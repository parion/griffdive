import { expect, test } from '@playwright/test'
import { playArcade, startArcade } from './arcade'
import { dismissWarbondIntro, fileCallsign, lockMisfortune } from './helpers'

test('redemption: a diver down under Martyrdom earns their reinforce back', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Solo drop' }).click()
  await fileCallsign(page, 'Griffon')
  await dismissWarbondIntro(page)

  await page.getByRole('button', { name: 'Spin', exact: true }).click()
  await lockMisfortune(page)
  await page.locator('.strain-card').getByRole('button', { name: 'Skip' }).click()
  await page.getByRole('button', { name: 'Deal the pacts' }).click()
  await page.getByRole('button', { name: 'Dive with no pacts' }).click()
  await expect(page.getByRole('heading', { name: 'Hold the line' })).toBeVisible()

  // The wheel is random: pin Martyrdom onto the saved dive, then reload it.
  const slotId = page.url().split('/dive/')[1]!.split(/[?#]/)[0]!
  await page.evaluate((id) => {
    const key = 'griffdive:saves:v2'
    const index = JSON.parse(localStorage.getItem(key) ?? '{}')
    const state = index[id].state
    state.wheel = { ...state.wheel, misfortuneId: 'noReserves' }
    state.misfortuneAccepted = true
    state.misfortuneFailed = false
    localStorage.setItem(key, JSON.stringify(index))
  }, slotId)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Hold the line' })).toBeVisible()

  const card = page.locator('.redemption-card')
  await expect(card).toContainText('Clear round 3')
  await card.getByRole('button', { name: 'I\'m down' }).click()

  const dialog = page.getByRole('dialog', { name: 'Redemption' })
  await expect(dialog).toContainText('Martyrdom')
  await page.waitForTimeout(600)
  await page.screenshot({ path: '/tmp/sh-shots/redemption-brief.png' })
  await dialog.getByRole('button', { name: 'Start the run' }).click()

  const board = dialog.locator('.board')
  await startArcade(page, board)
  await page.waitForTimeout(400)
  await page.screenshot({ path: '/tmp/sh-shots/redemption-play.png' })
  await playArcade(page, board, status => status === 'cleared')
  await expect(dialog.getByText('Redemption earned')).toBeVisible()
  await expect(dialog).toContainText('needs round 4')
  await page.waitForTimeout(600)
  await page.screenshot({ path: '/tmp/sh-shots/redemption-earned.png' })
  await dialog.getByRole('button', { name: 'Back to the fight' }).click()

  await expect(card).toContainText('Clear round 4')
  await expect(card).toContainText('Redeemed ×1')
})
