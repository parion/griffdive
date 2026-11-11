import { expect, test } from '@playwright/test'
import { dismissBriefing, dismissWarbondIntro, fileCallsign } from './helpers'

test('a solo specialist starts in the issued kit, reports in it and pays the service tax', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /^Set warbonds/ }).click()
  const setup = page.getByRole('dialog', { name: 'Variant & warbonds' })
  await setup.getByRole('radio', { name: /Eagle Ground Coordinator/ }).click()
  await expect(setup.getByRole('radio', { name: /Eagle Ground Coordinator/ })).toHaveAttribute('aria-checked', 'true')
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: 'Solo drop' }).click()
  await fileCallsign(page, 'Griffin')
  await dismissBriefing(page)
  await dismissWarbondIntro(page)
  await expect(page.locator('.seat-spec')).toHaveText(/Recruit · Eagle Ground Coordinator/)

  await page.getByRole('button', { name: 'Spin', exact: true }).click()
  await page.locator('.directive-card').getByRole('button', { name: 'Skip' }).click()
  await page.locator('.strain-card').getByRole('button', { name: 'Skip' }).click()
  await page.getByRole('button', { name: 'Deal the pacts' }).click()
  await page.getByRole('button', { name: 'Dive with no pacts' }).click()

  const orders = page.locator('.row.orders')
  await expect(orders).toContainText('Eagle Ground Coordinator')
  await expect(orders).toContainText('Eagle 500kg Bomb')

  await page.getByRole('button', { name: 'Extracted' }).click()
  await page.getByRole('button', { name: 'File report' }).click()
  await expect(page.getByRole('heading', { name: 'Bank one item' })).toBeVisible()
  await expect(page.getByText('1 option to your specialist\'s service tax')).toBeVisible()
  await expect(page.locator('.loot-card')).toHaveCount(2)
  await page.locator('.loot-card').first().click()
  await page.getByRole('button', { name: /^Bank / }).click()

  await expect(page.getByRole('region', { name: 'Service record' })).toContainText('Recruit')
})
