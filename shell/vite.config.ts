import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icons/shell-icon.svg', 'icons/maskable-shell-icon.svg'],
      manifest: {
        id: '/',
        name: 'PWA Platform Shell',
        short_name: 'PWA Shell',
        description: 'Installable homescreen shell for the modular PWA platform.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#f4ebd7',
        theme_color: '#a44a3f',
        icons: [
          {
            src: '/icons/shell-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: '/icons/maskable-shell-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,webmanifest}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname === '/generated/app-registry.json',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'app-registry',
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  server: {
    host: '0.0.0.0',
    port: 4173
  },
  preview: {
    host: '0.0.0.0',
    port: 4173
  }
});
