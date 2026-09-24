#!/usr/bin/env node
/**
 * The /api functions, served from this machine.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WHY THIS EXISTS
 * ══════════════════════════════════════════════════════════════════════
 *
 * The apk calls `https://sambramoh.vercel.app/api/...`, and that host
 * deploys from a branch which does not have `verify-document.js`. So
 * document classification 404s on every upload, degrades to
 * `unavailable`, and the partner's document sails through unchecked --
 * indistinguishable, from the partner's side, from having no classifier
 * at all.
 *
 * Deploying is the real fix. This is the one that works in the next
 * five minutes, needs nobody's permission and touches nothing anyone
 * else is using: run it here, point the apk at this machine, and the
 * phone gets a real answer over the LAN.
 *
 *   node --env-file=.env scripts/serve-api-local.mjs
 *
 * It prints the LAN url to put in VITE_API_ORIGIN. Both devices have to
 * be on the same wifi -- a phone on mobile data cannot reach a laptop.
 *
 * ── It is not a Vercel emulator ─────────────────────────────────────
 * It imports the same handler files and hands them a req/res pair shaped
 * the way they expect. `req.body` is parsed here because Vercel does
 * that before the handler sees it; everything else the handlers use is
 * plain Node. If a handler starts using something Vercel-specific this
 * will be the thing that breaks, and the fix is to add it here rather
 * than to change the handler.
 */
import { createServer } from 'node:http'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { networkInterfaces } from 'node:os'
import { pathToFileURL } from 'node:url'
import { ROOT } from './lib/loadSrc.mjs'

const PORT = Number(process.env.API_PORT ?? 4000)
const API = join(ROOT, 'api')

/* Loaded once each, on first use. A cold import inside the request
   would put a second or two in front of a partner holding a card. */
const loaded = new Map()
async function handlerFor(name) {
  if (loaded.has(name)) return loaded.get(name)
  const file = join(API, `${name}.js`)
  if (!existsSync(file)) return null
  const mod = await import(pathToFileURL(file).href)
  const fn = mod.default ?? null
  loaded.set(name, fn)
  return fn
}

/* Vercel's response object, to the extent the handlers use it. Each
   method returns `res` so `res.status(200).json(x)` chains. */
function wrap(res) {
  res.status = code => { res.statusCode = code; return res }
  res.json = body => {
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify(body))
    return res
  }
  res.send = body => { res.end(body); return res }
  return res
}

const readBody = req => new Promise((resolve, reject) => {
  const chunks = []
  let size = 0
  req.on('data', c => {
    size += c.length
    /* A base64 image of 10 MB is ~13.4 MB of JSON. 24 is room for that
       plus the envelope, and a hard stop rather than an OOM. */
    if (size > 24 * 1024 * 1024) { reject(new Error('body too large')); req.destroy() }
    chunks.push(c)
  })
  req.on('end', () => {
    const raw = Buffer.concat(chunks).toString('utf8')
    if (!raw) return resolve({})
    try { resolve(JSON.parse(raw)) } catch { resolve({}) }
  })
  req.on('error', reject)
})

const server = createServer(async (req, res) => {
  wrap(res)

  /* The apk's origin is `https://partner.sambramo.app`, a WebView-local
     scheme that is not this server -- so every call is cross-origin and
     preflighted. Wide open on purpose: this binds to a LAN address, on
     a developer's machine, with a real Supabase JWT still required by
     every handler that touches data. */
  res.setHeader('access-control-allow-origin', '*')
  res.setHeader('access-control-allow-headers', 'authorization, content-type')
  res.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS')
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end() }

  const path = new URL(req.url, 'http://x').pathname
  if (path === '/health') return res.status(200).json({ ok: true, at: new Date().toISOString() })

  const name = path.replace(/^\/api\//, '').replace(/\/+$/, '')
  if (!path.startsWith('/api/') || !/^[a-z0-9-]+$/.test(name)) {
    return res.status(404).json({ error: 'no such endpoint' })
  }

  const fn = await handlerFor(name)
  if (!fn) return res.status(404).json({ error: `api/${name}.js does not exist` })

  try {
    req.body = req.method === 'POST' ? await readBody(req) : {}
  } catch (e) {
    return res.status(413).json({ error: String(e.message) })
  }

  const started = Date.now()
  try {
    await fn(req, res)
  } catch (err) {
    console.error(`  ! ${name}: ${err?.message ?? err}`)
    if (!res.headersSent) res.status(500).json({ error: 'handler threw' })
  }
  console.log(`  ${String(res.statusCode).padEnd(3)} ${req.method} ${path}   ${Date.now() - started}ms`)
})

function lanAddresses() {
  const out = []
  for (const [name, addrs] of Object.entries(networkInterfaces())) {
    for (const a of addrs ?? []) {
      if (a.family === 'IPv4' && !a.internal) out.push({ name, address: a.address })
    }
  }
  return out
}

server.listen(PORT, '0.0.0.0', () => {
  const tick = String.fromCharCode(10003)
  console.log('')
  console.log(`${tick} api server listening on port ${PORT}`)
  console.log('')
  const lan = lanAddresses()
  if (!lan.length) {
    console.log('  No LAN address found. The phone will not be able to reach this.')
  } else {
    console.log('  Put ONE of these in .env.android as VITE_API_ORIGIN, then rebuild the apk:')
    console.log('')
    for (const { name, address } of lan) {
      console.log(`    VITE_API_ORIGIN=http://${address}:${PORT}      (${name})`)
    }
    console.log('')
    console.log('  The phone must be on the same wifi. Mobile data cannot reach this machine.')
    console.log(`  Check from the phone's browser first: http://${lan[0].address}:${PORT}/health`)
  }
  console.log('')
  console.log('  Windows will likely ask to allow node through the firewall. Say yes to')
  console.log('  Private networks. Without it the phone gets a connection timeout.')
  console.log('')
})
