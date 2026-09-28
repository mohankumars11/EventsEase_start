/**
 * Serve a harness page: real components from src/, bundled by esbuild
 * the way Vite resolves them, styled by the app's own built stylesheet,
 * and a Supabase client pointed at a stub URL that cannot reach any
 * real project. Same approach as scripts/shoot-components.mjs.
 */
import { createServer } from 'node:http'
import { mkdtempSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import esbuild from 'esbuild'

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

export async function serveHarness(scene, port = 4361) {
  const assets = join(ROOT, 'dist', 'assets')
  if (!existsSync(assets)) throw new Error('dist/ is missing: run `npm run build` first (the harness uses its stylesheet).')
  const css = readdirSync(assets).find(f => /^index-.*\.css$/.test(f))
  if (!css) throw new Error('no dist/assets/index-*.css')

  const tmp = mkdtempSync(join(tmpdir(), 'sb-selenium-'))
  const entry = join(tmp, 'entry.jsx')
  writeFileSync(entry, [
    `import React from 'react'`,
    `import { createRoot } from 'react-dom/client'`,
    `import Scene from ${JSON.stringify(resolve(ROOT, scene))}`,
    `import { ToastProvider } from ${JSON.stringify(join(ROOT, 'src/context/ToastContext.jsx'))}`,
    `createRoot(document.getElementById('root')).render(React.createElement(ToastProvider, null, React.createElement(Scene)))`,
    `window.__mounted = true`,
  ].join('\n'))
  const bundle = join(tmp, 'bundle.js')
  await esbuild.build({
    entryPoints: [entry], bundle: true, outfile: bundle, format: 'esm', jsx: 'automatic',
    loader: { '.js': 'jsx', '.jsx': 'jsx' }, resolveExtensions: ['.jsx', '.js', '.json'],
    define: {
      'process.env.NODE_ENV': '"production"',
      'import.meta.env': JSON.stringify({
        VITE_SUPABASE_URL: 'http://127.0.0.1:9/stub', VITE_SUPABASE_ANON_KEY: 'stub-anon-key',
        VITE_SURFACE: 'partner', MODE: 'production', DEV: false, PROD: true,
      }),
    },
    absWorkingDir: ROOT, nodePaths: [join(ROOT, 'node_modules')], logLevel: 'warning',
  })
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="/app.css"><style>html,body{margin:0;background:#fff}</style>
<div id="root"></div><script type="module" src="/bundle.js"></script>`
  const server = createServer((req, res) => {
    const u = req.url.split('?')[0]
    if (u === '/app.css') { res.setHeader('content-type', 'text/css'); return res.end(readFileSync(join(assets, css))) }
    if (u === '/bundle.js') { res.setHeader('content-type', 'text/javascript'); return res.end(readFileSync(bundle)) }
    res.setHeader('content-type', 'text/html'); res.end(html)
  })
  await new Promise((ok, fail) => { server.once('error', fail); server.listen(port, ok) })
  return { url: `http://127.0.0.1:${port}/`, close: () => new Promise(r => server.close(r)) }
}

/**
 * Serve the built app itself (dist/, the partner surface) with the SPA
 * fallback Vercel gives it, for the end-to-end suites.
 */
export async function serveApp(port = 4371) {
  const dist = join(ROOT, 'dist')
  if (!existsSync(join(dist, 'index.html'))) throw new Error('dist/ is missing: build the partner surface first.')
  const TYPES = { js: 'text/javascript', css: 'text/css', html: 'text/html', json: 'application/json',
                  svg: 'image/svg+xml', png: 'image/png', webp: 'image/webp', ico: 'image/x-icon', woff2: 'font/woff2' }
  const server = createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0])
    let file = join(dist, p)
    if (!file.startsWith(dist) || !existsSync(file) || p === '/' || !/\.[a-z0-9]+$/i.test(p)) file = join(dist, 'index.html')
    res.setHeader('content-type', TYPES[file.split('.').pop()] ?? 'application/octet-stream')
    res.end(readFileSync(file))
  })
  await new Promise((ok, fail) => { server.once('error', fail); server.listen(port, ok) })
  return { url: `http://127.0.0.1:${port}`, close: () => new Promise(r => server.close(r)) }
}
