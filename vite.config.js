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
