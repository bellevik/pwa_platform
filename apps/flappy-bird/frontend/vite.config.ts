import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const appSlug = 'flappy-bird';
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
        name: 'Flappy Bird Clone',
        short_name: 'Flappy Bird',
        description: 'Arcade-style Flappy Bird clone with touch controls, local best score tracking, and offline PWA installability',
        start_url: routeBase,
        scope: routeBase,
        display: 'standalone',
        background_color: '#c8f1ff',
        theme_color: '#0c8aa5',
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
