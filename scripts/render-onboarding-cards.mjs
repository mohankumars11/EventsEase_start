#!/usr/bin/env node
/**
 * The partner onboarding carousel art, sized and re-encoded for the apk.
 *
 *   node scripts/render-onboarding-cards.mjs
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THESE CANNOT SHIP AS SUPPLIED
 * ══════════════════════════════════════════════════════════════════════
 *
 * The three masters in brand/partner-card-*.png are 941x1672 PNGs of just
 * over 2MB each. Six megabytes on the screen a partner sees immediately
 * after the splash, on a phone that is still starting a WebView, is a
 * carousel that arrives one card at a time while somebody watches.
 *
 * WebP at 0.92 brings the set to a fraction of that with no difference
 * anyone can see at arm's length. The quality is high for the same reason
 * the splash art's is: these are photographic, with large soft gradients
 * behind the type, and a lossy codec bands those first.
 *
 * ── Why the browser does the encoding ────────────────────────────────
 * There is no sharp and no ffmpeg here, and adding an image pipeline to
 * re-encode three files is a poor trade. Chromium has a WebP encoder
 * behind canvas.toDataURL, and this repository already drives headless
 * Edge over CDP for the icons and the splash. Same pattern, no new
 * dependency. See scripts/render-splash-art.mjs, which this follows.
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, writeFileSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public', 'onboarding')
const WIDTHS = [720, 853]
const QUALITY = 0.92

/* Named for what each one SAYS, not for the order they arrived in.
 *
 * The first set had card 2 as the earnings poster and card 3 as a refer
 * and earn one. The final set replaced both: card 2 is the service
 * categories and card 3 is bookings and earnings. Keeping the old names
 * would have left every reference in the app pointing at a file whose
 * content no longer matched its name. */
const CARDS = [
  { src: 'partner-card-1-grow.png',     out: 'card-1-grow' },
  { src: 'partner-card-2-services.png', out: 'card-2-services' },
  { src: 'partner-card-3-earnings.png', out: 'card-3-earnings' },
]

for (const c of CARDS) {
  if (!existsSync(join(ROOT, 'brand', c.src))) {
    console.error(`\n  Missing brand/${c.src}\n`); process.exit(1)
  }
}

const CANDIDATES = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
]
const EDGE = CANDIDATES.find(existsSync)
if (!EDGE) { console.error('\n  No browser found.\n'); process.exit(1) }

const CDP = 9368
const profile = mkdtempSync(join(tmpdir(), 'sb-cards-'))
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
if (!list) { console.error('  The browser never opened a debugging port.'); browser.kill(); process.exit(1) }

const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl)
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

console.log('\n  Partner onboarding cards\n')
let total = 0

for (const card of CARDS) {
  const buf = readFileSync(join(ROOT, 'brand', card.src))
  const dataUrl = 'data:image/png;base64,' + buf.toString('base64')
  const files = await evalJs(`(async () => {
    const img = new Image(); img.src = ${JSON.stringify(dataUrl)}; await img.decode()
    const out = {}
    for (const w of ${JSON.stringify(WIDTHS)}) {
      const h = Math.round(img.naturalHeight * (w / img.naturalWidth))
      const c = document.createElement('canvas')
      c.width = w; c.height = h
      const cx = c.getContext('2d')
      cx.imageSmoothingEnabled = true
      cx.imageSmoothingQuality = 'high'
      cx.drawImage(img, 0, 0, w, h)
      out[w] = { h, data: c.toDataURL('image/webp', ${QUALITY}) }
    }
    return out
  })()`)

  for (const [w, { h, data }] of Object.entries(files)) {
    if (!data.startsWith('data:image/webp')) {
      console.error(`    FAIL ${card.out}@${w} came back as ${data.slice(5, 20)}`)
      browser.kill(); process.exit(1)
    }
    const bin = Buffer.from(data.split(',')[1], 'base64')
    writeFileSync(join(OUT, `${card.out}-${w}.webp`), bin)
    total += bin.length
    console.log(`    ok   public/onboarding/${card.out}-${w}.webp  ${w}x${h}  ${(bin.length / 1024).toFixed(0)}KB`)
  }
  console.log(`         source ${(buf.length / 1024).toFixed(0)}KB`)
}

console.log(`\n  ${(total / 1024).toFixed(0)}KB written, from ${(CARDS.length * 2.05).toFixed(1)}MB of PNG.\n`)
browser.kill()
