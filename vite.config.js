import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-512.png', 'icon-maskable-512.png'],
      manifest: {
        name: 'Sambramo — Celebrations, arranged. Nothing left to chance.',
        short_name: 'Sambramo',
        description:
          'A real coordinator arranges your celebration end to end — venue, decor, catering, photography and the priest — and brings back one clear price.',
        theme_color: '#FFFFFF',
        background_color: '#FFFFFF',
        display: 'standalone',
        start_url: '/',
        /* ── PNG, not SVG, and why ────────────────────────────────────
           These were two hand-drawn SVGs of the old kolam on plum. The mark
           is a Spencerian capital now, set in a webfont — and a standalone
           SVG used as an app icon cannot load an external font, so the icon
           could not be the logo the app actually draws.

           So they are rendered: the real Monogram component, on the real
           navy, exported at 1024 through the browser that already has the
           font. The icon is now the same object as the mark on the splash
           rather than a second drawing of it that can drift.

           Two purposes, deliberately. `maskable` bleeds navy to every edge
           with the letter at 55%, because Android crops it to whatever shape
           the launcher wants; `any` keeps its own rounded square for the
           platforms that do not crop. Shipping one file for both is how an
           icon ends up either clipped or floating in a white square. */
        icons: [
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
