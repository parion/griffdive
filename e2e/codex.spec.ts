import { expect, test } from '@playwright/test'

test('the Codex is reachable as a page and as a slide-over', async ({ page }) => {
  // Direct route still renders the shared browser.
  await page.goto('/codex')
  await expect(page.getByRole('heading', { name: 'Codex' })).toBeVisible()
  await expect(page.getByText('S Tier')).toBeVisible()

  // The header control opens the same browser as a dialog over the page.
  await page.getByRole('button', { name: 'Codex', exact: true }).click()
  const drawer = page.getByRole('dialog', { name: 'Codex' })
  await expect(drawer).toBeVisible()
  await drawer.getByRole('button', { name: 'Close codex' }).click()
  await expect(drawer).toBeHidden()
})
