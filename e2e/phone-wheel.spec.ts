import { expect, test } from '@playwright/test'
import { dismissWarbondIntro } from './helpers'

// The phone wheel phase is a drawer: the wheel sticks to the top and the
// directive/strain sheet scrolls up over it — the page itself never scrolls.
test('phone wheel: decision sheet expands over the wheel', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()

  await page.goto('/')
  await page.getByLabel('Diver name').fill('Griff')
  await page.getByRole('button', { name: 'Solo drop' }).click()
  await expect(page).toHaveURL(/\/dive\//)
  await dismissWarbondIntro(page)

  // The legend is gone from the phone wheel.
  await expect(page.locator('.phone-wheel .legend')).toHaveCount(0)
  await expect(page.locator('.phone-wheel .risk-legend')).toBeHidden()

  // Spin the wheel from its hub.
  await page.locator('.hub').click()
  await expect(page.locator('.phone-wheel .card').first()).toBeVisible()

  const pageScroll = await page.locator('.phone-scroll').evaluate(el => el.scrollHeight <= el.clientHeight + 1)
  expect(pageScroll).toBe(true)

  const drawer = page.locator('.phone-wheel .body')
  expect(await drawer.evaluate(el => getComputedStyle(el).overflowY)).toBe('auto')

  const geometry = () => page.evaluate(() => ({
    wheel: document.querySelector('.phone-wheel .wheel-wrap')!.getBoundingClientRect().toJSON() as DOMRect,
    sheetTop: document.querySelector('.phone-wheel .cards')!.getBoundingClientRect().top,
  }))

  // Once the spin lands the drawer opens on its own.
  await expect.poll(() => drawer.evaluate(el => el.scrollTop)).toBeGreaterThan(0)
  await drawer.evaluate((el) => {
    el.scrollTop = 0
  })

  // Collapsed: the sheet tucks over the wheel's lower rim, the wheel on screen.
  const collapsed = await geometry()
  expect(collapsed.sheetTop).toBeLessThan(collapsed.wheel.bottom)
  expect(collapsed.sheetTop).toBeGreaterThan(collapsed.wheel.top)

  // The cards need more room than the collapsed sheet: the drawer scrolls.
  expect(await drawer.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true)

  // Expanded: the wheel holds its place and the sheet rides up over it,
  // bringing the strain card (whole-operation faction commitment) in.
  await drawer.evaluate((el) => {
    el.scrollTop = el.scrollHeight
  })
  await expect(page.locator('.phone-wheel .strain-card')).toBeInViewport()
  const expanded = await geometry()
  expect(expanded.wheel.top).toBeCloseTo(collapsed.wheel.top, 0)
  expect(expanded.sheetTop).toBeLessThan(collapsed.sheetTop - 100)

  await context.close()
})
