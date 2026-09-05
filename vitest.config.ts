import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Mirrors Nuxt's path aliases so server/shared modules resolve the same way
// they do inside Nitro (`~~` = rootDir, `~` = app/).
export default defineConfig({
  resolve: {
    alias: {
      '~~': fileURLToPath(new URL('.', import.meta.url)),
      '~': fileURLToPath(new URL('./app', import.meta.url)),
    },
  },
  test: {
    include: ['shared/**/*.spec.ts', 'server/**/*.spec.ts', 'app/**/*.spec.ts'],
  },
})
