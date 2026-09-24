#!/usr/bin/env node
/**
 * Does the apk actually show the new screens?
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS EXISTS
 * ══════════════════════════════════════════════════════════════════════
 *
 * Every check so far proved a FILE was correct: the strings are in the
 * bundle, the bundle is in the apk, the apk has the right version. All
 * true, all verified, and none of it answered the only question that
 * matters — does a partner opening this build see the new screens.
 *
 * So this runs the apk's OWN bundled assets. Not dist/, not src/: the
 * `assets/public` directory is unzipped straight out of the .apk and
 * served, so what is exercised is byte-for-byte what is on the phone.
 *
 * A real partner session is minted (generateLink + verifyOtp, per the
 * pattern in the repo) and written into localStorage before the app
 * boots, because every screen worth checking is behind a login.
 *
 *   node scripts/verify-apk-screens.mjs <path-to.apk>
 *
 * Writes one screenshot per tab and asserts a marker unique to the new
 * build is present on each.
 */
import { spawn, execFileSync } from 'node:child_process'
import { createServer } from 'node:http'
import { mkdtempSync, existsSync, readFileSync, writeFileSync, rmSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, extname } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { ROOT } from './lib/loadSrc.mjs'

const apk = resolve(ROOT, process.argv[2] ?? '')
if (!existsSync(apk)) {
  console.error('\n  usage: node scripts/verify-apk-screens.mjs <path-to.apk>\n')
  process.exit(1)
}

const env = Object.fromEntries(readFileSync(join(ROOT, '.env'), 'utf8').split('\n')
  .map(l => l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)).filter(Boolean)
  .map(m => [m[1], m[2].trim()]))

const tick = String.fromCharCode(10003)
const cross = String.fromCharCode(10007)
let ran = 0, bad = 0
const fails = []
const ok = (n, cond, d = '') => {
  ran++
  if (!cond) { bad++; fails.push(`${n}${d ? ` — ${d}` : ''}`) }
  console.log(`  ${cond ? tick : cross} ${n}${cond ? '' : `   <-- ${d}`}`)
}

/* ── 1 · Unzip the apk's web assets ──────────────────────────────── */
const work = mkdtempSync(join(tmpdir(), 'sambramo-apk-'))
const web = join(work, 'public')

execFileSync('powershell', ['-NoProfile', '-Command',
  `Expand-Archive -LiteralPath '${apk}' -DestinationPath '${work}\\apk' -Force`],
  { stdio: 'pipe' })

const inner = join(work, 'apk', 'assets', 'public')
if (!existsSync(inner)) {
  console.error('\n  No assets/public inside that apk.\n'); process.exit(1)
}
execFileSync('powershell', ['-NoProfile', '-Command',
  `Copy-Item -Path '${inner}' -Destination '${web}' -Recurse -Force`], { stdio: 'pipe' })

const indexHtml = readFileSync(join(web, 'index.html'), 'utf8')
const entry = indexHtml.match(/assets\/(index-[A-Za-z0-9_-]+\.js)/)?.[1]
const version = existsSync(join(web, 'version.json'))
  ? JSON.parse(readFileSync(join(web, 'version.json'), 'utf8')) : {}

console.log(`\n  apk      ${apk.split(/[\\/]/).pop()}`)
console.log(`  entry    ${entry}`)
console.log(`  built    ${version.builtAt ?? 'unknown'}  (${version.surface ?? '?'})\n`)

/* ── 2 · A real partner session ──────────────────────────────────── */
const admin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
                           { auth: { persistSession: false } })
const anon = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY,
                          { auth: { persistSession: false } })

const EMAIL = process.env.PARTNER_EMAIL ?? 'sambramo.partner.test@gmail.com'

const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
  type: 'magiclink', email: EMAIL,
})
if (linkErr) { console.error('  could not mint a link:', linkErr.message); process.exit(1) }

/* Redeemed on the ANON client. On the service-role one every assertion
   afterwards would be testing the service role's permissions. */
const { data: fresh, error: otpErr } = await anon.auth.verifyOtp({
  token_hash: link.properties.hashed_token, type: 'magiclink',
})
if (otpErr) { console.error('  could not redeem it:', otpErr.message); process.exit(1) }
console.log(`  session  ${fresh.user.email}\n`)

/* supabase-js v2 keys its storage on the project ref. */
const ref = new URL(env.VITE_SUPABASE_URL).hostname.split('.')[0]
const storageKey = `sb-${ref}-auth-token`

/* ── 3 · Serve the apk's assets ──────────────────────────────────── */
const PORT = 4363
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.jpg': 'image/jpeg',
}
const server = createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0])
  let file = join(web, url === '/' ? 'index.html' : url.replace(/^\//, ''))
  /* The single-page fallback Capacitor itself applies: anything without
     a dot in its last segment gets index.html. */
  if (!existsSync(file)) {
    if (!/\.[a-z0-9]+$/i.test(url)) file = join(web, 'index.html')
    else { res.statusCode = 404; return res.end('not found') }
  }
  res.setHeader('content-type', MIME[extname(file)] ?? 'application/octet-stream')
  res.end(readFileSync(file))
})
server.listen(PORT)

/* ── 4 · Drive it ────────────────────────────────────────────────── */
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
              'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync)
const CDP = 9479
const profile = join(work, 'edge')
const browser = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${CDP}`,
  `--user-data-dir=${profile}`, '--no-first-run', '--disable-gpu',
  `http://127.0.0.1:${PORT}/`], { stdio: 'ignore' })

const sleep = ms => new Promise(r => setTimeout(r, ms))

let targets = []
for (let i = 0; i < 40; i++) {
  await sleep(500)
  try { targets = await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json() } catch { /* not up */ }
  if (targets.some(t => t.type === 'page')) break
}
const page = targets.find(t => t.type === 'page')
if (!page) { console.error('  Edge never opened its port.'); browser.kill(); process.exit(1) }

const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise(r => (ws.onopen = r))
let id = 0
const pending = new Map()
const logs = []
ws.onmessage = e => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) }
  if (m.method === 'Runtime.consoleAPICalled') {
    logs.push(m.params.args.map(a => a.value ?? a.description ?? '').join(' '))
  }
}
const send = (method, params = {}) =>
  new Promise(r => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })) })

await send('Runtime.enable')
await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride',
  { width: 430, height: 900, deviceScaleFactor: 1, mobile: true })

/* The session, written before the app boots. */
await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/` })
await sleep(1200)
await send('Runtime.evaluate', { expression:
  `localStorage.setItem(${JSON.stringify(storageKey)}, ${JSON.stringify(JSON.stringify(fresh.session))})` })

const shots = join(ROOT, 'shots')
const capture = async (name) => {
  const h = Math.ceil((await send('Runtime.evaluate',
    { expression: 'document.documentElement.scrollHeight' })).result.value)
  await send('Emulation.setDeviceMetricsOverride',
    { width: 430, height: Math.min(h, 3000), deviceScaleFactor: 1, mobile: true })
  await sleep(400)
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
  writeFileSync(join(shots, name), Buffer.from(shot.data, 'base64'))
  await send('Emulation.setDeviceMetricsOverride',
    { width: 430, height: 900, deviceScaleFactor: 1, mobile: true })
}

const textNow = async () =>
  (await send('Runtime.evaluate', { expression: 'document.body.innerText' })).result?.value ?? ''

const goto = async (hash, settle = 3500) => {
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}${hash}` })
  await sleep(settle)
}

/* ── 5 · The tabs, and a marker unique to THIS build on each ─────── */
console.log('WHAT THE APK ACTUALLY RENDERS\n')

const TABS = [
  ['Jobs',     '/dashboard/vendor?tab=offers',       'apk-tab-jobs.png',
   [['Under review', 'the status pill'], ['Sambramo Partner', 'the header']]],
  ['Calendar', '/dashboard/vendor?tab=availability', 'apk-tab-calendar.png',
   [['Set dates', 'the NEW header button (was "Block dates")'],
    ['Mark a range available', 'the NEW tools row']]],
  ['Earnings', '/dashboard/vendor?tab=earnings',     'apk-tab-earnings.png',
   [['Ready to claim', 'the hero']]],
  ['More',     '/dashboard/vendor?tab=account',      'apk-tab-more.png',
   [['Sambramo Partner \u00b7', 'the NEW build stamp'], ['bundle ', 'the NEW bundle line']]],
]

for (const [label, url, file, markers] of TABS) {
  await goto(url)
  const text = await textNow()
  await capture(file)
  console.log(`  ${label}`)
  for (const [needle, why] of markers) {
    ok(`    ${why}`, text.includes(needle), `"${needle}" not on screen`)
  }
}

console.log('')
const evicted = logs.filter(l => /service worker|stale cache/i.test(l))
if (evicted.length) console.log('  worker log:', evicted[0])

ws.close(); browser.kill(); server.close()
try { rmSync(work, { recursive: true, force: true }) } catch { /* windows holds it */ }

console.log(`\n${bad ? cross : tick} ${ran - bad}/${ran}   screenshots in shots/apk-tab-*.png\n`)
if (fails.length) { console.log('NOT ON SCREEN\n'); for (const f of fails) console.log('  ' + f) }
process.exitCode = bad ? 1 : 0
