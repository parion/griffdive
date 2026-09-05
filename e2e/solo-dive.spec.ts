import { expect, test } from '@playwright/test'

test('solo dive flow: spin → pacts → report → rewards → advance', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Diver name').fill('Griffon')
  await page.getByRole('button', { name: 'Start solo crusade' }).click()

  await expect(page).toHaveURL(/\/dive\/[0-9a-f-]{36}/)
  await expect(page.getByText('Medium', { exact: true })).toBeVisible()
  await expect(page.locator('.diff-icon')).toBeVisible()

  await page.getByRole('button', { name: 'Spin', exact: true }).click()
  await expect(page.getByText('Decision pending')).toBeVisible()
  await expect(page.locator('.tier-badge').first()).toBeVisible()

  // The team locks the drawn misfortune in — chosen risk raises everyone's luck.
  await page.getByRole('button', { name: 'Lock it in' }).click()
  await expect(page.getByText('Locked in — team-wide')).toBeVisible()

  await page.locator('.pact:not([disabled])').first().click()
  await page.getByRole('button', { name: 'Lock in & dive' }).click()

  await expect(page.getByRole('heading', { name: 'Briefing' })).toBeVisible()

  await page.getByRole('button', { name: 'Mission complete' }).click()
  await page.getByRole('button', { name: 'Submit success' }).click()

  await expect(page.getByText('Rewards — choose one')).toBeVisible()
  await page.locator('.item-card:not([disabled])').first().click()

  await page.getByRole('button', { name: /Next mission/ }).click()
  // Medium runs 2-mission operations. The tracker advances to the second
  // segment; the overall mission count lives in its accessible label.
  await expect(page.getByRole('img', { name: /operation mission 2 of 2/i })).toBeVisible()
  await expect(page.locator('.mission-track .seg.active')).toHaveCount(1)
  // The front persists, but mission 2 begins at the spin: a fresh misfortune
  // awaits the squad's decision.
  await page.getByRole('button', { name: 'Spin', exact: true }).click()
  await expect(page.getByText('Decision pending')).toBeVisible()
})
