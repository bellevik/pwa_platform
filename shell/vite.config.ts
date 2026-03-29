import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: [
        'icons/shell-icon.svg',
        'icons/maskable-shell-icon.svg',
        'apple-touch-icon.png',
        'app-icon-192.png',
        'app-icon-512.png',
        'app-maskable-512.png'
      ],
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
            src: '/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/app-icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/app-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/app-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
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
