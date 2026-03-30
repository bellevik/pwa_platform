import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const appSlug = '__APP_SLUG__';
const routeBase = `/${appSlug}/`;

export default defineConfig({
  base: routeBase,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      manifest: {
        id: routeBase,
        name: '__APP_NAME__',
        short_name: '__APP_NAME__',
        description: '__APP_DESCRIPTION__',
        start_url: routeBase,
        scope: routeBase,
        display: 'standalone',
        background_color: '#f7f3e8',
        theme_color: '#28536b',
        icons: [
          {
            src: `${routeBase}icons/app-icon.svg`,
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: `${routeBase}icons/app-maskable.svg`,
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,svg,webmanifest}'],
        skipWaiting: true
      }
    })
  ]
});
