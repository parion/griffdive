import { expect, test } from '@playwright/test'
import { fileCallsign } from './helpers'

test.use({ reducedMotion: 'reduce' })

test('the Bridge odds console rolls the same dice rarer as the rung and skulls rise', async ({ page }) => {
  await page.goto('/')
  const loot = page.locator('#loot')
  await loot.scrollIntoViewIfNeeded()
  const tiers = loot.locator('.draw .tier-badge')
  await expect(tiers).toHaveCount(4)

  await page.getByRole('radio', { name: /^Difficulty 3,/ }).click()
  await page.getByLabel('Skulls taken').fill('0')
  await expect(tiers).toHaveText(['C', 'C', 'C', 'C'])

  await page.getByRole('radio', { name: /^Difficulty 10,/ }).click()
  await page.getByLabel('Skulls taken').fill('11')
  await expect(tiers).toHaveText(['A', 'S', 'S', 'S+'])
  await expect(loot.locator('.draw').last()).toContainText('Liberty\'s Cross')
})

test('the closing call returns to the drop console', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Suit up' }).click()
  await expect(page.locator('#deploy')).toBeFocused()
  await expect(page.getByRole('button', { name: 'Host an online dive' })).toBeInViewport()
})

test('a saved run takes the wheel\'s place in the hero', async ({ page }) => {
  await page.goto('/')
  const wheel = page.locator('.hero .bw')
  await expect(wheel).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Service record' })).toHaveCount(0)

  await page.getByRole('button', { name: 'Solo drop' }).click()
  await fileCallsign(page, 'Griffon')
  await page.getByRole('button', { name: 'Start the dive' }).click()
  await expect(page.getByRole('button', { name: 'Spin', exact: true })).toBeVisible()
  await page.goto('/')
  const record = page.locator('.hero .record')
  await expect(record.locator('.record-card').filter({ hasText: 'Griffon' })).toBeVisible()
  await expect(wheel).toHaveCount(0)
})

const THREE_FRONTS = {
  status: 'active',
  order: {
    fronts: ['terminids', 'illuminate', 'automatons'],
    live: true,
    title: 'Hold the line on every front.',
    planets: [{ index: 64, name: 'Meridia', front: 'terminids', liberation: 41.2 }],
    expiresAt: new Date(Date.now() + 80 * 60 * 60 * 1000).toISOString(),
  },
}

test('a three-front Major Order docks in the header on desktop and pins to the bottom on phones', async ({ browser }) => {
  for (const viewport of [{ width: 1024, height: 768 }, { width: 360, height: 640 }]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' })
    const page = await context.newPage()
    await page.route('**/api/war/major-order', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(THREE_FRONTS),
    }))
    await page.goto('/')
    const band = page.locator('.mo-band.mo-in')
    await expect(band).toBeVisible()
    await expect(band.getByRole('button', { name: 'Start campaign' })).toBeVisible()
    const box = (await band.boundingBox())!
    if (viewport.width > 860) {
      await expect(page.locator('header .mo-band')).toHaveCount(1)
      await expect(band).toContainText('Terminids / Illuminate / Automatons')
      expect(box.y + box.height).toBeLessThanOrEqual(60)
    }
    else {
      expect(box.y + box.height).toBeGreaterThan(viewport.height - 20)
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
    await context.close()
  }
})
