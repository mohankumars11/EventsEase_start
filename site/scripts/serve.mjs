/**
 * Static server for dist/, matching what Vercel will do.
 *
 * Port 4321, not 4173 — that is Vite's preview port, and a clash while the
 * app is also running is a confusing twenty minutes.
 *
 * It reproduces the two behaviours that decide whether a link works in
 * production: `trailingSlash: true` (308 to the slashed form) and directory
 * indexes. Serving those differently locally is how a site passes every
 * local check and 404s on deploy.
 */
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIST = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const PORT = Number(process.env.PORT ?? 4321)

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
}

const send = (res, code, body, type = 'text/plain; charset=utf-8') => {
  res.writeHead(code, { 'Content-Type': type }); res.end(body)
}

createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost')
  let p = decodeURIComponent(url.pathname)

  // No traversal above dist, whatever the client sends.
  const safe = normalize(p).replace(/^(\.\.[/\\])+/, '')
  let file = join(DIST, safe)

  // A file with an extension is served as-is.
  if (extname(safe) && existsSync(file) && statSync(file).isFile()) {
    res.writeHead(200, {
      'Content-Type': TYPES[extname(safe).toLowerCase()] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    })
    return createReadStream(file).pipe(res)
  }

  // trailingSlash: true — everything else canonicalises to a slashed path.
  if (!p.endsWith('/')) {
    res.writeHead(308, { Location: p + '/' + url.search })
    return res.end()
  }

  file = join(DIST, safe, 'index.html')
  if (existsSync(file)) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
    return createReadStream(file).pipe(res)
  }

  const notFound = join(DIST, '404', 'index.html')
  if (existsSync(notFound)) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' })
    return createReadStream(notFound).pipe(res)
  }
  send(res, 404, 'Not found')
}).listen(PORT, () => {
  console.log(`\nsambramo.com → http://localhost:${PORT}/\n`)
})
