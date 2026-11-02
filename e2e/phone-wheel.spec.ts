import { expect, test } from '@playwright/test'
import { dismissWarbondIntro, fileCallsign } from './helpers'

// The phone call is one flat lit stage: directive and strain first, the wheel
// below, and the fixed action bar carrying the spin/deal gate.
test('phone wheel: the call reads top-down and the action bar follows the beat', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
  const page = await context.newPage()

  await page.goto('/')
  await page.getByRole('button', { name: 'Solo drop' }).click()
  await fileCallsign(page, 'Griff')
  await expect(page).toHaveURL(/\/dive\//)
  await dismissWarbondIntro(page)

  // The legend is gone from the phone wheel.
  await expect(page.locator('.phone-call .legend')).toHaveCount(0)
  await expect(page.locator('.phone-call .risk-legend')).toBeHidden()

  // Spin from the wheel hub.
  await page.locator('.hub').click()
  await expect(page.locator('.directive .take')).toBeVisible()
  await expect(page.locator('.strain .take')).toBeVisible()

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

test('phone wheel: reveal gates actions and paid rerolls confirm before spending', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'no-preference',
    hasTouch: true,
    isMobile: true,
  })
  const page = await context.newPage()

  await page.goto('/')
  await page.getByRole('button', { name: 'Solo drop' }).click()
  await fileCallsign(page, 'Griff')
  await dismissWarbondIntro(page)

  await page.getByRole('button', { name: 'Spin the wheel' }).click()
  const deal = page.locator('#phone-bar-primary').getByRole('button', { name: 'Deal the pacts' })
  const directiveReroll = page.getByRole('button', { name: 'Reroll directive · 1 token' })
  await expect(deal).toBeDisabled()
  await expect(deal).toHaveAttribute('title', 'Wait for the wheel reveal to finish')
  await expect(directiveReroll).toBeDisabled()
  await expect(directiveReroll).toHaveAttribute('title', 'Wait for the wheel reveal to finish')
  await expect(page.getByRole('button', { name: 'Reroll front · 1 token' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Reroll strain · 1 token' })).toBeDisabled()

  await expect(page.locator('.wheel-result')).toBeVisible()
  await expect(page.locator('#phone-wheel-reveal')).toBeHidden()
  await expect(page.getByRole('button', { name: 'View wheel' })).toBeVisible()
  await expect(page.locator('.risk-note')).toContainText('higher difficulties raise risk and offer more pacts')
  await page.getByRole('button', { name: 'View wheel' }).click()
  await expect(page.locator('#phone-wheel-reveal')).toBeVisible()
  await page.getByRole('button', { name: 'Hide wheel' }).click()
  await expect(page.locator('#phone-wheel-reveal')).toBeHidden()

  await directiveReroll.click()
  const confirm = page.getByRole('dialog', { name: 'Spend a reroll token?' })
  await expect(confirm).toContainText('spends 1 token. You have 1.')
  await confirm.getByRole('button', { name: 'Keep this draw' }).click()
  await expect(page.getByRole('dialog', { name: 'Spend a reroll token?' })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Reroll directive · 1 token' })).toBeEnabled()

  await page.getByRole('button', { name: 'Reroll directive · 1 token' }).click()
  await page.getByRole('dialog', { name: 'Spend a reroll token?' }).getByRole('button', { name: 'Spend 1 token' }).click()
  await expect(page.getByRole('button', { name: 'Reroll directive · 0 tokens' })).toBeDisabled()

  await context.close()
})

test('desktop call: Deal and rerolls stay gated until the wheel lands', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: 'no-preference',
  })
  const page = await context.newPage()

  await page.goto('/')
  await page.getByRole('button', { name: 'Solo drop' }).click()
  await fileCallsign(page, 'Griff')
  await dismissWarbondIntro(page)
  await page.getByRole('button', { name: 'Spin the wheel' }).click()

  const deal = page.getByRole('button', { name: 'Deal the pacts' })
  const reroll = page.getByRole('button', { name: /Reroll directive/ })
  await expect(deal).toBeDisabled()
  await expect(deal).toHaveAttribute('title', 'Wait for the wheel reveal to finish')
  await expect(reroll).toBeDisabled()
  await expect(reroll).toHaveAttribute('title', 'Wait for the wheel reveal to finish')
  await expect(page.locator('.directive-card:not(.empty-call)')).toBeVisible()
  await expect(deal).not.toHaveAttribute('title', 'Wait for the wheel reveal to finish')

  await context.close()
})
