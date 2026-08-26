#!/usr/bin/env node
/**
 * Screenshot one route of the running dev server, through headless Edge.
 *
 *   node scripts/shoot.mjs /celebrate/vehicle_pooja out.png
 *   node scripts/shoot.mjs /celebrate/housewarming out.png --click "[aria-label='Jump to any part of the plan']"
 *   node scripts/shoot.mjs /celebrate/mundan out.png --taps 3
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 * There is no Playwright in this project and this box does not have the RAM
 * to add one. Edge is already installed, it speaks the DevTools protocol over
 * a websocket, and Node has had a global WebSocket since 22 — so the whole
 * driver is about a hundred lines and no dependency.
 *
 * ── One route per launch ──────────────────────────────────────────────────
 * Deliberate, and not laziness: this is a 3.9 GB machine running Vite, and a
 * browser kept alive across several routes takes the dev server down with it.
 * Each run starts a browser, shoots one page, and kills it.
 *
 * `--click` runs a selector click before the shot, which is how the modal
 * surfaces (the jump sheet, the pairing sheet) get photographed at all —
 * they do not exist in the DOM until something opens them.
 *
 * `--taps N` presses the pinned primary action N times first, to walk the
 * journey forward to a screen that is not the first one.
 */
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const [route, outFile, ...rest] = process.argv.slice(2)
if (!route || !outFile) {
  console.error('usage: node scripts/shoot.mjs <route> <out.png> [--click <sel>] [--taps <n>] [--wait <ms>]')
  process.exit(1)
}
const flag = (name, fallback) => {
  const i = rest.indexOf(`--${name}`)
  return i === -1 ? fallback : rest[i + 1]
}
const clickSel = flag('click', null)
const taps = Number(flag('taps', 0))
const settle = Number(flag('wait', 1400))
const base = flag('base', 'http://localhost:5173')

const EDGE = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find(existsSync)
if (!EDGE) { console.error('Edge not found'); process.exit(1) }

const port = 9222 + Math.floor(Math.random() * 400)
const profile = mkdtempSync(join(tmpdir(), 'shoot-'))
const edge = spawn(EDGE, [
  '--headless=new',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  '--window-size=430,932',          // a phone, because that is what this is for
  '--no-first-run', '--no-default-browser-check',
  '--disable-gpu', '--disable-dev-shm-usage',
  'about:blank',
], { stdio: 'ignore' })

const sleep = ms => new Promise(r => setTimeout(r, ms))

/** The debugger takes a moment to open its port. Poll rather than guess. */
async function targetUrl() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`)
      const page = (await res.json()).find(t => t.type === 'page')
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl
    } catch { /* not up yet */ }
    await sleep(250)
  }
  throw new Error('Edge never opened its debugging port')
}

let id = 0
function rpc(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const mine = ++id
    const onMessage = ev => {
      const msg = JSON.parse(ev.data)
      if (msg.id !== mine) return
      ws.removeEventListener('message', onMessage)
      msg.error ? reject(new Error(`${method}: ${msg.error.message}`)) : resolve(msg.result)
    }
    ws.addEventListener('message', onMessage)
    ws.send(JSON.stringify({ id: mine, method, params }))
  })
}

const evaluate = (ws, expression) =>
  rpc(ws, 'Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    .then(r => r.result?.value)

try {
  const ws = new WebSocket(await targetUrl())
  await new Promise(r => ws.addEventListener('open', r, { once: true }))

  const errors = []
  ws.addEventListener('message', ev => {
    const m = JSON.parse(ev.data)
    if (m.method === 'Runtime.exceptionThrown') {
      errors.push(m.params.exceptionDetails?.exception?.description ?? 'exception')
    }
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      errors.push(m.params.args.map(a => a.value ?? a.description).join(' '))
    }
  })

  await rpc(ws, 'Runtime.enable')
  await rpc(ws, 'Page.enable')
  await rpc(ws, 'Page.navigate', { url: base + route })
  await sleep(settle + 900)

  for (let i = 0; i < taps; i++) {
    await evaluate(ws, `
      (() => {
        const bar = document.querySelector('.fixed.inset-x-0.bottom-0')
        const btn = bar?.querySelector('button:not([disabled])')
        btn?.click()
        return !!btn
      })()`)
    await sleep(700)
  }

  /* Arbitrary page JS before the shot — scrolling a section into view,
     filling a field, opening a disclosure. Anything that is a one-off and
     not worth its own flag. */
  const evalArg = flag('eval', null)
  if (evalArg) {
    await evaluate(ws, evalArg)
    await sleep(600)
  }

  if (clickSel) {
    const hit = await evaluate(ws, `
      (() => { const el = document.querySelector(${JSON.stringify(clickSel)}); el?.click(); return !!el })()`)
    if (!hit) console.warn(`  ! selector matched nothing: ${clickSel}`)
    await sleep(700)
  }

  const heading = await evaluate(ws, `document.querySelector('h1,h2')?.textContent?.trim() ?? '(no heading)'`)
  /* `captureBeyondViewport` stitches the whole scroll height, which is what
     you want for a page and exactly what you do not want for a modal: a
     `position: fixed` sheet is composited at document top in a stitched
     capture, so the pinned action bar and the jump sheet both land in the
     middle of the page instead of over it. `--fold` shoots the viewport
     only, which is the honest picture of an overlay. */
  const fold = rest.includes('--fold')
  const shot = await rpc(ws, 'Page.captureScreenshot', { format: 'png', captureBeyondViewport: !fold })
  writeFileSync(outFile, Buffer.from(shot.data, 'base64'))

  console.log(`${route}  →  ${outFile}`)
  console.log(`  heading: ${heading}`)
  if (errors.length) {
    console.log(`  ${errors.length} console error(s):`)
    for (const e of errors.slice(0, 6)) console.log(`    · ${String(e).slice(0, 200)}`)
  } else {
    console.log('  no console errors')
  }
  ws.close()
} finally {
  edge.kill()
  try { rmSync(profile, { recursive: true, force: true }) } catch { /* windows holds locks */ }
}
