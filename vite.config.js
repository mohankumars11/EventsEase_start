import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-maskable.svg'],
      manifest: {
        name: 'Sambramo — Celebrations, arranged. Nothing left to chance.',
        short_name: 'Sambramo',
        description:
          'A real coordinator arranges your celebration end to end — venue, decor, catering, photography and the priest — and brings back one clear price.',
        theme_color: '#2e1065',
        background_color: '#FFF8F0',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
