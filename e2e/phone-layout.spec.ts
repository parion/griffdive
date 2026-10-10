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
  const spin = page.getByRole('button', { name: 'Spin the wheel' })
  await expect(spin).toBeInViewport()
  await spin.click()
  await expect(page.locator('.cue')).toContainText('Squad call')
  await expectNoHorizontalOverflow(page)

  await context.close()
})

test('phone: the report time bar scrubs under a finger', async ({ browser }) => {
  const context = await browser.newContext({ viewport: SMALL_PHONE, reducedMotion: 'reduce', hasTouch: true, isMobile: true })
  const page = await context.newPage()

  await page.goto('/')
  await page.getByLabel('Diver name').fill('Griff')
  await page.getByRole('button', { name: 'Solo drop' }).click()
  await dismissWarbondIntro(page)
  await page.getByRole('button', { name: 'Spin the wheel' }).click()
  for (let attempt = 0; attempt < 2; attempt++) {
    const optOut = page.getByRole('button', { name: /^Opt out/ }).first()
    if (await optOut.isVisible().catch(() => false)) {
      await optOut.click()
    }
  }
  await page.getByRole('button', { name: 'Deal the pacts' }).click()
  await page.getByRole('button', { name: 'Lock in', exact: true }).click()
  await page.getByRole('button', { name: 'Mission complete' }).click()

  const bar = page.getByRole('progressbar', { name: /time/i })
  await bar.scrollIntoViewIfNeeded()
  const box = (await bar.boundingBox())!
  const y = box.y + box.height / 2
  const cdp = await context.newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + 2, y }] })
  for (let step = 1; step <= 6; step++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x + box.width * 0.6 * step / 6, y }] })
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect(bar).toHaveAttribute('aria-valuenow', '60')

  await context.close()
})
