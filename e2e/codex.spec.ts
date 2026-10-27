import { expect, test } from '@playwright/test'

test('the Armory is reachable as a page', async ({ page }) => {
  // Direct route still renders the shared browser.
  await page.goto('/codex')
  await expect(page.getByRole('heading', { name: 'Armory' })).toBeVisible()
  await expect(page.getByText('S Tier')).toBeVisible()
})
