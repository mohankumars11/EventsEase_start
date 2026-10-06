#!/usr/bin/env node
/**
 * Turn the supplied sticker artwork into assets the app can ship.
 *
 *   node scripts/prepare-master-stickers.mjs
 *
 * The originals in masters_photo/ are 1520×1013 JPEGs, ~200 KB each,
 * with a wide band of dead white around the artwork. Shipped as-is that
 * is 600 KB of bundle for three images that would each render with a
 * third of their box empty.
 *
 * So each one is:
 *
 *   trimmed   to the bounding box of the actual artwork, because the
 *             white margin is not part of the sticker — it is what the
 *             generator left around it, and it differs per image, so
 *             three stickers in a row would sit at three different
 *             optical sizes
 *   scaled    to 900px wide, which is 2× the widest they are ever drawn
 *             on a 412px phone
 *   re-encoded to WebP, which every browser the app targets reads and
 *             which is roughly a quarter of the JPEG here
 *
 * Through a canvas for the same reason scripts/shrink-report.mjs does:
 * there is no sharp and no ImageMagick on this machine, and adding a
 * native image toolchain to a 3.9 GB box to crop three pictures is the
 * wrong trade.
 *
 * The originals are never modified. Re-runnable.
 */
import { spawn, spawnSync } from 'node:child_process'
import { createServer } from 'node:http'
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, rmSync, mkdtempSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, extname } from 'node:path'
import { ROOT } from './lib/loadSrc.mjs'

const SRC = join(ROOT, 'masters_photo')
const OUT = join(ROOT, 'src', 'assets', 'masters')

/* The filenames carry the state each sticker is for, which is the whole
   reason they can be wired to line status without guesswork. Mapped
   explicitly rather than by fuzzy match on the name: a rename upstream
   should fail loudly here, not silently file the green "confirmed"
   sticker under "still searching". */
const WANTED = [
  { file: 'reaching_masters_photo.jpeg',
    out:  'reaching.webp',
    for:  'a line still being dispatched' },
  { file: 'payment_pending_from_customer_side_formaster_date_blocking.jpeg',
    out:  'payment-pending.webp',
    for:  'a line a master has accepted and nobody has paid for' },
  { file: 'masters_booking completed_date_blocked_payment_completed.jpeg',
    out:  'confirmed.webp',
    for:  'a line that is paid and the date is held' },
]

const missing = WANTED.filter(w => !existsSync(join(SRC, w.file)))
if (missing.length) {
  console.error('\n  Not in masters_photo/:')
  for (const m of missing) console.error('    ' + m.file)
  console.error('\n  Found instead: ' + readdirSync(SRC).join(', ') + '\n')
  process.exit(1)
}
mkdirSync(OUT, { recursive: true })

const PORT = 8983
const TYPES = { '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.png': 'image/png' }
const server = createServer((req, res) => {
  const name = decodeURIComponent(req.url.split('?')[0]).replace(/^\//, '')
  const p = join(SRC, name)
  if (!name || !existsSync(p)) { res.statusCode = 404; return res.end('no') }
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
const profile = mkdtempSync(join(tmpdir(), 'sb-sticker-'))
const CDP = 9435

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

const WIDTH = 900
const QUALITY = 0.82
/* How far from pure white still counts as background.
   Generous, because JPEG ringing puts a halo of 250-254 around the
   sticker's own white outline — a strict test would keep that halo and
   trim nothing. */
const NEAR_WHITE = 246

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
  await send('Page.navigate', { url: `http://localhost:${PORT}/${WANTED[0].file}` })
  await sleep(600)

  console.log(`\n  ${WANTED.length} stickers -> src/assets/masters/\n`)

  for (const w of WANTED) {
    const r = await evalJs(`(async () => {
      const img = new Image()
      img.src = ${JSON.stringify(`http://localhost:${PORT}/${encodeURIComponent(w.file)}`)}
      await img.decode()

      const W = img.naturalWidth, H = img.naturalHeight
      const probe = document.createElement('canvas')
      probe.width = W; probe.height = H
      const pg = probe.getContext('2d', { willReadFrequently: true })
      pg.drawImage(img, 0, 0)
      const px = pg.getImageData(0, 0, W, H).data

      // The bounding box of anything that is not background.
      let x0 = W, y0 = H, x1 = -1, y1 = -1
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4
          if (px[i] < ${NEAR_WHITE} || px[i + 1] < ${NEAR_WHITE} || px[i + 2] < ${NEAR_WHITE}) {
            if (x < x0) x0 = x
            if (x > x1) x1 = x
            if (y < y0) y0 = y
            if (y > y1) y1 = y
          }
        }
      }
      if (x1 < 0) return { error: 'the whole image reads as background' }

      // A hair of margin so the die-cut outline is not clipped.
      const pad = Math.round(Math.max(W, H) * 0.012)
      x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad)
      x1 = Math.min(W - 1, x1 + pad); y1 = Math.min(H - 1, y1 + pad)

      const cw = x1 - x0 + 1, ch = y1 - y0 + 1
      const scale = Math.min(1, ${WIDTH} / cw)
      const ow = Math.round(cw * scale), oh = Math.round(ch * scale)

      const c = document.createElement('canvas')
      c.width = ow; c.height = oh
      const g = c.getContext('2d')
      // White under it: WebP here carries no alpha, the artwork's own
      // ground is white, and the app's card is white. Painting it
      // explicitly means a re-encode can never leave a black edge.
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, ow, oh)
      g.imageSmoothingQuality = 'high'
      g.drawImage(img, x0, y0, cw, ch, 0, 0, ow, oh)

      return {
        data: c.toDataURL('image/webp', ${QUALITY}),
        was: W + 'x' + H, now: ow + 'x' + oh,
        trimmed: Math.round((1 - (cw * ch) / (W * H)) * 100),
      }
    })()`)

    const v = r.result?.value
    if (!v || v.error || !String(v.data).startsWith('data:image/webp')) {
      console.error(`  x ${w.out} — ${v?.error ?? 'the browser would not encode WebP'}`)
      process.exitCode = 1
      continue
    }
    const buf = Buffer.from(v.data.split(',')[1], 'base64')
    writeFileSync(join(OUT, w.out), buf)

    const wasKb = Math.round(statSync(join(SRC, w.file)).size / 1024)
    const nowKb = Math.round(buf.length / 1024)
    console.log(`  ${w.out.padEnd(22)} ${v.was} -> ${String(v.now).padEnd(9)} `
      + `${String(wasKb).padStart(4)} KB -> ${String(nowKb).padStart(3)} KB   ${v.trimmed}% margin trimmed`)
  }
  console.log('')
} finally {
  try { ws?.close() } catch { /* gone */ }
  browser.kill(); server.close()
  try { rmSync(profile, { recursive: true, force: true }) } catch { /* held */ }
}
