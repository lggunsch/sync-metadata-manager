import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      workbox: {
        // Don't precache the Essentia bundle — it's 2.5MB and only needed
        // when an artist uploads audio. Cache it at runtime instead.
        globIgnores: ['**/essentia*.js'],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/essentia.*\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'essentia-cache',
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },
      manifest: {
        name: 'FriedSoda Music',
        short_name: 'FSM',
        description: 'Sync Metadata Manager for independent artists',
        theme_color: '#030712',
        background_color: '#030712',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})