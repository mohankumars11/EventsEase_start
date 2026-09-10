#!/usr/bin/env node
/**
 * The Android launcher icons and splash, for both apps.
 *
 *   node scripts/render-app-icons.mjs
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT WAS THERE BEFORE
 * ══════════════════════════════════════════════════════════════════════
 *
 * Capacitor's default. A blue-grey compass on a white tile, shipped in
 * both apps, identical in both — so on a phone with both installed there
 * were two anonymous icons with no way to tell which was which, and
 * neither said Sambramo.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE WORD, NOT A MARK — AND WHAT THAT COSTS
 * ══════════════════════════════════════════════════════════════════════
 *
 * The tile is the wordmark. No letterform, no glyph, no symbol.
 *
 * I argued for a single S and was overruled, and the reasoning behind
 * the decision is sound: a symbol is only worth its space once people
 * already recognise it. Nobody recognises a Sambramo mark yet, and a
 * pretty glyph on an unknown brand is a tile that says nothing at all.
 * The name has to do the work until it is worth trademarking.
 *
 * The cost, stated once and then designed around: at mdpi the tile is
 * 48 real pixels, and eight characters across 44px of usable width is
 * about 5px per letter. It will not be READ at that size — it will be
 * recognised as a shape, the way a wordmark on a distant shopfront is.
 *
 * So everything below is aimed at making that shape as distinct as it
 * can be:
 *
 *   a condensed heavy SANS, not the serif    serif detail at 5px is mud
 *   uppercase                                even shape, no descenders
 *   93% of the tile width                    every pixel of the word
 *   one line, tight tracking                 two lines halve the height
 *
 * The partner tile adds PARTNERS underneath. That is what separates the
 * two apps now that neither has a symbol — and it is a better separator
 * than a notch was, because it is legible as a WORD the moment the tile
 * is bigger than a launcher.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHAT THIS CANNOT DO
 * ══════════════════════════════════════════════════════════════════════
 *
 * An AI-generated photograph of a person was asked for and is not here.
 * I cannot generate images, and a stock photo of a stranger presented as
 * a Sambramo master would be a picture of somebody who does not work
 * here — on the Play Store listing, which is the one place a claim is
 * checked. The partner tile earns its meaning from colour, the notch and
 * the store listing text instead.
 */
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { ROOT } from './lib/loadSrc.mjs'

const sleep = ms => new Promise(r => setTimeout(r, ms))

/* ══════════════════════════════════════════════════════════════════════
   THE PARTNER COLOUR
   ══════════════════════════════════════════════════════════════════════

   One constant, because it has to be identical in four places — the
   launcher tile, the round tile, the adaptive layer and the splash — and
   a colour that is nearly right in one of them reads as two apps.

   Set it here and re-run; nothing else needs touching. */
const PARTNER_COLOUR = '#F31D8B'

/* ── The two apps ─────────────────────────────────────────────────── */
const APPS = {
  customer: {
    dir: 'customer',
    /* The brand ground, lifted verbatim from `.brand-aqua` in
       index.css. Not a new palette invented for the icon: the tile, the
       splash and the app's own auth screens are then the same surface,
       and a phone showing the icon next to the splash shows one colour
       rather than two that nearly match. */
    bg: 'radial-gradient(120% 100% at 88% 92%, rgba(140,224,214,.55) 0%, rgba(85,178,175,0) 62%), linear-gradient(135deg, #17566C 0%, #256F8A 34%, #3D96A4 62%, #5FBBB4 100%)',
    solid: '#1B5C73',
    fg: '#FFFFFF',
    second: null,
    splashSub: 'Celebrations, arranged',
  },
  partner: {
    dir: 'partner',
    /* ── Flat colour, white word, nothing else ────────────────────────
       Porter's tile is one flat blue with PORTER in white, set heavy and
       hard against the edge. No gradient, no glyph, no illustration.
       That is not minimalism for its own sake — a flat field is the only
       treatment that survives being 48 real pixels under a launcher's
       drop shadow. A gradient at that size is a smudge, and the earlier
       saffron ramp went muddy exactly where the letters sat.

       So: one colour, white extrabold, and the word does the work. */
    bg: PARTNER_COLOUR,
    solid: PARTNER_COLOUR,
    /* White, and it is the reason the colour has to be a strong mid
       tone rather than a pastel: white on anything lighter than roughly
       #7A7A7A stops being readable the moment Android darkens the tile
       under its shadow. Both candidates clear that comfortably. */
    fg: '#FFFFFF',
    /* PARTNER, singular. It is what one person is, and the tile is read
       by one person looking for their own app. */
    second: 'PARTNER',
    splashSub: 'Where the city’s celebrations find you',
  },
}

/* Android launcher densities. `ic_launcher` is the legacy square,
   `_round` the circular one, `_foreground` the adaptive layer that the
   OS masks — 108dp of canvas of which only the middle 72dp is safe. */
const LAUNCHER = [
  { dir: 'mipmap-mdpi',    px: 48,  fg: 108 },
  { dir: 'mipmap-hdpi',    px: 72,  fg: 162 },
  { dir: 'mipmap-xhdpi',   px: 96,  fg: 216 },
  { dir: 'mipmap-xxhdpi',  px: 144, fg: 324 },
  { dir: 'mipmap-xxxhdpi', px: 192, fg: 432 },
]

/* The splash. Portrait and landscape at each density, which is what the
   Capacitor splash plugin looks for. */
const SPLASH = [
  { dir: 'drawable-port-mdpi',    w: 320,  h: 480  },
  { dir: 'drawable-port-hdpi',    w: 480,  h: 800  },
  { dir: 'drawable-port-xhdpi',   w: 720,  h: 1280 },
  { dir: 'drawable-port-xxhdpi',  w: 960,  h: 1600 },
  { dir: 'drawable-port-xxxhdpi', w: 1280, h: 1920 },
  { dir: 'drawable-land-mdpi',    w: 480,  h: 320  },
  { dir: 'drawable-land-hdpi',    w: 800,  h: 480  },
  { dir: 'drawable-land-xhdpi',   w: 1280, h: 720  },
  { dir: 'drawable-land-xxhdpi',  w: 1600, h: 960  },
  { dir: 'drawable-land-xxxhdpi', w: 1920, h: 1280 },
]

/* ── The tile ─────────────────────────────────────────────────────── */
function iconPage({ size, app, shape, safeRatio }) {
  const a = APPS[app]
  const radius = shape === 'round' ? '50%' : `${Math.round(size * 0.22)}px`

  /* The word spans `safeRatio` of the tile, and every number here came
     down after seeing it on a phone.
     
     0.93 / 0.72 / 0.74 were the ceilings the geometry allows, and a
     ceiling is the wrong place to sit: a launcher that rounds a corner
     slightly harder, or an OEM skin that insets the tile, eats the S
     and the O — and the report was exactly that, "not visible at
     either end".
     
     0.80 on the square leaves a tenth of the tile clear on each side.
     0.62 on the round one, where the corners are gone entirely and the
     word's own width is the diameter it has to live inside. 0.56 on the
     adaptive layer, which the OS crops to the middle 72 of 108dp — the
     tightest mask of the three and the one that must never clip. */
  /* ══════════════════════════════════════════════════════════════════
     WHICH ONE WINS AT 48 PIXELS
     ══════════════════════════════════════════════════════════════════

     First attempt gave the mark 34% and kept the word at four fifths of
     its old width. Rendered at mdpi that is a 16px figure under a word
     doing all the work — the illustration was decoration nobody would
     ever see, which is the worst of both.

     A tile cannot carry two things at 48px. On the partner app the
     PICTURE is the thing being found, so it takes nearly half the tile
     and the word drops to a caption underneath. That is the same
     hierarchy every earning app on this market's phones already uses,
     and it is the opposite of the customer tile, which has no mark and
     gives the whole tile to the name.

     The customer tile is untouched: no mark, so both numbers below are
     inert for it. */
  const hasMark = typeof a.mark === 'function'
  const markPx = Math.round(size * (shape === 'adaptive' ? 0.40 : 0.46))

  const w = Math.round(size * safeRatio * (hasMark ? 0.62 : 1))

  /* Sized from the WIDTH, not chosen. A condensed heavy sans sets
     "SAMBRAMO" at roughly 0.52 x its font-size per character, so eight
     characters want a size near w/4.2. Solving for the width is what
     keeps the word the same visual weight at 48px and at 432. */
  const fs = Math.round(w / 4.15)

  /* ── PARTNER is set as large as SAMBRAMO, not as a caption ────────
     It was 40% of the name with letter-spacing on top, which at 48px is
     four grey pixels — the word was there and could not be seen, so the
     tile read as the customer app in a different colour.

     Both lines are now the same weight and the same size, and both are
     FITTED to the same target width by __fit below. Seven characters
     across the width eight occupy makes PARTNER very slightly the wider
     letterform, which is what a stacked wordmark wants: two solid bars
     of equal length instead of a title and a footnote. */
  const secondFs = fs

  return `<!doctype html><meta charset="utf-8">
<style>
  html,body { margin:0; padding:0; width:${size}px; height:${size}px; overflow:hidden;
              background:${a.solid}; }
  .tile {
    width:${size}px; height:${size}px; border-radius:${radius};
    background:${a.bg};
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    position:relative; overflow:hidden;
  }
  ${hasMark ? `
  .mark {
    display:block;
    width:${markPx}px; height:${markPx}px;
    margin-bottom:${Math.round(size * 0.025)}px;
    /* The same drop the word carries, so the figure and the name sit on
       one light source rather than looking pasted together. */
    filter: drop-shadow(0 ${Math.max(1, Math.round(size * 0.006))}px ${Math.round(size * 0.016)}px rgba(0,0,0,.20));
  }
  .mark svg { display:block; }` : ''}
  .word {
    font-family: 'Arial Narrow', 'Helvetica Neue', Arial, system-ui, sans-serif;
    font-weight: 900;
    font-stretch: condensed;
    font-size:${fs}px;
    line-height:1;
    letter-spacing:${(-fs * 0.012).toFixed(2)}px;
    color:${a.fg};
    white-space:nowrap;
    /* No scale here. It is measured and applied by __fit() below.
       The first cut guessed the width from a per-character ratio and
       then corrected with scaleX — but the element's LAYOUT width is
       still the natural text width, so it overflowed the tile and
       overflow:hidden ate the S and the O. The tile read "AMBRAM".
       A guess plus a correction is two chances to be wrong; measuring
       is one. */
    text-shadow: 0 ${Math.max(1, Math.round(size * 0.008))}px ${Math.round(size * 0.02)}px rgba(0,0,0,.22);
  }
  ${a.second ? `
  .second {
    margin-top:${Math.round(size * 0.03)}px;
    font-family: 'Arial Narrow', 'Helvetica Neue', Arial, system-ui, sans-serif;
    font-weight:900;
    font-stretch: condensed;
    font-size:${secondFs}px;
    line-height:1;
    letter-spacing:${(-secondFs * 0.012).toFixed(2)}px;
    text-shadow: 0 ${Math.max(1, Math.round(size * 0.008))}px ${Math.round(size * 0.02)}px rgba(0,0,0,.22);
    /* The tracking is what makes a small word read as a label rather
       than a smudge. It also stops PARTNERS competing with the name
       above it, which is the thing being promoted. */
    color:${a.fg};
    white-space:nowrap;
  }` : ''}
</style>
<div class="tile">
  ${hasMark ? `<span class="mark">${a.mark(a.fg)}</span>` : ''}
  <span class="word" id="w">SAMBRAMO</span>
  ${a.second ? `<span class="second" id="s">${a.second}</span>` : ''}
</div>
<script>
  /* Measure, then fit. Called over CDP before the capture.
     scrollWidth is the natural width the browser laid out; the ratio to
     the target is the exact horizontal scale, and transform-origin
     centre keeps it centred while it shrinks. */
  window.__fit = function () {
    var target = ${w}
    var out = []
    /* Both lines, to the SAME width. Measuring each rather than scaling
       one to the other: the two words have different character counts,
       so a shared scale factor would leave one of them short. */
    ;['w', 's'].forEach(function (id) {
      var el = document.getElementById(id)
      if (!el) return
      var natural = el.scrollWidth
      var k = target / natural
      el.style.transformOrigin = 'center center'
      el.style.transform = 'scaleX(' + k.toFixed(4) + ')'
      out.push({ id: id, natural: natural, scale: k })
    })
    return { target: target, lines: out }
  }
</script>`
}

/* ── The splash ───────────────────────────────────────────────────── */
function splashPage({ w, h, app }) {
  const a = APPS[app]
  const short = Math.min(w, h)

  return `<!doctype html><meta charset="utf-8">
<style>
  html,body { margin:0; padding:0; width:${w}px; height:${h}px; overflow:hidden; }
  .bg {
    width:${w}px; height:${h}px; background:${a.bg};
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    position:relative; overflow:hidden;
  }
  .bg::before {
    content:''; position:absolute; inset:0;
    background: radial-gradient(circle at 50% 38%, rgba(255,255,255,.20), transparent 60%);
  }
  /* Here the WORD gets to be the word. A splash is full-screen and held
     for a second — the one place the whole name is legible, which is
     exactly why the icon does not have to carry it. */
  .word {
    position:relative;
    font-family: Georgia, 'Times New Roman', serif;
    font-weight:700;
    font-size:${Math.round(short * 0.155)}px;
    color:${a.fg};
    letter-spacing:-0.015em;
    text-shadow: 0 ${Math.round(short * 0.006)}px ${Math.round(short * 0.02)}px rgba(0,0,0,.16);
  }
  .rule {
    position:relative;
    margin-top:${Math.round(short * 0.045)}px;
    width:${Math.round(short * 0.16)}px; height:2px;
    background:${a.fg}; opacity:.45;
  }
  .sub {
    position:relative;
    margin-top:${Math.round(short * 0.042)}px;
    font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    font-weight:700;
    font-size:${Math.round(short * 0.033)}px;
    letter-spacing:.14em;
    text-transform:uppercase;
    color:${a.fg}; opacity:.8;
  }
</style>
<div class="bg">
  <div class="word">Sambramo</div>
  <div class="rule"></div>
  <div class="sub">${a.splashSub}</div>
</div>`
}

/* ── Driving Edge over CDP ────────────────────────────────────────── */
const EDGE = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].find(existsSync)

if (!EDGE) {
  console.error('\n  Edge not found. This renders through headless Edge over CDP.\n')
  process.exit(1)
}

const profile = mkdtempSync(join(tmpdir(), 'sambramo-icons-'))
const PORT = 9333

const edge = spawn(EDGE, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--disable-gpu', '--disable-dev-shm-usage', '--hide-scrollbars',
  'about:blank',
], { stdio: 'ignore' })

let ws, id = 0
const pending = new Map()

async function connect() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`)
      const targets = await res.json()
      const page = targets.find(t => t.type === 'page')
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl
    } catch { /* not up yet */ }
    await sleep(250)
  }
  throw new Error('Edge did not open a debugging port')
}

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const msgId = ++id
    pending.set(msgId, { resolve, reject })
    ws.send(JSON.stringify({ id: msgId, method, params }))
  })
}

async function shoot(html, w, h, outPath) {
  const file = join(profile, `p${++id}.html`)
  writeFileSync(file, html, 'utf8')
  await send('Emulation.setDeviceMetricsOverride', {
    width: w, height: h, deviceScaleFactor: 1, mobile: false,
  })
  await send('Page.navigate', { url: pathToFileURL(file).href })
  await sleep(260)
  // Fit the word to the tile before the shot. Without this the wordmark
  // is laid out at its natural width and clipped at both ends.
  await send('Runtime.evaluate', { expression: 'window.__fit && window.__fit()', returnByValue: true })
  await sleep(120)
  const shot = await send('Page.captureScreenshot', {
    format: 'png', clip: { x: 0, y: 0, width: w, height: h, scale: 1 },
  })
  // `send` resolves msg.result, so the payload is at .data — the sibling
  // script reads .result.data because its send() resolves the whole
  // message. One level of difference, and the error it produces says
  // "capture failed" rather than "you looked in the wrong place".
  const data = shot?.data ?? shot?.result?.data
  if (!data) throw new Error(`capture failed: ${outPath}`)
  mkdirSync(join(outPath, '..'), { recursive: true })
  writeFileSync(outPath, Buffer.from(data, 'base64'))
}

try {
  const url = await connect()
  ws = new WebSocket(url)
  await new Promise(r => { ws.onopen = r })
  ws.onmessage = e => {
    const msg = JSON.parse(e.data)
    const p = pending.get(msg.id)
    if (!p) return
    pending.delete(msg.id)
    msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result)
  }

  await send('Page.enable')
  await send('Runtime.enable')

  let n = 0
  for (const app of Object.keys(APPS)) {
    const res = join(ROOT, 'android', 'app', 'src', APPS[app].dir, 'res')
    console.log(`\n  ${app}`)

    for (const d of LAUNCHER) {
      await shoot(iconPage({ size: d.px, app, shape: 'square', safeRatio: 0.80 }),
        d.px, d.px, join(res, d.dir, 'ic_launcher.png')); n++
      await shoot(iconPage({ size: d.px, app, shape: 'round', safeRatio: 0.62 }),
        d.px, d.px, join(res, d.dir, 'ic_launcher_round.png')); n++
      // The adaptive layer. Bigger canvas, smaller glyph: the OS crops it.
      await shoot(iconPage({ size: d.fg, app, shape: 'adaptive', safeRatio: 0.56 }),
        d.fg, d.fg, join(res, d.dir, 'ic_launcher_foreground.png')); n++
    }
    console.log(`    launcher   ${LAUNCHER.length * 3} files`)

    for (const s of SPLASH) {
      await shoot(splashPage({ w: s.w, h: s.h, app }), s.w, s.h,
        join(res, s.dir, 'splash.png')); n++
    }
    console.log(`    splash     ${SPLASH.length} files`)
  }

  console.log(`\n  ${n} images written into the flavour res folders.\n`)
} finally {
  try { ws?.close() } catch { /* already gone */ }
  edge.kill()
  try { rmSync(profile, { recursive: true, force: true }) } catch { /* windows holds it briefly */ }
}
