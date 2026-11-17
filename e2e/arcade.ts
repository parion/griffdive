import { expect, type Locator, type Page } from '@playwright/test'

const KEYS: Readonly<Record<string, string>> = { U: 'ArrowUp', D: 'ArrowDown', L: 'ArrowLeft', R: 'ArrowRight' }

// Plays the stratagem arcade by reading each code off the board and typing it.
// Presses are paced like a quick human: the server's replay refuses a run
// whose median gap is machine-fast.
export async function playArcade(page: Page, board: Locator, until: (status: string) => boolean): Promise<void> {
  for (let step = 0; step < 2_000; step++) {
    // A cleared Redemption swaps the board out for the verdict.
    if (!(await board.isVisible())) {
      return
    }
    const status = (await board.getAttribute('data-status').catch(() => null)) ?? ''
    if (until(status)) {
      return
    }
    const code = await board.getAttribute('data-code').catch(() => '')
    if (!code) {
      await page.waitForTimeout(80)
      continue
    }
    for (const arrow of code) {
      await page.keyboard.press(KEYS[arrow]!)
      await page.waitForTimeout(60)
    }
  }
  throw new Error('the arcade never reached the expected status')
}

export async function startArcade(page: Page, board: Locator): Promise<void> {
  await expect(board).toHaveAttribute('data-status', 'ready')
  await page.keyboard.press('ArrowUp')
  await expect(board).toHaveAttribute('data-status', 'playing')
}
