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
        globPatterns: ['**/*.{js,css,html,svg,webmanifest}']
      }
    })
  ]
});
