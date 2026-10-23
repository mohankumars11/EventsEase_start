#!/usr/bin/env node
/**
 * The customer app's 3D illustrations, from source image to app asset.
 *
 *   node scripts/customer-art.mjs import            # generated-images/*.png → src/customer/art/*.webp
 *   node scripts/customer-art.mjs import --force    # re-encode even if the webp exists
 *   node scripts/customer-art.mjs crop <src.png> <spec.json>
 *
 * `import` takes the 1024×1024 PNGs scripts/generate_images.py writes and
 * makes a 512×512 WebP of each, named by the same id (cat-wedding,
 * occ-haldi-ceremony, svc-photography). 490 PNGs at ~1.5 MB would be a
 * 700 MB apk; 490 WebPs at 512 are ~20 MB. The app finds them by file name
 * (src/customer/data/art.js), so dropping a file in is the whole wiring.
 *
 * `crop` cuts named regions out of one image — spec is
 * [{ "id": "cat-wedding", "x": 0, "y": 0, "w": 100, "h": 100 }, …] in
 * source pixels — and writes them at their own size. Used for stand-in art
 * cut from a mock-up until the generated set exists.
 *
 * No image library is installed on this machine (no sharp, no PIL), so the
 * resizing is done by headless Edge's canvas, one browser for the whole run.
 */
import { spawn, execSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')
const ART = join(ROOT, 'src/customer/art')
const [mode, ...rest] = process.argv.slice(2)
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync)
if (!['import', 'crop'].includes(mode)) { console.error('usage: customer-art.mjs import [--force] | crop <src> <spec.json>'); process.exit(2) }

const sleep = ms => new Promise(r => setTimeout(r, ms))
const PORT = 9471 + Math.floor(Math.random() * 40)
const br = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'art-'))}`,
  '--no-first-run', '--disable-gpu', '--renderer-process-limit=1', 'about:blank'], { stdio: 'ignore' })
const done = code => { try { execSync(`taskkill /PID ${br.pid} /T /F`, { stdio: 'ignore' }) } catch { br.kill() } process.exit(code) }

let list
for (let i = 0; i < 50; i++) { await sleep(400); try { list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); if (list.some(t => t.type === 'page')) break } catch { /* not up yet */ } }
if (!list) { console.error('Edge never opened its debugging port'); done(1) }
const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl)
await new Promise(r => ws.addEventListener('open', r))
let n = 0
const call = (method, params) => new Promise(res => {
  const id = ++n
  const h = e => { const x = JSON.parse(e.data); if (x.id === id) { ws.removeEventListener('message', h); res(x) } }
  ws.addEventListener('message', h); ws.send(JSON.stringify({ id, method, params }))
})
/** Draw (sx, sy, sw, sh) of an image into a w×h canvas; return WebP bytes. */
async function draw(file, regions) {
  const data = `data:image/${file.endsWith('.jpg') ? 'jpeg' : 'png'};base64,` + readFileSync(file).toString('base64')
  const r = await call('Runtime.evaluate', { returnByValue: true, awaitPromise: true, expression: `(async()=>{
    const i=new Image();i.src=${JSON.stringify(data)};await i.decode();
    return ${JSON.stringify(regions)}.map(([sx,sy,sw,sh,w,h])=>{
      sw=sw||i.naturalWidth;sh=sh||i.naturalHeight;
      const c=document.createElement('canvas');c.width=w||sw;c.height=h||sh;
      const g=c.getContext('2d');g.imageSmoothingQuality='high';g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);
      g.drawImage(i,sx,sy,sw,sh,0,0,c.width,c.height);return c.toDataURL('image/webp',0.84).split(',')[1]})})()` })
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description ?? 'draw failed')
  return r.result.result.value.map(b => Buffer.from(b, 'base64'))
}

mkdirSync(ART, { recursive: true })
if (mode === 'import') {
  const from = join(ROOT, 'generated-images')
  const force = rest.includes('--force')
  const pngs = existsSync(from) ? readdirSync(from).filter(f => /^(cat|occ|svc|hero)-[a-z0-9_-]+\.png$/.test(f)) : []
  const todo = pngs.filter(f => force || !existsSync(join(ART, f.replace(/\.png$/, '.webp'))))
  console.log(`${pngs.length} generated, ${todo.length} to import`)
  for (const f of todo) {
    // the hero is generated 1536x1024 and shown wide; everything else is a square
    const [webp] = await draw(join(from, f), [f.startsWith('hero-') ? [0, 0, 0, 0, 960, 640] : [0, 0, 0, 0, 512, 512]])
    writeFileSync(join(ART, f.replace(/\.png$/, '.webp')), webp)
    console.log(`  ${f} → ${(webp.length / 1024).toFixed(0)} KB`)
  }
} else {
  const [src, spec] = rest
  const regions = JSON.parse(readFileSync(spec, 'utf8'))
  const out = await draw(src, regions.map(r => [r.x, r.y, r.w, r.h, r.outW, r.outH]))
  regions.forEach((r, k) => { writeFileSync(join(ART, `${r.id}.webp`), out[k]); console.log(`  ${r.id}.webp ${(out[k].length / 1024).toFixed(0)} KB`) })
}
done(0)
