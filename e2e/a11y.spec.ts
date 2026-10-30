import { expect, test } from '@playwright/test'
import { dismissWarbondIntro, fileCallsign, lockMisfortune } from './helpers'

test('the skip link moves focus to the main landmark', async ({ page }) => {
  await page.goto('/')
  const skip = page.getByRole('link', { name: 'Skip to main content' })
  await skip.focus()
  await expect(skip).toBeVisible()
  await skip.click()
  await expect(page.locator('#main-content')).toBeFocused()
})

test('the changelog dialog traps focus, closes on Escape, and restores focus', async ({ page }) => {
  await page.goto('/')
  const trigger = page.getByRole('button', { name: 'beta' })
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
  await page.goto('/')
  await page.getByRole('button', { name: 'Solo drop' }).click()
  await fileCallsign(page, 'Griffon')
  await dismissWarbondIntro(page)
  await page.getByRole('button', { name: 'Spin', exact: true }).click()
  await lockMisfortune(page)
  await page.locator('.strain-card').getByRole('button', { name: 'Skip' }).click()
  await page.getByRole('button', { name: 'Deal the pacts' }).click()
  await page.locator('.condition:not([disabled])').first().click()
  await page.getByRole('button', { name: /^Swear 1 pact/ }).click()
  await page.getByRole('button', { name: 'Extracted' }).click()

  const threeStars = page.getByRole('radio', { name: '3 stars' })
  await threeStars.focus()
  await expect(threeStars).toHaveAttribute('aria-checked', 'true')

  await page.keyboard.press('ArrowLeft', { delay: 100 })
  await expect(page.getByRole('radio', { name: '2 stars' })).toHaveAttribute('aria-checked', 'true')
  await expect(threeStars).toHaveAttribute('aria-checked', 'false')
})
