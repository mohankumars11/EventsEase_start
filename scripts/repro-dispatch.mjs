#!/usr/bin/env node
/**
 * Press "Find my masters" the way a customer does, and report what happens.
 *
 *   node --env-file=.env scripts/repro-dispatch.mjs [email]
 *
 * A booking was reported as sitting on "reaching masters" for ever with
 * nothing notified, while the API answered a hand-built payload with 200.
 * That gap is the whole problem: every check so far has called the
 * endpoint, and none has pressed the button.
 *
 * So this drives the REAL built bundle in a real browser with a real
 * session, seeds the app's own draft to the last step, clicks the actual
 * control, and reports the network request the app made, the response it
 * got, and anything it logged. Whatever is wrong is then a fact rather
 * than a hypothesis.
 */
import { spawn, spawnSync } from 'node:child_process'
import { createServer } from 'node:http'
import { readFileSync, existsSync, statSync, rmSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, extname } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { ROOT, readEnv } from './lib/loadSrc.mjs'

const DIST = join(ROOT, 'dist')
if (!existsSync(join(DIST, 'index.html'))) {
  console.error('\n  dist/ is missing. Run `npm run build` first.\n'); process.exit(1)
}

const EMAIL = process.argv[2] ?? 'sambramo.customer.test@gmail.com'
const url = readEnv('VITE_SUPABASE_URL')
const admin = createClient(url, readEnv('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } })
const anon = createClient(url, readEnv('VITE_SUPABASE_ANON_KEY'), { auth: { persistSession: false } })

const { data: link, error: le } = await admin.auth.admin.generateLink({ type: 'magiclink', email: EMAIL })
if (le) { console.error('  ' + le.message); process.exit(1) }
const { data: s, error: ve } = await anon.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'email' })
if (ve) { console.error('  ' + ve.message); process.exit(1) }
const session = s.session
const ref = url.replace(/^https:\/\//, '').split('.')[0]

const TYPES = {
  '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon',
}
const PORT = 8984
/* /api/ goes to the real deployment.

   Without this the static server answers /api/dispatch-booking with
   index.html -- vercel.json rewrites everything outside /api/ the same
   way -- and the app correctly reports "the server sent something
   unexpected". That is a harness artefact that would mask the very
   failure this exists to catch, and it did once. */
const API = process.env.REPRO_API ?? "https://sambramoh.vercel.app"

const server = createServer(async (req, res) => {
  if (req.url.startsWith("/api/")) {
    const body = await new Promise(r => {
      const c = []; req.on("data", d => c.push(d)); req.on("end", () => r(Buffer.concat(c)))
    })
    const up = await fetch(API + req.url, {
      method: req.method,
      headers: { "content-type": req.headers["content-type"] ?? "application/json" },
      body: ["GET", "HEAD"].includes(req.method) ? undefined : body,
    })
    const text = await up.text()
    res.statusCode = up.status
    res.setHeader("content-type", up.headers.get("content-type") ?? "application/json")
    return res.end(text)
  }
  const u = decodeURIComponent(req.url.split('?')[0])
  let p = join(DIST, u)
  if (!existsSync(p) || statSync(p).isDirectory()) p = join(DIST, 'index.html')
  res.setHeader('content-type', TYPES[extname(p)] ?? 'application/octet-stream')
  res.end(readFileSync(p))
}).listen(PORT)

const CANDIDATES = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
]
function onPath() {
  for (const n of ['google-chrome', 'chromium']) {
    const f = spawnSync(process.platform === 'win32' ? 'where' : 'which', [n], { encoding: 'utf8' })
    const l = String(f.stdout ?? '').split('\n')[0].trim()
    if (l && existsSync(l)) return l
  }
  return null
}
const EDGE = CANDIDATES.find(existsSync) ?? onPath()
if (!EDGE) { console.error('\n  No browser found.\n'); server.close(); process.exit(1) }

const sleep = ms => new Promise(r => setTimeout(r, ms))
const profile = mkdtempSync(join(tmpdir(), 'sb-repro-'))
const CDP = 9436
const browser = spawn(EDGE, [
  '--headless=new', `--remote-debugging-port=${CDP}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--disable-gpu', '--disable-dev-shm-usage',
  ...(process.platform === 'linux' ? ['--no-sandbox'] : []),
  'about:blank',
], { stdio: 'ignore' })

let ws, id = 0
const pending = new Map()
const send = (m, p = {}) => new Promise((res, rej) => {
  const n = ++id; pending.set(n, { res, rej })
  ws.send(JSON.stringify({ id: n, method: m, params: p }))
})
const evalJs = e => send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })

let failed = false
const netlog = []
const conlog = []

try {
  let wsUrl
  for (let i = 0; i < 60 && !wsUrl; i++) {
    try {
      const l = await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json()
      wsUrl = l.find(t => t.type === 'page')?.webSocketDebuggerUrl
    } catch { /* waiting */ }
    if (!wsUrl) await sleep(250)
  }
  ws = new WebSocket(wsUrl)
  await new Promise(r => { ws.onopen = r })
  ws.onmessage = e => {
    const m = JSON.parse(e.data)
    if (m.method === 'Network.requestWillBeSent' && /\/api\//.test(m.params?.request?.url ?? '')) {
      netlog.push({ kind: 'sent', url: m.params.request.url, method: m.params.request.method })
    }
    if (m.method === 'Network.responseReceived' && /\/api\//.test(m.params?.response?.url ?? '')) {
      netlog.push({ kind: 'response', url: m.params.response.url, status: m.params.response.status })
    }
    if (m.method === 'Network.loadingFailed') {
      netlog.push({ kind: 'failed', text: m.params.errorText, type: m.params.type })
    }
    if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) {
      conlog.push(m.params.args.map(a => a.value ?? a.description ?? '').join(' ').slice(0, 200))
    }
    if (m.method === 'Runtime.exceptionThrown') {
      conlog.push('EXCEPTION ' + (m.params.exceptionDetails?.exception?.description ?? '').slice(0, 200))
    }
    const p = pending.get(m.id)
    if (!p) return
    pending.delete(m.id)
    m.error ? p.rej(new Error(m.error.message)) : p.res(m.result)
  }

  await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 412, height: 915, deviceScaleFactor: 2, mobile: true })

  // A session and a finished basket, so the next tap is the dispatch.
  await send('Page.navigate', { url: `http://localhost:${PORT}/` })
  await sleep(900)
  await evalJs(`localStorage.setItem('sb-${ref}-auth-token', ${JSON.stringify(JSON.stringify(session))})`)
  await evalJs(`localStorage.removeItem('sambramo_live_booking')`)
  await evalJs(`localStorage.setItem('sambramo_instant_draft', ${JSON.stringify(JSON.stringify({
    at: Date.now(), step: 3, guests: 30,
    picked: ['photography'], durations: {}, options: {}, notes: {},
    where: { kind: 'home', area: 'Koramangala', pincode: '560034', lat: 12.9352, lng: 77.6245, status: 'served' },
    date: new Date(Date.now() + 86400000 * 20).toISOString(),
    occasionId: 'birthday',
  }))})`)

  await send('Page.navigate', { url: `http://localhost:${PORT}/book/instant?occasion=birthday` })
  await sleep(4500)
  await evalJs(`document.querySelectorAll('.brand-aqua').forEach(e => { e.style.display = 'none' })`)

  const before = (await evalJs('document.body.innerText.slice(0,160)')).result?.value ?? ''
  console.log(`\n  Signed in as ${EMAIL}\n`)
  console.log('  screen before the tap:')
  console.log('    ' + before.replace(/\n+/g, ' · ').slice(0, 150))

  // The button. Whatever it is called, it is the primary action.
  /* Tap the primary action until it dispatches or runs out of screens.
     The number of basket steps is exactly what regressed, so this must
     not assume there is only one tap left. */
  const taps = []
  for (let i = 0; i < 4; i++) {
    const r = await evalJs(`(() => {
      const b = [...document.querySelectorAll('button')]
        .filter(x => !x.disabled && /find my master|continue/i.test(x.innerText || ''))
      const t = b[b.length - 1]
      if (t) { t.click(); return t.innerText.trim() }
      return null
    })()`)
    const label = r.result?.value
    if (!label) break
    taps.push(label)
    await sleep(1800)
    if (/find my master/i.test(label)) break
  }
  console.log(String.fromCharCode(10))
  console.log("  tapped: " + (taps.join(" -> ") || "(nothing tappable)"))

  await sleep(12000)
  const after = (await evalJs('document.body.innerText.slice(0,400)')).result?.value ?? ''
  console.log('\n  screen 12s later:')
  console.log('    ' + after.replace(/\n+/g, ' · ').slice(0, 380))

  console.log('\n  /api/ traffic:')
  if (!netlog.length) console.log('    NOTHING WAS SENT')
  for (const n of netlog) {
    console.log('    ' + (n.kind === 'failed'
      ? `FAILED ${n.type} ${n.text}`
      : `${n.kind} ${n.status ?? n.method} ${(n.url ?? '').slice(0, 90)}`))
  }

  console.log('\n  console errors:')
  if (!conlog.length) console.log('    none')
  for (const c of conlog.slice(0, 8)) console.log('    ' + c)

  const dispatched = netlog.find(n => /dispatch-booking/.test(n.url ?? ''))
  const answered = netlog.find(n => n.kind === 'response' && /dispatch-booking/.test(n.url ?? ''))

  if (!dispatched) {
    console.error(String.fromCharCode(10))
    console.error("  FAIL - pressing the button sent no dispatch request at all.")
    console.error("  The screen moved and nothing was booked. This is exactly")
    console.error("  what a customer sees as reaching-masters-for-ever.")
    failed = true
  } else if (!answered || answered.status !== 200) {
    console.error("  FAIL - dispatch answered " + (answered ? answered.status : "nothing"))
    failed = true
  } else if (/did not go through|unexpected|try again/i.test(after)) {
    console.error("  FAIL - dispatch answered 200 but the board shows an error.")
    failed = true
  } else {
    console.log(String.fromCharCode(10))
    console.log("  A customer can press the button and reach masters.")
  }

} finally {
  try { ws?.close() } catch { /* gone */ }
  browser.kill(); server.close()
  try { rmSync(profile, { recursive: true, force: true }) } catch { /* held */ }
}

if (failed) process.exit(1)
