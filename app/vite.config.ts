import { defineConfig } from 'vitest/config'
import preact from '@preact/preset-vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,json,woff2}'], navigateFallback: 'index.html' },
      manifest: {
        name: 'GearCard',
        short_name: 'GearCard',
        description: 'Offline field reference for a Nikon Z kit',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#FBFAF7',
        theme_color: '#FBFAF7',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  server: { fs: { allow: ['..'] } },
  test: { include: ['tests/**/*.test.ts'] },
})
