import { expect, test } from '@playwright/test'

test('first run walks the animated briefing and declares warbonds', async ({ browser }) => {
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto('/')
  await expect(page).toHaveURL(/\/start(\?.*)?$/)

  // 1. Identify — the registry reclassifies A → E and the name field is ready.
  await expect(page.getByText('GRIFFDIVER', { exact: true })).toBeVisible()
  await page.getByLabel('Diver name').fill('Rookie')
  await page.getByRole('button', { name: 'Next' }).click()

  // 2. Spin — the wheel settles on a locked-in rule.
  await expect(page.getByText(/Locked in — \+3 team risk/)).toBeVisible()
  await page.getByRole('button', { name: 'Next' }).click()

  // 3. Pact — the Valor meter fills with team risk and a personal pact.
  await expect(page.getByText('Valor', { exact: true })).toBeVisible()
  await expect(page.getByText('Locked in', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Next' }).click()

  // 4. Reward — the ceiling ladder lights up.
  await expect(page.getByRole('img', { name: 'Reward ceiling climbs with Valor' })).toBeVisible()
  await page.getByRole('button', { name: 'Next' }).click()

  // 5. Warbonds — declare ownership with the real browser.
  const mobilize = page.getByRole('button', { name: /Helldivers Mobilize/ })
  await expect(mobilize).toHaveAttribute('aria-pressed', 'true')
  await mobilize.click()
  await expect(mobilize).toHaveAttribute('aria-pressed', 'false')
  await page.getByRole('button', { name: 'Next' }).click()

  // 6. Deploy — the order carries the name and the declared warbonds.
  await expect(page.getByText('Deployment order')).toBeVisible()
  await expect(page.getByText('Rookie')).toBeVisible()
  await page.getByRole('button', { name: 'Enter Griffdive' }).click()
  await expect(page).toHaveURL(/\/$/)

  await context.close()
})
