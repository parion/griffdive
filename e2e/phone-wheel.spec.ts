import { expect, test } from '@playwright/test'
import { dismissWarbondIntro } from './helpers'

// The phone wheel stays fixed; the directive/strain decision cards are a sheet
// that tucks over its lower rim and scrolls internally — never the page.
test('phone wheel: decision cards scroll over the wheel', async ({ browser }) => {
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

  // The wheel stays put: the page itself never scrolls.
  const pageScroll = await page.locator('.phone-scroll').evaluate(el => el.scrollHeight <= el.clientHeight + 1)
  expect(pageScroll).toBe(true)

  const sheet = page.locator('.phone-wheel .cards')
  await expect(sheet).toBeVisible()
  expect(await sheet.evaluate(el => getComputedStyle(el).overflowY)).toBe('auto')

  // The cards need more room than the sheet: it scrolls internally.
  const before = await sheet.evaluate(el => ({ client: el.clientHeight, content: el.scrollHeight }))
  expect(before.content).toBeGreaterThan(before.client)

  // The sheet's top edge overlaps the wheel, and the wheel is still on screen.
  const overlaps = await sheet.evaluate((el) => {
    const wheel = document.querySelector('.phone-wheel .wheel-wrap')!.getBoundingClientRect()
    const cardTop = el.getBoundingClientRect().top
    return cardTop < wheel.bottom && wheel.bottom > 0
  })
  expect(overlaps).toBe(true)

  // Scrolling brings the strain card (whole-operation faction commitment) in.
  await sheet.evaluate((el) => {
    el.scrollTop = el.scrollHeight
  })
  await expect(page.locator('.phone-wheel .strain-card')).toBeInViewport()

  await context.close()
})
