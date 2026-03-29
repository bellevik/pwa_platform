import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const appSlug = 'shopping-list';
const routeBase = `/${appSlug}/`;

export default defineConfig({
  base: routeBase,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        id: routeBase,
        name: 'Shopping List',
        short_name: 'Shopping List',
        description: 'Offline-first shopping list with local queue and sync-ready backend',
        start_url: routeBase,
        scope: routeBase,
        display: 'standalone',
        background_color: '#f7f3e8',
        theme_color: '#28536b',
        icons: [
          {
            src: `${routeBase}icons/app-icon-192.png`,
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: `${routeBase}icons/app-icon-512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: `${routeBase}icons/app-maskable-512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}']
      }
    })
  ]
});
