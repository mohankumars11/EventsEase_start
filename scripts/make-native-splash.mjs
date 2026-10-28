#!/usr/bin/env node
/**
 * Draw the customer app's Android launch screen to match the in-app splash.
 *
 *   node scripts/make-native-splash.mjs
 *
 * Android shows `res/drawable-…/splash.png` for the first moment of a cold
 * start, before the WebView paints; the in-app splash
 * (components/ui/SplashScreen) follows. They used to differ — the image
 * was the old serif "Sambramo · Celebrations, arranged" on a dark royal
 * gradient — so a customer saw two different splashes. This redraws every
 * size with exactly what the in-app splash shows: the flat #5B21A8 ground,
 * SAMBRAMO in heavy Manrope, and "Event booking done in minutes" with the
 * lead words highlighted. The sizes are read from the existing files.
 *
 * Drawn by headless Edge's canvas (no image library on this machine),
 * with Manrope loaded from public/fonts so the type is the app's own.
 */
import { spawn, execSync } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')
const RES = join(ROOT, 'android/app/src/customer/res')
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync)
const files = readdirSync(RES).filter(d => d.startsWith('drawable')).map(d => join(RES, d, 'splash.png')).filter(f => existsSync(f) && statSync(f).isFile())
const size = f => { const b = readFileSync(f); return [b.readUInt32BE(16), b.readUInt32BE(20)] }
const font = readFileSync(join(ROOT, 'public/fonts/Manrope-latin.woff2')).toString('base64')

const sleep = ms => new Promise(r => setTimeout(r, ms))
const PORT = 9520 + Math.floor(Math.random() * 40)
const br = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'splash-'))}`, '--no-first-run', '--disable-gpu', '--renderer-process-limit=1', 'about:blank'], { stdio: 'ignore' })
const done = code => { try { execSync(`taskkill /PID ${br.pid} /T /F`, { stdio: 'ignore' }) } catch { br.kill() } process.exit(code) }
let list
for (let i = 0; i < 50; i++) { await sleep(400); try { list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); if (list.some(t => t.type === 'page')) break } catch { /* not up */ } }
if (!list) { console.error('Edge never opened its debugging port'); done(1) }
const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl)
await new Promise(r => ws.addEventListener('open', r))
let n = 0
const call = (method, params) => new Promise(res => { const id = ++n; const h = e => { const x = JSON.parse(e.data); if (x.id === id) { ws.removeEventListener('message', h); res(x) } }; ws.addEventListener('message', h); ws.send(JSON.stringify({ id, method, params })) })

const sizes = files.map(size)
const r = await call('Runtime.evaluate', { returnByValue: true, awaitPromise: true, expression: `(async () => {
  const f = new FontFace('Manrope', 'url(data:font/woff2;base64,${font})', { weight: '200 800' });
  await f.load(); document.fonts.add(f);
  if (!document.fonts.check('800 40px Manrope')) throw new Error('Manrope did not load');
  return ${JSON.stringify(sizes)}.map(([w, h]) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.fillStyle = '#5B21A8'; g.fillRect(0, 0, w, h);
    const base = Math.min(w, h * 0.5625);           // the portrait width this layout is drawn for
    const ws = Math.round(base * 0.118);           // wordmark size, as clamp(38px, 11vw, 80px) at phone scale
    g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.fillStyle = '#FFFFFF';
    g.font = '800 ' + ws + 'px Manrope';
    if ('letterSpacing' in g) g.letterSpacing = Math.round(ws * 0.06) + 'px';
    g.shadowColor = 'rgba(255,255,255,.18)'; g.shadowBlur = ws * 0.3;
    const cy = h * 0.5;
    g.fillText('SAMBRAMO', w / 2, cy);
    g.shadowBlur = 0;
    if ('letterSpacing' in g) g.letterSpacing = '0px';
    // the tagline: "Event booking" on a highlighter pill, then "done in minutes"
    const ts = Math.round(base * 0.046);
    const lead = 'Event booking', rest = ' done in minutes';
    g.font = '800 ' + ts + 'px Manrope'; const lw = g.measureText(lead).width;
    g.font = '600 ' + ts + 'px Manrope'; const rw = g.measureText(rest).width;
    const pad = ts * 0.28, total = lw + pad * 2 + rw, x0 = w / 2 - total / 2, ty = cy + ws * 0.62 + ts;
    const pill = g.createLinearGradient(x0, 0, x0 + lw + pad * 2, 0); pill.addColorStop(0, '#FDE68A'); pill.addColorStop(1, '#F9A8D4');
    g.fillStyle = pill;
    const rx = ts * 0.35, px = x0, py = ty - ts * 0.92, pw = lw + pad * 2, ph = ts * 1.3;
    g.beginPath(); g.roundRect ? g.roundRect(px, py, pw, ph, rx) : g.rect(px, py, pw, ph); g.fill();
    g.textAlign = 'left';
    g.fillStyle = '#1A0838'; g.font = '800 ' + ts + 'px Manrope'; g.fillText(lead, x0 + pad, ty);
    g.fillStyle = 'rgba(255,255,255,.94)'; g.font = '600 ' + ts + 'px Manrope'; g.fillText(rest, x0 + pw, ty);
    return c.toDataURL('image/png').split(',')[1];
  });
})()` })
if (r.result?.exceptionDetails) { console.error(r.result.exceptionDetails.exception?.description ?? 'draw failed'); done(1) }
r.result.result.value.forEach((b64, k) => { writeFileSync(files[k], Buffer.from(b64, 'base64')); console.log(`  ${files[k].replace(ROOT, '')} ${sizes[k].join('x')}`) })
done(0)
