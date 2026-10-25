import { expect, test } from '@playwright/test'
import { dismissWarbondIntro, fileCallsign } from './helpers'

test('the Warbonds panel toggles ownership and persists it', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Solo drop' }).click()
  await fileCallsign(page, 'Griffon')
  await dismissWarbondIntro(page)

  const side = page.getByRole('complementary', { name: 'Dive tools' })
  const toggle = side.getByRole('navigation', { name: 'Tools' }).getByRole('button', { name: 'Warbonds', exact: true })
  await toggle.click()
  await expect(side.getByRole('heading', { name: 'Warbonds', level: 2 })).toBeVisible()

  const row = side.getByRole('button', { name: /Helldivers Mobilize/ })
  await expect(row).toHaveAttribute('aria-pressed', 'true')
  // Acquisition specials sort last and start unowned; the pre-order bonus is gone.
  await expect(side.getByRole('button', { name: /Super Citizen/ })).toHaveAttribute('aria-pressed', 'false')
  await expect(side.getByRole('button', { name: /Superstore/ })).toHaveAttribute('aria-pressed', 'false')
  await expect(side.getByRole('button', { name: /Pre-Order/ })).toHaveCount(0)
  await row.click()
  await expect(row).toHaveAttribute('aria-pressed', 'false')

  await toggle.click()
  await expect(side.getByRole('heading', { level: 2 })).toHaveCount(0)

  // The declared set survives a fresh dive (localStorage-backed).
  await page.goto('/')
  await page.getByRole('button', { name: 'Solo drop' }).click()
  await expect(page.getByRole('button', { name: 'Spin', exact: true })).toBeVisible()
  await toggle.click()
  await expect(side.getByRole('button', { name: /Helldivers Mobilize/ })).toHaveAttribute('aria-pressed', 'false')
})

test('the tutorial opens at dive start once, without chaining the Warbonds panel', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Solo drop' }).click()
  await fileCallsign(page, 'Griffon')

  // The tutorial's Warbonds step covers ownership, so closing it lands on the dive.
  const tutorial = page.getByRole('heading', { name: 'You hold the wheel.' })
  const drawer = page.getByRole('dialog', { name: 'Warbonds' })
  await expect(tutorial).toBeVisible()
  await page.getByRole('button', { name: 'Start the dive' }).click()
  await expect(tutorial).toBeHidden()
  await expect(page.getByRole('button', { name: 'Spin', exact: true })).toBeVisible()
  await expect(drawer).toBeHidden()

  // A second crusade in the same browser keeps everything closed (seen once).
  await page.goto('/')
  await page.getByRole('button', { name: 'Solo drop' }).click()
  await expect(page.getByRole('button', { name: 'Spin', exact: true })).toBeVisible()
  await expect(drawer).toBeHidden()
  await expect(tutorial).toBeHidden()

  // It stays reachable from the session menu.
  await page.getByRole('button', { name: 'Session menu' }).click()
  await page.getByRole('dialog', { name: 'Session' })
    .getByRole('button', { name: /Tutorial \/ field manual/ }).click()
  await expect(page.getByRole('dialog', { name: 'Host tutorial' })).toBeVisible()
})
