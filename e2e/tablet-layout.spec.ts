import { expect, test, type Page } from '@playwright/test'
import { dismissWarbondIntro, fileCallsign, settleDebrief } from './helpers'

// Tablet guards from the responsive audit. Just above the 1020px breakpoint the
// three-rail terminal once squeezed the centre phase until the wheel's decision
// cards, the report and the reward pods spilled under the Kit rail; just below
// it the phone shell floated as a 430px strip in empty gutters. The terminal
// also stays exactly one viewport tall: a hidden `.sr-only` label deep in a
// rail's tall content once gave the whole page a scrollbar and dead space under
// the phase bar.
const LANDSCAPE_TABLET = { width: 1024, height: 768 }
const PORTRAIT_TABLET = { width: 768, height: 1024 }

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
}

// The terminal is exactly one viewport and clips its own overflow, so the page
// itself must never scroll: any page-level scrollbar leaves dead space under the
// phase bar. (The rails scroll internally; that is fine.) The classic way this
// breaks is a hidden `.sr-only` label deep in a rail's tall content.
async function expectNoVerticalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollHeight - document.documentElement.clientHeight)
  expect(overflow).toBeLessThanOrEqual(0)
}

// The centre column clips sideways (overflow-x: hidden), so a too-wide phase
// never shows up as page overflow — compare its scroll width instead.
async function expectCentreFits(page: Page): Promise<void> {
  const overflow = await page.locator('#main-content').evaluate(el => el.scrollWidth - el.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
}

test('landscape tablet: the terminal keeps every phase inside the centre column', async ({ browser }) => {
  const context = await browser.newContext({ viewport: LANDSCAPE_TABLET, reducedMotion: 'reduce' })
  const page = await context.newPage()

  await page.goto('/')
  await expectNoHorizontalOverflow(page)
  await page.getByRole('button', { name: 'Solo drop' }).click()
  await fileCallsign(page, 'Griff')
  await dismissWarbondIntro(page)

  await page.getByRole('button', { name: 'Spin', exact: true }).click()
  // The drawn directive's call stays in view beside the wheel here.
  await expect(page.locator('.directive-card').getByRole('button', { name: 'Take it' })).toBeInViewport()
  await expectCentreFits(page)
  await expectNoVerticalOverflow(page)

  const directiveSkip = page.locator('.directive-card').getByRole('button', { name: 'Skip' })
  if (await directiveSkip.isVisible().catch(() => false)) {
    await directiveSkip.click()
  }
  const strainSkip = page.locator('.strain-card').getByRole('button', { name: 'Skip' })
  if (await strainSkip.isVisible().catch(() => false)) {
    await strainSkip.click()
  }
  await page.getByRole('button', { name: 'Deal the pacts' }).click()
  await page.getByRole('button', { name: 'Dive with no pacts' }).click()
  await expectCentreFits(page)
  await expectNoVerticalOverflow(page)

  await page.getByRole('button', { name: 'Extracted' }).click()
  await expect(page.getByRole('heading', { name: 'Mission report' })).toBeVisible()
  await expectCentreFits(page)
  await expectNoVerticalOverflow(page)

  await page.getByRole('button', { name: 'File report' }).click()
  await settleDebrief(page)
  await expect(page.getByRole('heading', { name: 'Bank one item' })).toBeVisible()
  await expectCentreFits(page)
  await expectNoVerticalOverflow(page)

  await context.close()
})

test('portrait tablet: the phone shell widens to the tablet', async ({ browser }) => {
  const context = await browser.newContext({ viewport: PORTRAIT_TABLET, reducedMotion: 'reduce', hasTouch: true })
  const page = await context.newPage()

  await page.goto('/')
  await page.getByRole('button', { name: 'Solo drop' }).click()
  await fileCallsign(page, 'Griff')
  await dismissWarbondIntro(page)

  const shell = await page.locator('.phone-shell').boundingBox()
  expect(shell?.width).toBeGreaterThanOrEqual(700)
  await expect(page.getByRole('button', { name: 'Spin the wheel' })).toBeInViewport()
  await expectNoHorizontalOverflow(page)

  await context.close()
})
