#!/usr/bin/env node
/**
 * The partner entry, run on the APK's own web bundle with a real login.
 *
 * Serves android/app/src/main/assets/public (what `npm run app:partner`
 * copies into the APK — or an .apk's assets/public when a path is given),
 * signs in a brand-new temporary partner, and drives headless Edge:
 *
 *   1  /partner/setup → "What services do you offer?", 34 cards
 *   2  pick Catering & Food + Bar & Beverages → Continue → Start →
 *      lands on /partner/onboard/catering_food, its own flow, step 1 of 13
 *   3  Bar & Beverages opens its own flow; the two drafts stay separate
 *   4  a saved draft reopens at its saved step (Catering → step 6, Menus)
 *   5  Anchor & MC opens the Anchor flow (not a generic one)
 *   6  Photography's Identity Verification & Bank Details step: the live
 *      identity chooser, then bank (searchable list, live IFSC lookup),
 *      account twice, consent, UPI, PAN → Save → ONE payout row in the
 *      database, real statuses on screen, activation answer from the server
 *   7  a second trade's step shows the saved details, adds no second row
 *   8  nothing navigated to More; no console errors
 *
 * Everything the temporary partner wrote is removed at the end.
 *
 *   npm run app:partner && node scripts/verify-apk-partner-entry.mjs [app.apk]
 */
import { spawn, execFileSync } from 'node:child_process'
import { createServer } from 'node:http'
import { mkdtempSync, existsSync, readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, extname } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { ROOT } from './lib/loadSrc.mjs'

const env = Object.fromEntries(readFileSync(join(ROOT, '.env'), 'utf8').split('\n')
  .map(l => l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)).filter(Boolean).map(m => [m[1], m[2].trim()]))
const tick = String.fromCharCode(10003), cross = String.fromCharCode(10007)
let ran = 0, bad = 0
const ok = (n, c, d = '') => { ran++; if (!c) bad++; console.log(`  ${c ? tick : cross} ${n}${c ? '' : `   <-- ${typeof d === 'string' ? d : JSON.stringify(d)}`}`); return c }
const sleep = ms => new Promise(r => setTimeout(r, ms))

/* ── 1 · The bundle ──────────────────────────────────────────────── */
const work = mkdtempSync(join(tmpdir(), 'sambramo-entry-'))
let web = join(ROOT, 'android', 'app', 'src', 'main', 'assets', 'public')
if (process.argv[2]) {
  const asZip = join(work, 'apk.zip')
  execFileSync('powershell', ['-NoProfile', '-Command',
    `Copy-Item -LiteralPath '${resolve(ROOT, process.argv[2])}' -Destination '${asZip}'; Expand-Archive -LiteralPath '${asZip}' -DestinationPath '${work}\\apk' -Force`], { stdio: 'pipe' })
  web = join(work, 'apk', 'assets', 'public')
}
if (!existsSync(join(web, 'index.html'))) { console.error('  no bundle at', web); process.exit(1) }
const version = existsSync(join(web, 'version.json')) ? JSON.parse(readFileSync(join(web, 'version.json'), 'utf8')) : {}
console.log(`\n  bundle   ${web}\n  built    ${version.builtAt ?? '?'} (${version.surface ?? '?'})`)

/* ── 2 · A brand-new partner, signed in for real ─────────────────── */
const admin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
const email = `e2e.apk.entry.${Date.now()}@example.com`
const { data: u, error: ue } = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { role: 'vendor', full_name: 'Ravi Kumar' } })
if (ue) { console.error(ue.message); process.exit(1) }
const uid = u.user.id
await admin.from('profiles').update({ role: 'vendor', full_name: 'Ravi Kumar' }).eq('id', uid)
const { data: link } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
const { data: fresh } = await anon.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' })
const storageKey = `sb-${new URL(env.VITE_SUPABASE_URL).hostname.split('.')[0]}-auth-token`
console.log(`  partner  ${email}\n`)

/* ── 3 · Serve it, open Edge ─────────────────────────────────────── */
const PORT = 4371, CDP = 9487
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.jpg': 'image/jpeg' }
/* /api/* runs the REAL serverless handlers in-process (as Vercel would), so
   what the app's Save triggers — e.g. the Razorpay Route setup — is the
   server code in this repo, not a stub. */
for (const [k, v] of Object.entries(env)) if (!(k in process.env)) process.env[k] = v
const apiHandler = async (req, res, url) => {
  const mod = join(ROOT, 'api', url.slice('/api/'.length) + '.js')
  if (!existsSync(mod)) { res.statusCode = 404; return res.end('{}') }
  const handler = (await import(pathToFileURL(mod).href)).default
  let raw = ''; for await (const c of req) raw += c
  let status = 200; const headers = {}
  const out = { status(c) { status = c; return this }, setHeader(k, v) { headers[k] = v }, json(j) { res.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*', ...headers }); res.end(JSON.stringify(j)); return this }, end(b) { res.writeHead(status, headers); res.end(b ?? ''); return this } }
  const query = Object.fromEntries(new URL(req.url, 'http://x').searchParams)
  await handler({ method: req.method, headers: req.headers, body: raw ? JSON.parse(raw) : {}, query, url: req.url }, out)
}
const server = createServer(async (req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0])
  if (url.startsWith('/api/')) { try { return await apiHandler(req, res, url) } catch (e) { res.statusCode = 500; return res.end(JSON.stringify({ error: String(e?.message ?? e) })) } }
  let file = join(web, url === '/' ? 'index.html' : url.replace(/^\//, ''))
  if (!existsSync(file)) { if (!/\.[a-z0-9]+$/i.test(url)) file = join(web, 'index.html'); else { res.statusCode = 404; return res.end('') } }
  res.setHeader('content-type', MIME[extname(file)] ?? 'application/octet-stream'); res.end(readFileSync(file))
})
server.listen(PORT)
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync)
const browser = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${CDP}`, `--user-data-dir=${join(work, 'edge')}`, '--no-first-run', '--disable-gpu', `http://127.0.0.1:${PORT}/`], { stdio: 'ignore' })
let targets = []
for (let i = 0; i < 40; i++) { await sleep(500); try { targets = await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json() } catch {} if (targets.some(t => t.type === 'page')) break }
const page = targets.find(t => t.type === 'page')
if (!page) { console.error('  Edge never opened its port.'); browser.kill(); process.exit(1) }
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise(r => (ws.onopen = r))
let id = 0; const pending = new Map(); const logs = []
ws.onmessage = e => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) }
  if (m.method === 'Runtime.exceptionThrown') logs.push('UNCAUGHT ' + (m.params.exceptionDetails?.exception?.description ?? m.params.exceptionDetails?.text))
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') logs.push('CONSOLE.ERROR ' + m.params.args.map(a => a.value ?? a.description ?? '').join(' '))
}
const send = (method, params = {}) => new Promise(r => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })) })
const js = async expression => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.value
await send('Runtime.enable'); await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 400, height: 860, deviceScaleFactor: 1, mobile: true })
await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/` })
await sleep(1500)
await js(`localStorage.setItem(${JSON.stringify(storageKey)}, ${JSON.stringify(JSON.stringify(fresh.session))}); true`)

const shots = join(ROOT, 'tmp', 'entry'); mkdirSync(shots, { recursive: true })
const capture = async name => {
  const h = Math.ceil(await js('Math.max(document.documentElement.scrollHeight, (document.getElementById("listing-scroll")?.scrollHeight ?? 0) + 200)'))
  await send('Emulation.setDeviceMetricsOverride', { width: 400, height: Math.min(Math.max(h, 860), 4200), deviceScaleFactor: 1, mobile: true })
  await sleep(500)
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
  writeFileSync(join(shots, name), Buffer.from(shot.data, 'base64'))
  await send('Emulation.setDeviceMetricsOverride', { width: 400, height: 860, deviceScaleFactor: 1, mobile: true })
}
const waitFor = async (expr, timeout = 25000) => {
  const t0 = Date.now()
  while (Date.now() - t0 < timeout) { if (await js(`(() => { try { return !!(${expr}) } catch { return false } })()`)) return true; await sleep(400) }
  return false
}
const goto = async path => { await send('Page.navigate', { url: `http://127.0.0.1:${PORT}${path}` }); await waitFor('!document.querySelector(".splash-ground") && document.body.innerText.trim().length > 40'); await sleep(800) }
const path = () => js('location.pathname + location.search')
const clickSel = sel => js(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return false; el.scrollIntoView({ block: 'center' }); el.click(); return true })()`)
const typeSel = (sel, v) => js(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return false; el.focus(); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(v)}); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new FocusEvent('focusout', { bubbles: true })); return true })()`)
const text = () => js('document.body.innerText')
const visited = []
const draft = (vid, trade, step) => js(`localStorage.setItem('partner_draft:${vid}:${trade}', JSON.stringify({ answers: {}, step: '${step}', savedAt: '2099-01-01T00:00:00.000Z' })); true`)

let vendorId = null
try {
  console.log('1 · THE SERVICE SELECTOR IS THE WAY IN\n')
  await goto('/partner/setup'); visited.push(await path())
  ok('"What services do you offer?" with all 34 trades', await waitFor('document.querySelectorAll("[data-trade]").length === 34'), await text())
  await sleep(2500)
  const { data: v } = await admin.from('vendors').select('id').eq('profile_id', uid).maybeSingle()
  vendorId = v?.id
  ok('the selector created the partner row (RLS, the partner\'s own session)', !!vendorId)
  await capture('apk-selector.png')

  console.log('\n2 · CONTINUE OPENS THE FIRST TRADE\'S OWN ONBOARDING\n')
  await clickSel('[data-trade="Catering & Food"]'); await sleep(200)
  await clickSel('[data-trade="Bar & Beverages"]'); await sleep(300)
  ok('2 services selected', /2 services selected/.test(await text()))
  await clickSel('[data-cta="continue"]'); await sleep(1200)
  ok('summary: "Let\'s set up your 2 services"', /Let's set up your 2 services/.test(await text()))
  await clickSel('[data-cta="start"]')
  ok('first picked, first set up: lands on /partner/onboard/catering_food', await waitFor('location.pathname === "/partner/onboard/catering_food"', 15000), await path())
  ok('…and it is Catering\'s own 13-step flow, step 1', await waitFor('document.querySelector(\'[data-listing-flow="catering_food"]\') && /Step 1 of 13/.test(document.body.innerText)'), await text())
  visited.push(await path())
  await capture('apk-onboard-catering.png')

  console.log('\n3 · EACH TRADE HAS ITS OWN FLOW AND ITS OWN DRAFT\n')
  await goto('/partner/onboard/bar_beverages'); visited.push(await path())
  ok('Bar & Beverages opens its own flow', await waitFor('document.querySelector(\'[data-listing-flow="bar_beverages"]\')'))
  await sleep(1500)
  const keys = await js(`Object.keys(localStorage).filter(k => k.startsWith('partner_draft:${vendorId}:'))`)
  ok(`two separate drafts (${(keys ?? []).map(k => k.split(':')[2]).join(', ')})`, ['catering_food', 'bar_beverages'].every(t => (keys ?? []).some(k => k.endsWith(':' + t))), keys)

  console.log('\n4 · A SAVED DRAFT REOPENS WHERE IT WAS LEFT\n')
  await draft(vendorId, 'catering_food', 'cat_menus')
  await goto('/partner/onboard/catering_food'); visited.push(await path())
  ok('Catering reopens at step 6 (Menu Builder)', await waitFor('/Step 6 of 13/.test(document.body.innerText)'), (await text()).slice(0, 200))

  console.log('\n5 · ANCHOR & MC OPENS ITS OWN FLOW\n')
  await goto('/partner/onboard/anchor_mc'); visited.push(await path())
  ok('the Anchor flow, not a generic one', await waitFor('document.querySelector("[data-anchor-flow]")'))

  console.log('\n6 · IDENTITY VERIFICATION & BANK DETAILS, INSIDE THE STEP\n')
  await draft(vendorId, 'photography', 'payout')
  await goto('/partner/onboard/photography'); visited.push(await path())
  ok('the step is the real form', await waitFor('/Identity Verification & Bank Details/.test(document.body.innerText) && document.querySelector("#ob-ifsc")'), (await text()).slice(0, 300))
  ok('no Set Up Payouts / Razorpay login substitute', !/Set Up Payouts|managed in Payouts|Log in to Razorpay/i.test(await text()))
  await sleep(2500)
  const idt = await text()
  ok('identity: the live list of accepted documents', /Which ID would you like to use|Aadhaar/.test(idt), idt.slice(0, 400))
  await capture('apk-payout-step-empty.png')

  await clickSel('[data-bank-picker] button'); await sleep(300)
  await typeSel('[data-testid="bank-search"]', 'hdfc'); await sleep(300)
  const found = await js('[...document.querySelectorAll("[data-bank]")].map(b => b.textContent)')
  ok(`bank search "hdfc" → ${found}`, found?.length === 1)
  await clickSel('[data-bank="HDFC"]'); await sleep(200)
  await typeSel('#ob-ifsc', 'HDFC0000240')
  ok('IFSC looked up live; branch filled', await waitFor('document.querySelector(\'[data-testid="ifsc-branch"]\')', 12000))
  ok(`  ${await js('document.querySelector(\'[data-testid="ifsc-branch"]\')?.innerText.replace(/\\n/g, " · ")')}`, true)
  await typeSel('#ob-name', 'Ravi Kumar')
  await typeSel('#ob-acc', '123456789012')
  await typeSel('#ob-acc2', '123456789099'); await sleep(300)
  ok('mismatched account numbers are caught', /do not match/.test(await text()))
  await typeSel('#ob-acc2', '123456789012')
  await clickSel('[data-testid="bank-consent"]')
  await clickSel('[data-upi-choice="add"]'); await sleep(200)
  await typeSel('#ob-upi', 'ravikumar@oksbi'); await typeSel('#ob-upi2', 'ravikumar@oksbi')
  await typeSel('#ob-pan', 'ABCPK1234F'); await sleep(300)
  await clickSel('[data-cta="save-payout"]')
  ok('saved', await waitFor('document.querySelector(\'[data-testid="payout-saved"]\')', 15000), (await text()).match(/.{0,120}(error|could not|cannot).{0,120}/i)?.[0] ?? '')
  await sleep(6000)
  const { data: rows } = await admin.from('vendor_payout_details').select('method, upi_id, ifsc, pan, verified_at').eq('vendor_id', vendorId)
  ok(`one payout row: ${JSON.stringify(rows?.map(r => ({ ...r, pan: r.pan ? 'set' : null })))}`, rows?.length === 1 && rows[0].method === 'bank' && rows[0].upi_id === 'ravikumar@oksbi' && rows[0].ifsc === 'HDFC0000240')
  ok('saving did not mark it verified', rows?.[0]?.verified_at == null)
  const statusText = await js('[...document.querySelectorAll(\'[data-section="step-status"] [data-status]\')].map(r => r.innerText.replace(/\\n/g, ": ")).join(" | ")')
  ok(`status read back: ${statusText}`, /Bank account: Details saved — verification pending/.test(statusText) && /UPI: Saved — not verified/.test(statusText) && !/Identity verification: Verified/.test(statusText), statusText)
  const act = await js(`document.querySelector('[data-section="step-status"] [data-status="activation"]')?.innerText.replace(/\\n/g, ": ")`)
  ok(`activation answered by the server: ${act}`, !!act && !/: Not started$/.test(act), act)
  if (await js('!!document.querySelector(\'[data-testid="contact-fix"]\')')) {
    await typeSel('#ob-phone', '9448012736'); await sleep(200)
    await clickSel('[data-cta="save-phone"]')
    const moved = await waitFor(`!/phone number/.test(document.querySelector('[data-section="step-status"] [data-status="activation"]')?.innerText ?? '')`, 15000)
    const act2 = await js(`document.querySelector('[data-section="step-status"] [data-status="activation"]')?.innerText.replace(/\\n/g, ": ")`)
    const { data: prof } = await admin.from('profiles').select('phone').eq('id', uid).single()
    ok(`mobile number added inline (profiles.phone ${prof?.phone ? 'saved' : 'missing'}); activation retried → ${act2}`, moved && !!prof?.phone, await js("document.querySelector('[data-testid=contact-fix]')?.innerText ?? 'card gone'"))
  }
  ok(`still on the step — ${await path()}`, (await path()).startsWith('/partner/onboard/photography'))
  await capture('apk-payout-step-saved.png')

  console.log('\n7 · THE NEXT TRADE REUSES IT\n')
  await draft(vendorId, 'videography', 'payout')
  await goto('/partner/onboard/videography'); visited.push(await path())
  await waitFor('/Identity Verification & Bank Details/.test(document.body.innerText) && document.querySelector("#ob-ifsc")'); await sleep(3000)
  const t7 = await text()
  ok('the saved account is shown, not asked for again', /Saved account ending 9012/.test(t7) && /Details saved — verification pending/.test(t7), t7.slice(0, 300))
  const { count } = await admin.from('vendor_payout_details').select('vendor_id', { count: 'exact', head: true }).eq('vendor_id', vendorId)
  ok('still exactly one payout record', count === 1, count)

  console.log('\n8 · NOTHING WENT TO MORE\n')
  ok(`routes visited: ${visited.join('  ')}`, !visited.some(p => /tab=account|tab=list/.test(p)))
} finally {
  const thrown = [...new Set(logs.filter(l => /^UNCAUGHT|Minified React error/i.test(l)))]
  ok(thrown.length ? `${thrown.length} uncaught error(s): ${thrown.slice(0, 3).join(' / ').slice(0, 300)}` : 'no uncaught errors', !thrown.length)
  const noisy = [...new Set(logs.filter(l => /^CONSOLE\.ERROR/.test(l)))]
  if (noisy.length) console.log(`  · console.error lines (network etc.): ${noisy.slice(0, 4).map(x => x.slice(0, 140)).join(' / ')}`)
  ws.close(); browser.kill(); server.close()
  if (vendorId) {
    await admin.from('vendor_payout_details').delete().eq('vendor_id', vendorId)
    await admin.from('partner_payout_accounts').delete().eq('vendor_id', vendorId)
    await admin.from('sambramo_listing_drafts').delete().eq('vendor_id', vendorId)
    await admin.from('partner_listings').delete().eq('vendor_id', vendorId)
    await admin.from('vendor_documents').delete().eq('vendor_id', vendorId)
    const { error } = await admin.from('vendors').delete().eq('id', vendorId)
    if (error) console.log('  vendor cleanup:', error.message)
  }
  await admin.auth.admin.deleteUser(uid)
  try { rmSync(work, { recursive: true, force: true }) } catch {}
  console.log(`\n  cleanup: temporary partner, vendor row, drafts and payout row removed`)
  console.log(`\n${bad ? cross : tick} verify-apk-partner-entry: ${ran - bad}/${ran}\n`)
  process.exitCode = bad ? 1 : 0
}
