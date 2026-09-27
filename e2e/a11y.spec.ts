import { expect, test } from '@playwright/test'
import { dismissWarbondIntro, seedOnboarded } from './helpers'

test('the skip link moves focus to the main landmark', async ({ page }) => {
  await seedOnboarded(page)
  await page.goto('/')
  const skip = page.getByRole('link', { name: 'Skip to main content' })
  await skip.focus()
  await expect(skip).toBeVisible()
  await skip.click()
  await expect(page.locator('#main-content')).toBeFocused()
})

test('the changelog dialog traps focus, closes on Escape, and restores focus', async ({ page }) => {
  await seedOnboarded(page)
  await page.goto('/')
  const trigger = page.getByRole('button', { name: 'alpha' })
  await trigger.click()

  const dialog = page.getByRole('dialog', { name: 'Changelog' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toHaveAttribute('aria-modal', 'true')

  // Focus lands inside the dialog and never escapes while tabbing.
  await expect(dialog.locator(':focus')).toHaveCount(1)
  for (let i = 0; i < 8; i += 1) {
    await page.keyboard.press('Tab')
    await expect(dialog.locator(':focus')).toHaveCount(1)
  }

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('the star rating is a keyboard-navigable radio group', async ({ page }) => {
  await seedOnboarded(page)
  await page.goto('/')
  await page.getByLabel('Diver name').fill('Griffon')
  await page.getByRole('button', { name: 'Start solo crusade' }).click()
  await dismissWarbondIntro(page)
  await page.getByRole('button', { name: 'Spin', exact: true }).click()
  await page.locator('.misfortune').getByRole('button', { name: 'Lock it in' }).click()
  await page.locator('.strain').getByRole('button', { name: 'Opt out' }).click()
  await page.locator('.pact:not([disabled])').first().click()
  await page.getByRole('button', { name: 'Lock in & dive' }).click()
  await page.getByRole('button', { name: 'Mission complete' }).click()

  const threeStars = page.getByRole('radio', { name: '3 stars' })
  await threeStars.focus()
  await expect(threeStars).toHaveAttribute('aria-checked', 'true')

  await page.keyboard.press('ArrowLeft', { delay: 100 })
  await expect(page.getByRole('radio', { name: '2 stars' })).toHaveAttribute('aria-checked', 'true')
  await expect(threeStars).toHaveAttribute('aria-checked', 'false')
})

test('the first run is gated by the full-screen onboarding', async ({ browser }) => {
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto('/')

  // A fresh browser is sent to the briefing instead of the base.
  await expect(page).toHaveURL(/\/start(\?.*)?$/)

  // The identity field takes focus, and the screen is a page — Escape can't
  // dismiss it out from under the diver.
  const nameInput = page.getByLabel('Diver name')
  await expect(nameInput).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(nameInput).toBeVisible()

  // Naming reveals "Skip the tour"; finishing lands back on the base.
  await nameInput.fill('Griffon')
  await page.getByRole('button', { name: 'Skip the tour' }).click()
  await expect(page).toHaveURL(/\/$/)

  await context.close()
})
