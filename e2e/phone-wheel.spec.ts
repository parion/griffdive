import { expect, test } from '@playwright/test'
import { dismissWarbondIntro } from './helpers'

// The phone call is one flat lit stage: directive and strain first, the wheel
// below, and the fixed action bar carrying the spin/deal gate.
test('phone wheel: the call reads top-down and the action bar follows the beat', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
  const page = await context.newPage()

  await page.goto('/')
  await page.getByLabel('Diver name').fill('Griff')
  await page.getByRole('button', { name: 'Solo drop' }).click()
  await expect(page).toHaveURL(/\/dive\//)
  await dismissWarbondIntro(page)

  // The legend is gone from the phone wheel.
  await expect(page.locator('.phone-call .legend')).toHaveCount(0)
  await expect(page.locator('.phone-call .risk-legend')).toBeHidden()
  await expect(page.locator('.beats .beat.current')).toContainText('Call')

  // Spin from the wheel hub.
  await page.locator('.hub').click()
  await expect(page.locator('.directive .take')).toBeVisible()
  await expect(page.locator('.strain .take')).toBeVisible()
  await expect(page.locator('.beats .beat.current')).toContainText('Call')

  // The two calls are separate, deliberate taps. A stranded draw disables
  // "Take it", so skip that one; either call leaves the strain open and the
  // deal gate disabled.
  const take = page.locator('.directive .take')
  if (await take.isEnabled()) {
    await take.click()
    await expect(page.locator('.directive .dc-verdict')).toContainText('Taken')
  }
  else {
    await page.locator('.directive .skip').click()
    await expect(page.locator('.directive .dc-verdict')).toContainText('Skipped')
  }
  await expect(page.locator('#phone-bar-primary').getByRole('button', { name: 'Deal the pacts' })).toBeDisabled()

  await page.locator('.strain .skip').click()
  await expect(page.locator('#phone-bar-primary').getByRole('button', { name: 'Deal the pacts' })).toBeEnabled()

  // The body scrolls; the shell and bar stay fixed.
  const scrolls = await page.locator('.phone-scroll').evaluate(el => el.scrollHeight >= el.clientHeight)
  expect(scrolls).toBe(true)
  const bar = await page.locator('.phone-bar').boundingBox()
  expect(bar!.y + bar!.height).toBeCloseTo(844, 0)

  await context.close()
})
