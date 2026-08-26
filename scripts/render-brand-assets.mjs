#!/usr/bin/env node
/**
 * Render the app icons from the real brand values.
 *
 *   node scripts/render-brand-assets.mjs
 *
 * ── Why a renderer and not two hand-drawn SVGs ────────────────────────────
 * The icon has to be the WORDMARK — "Sambramo", white and bold, on the
 * Comfortable Aqua ground — and a standalone SVG used as an app icon cannot
 * load a webfont. Whatever face the brand is set in, a static SVG would fall
 * back to whatever the launcher happens to have, which for a wordmark is the
 * difference between a logo and some text.
 *
 * So the icons are rendered by a browser that already has the font, at 1024
 * and downscaled, and written as PNG. That is also what keeps them from
 * drifting: the gradient stops below are the same ones `.brand-aqua` uses in
 * src/index.css, and this file is the only other place they are written.
 * Change one, change both, in the same commit.
 *
 * ── The two files are not the same picture ────────────────────────────────
 * `any` keeps its own rounded square, because the platforms that use it do
 * not crop and a full-bleed square would sit in a white box with hard
 * corners.
 *
 * `maskable` bleeds the gradient to every edge and pulls the wordmark in to
 * about 62% of the width, because Android crops it to whatever shape the
 * launcher wants — a circle, a squircle, a teardrop. The guaranteed-visible
 * region is a centred circle of 80% diameter, so anything outside that can be
 * cut. The old pair shipped one file doing both jobs, which is how an icon
 * ends up either clipped or floating.
 *
 * ── The fit is measured, not guessed ──────────────────────────────────────
 * "Sambramo" is eight characters and the icon is square, so the type size is
 * whatever makes the word span its allowed width — computed in the page from
 * the real rendered metrics after the font has loaded. Hard-coding a px size
 * means the word is either short of the edges or over them the first time
 * anybody adjusts the tracking.
 */
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { tmpdir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public')

/* The ground. Same stops as `.brand-aqua` / `.brand-aqua-chip`. */
const SHEEN = 'radial-gradient(120% 100% at 88% 92%, rgba(140,224,214,0.55) 0%, rgba(85,178,175,0) 62%)'
const RAMP = 'linear-gradient(135deg, #17566C 0%, #256F8A 34%, #3D96A4 62%, #5FBBB4 100%)'

/**
 * The wordmark's face, fetched once and inlined into the page.
 *
 * ── Why not just <link> Google Fonts ──────────────────────────────────────
 * That is what this did, and it hung. A headless page loading a webfont over
 * the network leaves `document.fonts.ready` pending whenever the request is
 * slow, blocked, or the page has an origin the stylesheet will not serve —
 * and the CDP call awaiting it then never returns, so the renderer produces
 * no icons and no error. Inlining removes the failure mode entirely: the font
 * is either in the page before it renders, or the script has already failed
 * out here with a message that says so.
 *
 * Playfair Display, because that is what `font-display` resolves to in
 * tailwind.config.js and therefore what SambramoWordmark actually draws. An
 * icon set in a different face from the in-app wordmark is two logos.
 */
async function inlineFace() {
  const css = await fetch(
    'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@800&display=swap',
        /* A FULL Chrome UA, not a short one.
       Google Fonts sniffs this and serves woff2 only to browsers it
       recognises; an abbreviated string gets the legacy TTF stylesheet, the
       woff2 regex below finds nothing, and the script fails with a confusing
       "returned no woff2" rather than the real cause. */
    { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
      + 'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' } },
  ).then(r => r.text())
  // The latin subset is the last @font-face block Google emits and the only
  // one this wordmark needs.
  const urls = [...css.matchAll(/url\((https:[^)]+\.woff2)\)/g)].map(m => m[1])
  if (!urls.length) throw new Error('Google Fonts returned no woff2 for Playfair Display')
  const buf = Buffer.from(await fetch(urls[urls.length - 1]).then(r => r.arrayBuffer()))
  return `@font-face{font-family:'Playfair Display';font-style:normal;font-weight:800;`
    + `src:url(data:font/woff2;base64,${buf.toString('base64')}) format('woff2');}`
}

const EDGE_CANDIDATES = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
]
const BROWSER = EDGE_CANDIDATES.find(p => existsSync(p))
if (!BROWSER) {
  console.error('No Edge or Chrome found. Icons not regenerated; the existing PNGs are untouched.')
  process.exit(1)
}

/**
 * The icon, as a page.
 *
 * `widthRatio` is how much of the tile the word may span. `radius` is 0 for
 * the maskable tile (it bleeds) and 22.5% for the `any` tile, which is the
 * corner radius Android and iOS both approximate.
 */
function page({ size, widthRatio, radius, face }) {
  return `<!doctype html><html><head><meta charset="utf-8">
<style>
${face}
  html,body { margin:0; padding:0; background:transparent; }
  #tile {
    width:${size}px; height:${size}px; border-radius:${radius}px;
    background-color:#1B5C73;
    background-image:${SHEEN}, ${RAMP};
    display:flex; align-items:center; justify-content:center;
    overflow:hidden;
  }
  /* Tracking is tighter here than the in-app wordmark's -0.022em, and
     deliberately so. The word is fitted to a WIDTH, so every em of tracking
     removed is width freed for the letters themselves — at -0.045em the cap
     height comes out about 5% larger inside the same tile. Display sizes
     want tighter fit anyway; this is the same adjustment a type designer
     makes by hand, done for the one size the icon is ever drawn at. */
  #word {
    font-family:'Playfair Display', Georgia, serif; font-weight:800; color:#fff;
    letter-spacing:-0.045em; line-height:1; white-space:nowrap;
    /* Set by the fitter below once the face has actually loaded. */
    font-size:100px;
  }
</style></head><body>
<div id="tile"><span id="word">Sambramo</span></div>
<script>
  window.__fit = async () => {
    /* Raced against a timeout, never awaited bare.
       A page that cannot reach fonts.googleapis.com — offline, or a
       navigation whose origin the stylesheet is blocked from — leaves both
       of these pending forever, and awaitPromise on the CDP side then
       hangs the renderer with no error and no output. Falling through to
       the fallback face after 6s produces a wrong-looking icon, which is a
       problem somebody can SEE; hanging produces nothing at all. */
    const settled = Promise.all([
      document.fonts.load('800 100px "Playfair Display"'),
      document.fonts.ready,
    ])
    await Promise.race([settled, new Promise(r => setTimeout(r, 4000))])
    window.__faceOk = document.fonts.check('800 100px "Playfair Display"')
    const el = document.getElementById('word')
    const target = ${size} * ${widthRatio}
    // Two passes: measure at a known size, scale, then correct for the
    // rounding and for tracking, which does not scale perfectly linearly.
    el.style.fontSize = '100px'
    let w = el.getBoundingClientRect().width
    el.style.fontSize = (100 * target / w) + 'px'
    w = el.getBoundingClientRect().width
    el.style.fontSize = (parseFloat(el.style.fontSize) * target / w) + 'px'
    /* Cap height, measured off the real ink rather than derived from the
       font size. getBoundingClientRect().height on a line box reports
       leading as well, which for Playfair is about a third more than the
       letters actually occupy — and sizing decisions made against that
       number are why the word looked smaller than its metrics claimed. */
    const probe = document.createElement('canvas').getContext('2d')
    /* Read the weight off the COMPUTED style. el.style.fontWeight is the
       inline one, which is empty here because the weight comes from the
       stylesheet — canvas would then be handed (space)82px Playfair Display,
       fail to parse it, and silently keep its default 10px sans font. The
       cap height reported would be of the wrong face at the wrong size. */
    const cs = getComputedStyle(el)
    probe.font = cs.fontWeight + ' ' + el.style.fontSize + ' "Playfair Display"'
    const m = probe.measureText('Sambramo')
    const cap = (m.actualBoundingBoxAscent || 0) + (m.actualBoundingBoxDescent || 0)
    return { fontSize: el.style.fontSize, width: el.getBoundingClientRect().width, cap, target, faceOk: window.__faceOk }
  }
</script>
</body></html>`
}

const sleep = ms => new Promise(r => setTimeout(r, ms))
/* Progress is printed as it happens, not collected and printed at the end.
   This script drives an external browser over a socket, and every way it can
   fail — the browser not starting, the debugging port not opening, a CDP call
   never answering — fails by HANGING rather than by throwing. Silence with no
   marker is indistinguishable from all three. */
const step = m => console.log('  · ' + m)
const profile = mkdtempSync(join(tmpdir(), 'brand-'))
step('launching ' + BROWSER.split('/').pop())
const browser = spawn(BROWSER, [
  '--headless=new', '--disable-gpu', '--remote-debugging-port=9346',
  `--user-data-dir=${profile}`, '--no-first-run', '--disable-dev-shm-usage',
  '--hide-scrollbars', 'about:blank',
], { stdio: 'ignore' })

let sock, id = 0
const pending = new Map()

try {
  let target
  for (let i = 0; i < 40 && !target; i++) {
    try {
      /* The abort signal is load-bearing, not belt-and-braces.
         Without it this fetch can hang open against a port the browser has
         bound but is not yet answering on — and because the retry lives
         INSIDE the await, the loop never gets to iterate, never reaches its
         own bound, and never throws. The script then sits there forever
         having printed one line. That is exactly what it did. */
      const res = await fetch('http://127.0.0.1:9346/json/list', { signal: AbortSignal.timeout(900) })
      target = (await res.json()).find(t => t.type === 'page')
    } catch { /* not up yet */ }
    if (!target) await sleep(400)
  }
  if (!target) throw new Error('the browser never exposed a debugging target')
  step('debugger attached')

  sock = new WebSocket(target.webSocketDebuggerUrl)
  sock.addEventListener('message', ev => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
  })
  await new Promise(r => sock.addEventListener('open', r))
  const send = (method, params = {}) => new Promise(res => {
    const n = ++id; pending.set(n, res)
    sock.send(JSON.stringify({ id: n, method, params }))
  })
  const evalJs = async expression => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.text)
    return r.result?.result?.value
  }

  await send('Runtime.enable')
  await send('Page.enable')
  step('CDP ready')

  process.stdout.write('  fetching Playfair Display… ')
  const face = await inlineFace()
  console.log(`${Math.round(face.length / 1024)} KB inlined`)

  /* Rendered at the size the manifest declares, not at 1024 and downscaled.
     The first cut did the latter via `clip.scale`, and Chromium ignored the
     scale — so the capture was the top-left 512×512 QUADRANT of a 1024 tile
     at full size: a rounded corner, a slab of gradient, and the top of the
     letters "Samb" running off the edge. The icon was wrong in a way that
     only looks like a cropping bug once you see it.
     512 CSS px with deviceScaleFactor 1 is unambiguous, and at icon sizes
     the type holds up perfectly well. */
  /* ── How much of the tile the word spans ──────────────────────────
     Raised from 0.78 / 0.60. At those ratios the wordmark was correct by
     the numbers and wrong on a home screen: "Sambramo" is eight characters
     of a serif with a modest x-height, so 78% of the WIDTH bought a cap
     height of only about 82px on a 512 tile — the word read as a caption
     under the icon rather than as the icon.

     `any` can take 0.88 because nothing crops it; 31px of clear space
     either side at 512 is still comfortably outside the corner radius at
     the vertical centre, where the tile is at full width.

     0.76 on the maskable tile is not a round number, it is the ceiling.
     For this word the cap height runs about 0.165 of the width, so the
     furthest ink from centre is hypot(w/2, 0.0825w) = 0.5068w, and the
     guaranteed-visible radius is 0.4 x tile. That solves to w <= 0.789 of
     the tile; 0.76 keeps roughly 10px of margin at 512 for the launchers
     that mask slightly tighter than the spec. Anything above 0.79 puts the
     S and the o under the crop on a circular mask.

     `maskable` is the constrained one. Android crops it to whatever shape
     the launcher wants and only a centred circle of 80% diameter is
     guaranteed to survive — radius 204.8 at 512. At 0.72 the word is 369
     wide, so its far corner sits at hypot(184, ~30) ≈ 187 from centre.
     Inside the circle with ~18px to spare, which is the margin a
     teardrop mask actually needs. Going to 0.78 here would put the S and
     the o under the crop on some launchers. */
  const JOBS = [
    { file: 'icon-512.png',          size: 512, widthRatio: 0.92, radius: 115, label: 'any (rounded square)' },
    { file: 'icon-maskable-512.png', size: 512, widthRatio: 0.76, radius: 0,   label: 'maskable (full bleed, 80% safe zone)' },
  ]

  for (const job of JOBS) {
    /* A file, not a `data:` URL.
       A data: page has an opaque origin, and Chromium will not fetch the
       Google Fonts stylesheet from one — so `document.fonts.load` never
       resolved and the renderer hung with no error. Writing the page to the
       temp profile dir and navigating to file:// gives it a real origin and
       the font arrives. */
    const htmlPath = join(profile, job.file.replace(/\.png$/, '.html'))
    writeFileSync(htmlPath, page({ ...job, face }), 'utf8')
    await send('Emulation.setDeviceMetricsOverride', {
      width: job.size, height: job.size, deviceScaleFactor: 1, mobile: false,
    })
    await send('Page.navigate', { url: pathToFileURL(htmlPath).href })
    await sleep(1500)
    const fit = await evalJs('window.__fit()')
    await sleep(250)
    const shot = await send('Page.captureScreenshot', {
      format: 'png',
      clip: { x: 0, y: 0, width: job.size, height: job.size, scale: 1 },
    })
    if (!shot.result?.data) throw new Error(`capture failed for ${job.file}`)
    writeFileSync(join(OUT, job.file), Buffer.from(shot.result.data, 'base64'))
    console.log(`  ${job.file.padEnd(24)} ${job.label}`)
    console.log(`      wordmark ${Math.round(parseFloat(fit.fontSize))}px `
      + `(cap ~${Math.round(fit.cap)}px, ${Math.round(100 * fit.cap / job.size)}% of the tile), `
      + `spanning ${Math.round(fit.width)} of ${Math.round(fit.target)}`)
    if (job.file.includes('maskable')) {
      const reach = Math.hypot(fit.width / 2, fit.cap / 2)
      const safe = job.size * 0.4
      console.log(`      furthest ink ${Math.round(reach)}px from centre; safe radius ${Math.round(safe)}px`)
      if (reach > safe) {
        console.warn('      WARNING: the wordmark can be cropped by a circular mask.')
        process.exitCode = 1
      }
    }
    if (!fit.faceOk) {
      console.warn('      WARNING: Playfair Display did not load — icon set in a fallback face.')
      process.exitCode = 1
    }
  }

  console.log('\nBoth icons rendered from the live brand values.')
} catch (err) {
  console.error('Icon render failed:', err.message)
  console.error('The existing PNGs are untouched.')
  process.exitCode = 1
} finally {
  try { sock?.close() } catch { /* already gone */ }
  browser.kill()
  await sleep(400)
  try { rmSync(profile, { recursive: true, force: true }) } catch { /* windows lock */ }
}
