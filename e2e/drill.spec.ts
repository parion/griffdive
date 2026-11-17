import { expect, test } from '@playwright/test'
import { playArcade, startArcade } from './arcade'

test('drill: type the codes, clear a round, keep a personal best', async ({ page }) => {
  await page.goto('/drill')
  await expect(page.getByRole('heading', { name: 'Drill', level: 1 })).toBeVisible()
  await expect(page.getByText('No run on record for this pool yet.')).toBeVisible()

  const board = page.locator('.board')
  await startArcade(page, board)
  // Clear round one, then stop typing and let the next round's bar run dry.
  await playArcade(page, board, status => status === 'intermission')
  await expect(board).toHaveAttribute('data-round', '2', { timeout: 10_000 })
  await expect(page.getByText('New personal best')).toBeVisible({ timeout: 20_000 })

  await page.reload()
  await expect(page.getByText('No run on record for this pool yet.')).toBeHidden()
  await expect(page.locator('.best')).toContainText('1 rounds')
})

test('drill: a wrong arrow restarts the code', async ({ page }) => {
  await page.goto('/drill')
  const board = page.locator('.board')
  await startArcade(page, board)
  const code = (await board.getAttribute('data-code'))!
  const first = { U: 'ArrowUp', D: 'ArrowDown', L: 'ArrowLeft', R: 'ArrowRight' }[code[0] as 'U']
  const wrong = code[1] === 'U' ? 'ArrowDown' : 'ArrowUp'
  await page.keyboard.press(first)
  await expect(board.locator('.arrow.done')).toHaveCount(1)
  await page.keyboard.press(wrong)
  await expect(board.locator('.arrow.done')).toHaveCount(0)
  await expect(board).toHaveAttribute('data-code', code)
})

test.describe('drill on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('the d-pad types the code', async ({ page }) => {
    await page.goto('/drill')
    const board = page.locator('.board')
    const pad = page.getByRole('group', { name: 'Stratagem d-pad' })
    const names: Readonly<Record<string, string>> = { U: 'Up', D: 'Down', L: 'Left', R: 'Right' }
    await pad.getByRole('button', { name: 'Up' }).tap()
    await expect(board).toHaveAttribute('data-status', 'playing')
    const code = (await board.getAttribute('data-code'))!
    for (const arrow of code) {
      await pad.getByRole('button', { name: names[arrow] }).tap()
      await page.waitForTimeout(60)
    }
    await expect(board).not.toHaveAttribute('data-code', code)
    await expect(board.locator('.lbl').nth(1)).toContainText('5 left')
  })
})
