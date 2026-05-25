import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const base = process.env.VITE_BASE_PATH || '/DS_Estetica_Auto/';

export default defineConfig({
  base,
  logLevel: 'error',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['brand/logo-ds.jpg', 'pwa-192.png', 'pwa-512.png'],
      manifest: {
        name: 'DS Estética Auto — Gestão Estética Automotiva',
        short_name: 'DS Estética',
        description: 'PWA offline DS Estética Auto — gestão de detailing com dados na pasta do aparelho.',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'any',
        lang: 'pt-BR',
        icons: [
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg,png,woff2}'],
        navigateFallback: `${base}index.html`.replace(/\/{2,}/g, '/'),
      },
    }),
  ],
});
