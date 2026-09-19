#!/usr/bin/env node
/**
 * Render the Open Graph images through headless Edge.
 *
 * SVG is not an option: Facebook, LinkedIn, WhatsApp and Slack all reject
 * image/svg+xml for og:image. Rasterising needs either a native image library
 * (sharp and resvg-js both add 25–40 MB of platform binaries to a project
 * whose whole point is having no dependencies) or a browser. Edge is already
 * installed and already drives the screenshot script, so it draws these too.
 *
 * Two images, not forty-four. A per-page OG card is worth having when pages
 * are shared individually and look different from each other; these would be
 * the same gradient with a different line of text, at a cost of ~2.5 MB
 * committed and a regeneration step every time a title changes. One default
 * card and one square logo is the honest trade until somebody is actually
 * sharing occasion pages.
 *
 *   node scripts/make-og.mjs
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SITE = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(SITE, 'public', 'og')
const brand = JSON.parse(readFileSync(join(SITE, 'content', 'brand.json'), 'utf8'))

const fontData = f => readFileSync(join(SITE, 'public', 'fonts', f)).toString('base64')
const ARCHIVO = fontData('ArchivoBlack-Regular.woff2')
const PLAYFAIR = fontData('playfair-800.woff2')
const MANROPE = fontData('manrope-600.woff2')

/* Fonts inlined as data URIs rather than linked. The template is loaded from
   a file:// URL with no server behind it, so a /fonts/ path would 404 and the
   card would silently render in Times New Roman — which is exactly the kind
   of failure nobody notices until it is the thumbnail on somebody's WhatsApp. */
const css = `
@font-face { font-family:'Mark'; src:url(data:font/woff2;base64,${ARCHIVO}) format('woff2'); }
@font-face { font-family:'Display'; src:url(data:font/woff2;base64,${PLAYFAIR}) format('woff2'); font-weight:800; }
@font-face { font-family:'Body'; src:url(data:font/woff2;base64,${MANROPE}) format('woff2'); font-weight:600; }
* { margin:0; padding:0; box-sizing:border-box; }
body { width:1200px; height:630px; overflow:hidden; background:#2A085C; color:#fff;
       font-family:'Body',sans-serif; position:relative; }
.aurora { position:absolute; inset:0 0 auto 0; height:10px;
          background:linear-gradient(115deg,#7C3AED 0%,#A56EFF 34%,#E879F9 64%,#FBBF24 100%); }
.glow { position:absolute; width:760px; height:760px; right:-230px; bottom:-330px; border-radius:50%;
        background:radial-gradient(circle,rgba(168,110,255,.42) 0%,rgba(42,8,92,0) 68%); }
.pad { position:absolute; inset:0; padding:74px 80px; display:flex; flex-direction:column; justify-content:space-between; }
.mark { font-family:'Mark',sans-serif; font-size:40px; letter-spacing:.02em; text-transform:uppercase; }
.cat { font-size:15px; font-weight:600; letter-spacing:.2em; text-transform:uppercase;
       color:rgba(255,255,255,.55); margin-top:10px; }
h1 { font-family:'Display',serif; font-weight:800; font-size:70px; line-height:1.04;
     letter-spacing:-.02em; max-width:940px; }
.sub { font-size:23px; color:rgba(255,255,255,.76); margin-top:20px; max-width:800px; line-height:1.45; }
.foot { display:flex; align-items:center; gap:16px; font-size:19px; color:rgba(255,255,255,.72); }
.dot { width:11px; height:11px; border-radius:50%; background:#FBBF24; }
`

const cardHtml = `<!doctype html><meta charset="utf-8"><style>${css}</style>
<div class="aurora"></div><div class="glow"></div>
<div class="pad">
  <div><div class="mark">Sambramo</div><div class="cat">${brand.categoryLine}</div></div>
  <div>
    <h1>Celebrations, arranged.<br>Nothing left to chance.</h1>
    <p class="sub">A human-assisted concierge celebration service in Bengaluru. One coordinator, every vendor, one clear price.</p>
  </div>
  <div class="foot"><span class="dot"></span><span>sambramo.com</span><span>·</span><span>Bengaluru, Karnataka</span></div>
</div>`

const logoHtml = `<!doctype html><meta charset="utf-8"><style>${css}
body { width:512px; height:512px; display:grid; place-items:center; }
.s { font-family:'Mark',sans-serif; font-size:240px; line-height:1; }
.pulli { position:absolute; top:96px; right:104px; width:44px; height:44px; border-radius:50%; background:#FBBF24; }
</style>
<div class="glow"></div><div class="pulli"></div><div class="s">S</div>`

const EDGE = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find(existsSync)
if (!EDGE) { console.error('Edge not found'); process.exit(1) }

const sleep = ms => new Promise(r => setTimeout(r, ms))
let id = 0
const rpc = (ws, method, params = {}) => new Promise((res, rej) => {
  const mine = ++id
  const on = ev => {
    const m = JSON.parse(ev.data)
    if (m.id !== mine) return
    ws.removeEventListener('message', on)
    m.error ? rej(new Error(`${method}: ${m.error.message}`)) : res(m.result)
  }
  ws.addEventListener('message', on)
  ws.send(JSON.stringify({ id: mine, method, params }))
})

/* One browser launch per image, sequential. The app's own shoot.mjs records
   why: this is a 3.9 GB box and a browser kept alive across several pages
   takes whatever else is running down with it. */
async function shoot(html, w, h, out, fonts = ['400 40px Mark']) {
  const dir = mkdtempSync(join(tmpdir(), 'og-'))
  const page = join(dir, 'card.html')
  writeFileSync(page, html, 'utf8')
  const port = 9222 + Math.floor(Math.random() * 400)
  // A user-data-dir that does not already exist makes Edge exit before it
  // opens the debugging port, with nothing on stderr. mkdtemp creates it.
  const profile = mkdtempSync(join(tmpdir(), 'og-profile-'))
  const edge = spawn(EDGE, [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    `--window-size=${w},${h}`, '--hide-scrollbars',
    '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--disable-dev-shm-usage',
    'about:blank',
  ], { stdio: 'ignore' })
  try {
    let wsUrl = null
    for (let i = 0; i < 60 && !wsUrl; i++) {
      try {
        const r = await fetch(`http://127.0.0.1:${port}/json/list`)
        wsUrl = (await r.json()).find(t => t.type === 'page')?.webSocketDebuggerUrl ?? null
      } catch { /* not up */ }
      if (!wsUrl) await sleep(250)
    }
    if (!wsUrl) throw new Error('Edge never opened its debugging port')

    const ws = new WebSocket(wsUrl)
    await new Promise(r => ws.addEventListener('open', r, { once: true }))
    await rpc(ws, 'Page.enable')
    await rpc(ws, 'Page.navigate', { url: 'file:///' + page.replace(/\\/g, '/') })
    await sleep(1400)

    // The fonts are data URIs, so a failure here means the base64 is wrong,
    // not that the network was slow. Worth knowing before the card ships.
    const ok = await rpc(ws, 'Runtime.evaluate', {
      expression: `document.fonts.ready.then(() => [${fonts.map(f => `document.fonts.check(${JSON.stringify(f)})`).join(',')}].every(Boolean))`,
      awaitPromise: true, returnByValue: true,
    }).then(r => r.result?.value)
    if (!ok) console.warn(`  ! ${out}: embedded fonts did not load — the card is in a fallback face`)

    const shotResult = await rpc(ws, 'Page.captureScreenshot', { format: 'png' })
    mkdirSync(dirname(out), { recursive: true })
    writeFileSync(out, Buffer.from(shotResult.data, 'base64'))
    console.log(`  ${out.split(/[\\/]/).pop()}  ${w}x${h}  ${(Buffer.from(shotResult.data, 'base64').length / 1024).toFixed(0)} KB`)
  } finally {
    edge.kill()
    for (const d of [dir, profile]) {
      try { rmSync(d, { recursive: true, force: true }) } catch { /* Windows holds the lock */ }
    }
  }
}

/* Launching Edge on this box is flaky: a port sometimes fails to bind with
   nothing on stderr, and a previous instance's helper processes can still be
   holding one. Three attempts on three ports is cheaper than a human
   re-running the script. */
async function shootWithRetry(html, w, h, out, fonts, tries = 3) {
  for (let i = 1; i <= tries; i++) {
    try { return await shoot(html, w, h, out, fonts) }
    catch (err) {
      if (i === tries) throw err
      console.warn(`  retry ${i}: ${err.message}`)
      await sleep(3000)
    }
  }
}

console.log('\nmake-og:')
await shootWithRetry(cardHtml, 1200, 630, join(OUT, 'default.png'), ['400 40px Mark', '800 70px Display', '600 23px Body'])
/* Edge does not release its debugging port the instant the parent is killed —
   the helper processes outlive it by about a second, and a relaunch inside
   that window silently fails to bind and never answers /json/list. */
await sleep(2500)
await shootWithRetry(logoHtml, 512, 512, join(OUT, 'logo-512.png'), ['400 240px Mark'])
console.log('')
process.exit(0)
