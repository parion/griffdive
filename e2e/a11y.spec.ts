import { expect, test } from '@playwright/test'
import { dismissWarbondIntro } from './helpers'

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
  await page.goto('/')
  await page.getByLabel('Diver name').fill('Griffon')
  await page.getByRole('button', { name: 'Start solo crusade' }).click()
  await dismissWarbondIntro(page)
  await page.getByRole('button', { name: 'Spin', exact: true }).click()
  await page.getByRole('button', { name: 'Lock it in' }).click()
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

test('the join name gate cannot be dismissed', async ({ browser }) => {
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto('/')
  await page.getByRole('button', { name: 'Host an online dive' }).click()
  await expect(page).toHaveURL(/\/dive\/[A-Z0-9]{6}/)

  const dialog = page.getByRole('dialog', { name: 'Identify yourself, diver' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel('Your name')).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(dialog).toBeVisible()

  await page.mouse.click(4, 4)
  await expect(dialog).toBeVisible()

  await context.close()
})
