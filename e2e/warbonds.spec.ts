import { expect, test } from '@playwright/test'

test('the Warbonds drawer toggles ownership and persists it', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Warbonds', exact: true }).click()
  const drawer = page.getByRole('dialog', { name: 'Warbonds' })
  await expect(drawer).toBeVisible()

  const row = drawer.getByRole('button', { name: /Helldivers Mobilize/ })
  await expect(row).toHaveAttribute('aria-pressed', 'true')
  await row.click()
  await expect(row).toHaveAttribute('aria-pressed', 'false')

  await drawer.getByRole('button', { name: 'Close warbonds' }).click()
  await expect(drawer).toBeHidden()

  // The declared set survives a reload (localStorage-backed).
  await page.reload()
  await page.getByRole('button', { name: 'Warbonds', exact: true }).click()
  await expect(
    page.getByRole('dialog', { name: 'Warbonds' })
      .getByRole('button', { name: /Helldivers Mobilize/ }),
  ).toHaveAttribute('aria-pressed', 'false')
})

test('the Warbonds panel opens at dive start once, then stays quiet', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Diver name').fill('Griffon')
  await page.getByRole('button', { name: 'Start solo crusade' }).click()

  const drawer = page.getByRole('dialog', { name: 'Warbonds' })
  await expect(drawer).toBeVisible()
  await drawer.getByRole('button', { name: 'Close warbonds' }).click()
  await expect(drawer).toBeHidden()

  // A second crusade in the same browser keeps the panel closed (seen once).
  await page.goto('/')
  await page.getByRole('button', { name: 'Start solo crusade' }).click()
  await expect(page.getByRole('button', { name: 'Spin', exact: true })).toBeVisible()
  await expect(drawer).toBeHidden()
})
