#!/usr/bin/env node
/**
 * The partner app's launcher icon, from the mascot artwork.
 *
 *   node scripts/render-partner-icon.mjs
 *
 * Source: brand/partner-icon-source.png (1254 x 1254, supplied). Writes,
 * into android/app/src/partner/res only:
 *
 *   mipmap-<d>/ic_launcher_foreground.png   the adaptive layer, 108dp, opaque
 *   mipmap-<d>/ic_launcher.png              legacy square (Android 7 and older)
 *   mipmap-<d>/ic_launcher_round.png        legacy round
 *   values/ic_launcher_background.xml       the layer's own edge colour
 *
 * render-app-icons.mjs no longer writes the partner launcher files, so
 * re-running it cannot put the old wordmark tile back.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THE ARTWORK IS EXTENDED, NOT FRAMED
 * ══════════════════════════════════════════════════════════════════════
 *
 * Android shows the middle 72dp of a 108dp layer, cut to whatever mask
 * the launcher uses (circle, squircle, rounded square), and only the
 * central 66dp circle is guaranteed. So the character is placed at 68dp:
 * his hair top and thumbs land inside that circle on every mask.
 *
 * That leaves 20dp a side of layer with no artwork in it. A flat colour
 * there shows as a visible ring, because the artwork's background is a
 * gradient (brighter behind the head, deeper at the foot) and no single
 * colour matches all four edges. So the artwork's own edges are
 * stretched outward and blurred, and the sharp art sits on top with a
 * 1.2% feather. The seam is the artwork meeting a copy of its own edge.
 *
 * ── Clean-up applied on the way out (the master is not edited) ────────
 *   - two white sparkle strokes beside his shoulders, painted out
 *   - the white rounded corners and the 8-14px white margin at the foot
 *   - the side extension comes from the violet ABOVE his hands: below
 *     row 540 the edge columns are his forearms, and stretched outward
 *     they glowed orange down both sides on squircle launchers
 *
 * Rendered in headless Edge, as every other brand asset here is: no
 * sharp or ImageMagick in this repo, and Chromium's canvas is enough.
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'brand', 'partner-icon-source.png')
const RES = join(ROOT, 'android', 'app', 'src', 'partner', 'res')
const MASTER = 1080                     // layer px the others are reduced from

const DENSITIES = [
  { dir: 'mipmap-mdpi',    legacy: 48,  fg: 108 },
  { dir: 'mipmap-hdpi',    legacy: 72,  fg: 162 },
  { dir: 'mipmap-xhdpi',   legacy: 96,  fg: 216 },
  { dir: 'mipmap-xxhdpi',  legacy: 144, fg: 324 },
  { dir: 'mipmap-xxxhdpi', legacy: 192, fg: 432 },
]

if (!existsSync(SRC)) { console.error('\n  Missing brand/partner-icon-source.png\n'); process.exit(1) }

/* ── Runs inside the page ─────────────────────────────────────────────
   Kept as one string so exactly this code is what renders; the preview
   scene that approved the look used the same functions. */
const PAGE = String.raw`
const ART_DP = 68, LAYER_DP = 108
const STROKES = [
  { x0: 128, x1: 294, y0: 408, y1: 568 },
  { x0: 960, x1: 1126, y0: 408, y1: 568 },
]
function cleanSource(img) {
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight
  const cx = c.getContext('2d'); cx.drawImage(img, 0, 0)
  const d = cx.getImageData(0, 0, c.width, c.height), W = c.width, H = c.height
  const at = (x, y) => (y * W + x) * 4
  for (const b of STROKES) for (let y = b.y0; y <= b.y1; y++) {
    const L = at(b.x0 - 4, y), R = at(b.x1 + 4, y)
    for (let x = b.x0; x <= b.x1; x++) {
      const t = (x - b.x0) / (b.x1 - b.x0), k = at(x, y)
      for (let q = 0; q < 3; q++) d.data[k + q] = d.data[L + q] * (1 - t) + d.data[R + q] * t
    }
  }
  const ZONE = 280
  const pale = k => d.data[k] > 225 && d.data[k + 1] > 225 && d.data[k + 2] > 225
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!((x < ZONE || x >= W - ZONE) && (y < ZONE || y >= H - ZONE))) continue
    const k = at(x, y); if (!pale(k)) continue
    let sx = x, sy = y
    const dx = x < W / 2 ? 1 : -1, dy = y < H / 2 ? 1 : -1
    while (pale(at(sx, sy)) && sx > 0 && sx < W - 1 && sy > 0 && sy < H - 1) { sx += dx; sy += dy }
    const s = at(Math.min(W - 1, Math.max(0, sx + dx * 3)), Math.min(H - 1, Math.max(0, sy + dy * 3)))
    for (let q = 0; q < 3; q++) d.data[k + q] = d.data[s + q]
  }
  cx.putImageData(d, 0, 0)
  const soft = document.createElement('canvas'); soft.width = W; soft.height = H
  const sx2 = soft.getContext('2d'); sx2.filter = 'blur(10px)'; sx2.drawImage(c, 0, 0)
  for (const b of STROKES) cx.drawImage(soft, b.x0 - 6, b.y0 - 6, b.x1 - b.x0 + 12, b.y1 - b.y0 + 12, b.x0 - 6, b.y0 - 6, b.x1 - b.x0 + 12, b.y1 - b.y0 + 12)
  return c
}
function buildLayer(src, px) {
  const T = 2, Lf = 2, R = 2, B = 18          // clean edge insets, measured
  const W = src.width - Lf - R, H = src.height - T - B
  const out = document.createElement('canvas'); out.width = out.height = px
  const g = out.getContext('2d')
  const a = Math.round(px * ART_DP / LAYER_DP), o = Math.round((px - a) / 2), e = px - o - a
  const back = document.createElement('canvas'); back.width = back.height = px
  const b = back.getContext('2d')
  const SIDE = 540
  const midX = Lf + Math.round(W * 0.32), midW = Math.round(W * 0.36)
  b.drawImage(src, Lf, T, W, 1, o, 0, a, o)
  b.drawImage(src, midX, T + H - 1, midW, 1, 0, o + a, px, e)
  b.drawImage(src, Lf, T, 1, SIDE, 0, o, o, a)
  b.drawImage(src, Lf + W - 1, T, 1, SIDE, o + a, o, e, a)
  b.drawImage(src, Lf, T, 1, 1, 0, 0, o, o)
  b.drawImage(src, Lf + W - 1, T, 1, 1, o + a, 0, e, o)
  b.drawImage(src, Lf, T + SIDE - 1, 1, 1, 0, o + a, o, e)
  b.drawImage(src, Lf + W - 1, T + SIDE - 1, 1, 1, o + a, o + a, e, e)
  /* The centre of the backdrop is hidden under the sharp art except for
     the blur's reach at its border. Drawing the ART here (the first
     version) let that blur carry his forearm skin outward as an orange
     glow at the lower sides, so it is filled from the same violet edge
     columns instead. */
  b.drawImage(src, Lf, T, 1, SIDE, o, o, a / 2, a)
  b.drawImage(src, Lf + W - 1, T, 1, SIDE, o + a / 2, o, a / 2, a)
  b.drawImage(src, midX, T + H - 1, midW, 1, o, o + a * 0.85, a, a * 0.15)
  g.filter = 'blur(' + Math.round(px * 0.03) + 'px)'
  g.drawImage(back, -px * 0.05, -px * 0.05, px * 1.1, px * 1.1)
  g.filter = 'none'
  const f = Math.max(1, Math.round(a * 0.012))
  const art = document.createElement('canvas'); art.width = art.height = a
  const ax = art.getContext('2d')
  ax.drawImage(src, Lf, T, W, H, 0, 0, a, a)
  const mask = document.createElement('canvas'); mask.width = mask.height = a
  const mx = mask.getContext('2d')
  mx.filter = 'blur(' + f + 'px)'
  mx.fillStyle = '#fff'; mx.fillRect(f * 1.5, f * 1.5, a - f * 3, a - f * 3)
  ax.globalCompositeOperation = 'destination-in'
  ax.drawImage(mask, 0, 0)
  g.drawImage(art, o, o)
  return out
}
/* Halving steps: one jump from 1080 to 108 aliases the hair and the
   lettering; repeated halves with high-quality smoothing do not. */
function reduce(c, size) {
  let cur = c
  while (cur.width / 2 >= size) {
    const n = document.createElement('canvas'); n.width = n.height = Math.round(cur.width / 2)
    const nx = n.getContext('2d'); nx.imageSmoothingQuality = 'high'; nx.drawImage(cur, 0, 0, n.width, n.height)
    cur = n
  }
  const o = document.createElement('canvas'); o.width = o.height = size
  const ox = o.getContext('2d'); ox.imageSmoothingQuality = 'high'; ox.drawImage(cur, 0, 0, size, size)
  return o
}
/* Legacy icons show the visible 72dp of the layer, the part an adaptive
   launcher would show, cut to a rounded square or a circle with
   transparent corners, which is what pre-adaptive launchers expect. */
function legacy(layer, size, round) {
  const crop = layer.width * 72 / 108, off = (layer.width - crop) / 2
  const sq = document.createElement('canvas'); sq.width = sq.height = Math.round(crop)
  sq.getContext('2d').drawImage(layer, off, off, crop, crop, 0, 0, sq.width, sq.height)
  const small = reduce(sq, size)
  const o = document.createElement('canvas'); o.width = o.height = size
  const ox = o.getContext('2d')
  ox.beginPath()
  if (round) ox.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
  else ox.roundRect(0, 0, size, size, size * 0.18)
  ox.clip(); ox.drawImage(small, 0, 0)
  return o
}
/* The average of the layer's outermost ring of pixels: the colour any
   launcher animation that overshoots the layer would reveal. */
function edgeColour(c) {
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, W = c.width
  let r = 0, g = 0, b = 0, n = 0
  for (let i = 0; i < W; i++) for (const [x, y] of [[i, 0], [i, W - 1], [0, i], [W - 1, i]]) {
    const k = (y * W + x) * 4; r += d[k]; g += d[k + 1]; b += d[k + 2]; n++
  }
  const h = v => Math.round(v / n).toString(16).padStart(2, '0')
  return '#' + (h(r) + h(g) + h(b)).toUpperCase()
}
`

const CANDIDATES = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
]
const EDGE = CANDIDATES.find(existsSync)
if (!EDGE) { console.error('\n  No browser found.\n'); process.exit(1) }

const CDP = 9371
const profile = mkdtempSync(join(tmpdir(), 'sb-picon-'))
const browser = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${CDP}`,
  `--user-data-dir=${profile}`, '--no-first-run', '--disable-gpu',
  '--disable-dev-shm-usage', 'about:blank'], { stdio: 'ignore' })

const sleep = ms => new Promise(r => setTimeout(r, ms))
let list = null
for (let i = 0; i < 40; i++) {
  await sleep(500)
  try {
    list = await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json()
    if (list.some(t => t.type === 'page')) break
  } catch { /* not listening yet */ }
}
if (!list?.some(t => t.type === 'page')) { console.error('  The browser never opened a debugging port.'); browser.kill(); process.exit(1) }

const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl)
let id = 0
const pending = new Map()
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
})
await new Promise(r => ws.addEventListener('open', r))
const send = (method, params = {}) => new Promise(res => {
  const n = ++id; pending.set(n, res); ws.send(JSON.stringify({ id: n, method, params }))
})

const dataUrl = 'data:image/png;base64,' + readFileSync(SRC).toString('base64')
const reply = await send('Runtime.evaluate', {
  returnByValue: true, awaitPromise: true,
  expression: `(async () => { ${PAGE}
    const img = new Image(); img.src = ${JSON.stringify(dataUrl)}; await img.decode()
    const layer = buildLayer(cleanSource(img), ${MASTER})
    const png = c => c.toDataURL('image/png').split(',')[1]
    const out = { bg: edgeColour(layer), files: {} }
    for (const d of ${JSON.stringify(DENSITIES)}) {
      out.files[d.dir + '/ic_launcher_foreground.png'] = png(reduce(layer, d.fg))
      out.files[d.dir + '/ic_launcher.png'] = png(legacy(layer, d.legacy, false))
      out.files[d.dir + '/ic_launcher_round.png'] = png(legacy(layer, d.legacy, true))
    }
    return out
  })()`,
})
browser.kill()
try { rmSync(profile, { recursive: true, force: true }) } catch { /* windows holds it briefly */ }

const value = reply.result?.result?.value
if (!value) {
  console.error('\n  Render failed:', JSON.stringify(reply.result?.exceptionDetails ?? reply.error ?? reply).slice(0, 600))
  process.exit(1)
}

console.log('\n  Partner launcher icon\n')
for (const [rel, b64] of Object.entries(value.files)) {
  const bin = Buffer.from(b64, 'base64')
  writeFileSync(join(RES, rel), bin)
  console.log(`    ok   ${rel.padEnd(40)} ${(bin.length / 1024).toFixed(0)}KB`)
}

/* The background layer. The foreground is opaque edge to edge, so this
   is only ever seen if a launcher's open animation overshoots the layer;
   matched to the layer's own edge so even then there is no seam. */
writeFileSync(join(RES, 'values', 'ic_launcher_background.xml'), `<?xml version="1.0" encoding="utf-8"?>
<!--
  The adaptive icon's background layer, written by
  scripts/render-partner-icon.mjs. Do not edit by hand.

  The foreground (the mascot artwork, extended to the layer's edge) is
  opaque, so this colour is only ever seen if a launcher animation
  overshoots the foreground. It is the average of the foreground's own
  outermost pixels, so even then there is no visible ring.
-->
<resources>
    <color name="ic_launcher_background">${value.bg}</color>
</resources>
`)
console.log(`    ok   values/ic_launcher_background.xml        ${value.bg}\n`)
