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
 * WHY THE ICON IS A LETTER AND NOT THE WORD
 * ══════════════════════════════════════════════════════════════════════
 *
 * A launcher icon is 48dp. On a 1080p phone that is about 108 real
 * pixels, and it sits below a two-line label that already says
 * "Sambramo" and "Sambramo Partners".
 *
 * "Sambramo" is eight characters of a serif with a modest x-height. At
 * 108px across, its cap height lands near 18px — legible on a monitor at
 * 512, illegible in a hand. Zomato ships a letterform. Blinkit ships a
 * letterform. Swiggy ships a letterform. Not fashion: it is the only
 * thing that survives being 12mm wide.
 *
 * So the tile carries the S, at the weight and colour the brand uses,
 * and the WORD appears where there is room for it — on the splash, at
 * full size, which is the screen this file also renders.
 *
 * ══════════════════════════════════════════════════════════════════════
 * THE TWO APPS MUST BE TELLABLE APART ACROSS A ROOM
 * ══════════════════════════════════════════════════════════════════════
 *
 * A master and a customer may both have both installed. Same name, same
 * first letter — so the difference cannot be the glyph, it has to be the
 * colour and the shape behind it.
 *
 *   customer   deep plum ground, white S            calm, the brand
 *   partner    saffron ground, plum S, corner notch  warm, worker-facing
 *
 * The notch is the load-bearing part: colour alone fails for the ~8% of
 * men with a colour vision deficiency, and a shape difference does not.
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

/* ── The two apps ─────────────────────────────────────────────────── */
const APPS = {
  customer: {
    dir: 'customer',
    // Deep plum into a warmer violet. Dark grounds make a white glyph
    // read at any size, and this is the app's own 950/800 ramp.
    bg: 'linear-gradient(155deg, #2e1065 0%, #4c1d95 55%, #5b21b6 100%)',
    fg: '#FFFFFF',
    accent: '#fbbf24',
    notch: false,
    splashWord: '#FFFFFF',
    splashSub: 'Celebrations, arranged',
  },
  partner: {
    dir: 'partner',
    // Saffron. The colour every partner-facing action in the app already
    // uses, so the icon is the first instance of a pattern rather than a
    // one-off.
    bg: 'linear-gradient(155deg, #f59e0b 0%, #fbbf24 55%, #fcd34d 100%)',
    fg: '#2e1065',
    accent: '#2e1065',
    notch: true,
    splashWord: '#2e1065',
    splashSub: 'Work that comes to you',
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

  /* The glyph fills `safeRatio` of the tile. For the adaptive foreground
     that is 0.62 — the OS masks to the middle 72 of 108dp (0.667), and a
     letterform whose ink runs to the edge of the safe circle looks
     cramped in every launcher that crops tighter than the spec. */
  const glyph = Math.round(size * safeRatio)

  return `<!doctype html><meta charset="utf-8">
<style>
  html,body { margin:0; padding:0; width:${size}px; height:${size}px; overflow:hidden; }
  .tile {
    width:${size}px; height:${size}px; border-radius:${radius};
    background:${shape === 'adaptive' ? a.bg : a.bg};
    display:flex; align-items:center; justify-content:center;
    position:relative; overflow:hidden;
  }
  /* A soft light from the top-left, so the tile is not a flat slab.
     Two stops only — an icon is looked at for a third of a second. */
  .tile::before {
    content:''; position:absolute; inset:0;
    background: radial-gradient(circle at 28% 22%, rgba(255,255,255,.28), transparent 62%);
  }
  ${a.notch ? `
  /* The shape difference. A saffron tile and a plum tile are one
     colour apart; this corner is what separates them for somebody who
     cannot see that difference. */
  .tile::after {
    content:''; position:absolute;
    right:${-size * 0.14}px; top:${-size * 0.14}px;
    width:${size * 0.42}px; height:${size * 0.42}px;
    border-radius:50%;
    background:${a.accent};
    opacity:.16;
  }` : ''}
  .s {
    position:relative;
    font-family: Georgia, 'Times New Roman', serif;
    font-weight:700;
    font-size:${glyph}px;
    line-height:1;
    color:${a.fg};
    letter-spacing:-0.02em;
    /* Optical centring. A serif S sits visually low in its box; the
       nudge is small and it is the difference between centred and
       nearly centred, which is all anybody sees. */
    transform: translateY(${Math.round(size * 0.012)}px);
    text-shadow: 0 ${Math.round(size * 0.012)}px ${Math.round(size * 0.03)}px rgba(0,0,0,.18);
  }
</style>
<div class="tile"><span class="s">S</span></div>`
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
    color:${a.splashWord};
    letter-spacing:-0.015em;
    text-shadow: 0 ${Math.round(short * 0.006)}px ${Math.round(short * 0.02)}px rgba(0,0,0,.16);
  }
  .rule {
    position:relative;
    margin-top:${Math.round(short * 0.045)}px;
    width:${Math.round(short * 0.16)}px; height:2px;
    background:${a.splashWord}; opacity:.45;
  }
  .sub {
    position:relative;
    margin-top:${Math.round(short * 0.042)}px;
    font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    font-weight:700;
    font-size:${Math.round(short * 0.033)}px;
    letter-spacing:.14em;
    text-transform:uppercase;
    color:${a.splashWord}; opacity:.8;
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
  await sleep(240)
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

  let n = 0
  for (const app of Object.keys(APPS)) {
    const res = join(ROOT, 'android', 'app', 'src', APPS[app].dir, 'res')
    console.log(`\n  ${app}`)

    for (const d of LAUNCHER) {
      await shoot(iconPage({ size: d.px, app, shape: 'square', safeRatio: 0.60 }),
        d.px, d.px, join(res, d.dir, 'ic_launcher.png')); n++
      await shoot(iconPage({ size: d.px, app, shape: 'round', safeRatio: 0.56 }),
        d.px, d.px, join(res, d.dir, 'ic_launcher_round.png')); n++
      // The adaptive layer. Bigger canvas, smaller glyph: the OS crops it.
      await shoot(iconPage({ size: d.fg, app, shape: 'adaptive', safeRatio: 0.38 }),
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
