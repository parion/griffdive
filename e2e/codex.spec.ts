import { expect, test } from '@playwright/test'

test('the Codex is reachable as a page', async ({ page }) => {
  // Direct route still renders the shared browser.
  await page.goto('/codex')
  await expect(page.getByRole('heading', { name: 'Codex' })).toBeVisible()
  await expect(page.getByText('S Tier')).toBeVisible()
})
