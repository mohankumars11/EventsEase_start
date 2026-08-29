#!/usr/bin/env node
/**
 * Actually open the screens, and fail if any of them throws.
 *
 *   node scripts/smoke-routes.mjs            (expects dist/ to exist)
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS HAD TO EXIST
 * ══════════════════════════════════════════════════════════════════════
 *
 * The instant booking screen shipped to a customer's phone in a state
 * where opening it threw immediately:
 *
 *   ReferenceError: Cannot access 'E' before initialization
 *
 * A block that read `total` had been written above `total`'s
 * declaration. `const` is hoisted but not initialised, so the reference
 * sat in the temporal dead zone and every render threw — and the error
 * boundary turned that into "Something went wrong on our side."
 *
 * Every check in the pipeline passed, and every one of them was right
 * to:
 *
 *   esbuild        compiles it. The reference is legal JavaScript.
 *   vite build     bundles it. Rollup does not evaluate a component.
 *   the APK build  packaged it. Nothing had run it.
 *
 * The gap is not a missing linter. It is that NOTHING IN THE PIPELINE
 * EVER EXECUTED A SCREEN. A bundler answers "does this parse and
 * resolve"; only a browser answers "does this render".
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT IT DOES AND DELIBERATELY DOES NOT DO
 * ══════════════════════════════════════════════════════════════════════
 *
 * It opens each route in headless Edge against the real production
 * bundle and fails on an uncaught exception or a React render error.
 * That is all. It asserts nothing about content, because a smoke test
 * that checks copy breaks every time somebody improves a sentence, and
 * a test people disable is worse than no test.
 *
 * Routes behind a login render their signed-out state, which is a real
 * render and catches the same class of bug. The dead zone above would
 * have been caught by loading /book/instant with no session at all.
 */
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, extname } from 'node:path'
import { ROOT } from './lib/loadSrc.mjs'

/* Defaults to dist/, but takes a path — so the same test can be pointed
   at a bundle extracted from a published APK, which is how it was
   proved to catch the bug it exists for. */
const DIST = process.argv[2]
  ? (process.argv[2].startsWith('/') || /^[A-Za-z]:/.test(process.argv[2])
      ? process.argv[2] : join(ROOT, process.argv[2]))
  : join(ROOT, 'dist')
if (!existsSync(join(DIST, 'index.html'))) {
  console.error('\n  dist/ is missing. Run `vite build` first.\n')
  process.exit(1)
}

/* Every screen a customer or a master can reach in the first minute.
   Deep paths are routed CLIENT-side below, because that is what the app
   does — a Capacitor WebView never requests a deep URL from a server. */
const ROUTES = [
  '/',
  '/login',
  '/signup',
  '/partner/join',
  '/services',
  '/plan',
  '/book/instant?occasion=birthday',
  '/book/choose',
  '/book/when',
  '/celebrate/birthday',
  '/track',
  '/dashboard/vendor',
  '/dashboard/customer',
  '/account',
]

const TYPES = {
  '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
}

const PORT = 8977
const server = createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0])
  let p = join(DIST, url)
  // SPA fallback, exactly like the WebView's local server.
  if (!existsSync(p) || statSync(p).isDirectory()) p = join(DIST, 'index.html')
  res.setHeader('content-type', TYPES[extname(p)] ?? 'application/octet-stream')
  res.end(readFileSync(p))
}).listen(PORT)

const EDGE = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  // Linux runners. The workflow installs chromium; these are the paths
  // apt and snap put it at.
  '/usr/bin/microsoft-edge', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium-browser', '/usr/bin/chromium', '/snap/bin/chromium',
].find(existsSync)

if (!EDGE) {
  console.error('\n  No Edge or Chrome found — cannot run the smoke test.\n')
  server.close()
  process.exit(1)
}

const sleep = ms => new Promise(r => setTimeout(r, ms))
const profile = mkdtempSync(join(tmpdir(), 'sb-smoke-'))
const CDP = 9412

const browser = spawn(EDGE, [
  '--headless=new', `--remote-debugging-port=${CDP}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--disable-gpu', '--disable-dev-shm-usage', 'about:blank',
], { stdio: 'ignore' })

let ws, id = 0
const pending = new Map()
let caught = []

const send = (method, params = {}) => new Promise((res, rej) => {
  const n = ++id
  pending.set(n, { res, rej })
  ws.send(JSON.stringify({ id: n, method, params }))
})

const failures = []

try {
  let url
  for (let i = 0; i < 60 && !url; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json()
      url = list.find(t => t.type === 'page')?.webSocketDebuggerUrl
    } catch { /* not up yet */ }
    if (!url) await sleep(250)
  }
  if (!url) throw new Error('browser did not expose a debugging port')

  ws = new WebSocket(url)
  await new Promise(r => { ws.onopen = r })
  ws.onmessage = e => {
    const m = JSON.parse(e.data)
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id); pending.delete(m.id)
      m.error ? p.rej(new Error(m.error.message)) : p.res(m.result)
      return
    }
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params?.exceptionDetails
      caught.push((d?.exception?.description ?? d?.text ?? 'exception').split('\n')[0])
    }
    if (m.method === 'Runtime.consoleAPICalled' && m.params?.type === 'error') {
      const text = (m.params.args ?? []).map(a => a.value ?? a.description ?? '').join(' ')
      /* Only OUR render errors and real exceptions.
         A 404 for a font or an image is noise here — it does not stop a
         screen rendering, and failing on it would make this test a thing
         people learn to ignore. */
      if (/Unhandled render error|ReferenceError|TypeError|is not a function|before initialization/i.test(text)) {
        caught.push(text.split('\n')[0].slice(0, 200))
      }
    }
  }

  await send('Runtime.enable')
  await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride', {
    width: 412, height: 915, deviceScaleFactor: 2, mobile: true,
  })

  console.log(`\n  Opening ${ROUTES.length} routes against dist/\n`)

  for (const route of ROUTES) {
    caught = []
    // Root first, then route client-side — the app's own path.
    await send('Page.navigate', { url: `http://localhost:${PORT}/` })
    await sleep(1400)
    await send('Runtime.evaluate', {
      expression: `history.pushState({}, '', ${JSON.stringify(route)});`
        + `window.dispatchEvent(new PopStateEvent('popstate'))`,
    })
    await sleep(1800)

    const seen = await send('Runtime.evaluate', {
      expression: `document.body.innerText.slice(0, 120)`,
      returnByValue: true,
    })
    const text = seen.result?.value ?? ''

    // The error boundary's own words. A screen that renders it has not
    // "rendered" in any sense worth passing.
    const boundary = /Something went wrong on our side/i.test(text)

    const bad = [...new Set(caught)]
    if (bad.length || boundary) {
      failures.push({ route, bad, boundary })
      console.log(`  ✗ ${route}`)
      if (boundary) console.log('      the error boundary rendered')
      for (const b of bad.slice(0, 2)) console.log('      ' + b)
    } else {
      console.log(`  ✓ ${route}`)
    }
  }
} finally {
  try { ws?.close() } catch { /* already gone */ }
  browser.kill()
  server.close()
  try { rmSync(profile, { recursive: true, force: true }) } catch { /* windows holds it */ }
}

if (failures.length) {
  console.error(`\n  ${failures.length} of ${ROUTES.length} routes threw. Not shippable.\n`)
  process.exit(1)
}

console.log(`\n  All ${ROUTES.length} routes rendered clean.\n`)
