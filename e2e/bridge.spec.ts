import { expect, test } from '@playwright/test'

test.use({ reducedMotion: 'reduce' })

test('the Bridge odds console rolls the same dice rarer as the rung and skulls rise', async ({ page }) => {
  await page.goto('/')
  const loot = page.locator('#loot')
  await loot.scrollIntoViewIfNeeded()
  const tiers = loot.locator('.draw .tier-badge')
  await expect(tiers).toHaveCount(4)

  await page.getByRole('radio', { name: /^Difficulty 3,/ }).click()
  await page.getByLabel('Skulls taken').fill('0')
  await expect(tiers).toHaveText(['C', 'C', 'C', 'C'])

  await page.getByRole('radio', { name: /^Difficulty 10,/ }).click()
  await page.getByLabel('Skulls taken').fill('11')
  await expect(tiers).toHaveText(['A', 'S', 'S', 'S+'])
  await expect(loot.locator('.draw').last()).toContainText('Liberty\'s Cross')
})

test('the closing call returns to the drop console', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Suit up' }).click()
  await expect(page.locator('#deploy')).toBeFocused()
  await expect(page.getByRole('button', { name: 'Host an online dive' })).toBeInViewport()
})
