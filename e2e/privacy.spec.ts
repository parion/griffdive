import { expect, test } from '@playwright/test'

test('the privacy notice is reachable from the Bridge footer', async ({ page }) => {
  await page.goto('/')
  const link = page.getByRole('link', { name: 'PRIVACY' })
  await expect(link).toBeVisible()
  await link.click()

  await expect(page).toHaveURL(/\/privacy$/)
  await expect(page.getByRole('heading', { name: 'Privacy' })).toBeVisible()
  await expect(page.getByText('No cookies · no analytics · no ads')).toBeVisible()
  await expect(page.locator('#main-content')).toHaveCount(1)

  // The full notice is one click away in the repository.
  await expect(page.getByRole('link', { name: 'PRIVACY.md' })).toHaveAttribute('href', /PRIVACY\.md$/)
})

test('the privacy notice renders on a direct visit', async ({ page }) => {
  await page.goto('/privacy')
  await expect(page.getByRole('heading', { name: 'Privacy' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'What this app stores' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Your choices' })).toBeVisible()
})
