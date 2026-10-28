#!/usr/bin/env node
/**
 * Draw the customer app's launcher icon to match the splash (Mohan,
 * 2026-10-28: "the same background … highlighted, like Zepto / Blinkit").
 *
 *   node scripts/make-launcher-icon.mjs
 *
 * A vivid amethyst ground (lighter at the top-left, the splash's #5B21A8
 * through to deep violet), SAMBRAMO in heavy white Manrope, and under it
 * the splash's yellow-to-rose highlighter stroke. Writes, for every density:
 *   ic_launcher.png / ic_launcher_round.png   legacy launchers (full art)
 *   ic_launcher_foreground.png                adaptive foreground (transparent,
 *                                             inside the 66 dp safe zone)
 * and the adaptive background (res/drawable/ic_launcher_bg.xml) is the same
 * gradient, so every launcher shape shows the same icon.
 */
import { spawn, execSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')
const RES = join(ROOT, 'android/app/src/customer/res')
const DENS = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 }
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync)
const font = readFileSync(join(ROOT, 'public/fonts/Manrope-latin.woff2')).toString('base64')

const sleep = ms => new Promise(r => setTimeout(r, ms))
const PORT = 9560 + Math.floor(Math.random() * 40)
const br = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'icon-'))}`, '--no-first-run', '--disable-gpu', '--renderer-process-limit=1', 'about:blank'], { stdio: 'ignore' })
const done = code => { try { execSync(`taskkill /PID ${br.pid} /T /F`, { stdio: 'ignore' }) } catch { br.kill() } process.exit(code) }
let list
for (let i = 0; i < 50; i++) { await sleep(400); try { list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); if (list.some(t => t.type === 'page')) break } catch { /* not up */ } }
if (!list) { console.error('Edge never opened its debugging port'); done(1) }
const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl)
await new Promise(r => ws.addEventListener('open', r))
let n = 0
const call = (method, params) => new Promise(res => { const id = ++n; const h = e => { const x = JSON.parse(e.data); if (x.id === id) { ws.removeEventListener('message', h); res(x) } }; ws.addEventListener('message', h); ws.send(JSON.stringify({ id, method, params })) })

const jobs = Object.entries(DENS).flatMap(([d, px]) => [[d, 'ic_launcher', px, 'square'], [d, 'ic_launcher_round', px, 'round'], [d, 'ic_launcher_foreground', Math.round(px * 2.25), 'fg']])
const r = await call('Runtime.evaluate', { returnByValue: true, awaitPromise: true, expression: `(async () => {
  const f = new FontFace('Manrope', 'url(data:font/woff2;base64,${font})', { weight: '200 800' });
  await f.load(); document.fonts.add(f);
  if (!document.fonts.check('800 40px Manrope')) throw new Error('Manrope did not load');
  const ground = (g, s) => {
    const bg = g.createLinearGradient(0, 0, s, s);
    bg.addColorStop(0, '#8B5CF6'); bg.addColorStop(.45, '#5B21A8'); bg.addColorStop(1, '#3B0F80');
    g.fillStyle = bg; g.fillRect(0, 0, s, s);
    const glow = g.createRadialGradient(s * .3, s * .25, 0, s * .3, s * .25, s * .7);
    glow.addColorStop(0, 'rgba(255,255,255,.28)'); glow.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = glow; g.fillRect(0, 0, s, s);
  };
  const mark = (g, cx, cy, width) => {
    let fs = width / 5.2;
    g.font = '800 ' + fs + 'px Manrope';
    if ('letterSpacing' in g) g.letterSpacing = (fs * .02) + 'px';
    while (g.measureText('SAMBRAMO').width > width && fs > 4) { fs -= .5; g.font = '800 ' + fs + 'px Manrope' }
    const tw = g.measureText('SAMBRAMO').width;
    const bw = tw * .62, bh = fs * .3, by = cy + fs * .42;
    const hl = g.createLinearGradient(cx - bw / 2, 0, cx + bw / 2, 0); hl.addColorStop(0, '#FDE68A'); hl.addColorStop(1, '#F9A8D4');
    g.fillStyle = hl; g.beginPath(); g.roundRect ? g.roundRect(cx - bw / 2, by, bw, bh, bh / 2) : g.rect(cx - bw / 2, by, bw, bh); g.fill();
    g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.shadowColor = 'rgba(30,5,70,.45)'; g.shadowBlur = fs * .25; g.shadowOffsetY = fs * .06;
    g.fillStyle = '#FFFFFF'; g.fillText('SAMBRAMO', cx, cy + fs * .32);
    g.shadowBlur = 0; g.shadowOffsetY = 0;
  };
  return ${JSON.stringify(jobs)}.map(([d, name, s, kind]) => {
    const c = document.createElement('canvas'); c.width = s; c.height = s;
    const g = c.getContext('2d');
    if (kind === 'fg') { mark(g, s / 2, s / 2, s * .58) }
    else {
      g.save();
      if (kind === 'round') { g.beginPath(); g.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2); g.clip() }
      else { const rr = s * .22; g.beginPath(); g.roundRect ? g.roundRect(0, 0, s, s, rr) : g.rect(0, 0, s, s); g.clip() }
      ground(g, s); mark(g, s / 2, s / 2, s * .8);
      g.restore();
    }
    return c.toDataURL('image/png').split(',')[1];
  });
})()` })
if (r.result?.exceptionDetails) { console.error(r.result.exceptionDetails.exception?.description ?? 'draw failed'); done(1) }
r.result.result.value.forEach((b64, k) => {
  const [d, name] = jobs[k]
  const dir = join(RES, `mipmap-${d}`); mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, `${name}.png`), Buffer.from(b64, 'base64'))
  console.log(`  mipmap-${d}/${name}.png`)
})
/* The adaptive background: the same gradient, so a masked icon looks the same. */
mkdirSync(join(RES, 'drawable'), { recursive: true })
writeFileSync(join(RES, 'drawable/ic_launcher_bg.xml'), `<?xml version="1.0" encoding="utf-8"?>
<!-- The adaptive icon's ground — the same gradient as the legacy icon and the splash. scripts/make-launcher-icon.mjs -->
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <gradient android:type="linear" android:angle="315" android:startColor="#8B5CF6" android:centerColor="#5B21A8" android:endColor="#3B0F80" />
</shape>
`)
mkdirSync(join(RES, 'mipmap-anydpi-v26'), { recursive: true })
for (const f of ['ic_launcher', 'ic_launcher_round']) writeFileSync(join(RES, `mipmap-anydpi-v26/${f}.xml`), `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_bg"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`)
console.log('  drawable/ic_launcher_bg.xml, mipmap-anydpi-v26/*')
done(0)
