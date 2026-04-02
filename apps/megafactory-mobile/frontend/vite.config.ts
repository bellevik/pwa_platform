import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const appSlug = 'megafactory-mobile';
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
        name: 'Pocket Megafactory',
        short_name: 'Pocket Megafactory',
        description: 'Portrait-only offline-first consumer-tech factory sim with cloud backup',
        start_url: routeBase,
        scope: routeBase,
        display: 'standalone',
        background_color: '#f5f2e9',
        theme_color: '#0f766e',
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
