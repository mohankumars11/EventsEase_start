/**
 * Replace individual cells in the 34-trade raster sprite.
 *
 *   node scripts/patch-trade-sprite.mjs "Venue=C:/path/venue.png" "Videography=..." ...
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY A BROWSER DOES THE IMAGE WORK
 * ══════════════════════════════════════════════════════════════════════
 *
 * There is no sharp, jimp or PIL on this machine, and installing a
 * native image toolchain to move four pictures is not worth it. Headless
 * Edge already decodes WebP, composites on a canvas and re-encodes WebP,
 * which is the whole job. Same tool the screenshot harness uses.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE GEOMETRY IS NOT NEGOTIABLE
 * ══════════════════════════════════════════════════════════════════════
 *
 * SambramoTradePictogram.css sets `background-size: 700% 500%`, so the
 * sprite is exactly 7 columns by 5 rows and every cell is mapped onto
 * the whole card. The sheet is 1344x640, so a cell is 192x128. Writing
 * a cell at any other size shifts every trade after it.
 *
 * ══════════════════════════════════════════════════════════════════════
 * COVER, BECAUSE THE OTHER THIRTY CELLS COVER
 * ══════════════════════════════════════════════════════════════════════
 *
 * The replacements are square and the cell is 1.5:1. Fitting them whole
 * was tried first and it is wrong: the new cards came out letterboxed,
 * with white bands above and below, sitting beside thirty cards that run
 * edge to edge. The odd one out reads as a bug even when the artwork is
 * right.
 *
 * So the art fills the cell and the overflow is cropped, centred. Pass
 * `:inset=N` after the path to shrink the art by N percent when a tall
 * subject would lose its head, or a NEGATIVE N to zoom in when the art
 * carries its own white backdrop and would otherwise read as
 * letterboxed beside thirty full-bleed neighbours.
 */
import { readFileSync, writeFileSync, existsSync, mkdtempSync } from 'node:fs'
import { spawn, spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join, extname } from 'node:path'
import { createServer } from 'node:http'
import { WebSocket } from 'ws'

const ROOT = process.cwd()
const SPRITE_JS = join(ROOT, 'src/assets/sambramo/pictograms/raster-34.js')
const COLS = 7, ROWS = 5

const args = process.argv.slice(2)
if (!args.length) { console.error('usage: node scripts/patch-trade-sprite.mjs "Trade Name=/path/to.png" ...'); process.exit(1) }

const src = readFileSync(SPRITE_JS, 'utf8')
const tradesArr = JSON.parse(
  src.slice(src.indexOf('SAMBRAMO_RASTER_TRADES'))
    .match(/\[[^\]]*\]/)[0].replace(/'/g, '"').replace(/,\s*]/, ']'),
)
const spriteUri = 'data:image/webp;base64,' + src.slice(src.indexOf('base64,') + 7).split("'")[0]

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }
const patches = args.map(a => {
  let spec = a, inset = 0, shift = 0
  for (;;) {
    const m = spec.match(/:(inset|shift)=(-?\d+(?:\.\d+)?)$/)
    if (!m) break
    if (m[1] === 'inset') inset = Number(m[2]); else shift = Number(m[2])
    spec = spec.slice(0, m.index)
  }
  const i = spec.lastIndexOf('=')
  const trade = spec.slice(0, i), file = spec.slice(i + 1)
  const index = tradesArr.indexOf(trade)
  if (index === -1) { console.error(`unknown trade: ${trade}`); process.exit(1) }
  if (!existsSync(file)) { console.error(`missing file: ${file}`); process.exit(1) }
  const type = MIME[extname(file).toLowerCase()]
  if (!type) { console.error(`unsupported type: ${file}`); process.exit(1) }
  return { trade, index, inset, shift, uri: `data:${type};base64,${readFileSync(file).toString('base64')}` }
})

for (const p of patches) {
  console.log(`  cell ${String(p.index).padStart(2)}  row ${Math.floor(p.index / COLS)} col ${p.index % COLS}  <-  ${p.trade}`)
}

const PAGE = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#fff">
<script>
window.__run = async (spriteUri, patches, cols, rows) => {
  const load = u => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = u })
  const sheet = await load(spriteUri)
  const c = document.createElement('canvas')
  c.width = sheet.naturalWidth; c.height = sheet.naturalHeight
  const g = c.getContext('2d')
  g.drawImage(sheet, 0, 0)
  const cw = c.width / cols, ch = c.height / rows
  for (const p of patches) {
    const img = await load(p.uri)
    const x = (p.index % cols) * cw, y = Math.floor(p.index / cols) * ch
    g.save()
    g.beginPath(); g.rect(x, y, cw, ch); g.clip()
    /* The backdrop the generated art already uses, so the padding is
       invisible rather than a grey band. */
    g.fillStyle = '#ffffff'; g.fillRect(x, y, cw, ch)
    const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight) * (1 - (p.inset || 0) / 100)
    const w = img.naturalWidth * s, h = img.naturalHeight * s
    g.imageSmoothingQuality = 'high'
    /* shift nudges the art vertically inside its cell, as a percent
       of cell height. A zoomed tall subject lands high and loses its
       top; moving it down costs the base, which matters less.
       No backticks in here - this block lives inside a template
       literal and one would end it. */
    const dy = (p.shift || 0) / 100 * ch
    g.drawImage(img, x + (cw - w) / 2, y + (ch - h) / 2 + dy, w, h)
    g.restore()
  }
  return { uri: c.toDataURL('image/webp', 0.92), w: c.width, h: c.height, cw, ch }
}
</script></body>`

const PORT = 9488
const server = createServer((_, res) => { res.setHeader('content-type', 'text/html'); res.end(PAGE) }).listen(PORT)

const CANDIDATES = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
]
const onPath = () => {
  for (const n of ['google-chrome', 'chromium']) {
    const f = spawnSync(process.platform === 'win32' ? 'where' : 'which', [n], { encoding: 'utf8' })
    const l = String(f.stdout ?? '').split('\n')[0].trim()
    if (l && existsSync(l)) return l
  }
  return null
}
const EDGE = CANDIDATES.find(existsSync) ?? onPath()
if (!EDGE) { console.error('no browser found'); server.close(); process.exit(1) }

const sleep = ms => new Promise(r => setTimeout(r, ms))
const profile = mkdtempSync(join(tmpdir(), 'sb-sprite-'))
const CDP = 9489
const browser = spawn(EDGE, [
  '--headless=new', `--remote-debugging-port=${CDP}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--disable-gpu', '--disable-dev-shm-usage',
  ...(process.platform === 'linux' ? ['--no-sandbox'] : []),
  `http://127.0.0.1:${PORT}/`,
], { stdio: 'ignore' })

let wsUrl = null
for (let i = 0; i < 60 && !wsUrl; i++) {
  await sleep(300)
  try {
    const list = await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json()
    wsUrl = list.find(t => t.type === 'page' && t.url.includes(String(PORT)))?.webSocketDebuggerUrl ?? null
  } catch { /* port not open yet */ }
}
if (!wsUrl) { console.error('browser never opened its debugging port'); browser.kill(); server.close(); process.exit(1) }

const ws = new WebSocket(wsUrl)
let id = 0
const pending = new Map()
ws.on('message', d => {
  const m = JSON.parse(d)
  if (m.id && pending.has(m.id)) { pending.get(m.id).res(m); pending.delete(m.id) }
})
await new Promise(r => ws.on('open', r))
const send = (method, params = {}) => new Promise(res => { const n = ++id; pending.set(n, { res }); ws.send(JSON.stringify({ id: n, method, params })) })

await send('Runtime.enable')
for (let i = 0; i < 40; i++) {
  const r = await send('Runtime.evaluate', { expression: 'typeof window.__run', returnByValue: true })
  if (r.result?.result?.value === 'function') break
  await sleep(200)
}

const call = await send('Runtime.evaluate', {
  expression: `window.__run(${JSON.stringify(spriteUri)}, ${JSON.stringify(patches.map(p => ({ index: p.index, uri: p.uri, inset: p.inset, shift: p.shift })))}, ${COLS}, ${ROWS})`,
  returnByValue: true, awaitPromise: true,
})

ws.close(); browser.kill(); server.close()

const out = call.result?.result?.value
if (!out?.uri) { console.error('compositing failed:', JSON.stringify(call).slice(0, 400)); process.exit(1) }

const b64 = out.uri.slice(out.uri.indexOf('base64,') + 7)
const next = src.replace(/(SAMBRAMO_RASTER_SPRITE = ')[^']*(')/, `$1data:image/webp;base64,${b64}$2`)
if (next === src) { console.error('could not splice the sprite constant'); process.exit(1) }
writeFileSync(SPRITE_JS, next)

console.log(`\n  sheet ${out.w}x${out.h}, cell ${out.cw}x${out.ch}`)
console.log(`  sprite ${(Buffer.from(b64, 'base64').length / 1024).toFixed(0)} KB  (was ${(Buffer.from(spriteUri.slice(spriteUri.indexOf('base64,') + 7), 'base64').length / 1024).toFixed(0)} KB)`)
console.log('  raster-34.js written')
