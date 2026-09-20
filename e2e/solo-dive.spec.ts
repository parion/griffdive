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

  // The team locks the drawn misfortune in — chosen risk raises everyone's Valor.
  await page.getByRole('button', { name: 'Lock it in' }).click()
  await expect(page.getByText('Locked in — team-wide')).toBeVisible()

  // The squad strip shows who still has to decide.
  await expect(page.getByRole('img', { name: 'choosing pacts' })).toBeVisible()

  // The Valor meter reflects the team risk and grows as pacts are added.
  const valor = page.getByRole('progressbar', { name: 'Valor' })
  await expect(valor).toBeVisible()
  const teamValor = Number(await valor.getAttribute('aria-valuenow'))
  await page.locator('.pact:not([disabled])').first().click()
  expect(Number(await valor.getAttribute('aria-valuenow'))).toBeGreaterThan(teamValor)
  await page.getByRole('button', { name: 'Lock in & dive' }).click()

  // The briefing carries the same locked Valor through (QA-U1).
  await expect(page.getByRole('heading', { name: 'Briefing' })).toBeVisible()
  await expect(valor).toBeVisible()

  await page.getByRole('button', { name: 'Mission complete' }).click()
  // The victory banner + big stars, then slider-driven samples and time.
  await expect(page.getByText('Mission Completed')).toBeVisible()
  const commonSlider = page.locator('input[type="range"][aria-label="Common samples"]')
  await expect(commonSlider).toBeVisible()
  await expect(page.locator('input[type="range"][aria-label="Time remaining percent"]')).toBeVisible()
  await commonSlider.fill('5')
  await expect(page.locator('input[type="number"][aria-label="Common samples"]')).toHaveValue('5')
  // Reka tooltip labels the time-remaining slider.
  await page.getByRole('button', { name: 'Time remaining' }).hover()
  await expect(page.getByText('Time remaining', { exact: true })).toBeVisible()
  // The report form opens at the difficulty's best result — 3 stars at Medium.
  await expect(page.getByRole('radio', { name: '3 stars' })).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('button', { name: 'Submit success' }).click()

  await expect(page.getByText('Rewards — choose one')).toBeVisible()
  await expect(page.getByRole('img', { name: 'choosing reward' })).toBeVisible()
  await page.locator('.item-card:not([disabled])').first().click()

  // Bonus honors replaces the locked Valor meter once the draft completes: the
  // host awards the spun stat contest and the winner banks a reward token.
  await expect(page.getByRole('heading', { name: 'Squad Honors' })).toBeVisible()
  await page.locator('.award-row').getByRole('button', { name: 'Griffon' }).click()
  await page.getByRole('button', { name: 'Claim a reward token' }).click()
  await expect(page.getByText('Reward token banked.')).toBeVisible()

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

test('a failed mission labels the operation failed and restarts it', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Diver name').fill('Griffon')
  await page.getByRole('button', { name: 'Start solo crusade' }).click()

  await page.getByRole('button', { name: 'Spin', exact: true }).click()
  await page.getByRole('button', { name: 'Lock it in' }).click()
  await page.locator('.pact:not([disabled])').first().click()
  await page.getByRole('button', { name: 'Lock in & dive' }).click()

  await page.getByRole('button', { name: 'Mission failed' }).click()
  await page.getByRole('button', { name: 'Submit failure' }).click()

  // The header track reads the failed mission, not a stale live index.
  await expect(page.getByRole('img', { name: /Operation failed/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Operation failed' })).toBeVisible()

  // Forfeiting one item restarts the operation at mission 1.
  await page.locator('.item-card:not([disabled])').first().click()
  await expect(page.getByRole('img', { name: /operation mission 1 of 2/i })).toBeVisible()
})
