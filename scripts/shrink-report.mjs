#!/usr/bin/env node
/**
 * Re-encode the test-report captures small enough to embed.
 *
 *   node scripts/shrink-report.mjs
 *
 * The captures are 824px wide at deviceScaleFactor 2 and total 16 MB —
 * fine as evidence on disk, too big to inline into a single page once
 * base64 has added its third. These are the same pictures at 1x in JPEG,
 * which lands the set around 2 MB.
 *
 * Through a canvas rather than a library because there is no image
 * toolchain on this machine: no sharp, no ImageMagick. The browser is
 * already a dependency of the capture step, and scripts/render-app-icons
 * already draws through one, so this borrows that path rather than
 * adding a native build to a 3.9 GB box.
 *
 * The originals are never touched. Thumbnails go to a sibling folder, so
 * a bad re-encode costs a re-run and not a re-capture.
 */
import { spawn, spawnSync } from 'node:child_process'
import { createServer } from 'node:http'
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, rmSync, mkdtempSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ROOT } from './lib/loadSrc.mjs'

const SRC = join(ROOT, 'docs', 'test-report')
const OUT = join(SRC, 'small')
const WIDTH = 420
const QUALITY = 0.72

const files = readdirSync(SRC).filter(f => f.endsWith('.png')).sort()
if (!files.length) { console.error('\n  Nothing in docs/test-report/. Run capture-report first.\n'); process.exit(1) }
mkdirSync(OUT, { recursive: true })

const PORT = 8982
const server = createServer((req, res) => {
  const name = decodeURIComponent(req.url.split('?')[0]).replace(/^\//, '')
  const p = join(SRC, name)
  if (!name || !existsSync(p)) { res.statusCode = 404; return res.end('no') }
  res.setHeader('content-type', 'image/png')
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
const profile = mkdtempSync(join(tmpdir(), 'sb-shrink-'))
const CDP = 9434

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
const evalJs = expr => send('Runtime.evaluate', {
  expression: expr, returnByValue: true, awaitPromise: true,
})

try {
  let url
  for (let i = 0; i < 60 && !url; i++) {
    try {
      const l = await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json()
      url = l.find(t => t.type === 'page')?.webSocketDebuggerUrl
    } catch { /* waiting */ }
    if (!url) await sleep(250)
  }
  ws = new WebSocket(url)
  await new Promise(r => { ws.onopen = r })
  ws.onmessage = e => {
    const m = JSON.parse(e.data)
    const p = pending.get(m.id)
    if (!p) return
    pending.delete(m.id)
    m.error ? p.rej(new Error(m.error.message)) : p.res(m.result)
  }
  await send('Runtime.enable'); await send('Page.enable')
  await send('Page.navigate', { url: `http://localhost:${PORT}/${files[0]}` })
  await sleep(600)

  console.log(`\n  ${files.length} captures -> docs/test-report/small/\n`)
  let before = 0, after = 0

  for (const f of files) {
    const r = await evalJs(`(async () => {
      const img = new Image()
      img.src = ${JSON.stringify(`http://localhost:${PORT}/${f}`)}
      await img.decode()
      const w = ${WIDTH}
      const h = Math.round(img.naturalHeight * (w / img.naturalWidth))
      const c = document.createElement('canvas')
      c.width = w; c.height = h
      const g = c.getContext('2d')
      // White beneath, because a JPEG has no alpha and the app's ground
      // is white — without this a transparent edge comes back black.
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h)
      g.imageSmoothingQuality = 'high'
      g.drawImage(img, 0, 0, w, h)
      return c.toDataURL('image/jpeg', ${QUALITY})
    })()`)

    const data = r.result?.value
    if (typeof data !== 'string' || !data.startsWith('data:image/jpeg')) {
      console.log(`  x ${f}`)
      continue
    }
    const buf = Buffer.from(data.split(',')[1], 'base64')
    const out = f.replace(/\.png$/, '.jpg')
    writeFileSync(join(OUT, out), buf)

    const wasKb = Math.round(statSync(join(SRC, f)).size / 1024)
    const nowKb = Math.round(buf.length / 1024)
    before += wasKb; after += nowKb
    console.log(`  ${out.padEnd(30)} ${String(wasKb).padStart(5)} KB -> ${String(nowKb).padStart(4)} KB`)
  }

  console.log(`\n  ${(before / 1024).toFixed(1)} MB -> ${(after / 1024).toFixed(1)} MB\n`)
} finally {
  try { ws?.close() } catch { /* gone */ }
  browser.kill(); server.close()
  try { rmSync(profile, { recursive: true, force: true }) } catch { /* held */ }
}
