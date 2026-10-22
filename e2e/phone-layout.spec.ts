import { expect, test, type Page } from '@playwright/test'
import { dismissWarbondIntro } from './helpers'

// Phone layout guards from the mobile checkup. A live Major Order once blew the
// Bridge out to a ~960px layout viewport, so every phone tap landed on a
// zoomed-out page.
const SMALL_PHONE = { width: 360, height: 640 }

async function mockMajorOrder(page: Page): Promise<void> {
  await page.route('**/api/war/major-order', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      status: 'active',
      order: {
        fronts: ['terminids', 'automatons'],
        live: true,
        title: 'Hold the designated planet and eliminate the mandated number of bile-producing Terminids in order to prove the safety of the region',
        planets: [{ index: 64, name: 'Meridia', front: 'terminids', liberation: 41.2 }],
        expiresAt: new Date(Date.now() + 80 * 60 * 60 * 1000).toISOString(),
      },
    }),
  }))
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
}

test('phone: the Bridge and the dive never overflow sideways', async ({ browser }) => {
  const context = await browser.newContext({ viewport: SMALL_PHONE, reducedMotion: 'reduce', hasTouch: true, isMobile: true })
  const page = await context.newPage()
  await mockMajorOrder(page)

  await page.goto('/')
  await expect(page.locator('.mo-band.mo-in')).toBeVisible()
  await expectNoHorizontalOverflow(page)
  // Ship nav keeps its labels on phones.
  await expect(page.getByRole('button', { name: 'Codex', exact: true })).toContainText('Codex')

  await page.getByLabel('Diver name').fill('Griff')
  await page.getByRole('button', { name: 'Solo drop' }).click()
  await dismissWarbondIntro(page)
  await expectNoHorizontalOverflow(page)

  // Before the draw the pinned CTA is the live spin, not a dead deal gate.
  await expect(page.locator('.beats .beat.current')).toContainText('Call')
  const spin = page.getByRole('button', { name: 'Spin the wheel' })
  await expect(spin).toBeInViewport()
  await spin.click()
  await expect(page.locator('.phone-call')).toBeVisible()
  await expect(page.locator('.directive .take')).toBeVisible()
  await expectNoHorizontalOverflow(page)

  await context.close()
})

test('phone: the report time cells tap under a finger', async ({ browser }) => {
  const context = await browser.newContext({ viewport: SMALL_PHONE, reducedMotion: 'reduce', hasTouch: true, isMobile: true })
  const page = await context.newPage()

  await page.goto('/')
  await page.getByLabel('Diver name').fill('Griff')
  await page.getByRole('button', { name: 'Solo drop' }).click()
  await dismissWarbondIntro(page)
  await page.getByRole('button', { name: 'Spin the wheel' }).click()
  await page.locator('.directive .skip').click()
  await page.locator('.strain .skip').click()
  await page.getByRole('button', { name: 'Deal the pacts' }).click()
  await page.getByRole('button', { name: 'Dive with no pacts' }).click()
  await page.getByRole('button', { name: 'Extracted' }).click()

  const cell = page.getByRole('button', { name: 'Set time remaining to 60 percent' })
  await cell.scrollIntoViewIfNeeded()
  const box = (await cell.boundingBox())!
  expect(box.width).toBeGreaterThanOrEqual(24)
  expect(box.height).toBeGreaterThanOrEqual(24)
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2)
  await expect(page.locator('.time-value')).toContainText('60')

  await context.close()
})
