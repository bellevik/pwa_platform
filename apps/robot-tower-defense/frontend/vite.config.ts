import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const appSlug = 'robot-tower-defense';
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
          name: 'Robot Tower Defense',
          short_name: 'Robot TD',
          description: 'Portrait-first robot tower defense campaign with fixed pads, manual wave starts, and offline PWA play',
          start_url: routeBase,
          scope: routeBase,
          display: 'standalone',
          background_color: '#071017',
          theme_color: '#0e2432',
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
        globPatterns: ['**/*.{js,css,html,svg,webmanifest,png}'],
        skipWaiting: true
      }
    })
  ]
});
