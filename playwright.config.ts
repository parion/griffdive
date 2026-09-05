import { defineConfig, devices } from '@playwright/test'

// E2E runs against the production build (Nitro server + WebSocket together),
// started automatically on port 3173.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3173',
    trace: 'retain-on-failure',
    // Animation is presentation, not flow: E2E asserts the settled state.
    contextOptions: { reducedMotion: 'reduce' },
  },
  webServer: {
    command: 'pnpm build && node .output/server/index.mjs',
    url: 'http://localhost:3173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: { PORT: '3173' },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
