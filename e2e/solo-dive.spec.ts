import { expect, test } from '@playwright/test'

test('solo dive flow: spin → pacts → report → rewards → advance', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Diver name').fill('Griffon')
  await page.getByRole('button', { name: 'Start solo crusade' }).click()

  await expect(page).toHaveURL(/\/dive\/[0-9a-f-]{36}/)
  await expect(page.getByText('Medium (3)')).toBeVisible()

  await page.getByRole('button', { name: 'Spin', exact: true }).click()
  await expect(page.getByText('Misfortune · drawn')).toBeVisible()
  await expect(page.locator('.tier-badge').first()).toBeVisible()

  // The team accepts the drawn misfortune — chosen risk raises everyone's luck.
  await page.getByRole('button', { name: 'Accept misfortune' }).click()
  await expect(page.getByText('Misfortune · in effect')).toBeVisible()

  await page.locator('.pact:not([disabled])').first().click()
  await page.getByRole('button', { name: 'Lock in & dive' }).click()

  await expect(page.getByRole('heading', { name: 'Briefing' })).toBeVisible()

  await page.getByRole('button', { name: 'Mission complete' }).click()
  await page.getByRole('button', { name: 'Submit success' }).click()

  await expect(page.getByText('Rewards — choose one')).toBeVisible()
  await page.locator('.item-card:not([disabled])').first().click()

  await page.getByRole('button', { name: /Next mission/ }).click()
  await expect(page.getByText('mission #2')).toBeVisible()
  // Medium runs 2-mission operations and the wheel carries over, so mission 2
  // resumes at the pact phase without a new spin.
  await expect(page.getByText('operation mission 2/2')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Spin', exact: true })).toHaveCount(0)
})
