import { expect, test } from '@playwright/test'

const BOARD = 'https://feedback.griffdive.test'

test('a diver can file a note from the Bridge without an account', async ({ page }) => {
  await page.goto('/')

  const trigger = page.getByRole('button', { name: 'FEEDBACK' })
  await trigger.click()

  const dialog = page.getByRole('dialog', { name: 'Send feedback' })
  await expect(dialog).toBeVisible()

  // The public board is a click-through, never an embedded script.
  await expect(dialog.getByRole('link', { name: /public board/i })).toHaveAttribute('href', BOARD)

  await dialog.getByRole('radio', { name: /^Bug/ }).click()
  await dialog.getByRole('textbox', { name: 'Your note' }).fill('The wheel stuttered on the second spin.')
  await dialog.getByRole('textbox', { name: /Reply-to/ }).fill('diver@example.test')
  await dialog.getByRole('button', { name: 'File report' }).click()

  await expect(dialog.getByText('Filed', { exact: true })).toBeVisible()
  await expect(dialog.locator('.ref')).toHaveText(/^[A-Z0-9]{10}$/)
  await expect(dialog.getByRole('link', { name: 'Open the board' })).toHaveAttribute('href', BOARD)
})

test('the sheet restores focus to its trigger and keeps a typed note on Escape', async ({ page }) => {
  await page.goto('/')

  const trigger = page.getByRole('button', { name: 'FEEDBACK' })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'Send feedback' })
  await dialog.getByRole('textbox', { name: 'Your note' }).fill('Half-written thought')

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()

  // Reopening must not throw the draft away — accidental closes happen.
  await trigger.click()
  await expect(dialog.getByRole('textbox', { name: 'Your note' })).toHaveValue('Half-written thought')
})
