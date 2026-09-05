// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/fonts', '@pinia/nuxt', 'motion-v/nuxt'],
  components: [
    { path: '~/components', pathPrefix: false },
  ],
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2025-07-15',
  nitro: {
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
})
