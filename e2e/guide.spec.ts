import { expect, test } from '@playwright/test'

test('the Guide slide-over explains the loop from the header', async ({ page }) => {
  await page.goto('/')

  const trigger = page.getByRole('button', { name: 'Guide', exact: true })
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await trigger.click()

  const drawer = page.getByRole('dialog', { name: 'How a dive works' })
  await expect(drawer).toBeVisible()

  // The six beats, spin through reward.
  const steps = drawer.locator('.guide-steps li')
  await expect(steps).toHaveCount(6)
  await expect(steps.first()).toContainText('Spin')
  await expect(steps.last()).toContainText('Reward')

  // The Valor/ceiling explainer and the accountability tells ride along.
  await expect(drawer.getByRole('heading', { name: 'Reading the odds' })).toBeVisible()
  await expect(drawer.getByText('seen in the loadout screen')).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(drawer).toBeHidden()
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
})
