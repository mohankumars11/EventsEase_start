#!/usr/bin/env node
/**
 * Screenshot one page of the local static server, through headless Edge.
 *
 *   node scripts/shoot-page.mjs / shots/home.png --desktop
 *   node scripts/shoot-page.mjs /occasions/wedding/ shots/w.png --no-js
 *
 * Adapted from scripts/shoot.mjs at the repo root — same CDP-over-WebSocket
 * approach, no Playwright, no dependency. Three differences:
 *
 *   --desktop   1440x900 instead of the app driver's fixed 430x932 phone
 *   --no-js     Emulation.setScriptExecutionDisabled before navigating
 *   --full      full-page capture rather than the viewport
 *
 * ONE ROUTE PER LAUNCH, and that is deliberate rather than lazy: the root
 * driver's header records that on this 3.9 GB box a browser kept alive
 * across several routes takes the server down with it. Each run starts a
 * browser, shoots one page, and kills it.
 *
 * WHY --no-js MATTERS HERE MORE THAN ANYWHERE
 *
 * This site ships no JavaScript at all, because the crawlers it exists to
 * reach do not run any. So the --no-js shot must be byte-identical to the
 * normal one. That equality IS the proof, and it is worth capturing rather
 * than asserting.
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

const [route, outFile, ...rest] = process.argv.slice(2)
if (!route || !outFile) {
  console.error('usage: node scripts/shoot-page.mjs <route> <out.png> [--desktop] [--no-js] [--full] [--base url]')
  process.exit(1)
}
const has = f => rest.includes(`--${f}`)
const flag = (n, d) => { const i = rest.indexOf(`--${n}`); return i === -1 ? d : rest[i + 1] }

const base = flag('base', 'http://localhost:4321')
const [w, hgt] = has('desktop') ? [1440, 900] : [430, 932]

const EDGE = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find(existsSync)
if (!EDGE) { console.error('Edge not found'); process.exit(1) }

const port = 9222 + Math.floor(Math.random() * 400)
const profile = mkdtempSync(join(tmpdir(), 'shoot-site-'))
const edge = spawn(EDGE, [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  `--window-size=${w},${hgt}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--disable-dev-shm-usage',
  'about:blank',
], { stdio: 'ignore' })

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function targetUrl() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/list`)
      const p = (await r.json()).find(t => t.type === 'page')
      if (p?.webSocketDebuggerUrl) return p.webSocketDebuggerUrl
    } catch { /* not up yet */ }
    await sleep(250)
  }
  throw new Error('Edge never opened its debugging port')
}

let id = 0
const rpc = (ws, method, params = {}) => new Promise((resolve, reject) => {
  const mine = ++id
  const on = ev => {
    const m = JSON.parse(ev.data)
    if (m.id !== mine) return
    ws.removeEventListener('message', on)
    m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)
  }
  ws.addEventListener('message', on)
  ws.send(JSON.stringify({ id: mine, method, params }))
})

try {
  const ws = new WebSocket(await targetUrl())
  await new Promise(r => ws.addEventListener('open', r, { once: true }))
  await rpc(ws, 'Page.enable')
  await rpc(ws, 'Runtime.enable')

  if (has('no-js')) await rpc(ws, 'Emulation.setScriptExecutionDisabled', { value: true })

  await rpc(ws, 'Page.navigate', { url: base + route })
  await sleep(Number(flag('wait', 1500)))

  /* document.fonts.ready resolves even when a @font-face FAILED, so waiting
     on it alone measures the fallback and photographs it. Assert the real
     faces are loaded — the same trap the app's own headless measurements hit. */
  const fontsOk = await rpc(ws, 'Runtime.evaluate', {
    expression: `document.fonts.ready.then(() => [
      document.fonts.check('800 32px "Playfair Display"'),
      document.fonts.check('400 16px "Manrope"'),
      document.fonts.check('400 20px "Sambramo Display"'),
    ])`,
    awaitPromise: true, returnByValue: true,
  }).then(r => r.result?.value)
  if (!fontsOk?.every(Boolean)) {
    console.warn(`  ! fonts not all loaded: Playfair=${fontsOk?.[0]} Manrope=${fontsOk?.[1]} Archivo=${fontsOk?.[2]}`)
  }

  const shot = await rpc(ws, 'Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: has('full'),
    ...(has('full') ? {} : { clip: undefined }),
  })
  mkdirSync(dirname(outFile), { recursive: true })
  writeFileSync(outFile, Buffer.from(shot.data, 'base64'))
  console.log(`  ${outFile}  ${w}x${hgt}${has('no-js') ? ' no-js' : ''}`)
} finally {
  edge.kill()
  try { rmSync(profile, { recursive: true, force: true }) } catch { /* Windows holds the lock briefly */ }
  // Edge spawns a tree of helper processes and killing the parent does not
  // reap them, so Node sits waiting on their stdio and the script never
  // exits. On a 3.9 GB box a pile of orphaned renderers is not a cosmetic
  // problem, so exit hard and let the OS clean up.
  process.exit(0)
}
