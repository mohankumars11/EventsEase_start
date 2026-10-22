#!/usr/bin/env node
/**
 * Photograph a customer-app screen the way a phone shows it.
 *
 *   MSYS_NO_PATHCONV=1 node scripts/shoot-customer.mjs <route> <out.png>
 *     [--base http://127.0.0.1:5291] [--state plan.json] [--ready "<selector>"]
 *     [--eval "<js, awaited>"] [--full] [--port 9431] [--timeout 90000]
 *
 * 390×844 at 2x, mobile emulation. `--state` seeds the plan
 * (localStorage `sbm.cx.plan.v1`) before the route loads, so a basket or
 * a half-planned occasion can be shown without clicking through. The shot
 * is taken only after `--ready` exists AND every image on screen has
 * loaded — a cold Vite takes a minute on this machine, and --eval run
 * before React mounts clicks nothing (see shoot-eval-runs-before-hydration).
 *
 * One route per launch, and only this run's Edge is killed (by PID tree):
 * this machine has 3.9 GB, and `taskkill /IM msedge.exe` would also close
 * whatever browser the person at the keyboard has open.
 */
import { spawn, execSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const [route, out, ...rest] = process.argv.slice(2)
if (!route || !out) { console.error('usage: shoot-customer.mjs <route> <out.png> [--base] [--state] [--ready] [--eval] [--full]'); process.exit(2) }
const flag = (n, d) => { const i = rest.indexOf(`--${n}`); return i >= 0 ? rest[i + 1] : d }
const base = flag('base', 'http://127.0.0.1:5291')
const port = Number(flag('port', 9431))
const ready = flag('ready', '[data-customer-app] main')
const timeout = Number(flag('timeout', 90000))
const full = rest.includes('--full')
const state = flag('state', null)
const evalJs = flag('eval', null)

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const profile = mkdtempSync(join(tmpdir(), 'cx-shot-'))
const edge = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--window-size=390,844',
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--disable-dev-shm-usage', '--disable-extensions',
  '--renderer-process-limit=1', '--js-flags=--max-old-space-size=320', 'about:blank'], { stdio: 'ignore' })
const kill = () => { try { execSync(`taskkill /F /T /PID ${edge.pid}`, { stdio: 'ignore' }) } catch { /* gone */ } }
process.on('exit', kill)
const sleep = ms => new Promise(r => setTimeout(r, ms))

let target
for (let i = 0; i < 60 && !target; i++) {
  await sleep(500)
  try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page') } catch { /* not yet */ }
}
if (!target) { console.error('edge never opened its debugging port'); process.exit(1) }

const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
let id = 0
const pending = new Map()
ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id) } }
ws.onclose = () => { for (const r of pending.values()) r({ error: { message: 'browser closed' } }) }
const rpc = (method, params = {}) => new Promise((res, rej) => {
  const n = ++id
  const t = setTimeout(() => { pending.delete(n); rej(new Error(`${method} timed out`)) }, 30000)
  pending.set(n, d => { clearTimeout(t); d.error ? rej(new Error(d.error.message)) : res(d.result) })
  ws.send(JSON.stringify({ id: n, method, params }))
})
const js = async expression => (await rpc('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.value

await rpc('Page.enable'); await rpc('Runtime.enable')
await rpc('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
await rpc('Emulation.setTouchEmulationEnabled', { enabled: true })

/* --session <email>: sign in as a real account (service role mints a magic
   link, the anon client redeems it) — for screens behind a login. Needs
   .env loaded (node --env-file=.env). */
const sessionEmail = flag('session', null)
if (state || sessionEmail) {
  await rpc('Page.navigate', { url: `${base}/favicon.svg` })
  await sleep(800)
  if (state) await js(`localStorage.setItem('sbm.cx.plan.v1', ${JSON.stringify(readFileSync(state, 'utf8'))}); 'ok'`)
  if (sessionEmail) {
    const { createClient } = await import('@supabase/supabase-js')
    const U = process.env.VITE_SUPABASE_URL
    const admin = createClient(U, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    const anon = createClient(U, process.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
    const { data: link } = await admin.auth.admin.generateLink({ type: 'magiclink', email: sessionEmail })
    const { data } = await anon.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' })
    const ref = new URL(U).hostname.split('.')[0]
    await js(`localStorage.setItem('sb-${ref}-auth-token', ${JSON.stringify(JSON.stringify(data.session))}); 'ok'`)
  }
}
await rpc('Page.navigate', { url: base + route })

const t0 = Date.now()
let ok = false
while (Date.now() - t0 < timeout) {
  await sleep(700)
  ok = await js(`!!document.querySelector(${JSON.stringify(ready)}) && !document.body.innerText.includes('Loading…') && !document.querySelector('.app-splash')`).catch(() => false)
  if (ok) break
}
if (!ok) { console.error(`never rendered ${ready} on ${route}`); writeFileSync(out, Buffer.from((await rpc('Page.captureScreenshot', { format: 'png' })).data, 'base64')); process.exit(1) }

if (evalJs) { await js(`(async () => { ${evalJs} })()`).catch(e => console.error('eval:', e.message)); await sleep(900) }
/* --dump <file>: save the plan the app built, to seed later shots with. */
const dump = flag('dump', null)
if (dump) { await sleep(Number(flag('dump-wait', 6000))); writeFileSync(dump, await js(`localStorage.getItem('sbm.cx.plan.v1')`)) }

/* Skeletons resolve and images decode before the shot. */
for (let i = 0; i < 30; i++) {
  const busy = await js(`(() => { const imgs=[...document.images].filter(im => { const r = im.getBoundingClientRect(); return r.bottom > 0 && r.top < ${full ? 'document.documentElement.scrollHeight' : 'innerHeight'} }); return document.querySelectorAll('.cx-shimmer').length + imgs.filter(im => !im.complete).length })()`).catch(() => 0)
  if (!busy) break
  await sleep(500)
}
await js(`document.querySelectorAll('[data-splash], .splash-screen').forEach(e => e.remove()); 'ok'`).catch(() => {})
await sleep(400)

if (full) {
  const h = await js('Math.min(document.documentElement.scrollHeight, 6000)')
  await rpc('Emulation.setDeviceMetricsOverride', { width: 390, height: h, deviceScaleFactor: 2, mobile: true })
  await sleep(900)
}
const shot = await rpc('Page.captureScreenshot', { format: 'png' })
writeFileSync(out, Buffer.from(shot.data, 'base64'))
const errs = await js(`document.title`).catch(() => '')
console.log(`shot ${route} → ${out}${errs ? `  (${errs})` : ''}`)
ws.close(); kill(); process.exit(0)
