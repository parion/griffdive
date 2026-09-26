// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/fonts', '@pinia/nuxt', 'motion-v/nuxt', '@vite-pwa/nuxt'],
  ssr: false,
  components: [
    { path: '~/components', pathPrefix: false },
  ],
  devtools: { enabled: true },
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'Griffdive',
      meta: [
        {
          name: 'description',
          content: 'A Helldivers 2 squad roguelike: climb the difficulty ladder, spin the Wheel of Misfortune, and let chosen risk buy rarer rewards.',
        },
        { name: 'theme-color', content: '#131511' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black' },
        { name: 'apple-mobile-web-app-title', content: 'Griffdive' },
        { property: 'og:title', content: 'Griffdive' },
        {
          property: 'og:description',
          content: 'A Helldivers 2 squad roguelike: climb the difficulty ladder, spin the Wheel of Misfortune, and let chosen risk buy rarer rewards.',
        },
        { property: 'og:type', content: 'website' },
      ],
      link: [
        { rel: 'icon', href: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon-180x180.png' },
        { rel: 'manifest', href: '/manifest.webmanifest' },
      ],
    },
  },
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2025-07-15',
  nitro: {
    // Room state (and saved dives) live on disk, not process memory, so sessions
    // survive deploys. The base is relative so dev, CI and the container all
    // resolve the same writable path (`/app/.data/rooms` at runtime, where the
    // Fly volume is mounted); `fs-lite` uses only node:fs — no runtime dep.
    storage: {
      rooms: { driver: 'fs-lite', base: './.data/rooms' },
    },
    experimental: {
      websocket: true,
    },
  },
  eslint: {
    config: {
      stylistic: true,
    },
  },
  fonts: {
    defaults: {
      styles: ['normal'],
      subsets: ['latin', 'latin-ext'],
    },
    families: [
      { name: 'Chakra Petch', provider: 'google', weights: ['400', '600', '700'] },
    ],
  },
  pwa: {
    registerType: 'autoUpdate',
    registerWebManifestInRouteRules: true,
    manifest: {
      name: 'Griffdive',
      short_name: 'Griffdive',
      description: 'A Helldivers 2 squad roguelike: climb the difficulty ladder, spin the Wheel of Misfortune, and let chosen risk buy rarer rewards.',
      lang: 'en',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#131511',
      theme_color: '#131511',
      icons: [
        { src: '/pwa-64x64.png', sizes: '64x64', type: 'image/png' },
        { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: '/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      // Precache the app shell + build assets + fonts + PWA icons. Game art lives
      // under /images and is far too large to precache — it is cached on demand.
      globPatterns: [
        '**/*.{js,css,html,ico,woff2,svg}',
        'pwa-*.png',
        'maskable-icon-*.png',
        'apple-touch-icon-*.png',
      ],
      // The SPA shell is rendered per request by Nitro, so there is no
      // precacheable index.html to bind a navigation fallback to. `undefined`
      // keeps the Nuxt module from defaulting it, and navigations are cached at
      // runtime instead (below) so a launched/reloaded PWA still opens offline.
      navigateFallback: undefined,
      cleanupOutdatedCaches: true,
      runtimeCaching: [
        // Live room state must never be served stale: room snapshots are realtime.
        {
          urlPattern: /^\/api\//,
          handler: 'NetworkOnly',
        },
        // App shell: fresh when online, cached copy when the network is gone.
        {
          urlPattern: ({ request }) => request.mode === 'navigate',
          handler: 'NetworkFirst',
          options: {
            cacheName: 'griffdive-shell',
            networkTimeoutSeconds: 4,
            expiration: { maxEntries: 24 },
          },
        },
        // Catalog art is immutable and large: cache after first view, refresh in
        // the background so the codex renders instantly on repeat visits.
        {
          urlPattern: ({ request }) => request.destination === 'image',
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'griffdive-images',
            expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
      ],
    },
    client: {
      installPrompt: false,
    },
  },
})
