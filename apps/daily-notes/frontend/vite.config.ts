import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const appSlug = 'daily-notes';
const routeBase = `/${appSlug}/`;

export default defineConfig({
  base: routeBase,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['apple-touch-icon.png', 'app-icon-192.png', 'app-icon-512.png', 'app-maskable-512.png'],
      manifest: {
        id: routeBase,
        name: 'Daily Notes',
        short_name: 'Daily Notes',
        description: 'Quick capture notes app used to prove the generated static app workflow',
        start_url: routeBase,
        scope: routeBase,
        display: 'standalone',
        background_color: '#f5f0ff',
        theme_color: '#5f4bb6',
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
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}']
      }
    })
  ]
});
