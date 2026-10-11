import { expect, test, type Page } from '@playwright/test'
import { dismissWarbondIntro } from './helpers'

const VIEWPORT = { width: 390, height: 844 }

// The phone dive's bottom bar is one fixed frame: info above, secondary +
// primary action below, on every screen — never absent, never reshaped.
async function expectPinnedBar(page: Page, label: string): Promise<void> {
  const bar = page.locator('.phone-bar')
  await expect(bar, label).toBeVisible()
  await expect(page.locator('#phone-bar-primary > *').first(), `${label}: primary action`).toBeVisible()
  const box = await bar.boundingBox()
  expect(box, label).not.toBeNull()
  expect(box!.y + box!.height, `${label}: bar sits at the bottom edge`).toBeCloseTo(VIEWPORT.height, 0)
  expect(box!.width, `${label}: bar spans the column`).toBeGreaterThanOrEqual(VIEWPORT.width - 4)
  const primary = await page.locator('#phone-bar-primary > *').first().boundingBox()
  expect(primary!.height, `${label}: primary hit area`).toBeGreaterThanOrEqual(54)
  if (process.env.SHOTS) {
    await page.screenshot({ path: `${process.env.SHOTS}/${label}.png` })
  }
}

test('phone: the action bar is pinned on every screen of a dive', async ({ browser }) => {
  const context = await browser.newContext({ viewport: VIEWPORT, reducedMotion: 'reduce' })
  const page = await context.newPage()

  await page.goto('/')
  await page.getByRole('button', { name: 'Host an online dive' }).click()
  await expect(page).toHaveURL(/\/dive\/[A-Z0-9]{6}/)
  await page.getByLabel('Your name').fill('Host')
  await page.getByRole('button', { name: 'Join the dive' }).click()
  await dismissWarbondIntro(page)

  await expectPinnedBar(page, '1-lobby')
  await page.getByRole('button', { name: 'Launch crusade' }).click()
  await expect(page.locator('.phone-wheel')).toBeVisible()

  await expectPinnedBar(page, '2-wheel-spin')
  await page.locator('#phone-bar-primary').getByRole('button', { name: 'Spin the wheel' }).click()
  await expect(page.locator('.phone-wheel .card').first()).toBeVisible()
  await expectPinnedBar(page, '3-wheel-decision')

  // Opting out of both calls keeps the flow deterministic (no stranded rules).
  await page.locator('.phone-wheel .opt-out').first().click()
  await page.locator('.phone-wheel .opt-out').first().click()
  await expectPinnedBar(page, '4-wheel-deal')
  await page.locator('#phone-bar-primary').getByRole('button', { name: 'Deal the pacts' }).click()

  await expect(page.locator('.phone-pacts')).toBeVisible()
  await expectPinnedBar(page, '5-pacts')
  await page.locator('#phone-bar-primary').getByRole('button', { name: /Lock in/ }).click()
  await expectPinnedBar(page, '6-diving')

  await page.locator('#phone-bar-primary').getByRole('button', { name: 'Mission complete' }).click()
  await expectPinnedBar(page, '7-report')
  await page.locator('#phone-bar-primary').getByRole('button', { name: 'File report' }).click()

  await expect(page.locator('.phone-rewards .row').first()).toBeVisible()
  await expectPinnedBar(page, '8-draft')
  await page.locator('.phone-rewards .row').first().click()
  await expectPinnedBar(page, '9-draft-banked')
  await page.locator('#phone-bar-primary').getByRole('button').first().click()

  await expect(page.getByRole('region', { name: 'Squad honors' })).toBeVisible()
  await expectPinnedBar(page, '10-honors')

  await context.close()
})

test('phone: a failed mission lands on the pinned surrender bar', async ({ browser }) => {
  const context = await browser.newContext({ viewport: VIEWPORT, reducedMotion: 'reduce' })
  const page = await context.newPage()

  await page.goto('/')
  await page.getByRole('button', { name: 'Host an online dive' }).click()
  await expect(page).toHaveURL(/\/dive\/[A-Z0-9]{6}/)
  await page.getByLabel('Your name').fill('Host')
  await page.getByRole('button', { name: 'Join the dive' }).click()
  await dismissWarbondIntro(page)

  await page.getByRole('button', { name: 'Launch crusade' }).click()
  await page.locator('#phone-bar-primary').getByRole('button', { name: 'Spin the wheel' }).click()
  await page.locator('.phone-wheel .opt-out').first().click()
  await page.locator('.phone-wheel .opt-out').first().click()
  await page.locator('#phone-bar-primary').getByRole('button', { name: 'Deal the pacts' }).click()
  await page.locator('#phone-bar-primary').getByRole('button', { name: /Lock in/ }).click()

  await page.locator('#phone-bar-secondary').getByRole('button', { name: 'Mission failed' }).click()
  await expectPinnedBar(page, '11-diving-confirm-failure')
  await page.locator('#phone-bar-primary').getByRole('button', { name: 'Confirm failure' }).click()

  await expect(page.getByRole('heading', { name: 'Mission failed' }).first()).toBeVisible()
  await expectPinnedBar(page, '12-forfeit')

  // Picking an item arms the hold-to-confirm surrender.
  await page.locator('.sur-tile').first().click()
  await expect(page.locator('#phone-bar-primary').getByRole('button', { name: /Surrender/ })).toBeEnabled()
  await expectPinnedBar(page, '13-forfeit-armed')

  await context.close()
})
