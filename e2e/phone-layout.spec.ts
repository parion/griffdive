import { expect, test, type Page } from '@playwright/test'
import { dismissWarbondIntro, fileCallsign } from './helpers'

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
  await expect(page.getByRole('link', { name: 'Ko-fi', exact: true })).toContainText('Ko-fi')

  await page.getByRole('button', { name: 'Solo drop' }).click()
  await fileCallsign(page, 'Griff')
  await dismissWarbondIntro(page)
  await expectNoHorizontalOverflow(page)

  // Before the draw the pinned CTA is the live spin, not a dead deal gate.
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
  await page.getByRole('button', { name: 'Solo drop' }).click()
  await fileCallsign(page, 'Griff')
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

test('phone: the hangar keeps four bays in a row and the launch in reach', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: SMALL_PHONE,
    reducedMotion: 'reduce',
    hasTouch: true,
    isMobile: true,
    extraHTTPHeaders: { 'x-forwarded-for': '10.30.0.1' },
  })
  const page = await context.newPage()
  await mockMajorOrder(page)

  await page.goto('/')
  await page.getByRole('button', { name: 'Host an online dive' }).click()
  await expect(page).toHaveURL(/\/dive\/[A-Z0-9]{6}/)
  await page.getByLabel('Your name').fill('Host')
  await page.getByLabel('Your name').press('Enter')
  await page.getByRole('button', { name: 'Start the dive' }).click()
  await dismissWarbondIntro(page)

  // Setup stands alone: no dive header or squad dock until launch.
  await expect(page.locator('.hangar')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Kit' })).toHaveCount(0)

  const bays = page.locator('.bays .bay')
  await expect(bays).toHaveCount(4)
  const tops = await bays.evaluateAll(els => els.map(el => Math.round(el.getBoundingClientRect().top)))
  expect(new Set(tops).size).toBe(1)

  // The hangar clips at the viewport, so overflow shows as content past the edge.
  const past = await page.evaluate(() => [...document.querySelectorAll('.hangar *')]
    .filter(el => el.getBoundingClientRect().right > window.innerWidth + 1).length)
  expect(past).toBe(0)

  // The live order is the default plan.
  await expect(page.getByRole('radio', { name: /Major Order/ })).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByRole('button', { name: /^Launch crusade/ })).toBeInViewport()

  await context.close()
})
