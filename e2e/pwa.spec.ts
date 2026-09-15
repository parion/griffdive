import { expect, test } from '@playwright/test'

test('PWA affordances: manifest, icons and service worker are served', async ({ page, request }) => {
  const manifest = await request.get('/manifest.webmanifest')
  expect(manifest.ok()).toBeTruthy()
  expect(manifest.headers()['content-type']).toContain('application/manifest+json')

  const json = await manifest.json()
  expect(json.name).toBe('Griffdive')
  expect(json.display).toBe('standalone')
  expect(json.start_url).toBe('/')
  expect(json.icons.some((icon: { sizes: string }) => icon.sizes === '192x192')).toBeTruthy()
  expect(json.icons.some((icon: { purpose?: string }) => icon.purpose === 'maskable')).toBeTruthy()

  for (const src of json.icons.map((icon: { src: string }) => icon.src)) {
    const icon = await request.get(src)
    expect(icon.ok(), `${src} should be served`).toBeTruthy()
  }

  const sw = await request.get('/sw.js')
  expect(sw.ok()).toBeTruthy()

  await page.goto('/')
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.webmanifest')
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#131511')
})
