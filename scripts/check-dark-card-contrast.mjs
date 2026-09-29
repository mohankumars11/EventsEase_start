/**
 * Is the text on the dark cards actually printed?
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY A CSS WALKER CANNOT ANSWER THIS
 * ══════════════════════════════════════════════════════════════════════
 *
 * The token names in this app carry "how prominent", never "what is
 * behind me". `text-ink-mute` on a plum card reads perfectly sensibly in
 * review, passes every build, and is not printed.
 *
 * And getComputedStyle cannot catch it: grounds here are routinely
 * painted by an absolutely-positioned sibling or a multi-stop gradient,
 * so walking up for a background-color reports transparent all the way
 * to <body> and scores the broken cards as fine.
 *
 * So this measures PIXELS. The page is photographed over CDP, handed
 * back to itself as a data: URL, drawn to a canvas, and every text node
 * compared against a ring of pixels just outside its own box.
 *
 *   node scripts/check-dark-card-contrast.mjs --scenes scripts/scenes/partner-dark.jsx
 *
 * Exits non-zero if anything is below its WCAG floor (3:1 for large
 * text, 4.5:1 otherwise).
 */
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { mkdtempSync, readFileSync, writeFileSync, existsSync, statSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import esbuild from 'esbuild'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const rest = process.argv.slice(2)
if (rest.includes('--help')) {
  console.error('usage: node scripts/check-dark-card-contrast.mjs [--scenes <file.jsx>] [--width N] [--wait ms]')
  process.exit(1)
}
const flag = (n, d) => { const i = rest.indexOf(`--${n}`); return i === -1 ? d : rest[i + 1] }
const scenes = resolve(ROOT, flag('scenes', 'scripts/scenes/vendor-scenes.jsx'))
/* @2x is right for reading a screenshot and about four times the bytes
   of @1x, which is the difference between a file that can be sent and
   one that is refused. */
const SCALE = Number(flag('scale', '2')) || 2
const width = Number(flag('width', 430))
const settle = Number(flag('wait', 900))
/* Run after mount, before the shot. Some states only exist after an
   interaction — an accordion opened, a course expanded — and those are
   exactly the states worth photographing. */
const evalAfter = flag('eval', null)
/* ── --desktop ─────────────────────────────────────────────────────────
   `mobile: true` tells the emulator this is a phone, and a phone is what
   almost every scene here is. But a screen with `lg:` breakpoints has a
   second layout that no amount of --width will reveal while the
   emulator is still claiming to be a handset: Chrome keeps the mobile
   viewport meta behaviour and the media queries resolve against it.
   Shipping a two-column desktop dashboard that nobody has looked at is
   not shipping it, so this flag exists to photograph the other half. */
const desktop = rest.includes('--desktop')

/* ── the stylesheet, and a staleness check ───────────────────────────── */
const distAssets = join(ROOT, 'dist', 'assets')
if (!existsSync(distAssets)) { console.error('\n  dist/ is missing — run a build first.\n'); process.exit(1) }
const cssName = readdirSync(distAssets).find(f => /^index-.*\.css$/.test(f))
if (!cssName) { console.error('\n  no dist/assets/index-*.css\n'); process.exit(1) }
const cssPath = join(distAssets, cssName)
const cssAge = statSync(cssPath).mtimeMs

/* Newest thing under src/. If a component changed after the sheet was
   built, its classes may not be in the sheet and the photograph would
   quietly lie about the design. */
let newest = 0, newestFile = ''
;(function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) walk(p)
    else { const m = statSync(p).mtimeMs; if (m > newest) { newest = m; newestFile = p } }
  }
})(join(ROOT, 'src'))

if (newest > cssAge) {
  console.error(`\n  STALE STYLESHEET`)
  console.error(`    sheet built : ${new Date(cssAge).toLocaleString()}`)
  console.error(`    newest src  : ${new Date(newest).toLocaleString()}  ${newestFile.replace(ROOT, '')}`)
  console.error(`\n  Build first, or the photo shows last build's classes.\n`)
  process.exit(1)
}

/* ── bundle the scenes ───────────────────────────────────────────────── */
const tmp = mkdtempSync(join(tmpdir(), 'sambramo-shot-'))
const entry = join(tmp, 'entry.jsx')
writeFileSync(entry, [
  `import React from 'react'`,
  `import { createRoot } from 'react-dom/client'`,
  `import Scenes from ${JSON.stringify(scenes)}`,
  /* Components reach for app context — MenuUpload calls useToast and
     throws outright without a provider, which showed up as an empty
     page rather than an error. Providers that are pure UI go here;
     anything that would talk to the network deliberately does not. */
  `import { ToastProvider } from ${JSON.stringify(join(ROOT, 'src/context/ToastContext.jsx'))}`,
  `createRoot(document.getElementById('root')).render(`,
  `  React.createElement(ToastProvider, null, React.createElement(Scenes)))`,
  `window.__mounted = true`,
].join('\n'))

const bundle = join(tmp, 'bundle.js')
await esbuild.build({
  entryPoints: [entry],
  bundle: true,
  outfile: bundle,
  /* esm, not iife: components pull in the supabase client, which reads
     import.meta.env, and esbuild can only compile that under esm. The
     page loads it as a module. */
  format: 'esm',
  jsx: 'automatic',
  loader: { '.js': 'jsx', '.jsx': 'jsx' },
  resolveExtensions: ['.jsx', '.js', '.ts', '.tsx', '.json'],
  define: {
    'process.env.NODE_ENV': '"production"',
    /* A stub, deliberately not the real project. These scenes render
       markup; nothing here should be able to reach production, and a
       harness that quietly could is a harness that eventually does. */
    'import.meta.env': JSON.stringify({
      VITE_SUPABASE_URL: 'http://127.0.0.1:9/stub',
      VITE_SUPABASE_ANON_KEY: 'stub-anon-key',
      VITE_SURFACE: 'partner', MODE: 'production', DEV: false, PROD: true,
    }),
  },
  absWorkingDir: ROOT,
  /* The entry is written to a temp dir, so esbuild would look for
     node_modules beside THAT and find nothing. Resolution follows the
     importer, not absWorkingDir. */
  nodePaths: [join(ROOT, 'node_modules')],
  logLevel: 'warning',
})

/* ── serve it ────────────────────────────────────────────────────────── */
const PORT = 4357
const html = `<!doctype html><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="/app.css">
<style>html,body{margin:0;background:#fff}</style>
<div id="root"></div><script type="module" src="/bundle.js"></script>`

const server = createServer((req, res) => {
  const url = req.url.split('?')[0]
  if (url === '/app.css') { res.setHeader('content-type', 'text/css'); return res.end(readFileSync(cssPath)) }
  if (url === '/bundle.js') { res.setHeader('content-type', 'text/javascript'); return res.end(readFileSync(bundle)) }
  res.setHeader('content-type', 'text/html'); res.end(html)
})

/* A killed run leaves the port bound for a while, and node's default is
   an unhandled 'error' event: a stack trace ending in
   shoot-components.mjs:141, which reads as this file being broken. It is
   not; it is the previous run still holding 4351. Said plainly, with the
   fix. */
server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error('\n  Port ' + PORT + ' is still held by an earlier run.')
    console.error('  Kill it and try again:')
    console.error('    powershell "Get-NetTCPConnection -LocalPort ' + PORT
      + ' | Select -Expand OwningProcess -Unique | Stop-Process -Force"\n')
  } else {
    console.error('\n  Could not start the local server: ' + err.message + '\n')
  }
  process.exit(1)
})

server.listen(PORT)

/* ── shoot it ────────────────────────────────────────────────────────── */
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
              'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync)
if (!EDGE) { console.error('Edge not found'); process.exit(1) }

const profile = mkdtempSync(join(tmpdir(), 'sb-shot-'))
const CDP = 9473
const browser = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${CDP}`,
  `--user-data-dir=${profile}`, '--no-first-run', '--disable-gpu',
  '--disable-dev-shm-usage', 'about:blank'], { stdio: 'ignore' })

const sleep = ms => new Promise(r => setTimeout(r, ms))

/* Edge used to be given a flat 2.2 seconds to come up. On this box, right
   after a build, it sometimes needs more, and the failure was a bare
   ECONNREFUSED that looks like Edge is missing rather than slow. Wait for
   the port instead of guessing at it. */
let targets = null
for (let i = 0; i < 40 && !targets; i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json() }
  catch { await sleep(500) }
}
if (!targets) {
  console.error(`\n  Edge never opened the debugging port (${CDP}) in 20s.`)
  console.error('  Another headless run may still be holding it: kill msedge and retry.\n')
  browser.kill()
  process.exit(1)
}
const page = targets.find(t => t.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise(r => (ws.onopen = r))

let id = 0
const pending = new Map()
const errors = []
ws.onmessage = e => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) }
  if (m.method === 'Runtime.exceptionThrown') {
    errors.push(m.params.exceptionDetails?.exception?.description
      ?? m.params.exceptionDetails?.text ?? 'unknown')
  }
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    errors.push(m.params.args.map(a => a.value ?? a.description ?? '').join(' '))
  }
}
const send = (method, params = {}) =>
  new Promise(r => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })) })

await send('Runtime.enable')
await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride',
  { width, height: 900, deviceScaleFactor: 1, mobile: true })
await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/` })
await sleep(settle)

const mounted = await send('Runtime.evaluate', { expression: 'window.__mounted === true' })
if (!mounted.result?.value) {
  console.error('\n  NOTHING MOUNTED — the scenes threw before rendering.')
  errors.slice(0, 6).forEach(e => console.error('    ' + String(e).split('\n')[0]))
  ws.close(); browser.kill(); server.close(); process.exit(1)
}

const pageH = Math.ceil((await send('Runtime.evaluate',
  { expression: 'document.documentElement.scrollHeight' })).result.value)
await send('Emulation.setDeviceMetricsOverride',
  { width, height: pageH, deviceScaleFactor: 1, mobile: true })
await sleep(300)

const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })

/* ══════════════════════════════════════════════════════════════════════
   THE PIXELS, HANDED BACK TO THE PAGE
   ══════════════════════════════════════════════════════════════════════

   getComputedStyle cannot answer "what is behind this text" in this app.
   Grounds are routinely painted by an absolutely-positioned sibling or a
   multi-stop gradient, so walking up for a background-color reports
   transparent all the way to body and scores every broken card as fine.

   So the page is photographed, the photograph is given back to the page
   as a data: URL, drawn to a canvas, and each text node compared against
   the pixels it is actually sitting on.

   No backticks anywhere below: this whole script is a template literal
   and one would end it. */
const MEASURE = `(async () => {
  const img = new Image()
  img.src = 'data:image/png;base64,' + ${JSON.stringify(shot.data)}
  await img.decode()

  const c = document.createElement('canvas')
  c.width = img.naturalWidth; c.height = img.naturalHeight
  const g = c.getContext('2d', { willReadFrequently: true })
  g.drawImage(img, 0, 0)

  const sx = img.naturalWidth / document.documentElement.scrollWidth

  const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
  const lum = (r, gr, b) => 0.2126 * lin(r) + 0.7152 * lin(gr) + 0.0722 * lin(b)
  const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)

  const parse = css => {
    const m = String(css).match(/rgba?\\(([^)]+)\\)/)
    if (!m) return null
    const [r, gr, b, a] = m[1].split(',').map(Number)
    return { r, g: gr, b, a: a === undefined ? 1 : a }
  }

  /* Emoji report their parent colour and paint their own, so they score
     as failures on every dark card. */
  const EMOJI = /[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}\\u{FE0F}]/u

  const out = []
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.nodeValue.trim()
    if (!text || text.length < 2 || EMOJI.test(text)) continue

    const el = node.parentElement
    if (!el) continue
    /* A washed-out disabled control is correct, and including them
       buries every real hit. */
    if (el.closest('[disabled],[aria-disabled="true"]')) continue
    if (el.closest('[data-scene-label]')) continue

    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.15) continue

    const range = document.createRange()
    range.selectNodeContents(node)
    const r = range.getBoundingClientRect()
    if (r.width < 4 || r.height < 4) continue

    const fg = parse(cs.color)
    if (!fg) continue
    const fgLum = lum(fg.r, fg.g, fg.b)

    /* ---- Sampled from a RING around the text, not from inside it ----
       The glyphs are in the box, so any statistic taken over the box is
       contaminated by the ink: for short bold strings the text IS the
       mode and the median alike, and plum initials on a saffron disc --
       genuinely about 9:1 -- measured as 3.8:1.

       A two-pixel ring just outside the box is the fill and nothing
       else, which is exactly what the text has to be legible against. */
    const pad = 3
    const x0 = Math.max(0, Math.round((r.left + scrollX) * sx) - pad)
    const y0 = Math.max(0, Math.round((r.top + scrollY) * sx) - pad)
    const w = Math.min(c.width - x0, Math.round(r.width * sx) + pad * 2)
    const h = Math.min(c.height - y0, Math.round(r.height * sx) + pad * 2)
    if (w < 6 || h < 6) continue

    const px = g.getImageData(x0, y0, w, h).data
    const ring = []
    for (let yy = 0; yy < h; yy++) {
      for (let xx = 0; xx < w; xx++) {
        const edge = xx < pad || yy < pad || xx >= w - pad || yy >= h - pad
        if (!edge) continue
        const i = (yy * w + xx) * 4
        ring.push(lum(px[i], px[i + 1], px[i + 2]))
      }
    }
    if (ring.length < 8) continue

    /* The MODE of the ring, bucketed. A ring that crosses a card edge
       has two populations and the bigger one is the card the text is
       on. A mean would land between them, on nothing. */
    const B = 48
    const hist = new Array(B).fill(0)
    for (const l of ring) hist[Math.min(B - 1, Math.floor(l * B))]++
    let top = 0
    for (let i = 1; i < B; i++) if (hist[i] > hist[top]) top = i
    let sum = 0, hits = 0
    for (const l of ring) {
      if (Math.min(B - 1, Math.floor(l * B)) === top) { sum += l; hits++ }
    }
    const ground = hits ? sum / hits : 1

    const effective = fg.a >= 1 ? fgLum : fgLum * fg.a + ground * (1 - fg.a)
    const cr = ratio(effective, ground)

    const size = parseFloat(cs.fontSize) || 12
    const weight = Number(cs.fontWeight) || 400
    /* WCAG's large-text allowance: 18.66px bold, or 24px at any weight. */
    const large = size >= 24 || (size >= 18.66 && weight >= 700)
    const floor = large ? 3 : 4.5

    out.push({
      text: text.slice(0, 56),
      colour: cs.color,
      ratio: Math.round(cr * 100) / 100,
      ground: Math.round(ground * 1000) / 1000,
      size, weight, floor,
      dark: ground < 0.20,
      fails: cr < floor,
    })
  }
  return JSON.stringify(out)
})()`

const measured = await send('Runtime.evaluate',
  { expression: MEASURE, awaitPromise: true, returnByValue: true })

if (measured.exceptionDetails) {
  ws.close(); browser.kill(); server.close()
  console.error('')
  console.error('  The measuring script threw inside the page:')
  console.error('    ' + (measured.exceptionDetails.exception?.description
    ?? measured.exceptionDetails.text ?? 'unknown'))
  console.error('')
  process.exit(1)
}

const raw = measured.result?.value
const nodes = typeof raw === 'string' ? JSON.parse(raw) : []

ws.close(); browser.kill(); server.close()

const tick = String.fromCharCode(10003)
const cross = String.fromCharCode(10007)

const onDark = nodes.filter(n => n.dark)
const failures = nodes.filter(n => n.fails)
const darkFailures = failures.filter(n => n.dark)

console.log(`\n  ${nodes.length} pieces of text measured, ${onDark.length} on a dark ground.\n`)

if (!failures.length) {
  console.log(`  ${tick} every one clears its WCAG floor.\n`)
} else {
  console.log(`  ${cross} ${failures.length} below the floor (${darkFailures.length} on a dark ground)\n`)
  for (const n of failures.sort((a, b) => a.ratio - b.ratio).slice(0, 30)) {
    console.log(`  ${n.ratio.toFixed(2).padStart(5)}:1  needs ${n.floor}  `
      + `${n.dark ? 'DARK ' : 'light'} groundL=${String(n.ground).padEnd(6)} `
      + `${n.colour.padEnd(22)} ${JSON.stringify(n.text)}`)
  }
  if (failures.length > 30) console.log(`  … and ${failures.length - 30} more`)
  console.log('')
}
process.exitCode = failures.length ? 1 : 0
