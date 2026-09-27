#!/usr/bin/env node
/**
 * The launch screen artwork, sized and re-encoded for the apk.
 *
 *   node scripts/render-splash-art.mjs
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS IS A SCRIPT AND NOT A ONE-OFF
 * ══════════════════════════════════════════════════════════════════════
 *
 * brand/splash-source.png is a 887x1774 PNG, 1.7MB. That file is the
 * master and it is the wrong thing to ship: a launch screen is decoded
 * before the app has painted anything, on a phone that is simultaneously
 * starting a WebView, a Firebase SDK and a React tree, and 1.7MB of PNG is
 * a visible pause at exactly the moment there is nothing to look at yet.
 *
 * WebP at quality 0.82 is roughly a fifth of that for artwork of this kind
 * (photographic centre, flat ground) with no difference anyone can see at
 * arm's length on a phone.
 *
 * Two widths rather than one: 1080 covers every phone at 3x and above,
 * 720 covers the low end, which is most of this market and the hardware
 * least able to afford the decode. The markup picks with a srcset, so a
 * 360px Galaxy A never downloads the 1080.
 *
 * ── Why the browser does the encoding ────────────────────────────────
 * There is no sharp and no ffmpeg in this project, and adding an image
 * pipeline to re-encode one asset is a poor trade. Chromium already has a
 * WebP encoder behind canvas.toDataURL, and this repository already drives
 * headless Edge over CDP for the app icons. Same pattern, same dependency,
 * which is none.
 *
 * ── It also reports the ground colour ────────────────────────────────
 * The artwork is letterboxed rather than cropped (see SplashScreen.jsx),
 * so the colour behind it has to be the artwork's own edge or the seam
 * shows. Rather than anyone eyedropping it by hand, the script samples the
 * four corners and prints what it found. If that stops matching
 * splash_background in colors.xml, the launch screen has a visible join.
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, writeFileSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'brand', 'splash-source.png')
const OUT = join(ROOT, 'public', 'splash')
const WIDTHS = [720, 1080, 1440]
/* [top, height] in SOURCE pixels: the illustration, without any baked text. */
const CROP = [450, 950]
/* 0.94, not the 0.82 this started at.
 *
 * The artwork is mostly large, smooth purple gradient, which is the worst
 * case for a lossy codec: flat areas with a slow ramp are where WebP spends
 * the fewest bits and where banding and blocking show first. At 0.82 the
 * ground behind the wheel visibly stepped. The extra weight buys a launch
 * screen with no visible noise in the one area that covers most of it. */
const QUALITY = 0.94

if (!existsSync(SRC)) {
  console.error(`\n  Missing ${SRC}\n`)
  process.exit(1)
}

const CANDIDATES = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
]
const EDGE = CANDIDATES.find(existsSync)
if (!EDGE) { console.error('\n  No browser found.\n'); process.exit(1) }

const CDP = 9362
const profile = mkdtempSync(join(tmpdir(), 'sb-splash-'))
const browser = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${CDP}`,
  `--user-data-dir=${profile}`, '--no-first-run', '--disable-gpu',
  '--disable-dev-shm-usage', 'about:blank'], { stdio: 'ignore' })

const sleep = ms => new Promise(r => setTimeout(r, ms))

/* Poll rather than sleep a fixed interval. This box is small and Edge's
   cold start varies by seconds; a hard 2500ms wait failed here more often
   than it succeeded. */
let list = null
for (let i = 0; i < 40; i++) {
  await sleep(500)
  try {
    list = await (await fetch(`http://127.0.0.1:${CDP}/json/list`)).json()
    if (list.some(t => t.type === 'page')) break
  } catch { /* not listening yet */ }
}
if (!list) {
  console.error('  The browser never opened a debugging port.')
  browser.kill(); process.exit(1)
}
const page = list.find(t => t.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
let id = 0
const pending = new Map()
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) { pending.get(m.id).res(m.result); pending.delete(m.id) }
})
await new Promise(r => ws.addEventListener('open', r))
const send = (m, p = {}) => new Promise(res => {
  const n = ++id; pending.set(n, { res }); ws.send(JSON.stringify({ id: n, method: m, params: p }))
})
const evalJs = async e =>
  (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }))?.result?.value

const dataUrl = 'data:image/png;base64,' + readFileSync(SRC).toString('base64')

const result = await evalJs(`(async () => {
  const img = new Image()
  img.src = ${JSON.stringify(dataUrl)}
  await img.decode()

  const out = {}

  // Corner sample, from a 1:1 draw. The ground behind the letterboxed
  // artwork has to be this colour or the join is visible.
  const s = document.createElement('canvas')
  s.width = img.naturalWidth; s.height = img.naturalHeight
  const sx = s.getContext('2d')
  sx.drawImage(img, 0, 0)
  const px = (x, y) => {
    const d = sx.getImageData(x, y, 1, 1).data
    return '#' + [d[0], d[1], d[2]].map(v => v.toString(16).padStart(2, '0')).join('')
  }
  out.corners = {
    tl: px(2, 2),
    tr: px(img.naturalWidth - 3, 2),
    bl: px(2, img.naturalHeight - 3),
    br: px(img.naturalWidth - 3, img.naturalHeight - 3),
  }
  out.size = img.naturalWidth + 'x' + img.naturalHeight

  // ── The illustration on its own ────────────────────────────────
  // The source has the wordmark, the category line and the two promise
  // lines baked into it. Baked text cannot animate, cannot resize per
  // handset and cannot be corrected without re-rendering the artwork,
  // so the launch screen sets all four live and uses only the picture.
  //
  // The crop rows are measured, not guessed: a row scan of the source
  // found the wordmark at y246-326, the category line at y362-384, the
  // illustration at y494-1376 and the promise lines at y1482-1562.
  // 450 and 1400 sit inside the quiet gaps either side of the art, so
  // the crop takes the glow with it and no descender of any letter.
  out.files = {}
  {
    const [cy, ch] = ${JSON.stringify(CROP)}
    for (const w of ${JSON.stringify(WIDTHS)}) {
      const scale = w / img.naturalWidth
      const h = Math.round(ch * scale)
      const c = document.createElement('canvas')
      c.width = w; c.height = h
      const cx = c.getContext('2d')
      cx.imageSmoothingEnabled = true
      cx.imageSmoothingQuality = 'high'
      cx.drawImage(img, 0, cy, img.naturalWidth, ch, 0, 0, w, h)
      out.files['art-' + w] = { h, data: c.toDataURL('image/webp', ${QUALITY}) }
    }
  }
  /* The uncropped poster is deliberately NOT emitted any more.
     Nothing renders it: SplashScreen.jsx sets all four lines of type
     itself and uses the crop. Shipping it anyway put close to a megabyte
     of never-requested WebP into dist, all of which vite-plugin-pwa
     precaches on first load. */
  return out
})()`)

if (!result) { console.error('\n  The browser returned nothing.\n'); browser.kill(); process.exit(1) }

console.log(`\n  Launch artwork  (source ${result.size})\n`)

for (const [key, { h, data }] of Object.entries(result.files)) {
  const w = String(key).replace('art-', '')
  const name = String(key).startsWith('art-') ? `splash-art-${w}` : `splash-${w}`
  if (!data.startsWith('data:image/webp')) {
    console.error(`    FAIL ${name} came back as ${data.slice(5, 20)} — this build of the`)
    console.error('         browser has no WebP encoder. Nothing written.')
    browser.kill(); process.exit(1)
  }
  const buf = Buffer.from(data.split(',')[1], 'base64')
  const file = join(OUT, `${name}.webp`)
  writeFileSync(file, buf)
  console.log(`    ok   public/splash/${name}.webp  ${w}x${h}  ${(buf.length / 1024).toFixed(0)}KB`)
}

const src = readFileSync(SRC)
console.log(`\n    source PNG was ${(src.length / 1024).toFixed(0)}KB\n`)

/* The ground colour, so a mismatch is caught here rather than on a phone. */
const GROUND = '#2a085c'
const c = result.corners
console.log('    corner sample:', Object.entries(c).map(([k, v]) => `${k} ${v}`).join('  '))
const off = Object.entries(c).filter(([, v]) => v.toLowerCase() !== GROUND)
if (off.length) {
  console.log(`\n    note: corners are not ${GROUND}. The artwork is letterboxed on`)
  console.log('          a flat ground, so whichever colour the long edges are is')
  console.log('          the one splash_background should be. Adjust if the seam shows.')
}
console.log('')

browser.kill()
