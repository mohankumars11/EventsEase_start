import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync, mkdtempSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
const [src, outPrefix, partH = '1600'] = process.argv.slice(2)
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(existsSync)
const PORT = 9391 + Math.floor(Math.random() * 50), prof = mkdtempSync(join(tmpdir(), 'crop-'))
const br = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`, '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore' })
const sleep = ms => new Promise(r => setTimeout(r, ms))
let list; for (let i = 0; i < 40; i++) { await sleep(400); try { list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); if (list.some(t => t.type === 'page')) break } catch {} }
const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.addEventListener('open', r))
let id = 0; const call = (m, p) => new Promise(res => { const n = ++id; const h = e => { const x = JSON.parse(e.data); if (x.id === n) { ws.removeEventListener('message', h); res(x) } }; ws.addEventListener('message', h); ws.send(JSON.stringify({ id: n, method: m, params: p })) })
const data = 'data:image/png;base64,' + readFileSync(src).toString('base64')
const r = await call('Runtime.evaluate', { returnByValue: true, awaitPromise: true, expression: `(async()=>{const i=new Image();i.src=${JSON.stringify(data)};await i.decode();const H=${Number(partH)},out=[];for(let y=0;y<i.naturalHeight;y+=H){const c=document.createElement('canvas');c.width=i.naturalWidth;c.height=Math.min(H,i.naturalHeight-y);c.getContext('2d').drawImage(i,0,-y);out.push(c.toDataURL('image/png').split(',')[1])}return out})()` })
const parts = r.result.result.value
parts.forEach((b64, k) => writeFileSync(`${outPrefix}-${k + 1}.png`, Buffer.from(b64, 'base64')))
console.log(src.split('/').pop(), 'parts', parts.length); br.kill()
