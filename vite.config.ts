import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // Registered conditionally in src/main.tsx (!Capacitor.isNativePlatform())
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,woff2}'],
        globIgnores: ['**/*.apk'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/api\//],
        ignoreURLParametersMatching: [/^v$/],
        additionalManifestEntries: [
          { url: '/data/sections_summary.json', revision: 'v2' },
          { url: '/data/all_sections_overview.json', revision: 'v2' },
          { url: '/data/all_official_pois.json', revision: 'v2' },
        ],
        runtimeCaching: [
          {
            urlPattern: /\/data\/sections\/section_\d+\.json/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'ewt-section-details-v2',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
            },
          },
        ],
      },
    }),
  ],
  base: '/',
  server: {
    port: 3000,
    open: true,
  },
});
