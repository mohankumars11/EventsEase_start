import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * Serve `api/*.js` from the dev server.
 *
 * ── Why this exists ─────────────────────────────────────────────────
 * `api/` is Vercel serverless. In production Vercel runs those files; in
 * development nothing does, so every endpoint 404s and the only way to
 * exercise a payment or a dispatch is to deploy. That is a terrible loop
 * for a feature whose whole point is a race condition.
 *
 * `vercel dev` is the official answer and it is heavy — it boots a second
 * server, wants a linked project, and on a 3.9 GB box it competes with
 * Vite for the memory Vite is already short of.
 *
 * ── Why `ssrLoadModule` rather than a plain import ──────────────────
 * Node cannot load these handlers directly once they import from `src/`:
 * the sources use extensionless relative imports that Node's ESM
 * resolver will not follow. `ssrLoadModule` runs them through Vite's own
 * resolution — the same one the browser build uses — so a handler can
 * import the real pricing engine instead of carrying a second copy of
 * the rate card that drifts.
 *
 * It also hot-reloads, so editing a handler does not need a restart.
 *
 * ── Dev only ────────────────────────────────────────────────────────
 * `apply: 'serve'` keeps every byte of this out of the production bundle.
 * On Vercel the real runtime serves these files and this plugin does not
 * exist.
 */
function devApi() {
  return {
    name: 'sambramo-dev-api',
    apply: 'serve',

    /**
     * Put `.env` into `process.env`, the way Vercel does.
     *
     * Vite loads `.env` into `import.meta.env` for CLIENT code, and only
     * the `VITE_`-prefixed half of it. A serverless handler reads
     * `process.env.SUPABASE_SERVICE_ROLE_KEY` — deliberately unprefixed,
     * because a service-role key that reached the browser bundle would be
     * a full database bypass shipped to every visitor.
     *
     * So in dev those variables are simply absent and every handler
     * fails on a missing key, which looks like a broken endpoint rather
     * than a missing environment. This closes that gap and nothing else:
     * `loadEnv(mode, root, '')` reads the same file Vercel's dashboard
     * mirrors, and it never touches the client bundle.
     */
    config(_, { mode }) {
      const env = loadEnv(mode, process.cwd(), '')
      for (const [k, v] of Object.entries(env)) {
        if (process.env[k] === undefined) process.env[k] = v
      }
    },

    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next()

        const route = req.url.split('?')[0].replace(/^\/api\//, '').replace(/\/$/, '')
        if (!/^[a-z0-9-]+$/i.test(route)) return next()

        let mod
        try {
          mod = await server.ssrLoadModule(`/api/${route}.js`)
        } catch (err) {
          if (String(err?.message ?? '').includes('Failed to load url')) return next()
          server.config.logger.error(`[dev-api] ${route}: ${err.stack ?? err}`)
          res.statusCode = 500
          res.setHeader('content-type', 'application/json')
          return res.end(JSON.stringify({ error: 'Handler failed to load', detail: String(err?.message ?? err) }))
        }

        // Vercel hands the handler a parsed body. Vite does not, so the
        // stream is read here — except where the handler has opted out
        // (`config.api.bodyParser === false`), which the Razorpay webhook
        // does because its signature is an HMAC over the exact bytes.
        const wantsRaw = mod.config?.api?.bodyParser === false
        if (!wantsRaw && req.method !== 'GET' && req.method !== 'HEAD') {
          const chunks = []
          for await (const c of req) chunks.push(c)
          const raw = Buffer.concat(chunks).toString('utf8')
          try { req.body = raw ? JSON.parse(raw) : {} } catch { req.body = {} }
        }

        // The handful of Express-ish helpers the handlers actually use.
        res.status = code => { res.statusCode = code; return res }
        res.json = payload => {
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify(payload))
          return res
        }

        try {
          await mod.default(req, res)
        } catch (err) {
          server.config.logger.error(`[dev-api] ${route}: ${err.stack ?? err}`)
          if (!res.writableEnded) {
            res.statusCode = 500
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ error: String(err?.message ?? err) }))
          }
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    devApi(),
    VitePWA({
      /* Off inside the native build.
       *
       * A service worker precaching the app shell is the right thing on
       * the web and actively harmful in a WebView: the assets are
       * already local, so the cache buys nothing, and it introduces a
       * second copy of the app that can be served instead of the one
       * that was installed. That is how a relaunch kept showing code
       * from hours earlier.
       *
       * Set by the Android workflow before `vite build`. */
      disable: process.env.CAPACITOR_BUILD === 'true',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-512.png', 'icon-maskable-512.png'],
      manifest: {
        name: 'Sambramo — Celebrations, arranged. Nothing left to chance.',
        short_name: 'Sambramo',
        description:
          'A real coordinator arranges your celebration end to end — venue, decor, catering, photography and the priest — and brings back one clear price.',
        /* Both are the aqua ground, not white.
           `background_color` is what Android paints for the split-second
           between tapping the icon and the WebView painting its first
           frame. White there meant a white flash, then an aqua splash —
           a visible blink on every single cold start. Matching it to the
           splash's own deep corner makes the launch look continuous. */
        theme_color: '#1B5C73',
        background_color: '#1B5C73',
        display: 'standalone',
        start_url: '/',
        /* ── PNG, not SVG, and why ────────────────────────────────────
           The icon is the WORDMARK — "Sambramo" in white on the Comfortable
           Aqua ground — and a standalone SVG used as an app icon cannot load
           a webfont. It would fall back to whatever face the launcher
           happens to have, which for a wordmark is the difference between a
           logo and some text.

           So both files are rendered by a browser that already has Playfair
           Display, at 1024 and downscaled — see
           scripts/render-brand-assets.mjs, which also holds the gradient
           stops in the one other place they are written outside index.css.

           Two purposes, deliberately. `maskable` bleeds the gradient to
           every edge with the word at 60% of the width, because Android
           crops it to whatever shape the launcher wants and only a centred
           circle of 80% diameter is guaranteed to survive; `any` keeps its
           own rounded square for the platforms that do not crop. Shipping
           one file for both is how an icon ends up either clipped or
           floating in a white box. */
        icons: [
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
