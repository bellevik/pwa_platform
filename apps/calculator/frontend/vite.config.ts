import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const appSlug = 'calculator';
const routeBase = `/${appSlug}/`;

export default defineConfig({
  base: routeBase,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['apple-touch-icon.png', 'app-icon-192.png', 'app-icon-512.png', 'app-maskable-512.png'],
      manifest: {
        id: routeBase,
        name: 'Calculator',
        short_name: 'Calculator',
        description: 'Futuristic neumorphic calculator with persistent local history and tactile sci-fi controls',
        start_url: routeBase,
        scope: routeBase,
        display: 'standalone',
        background_color: '#0d1422',
        theme_color: '#182235',
        icons: [
          {
            src: `${routeBase}apple-touch-icon.png`,
            sizes: '180x180',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: `${routeBase}app-icon-192.png`,
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: `${routeBase}app-icon-512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: `${routeBase}app-maskable-512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        skipWaiting: true
      }
    })
  ]
});
