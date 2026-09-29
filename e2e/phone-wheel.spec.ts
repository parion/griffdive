import { expect, test } from '@playwright/test'
import { dismissWarbondIntro } from './helpers'

// The phone wheel phase must expose one scroll region: the wheel and the
// directive/strain decision cards scroll together, so the cards can come up
// over the wheel instead of being trapped in a short nested viewport.
test('phone wheel: decision cards scroll up over the wheel', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()

  await page.goto('/')
  await page.getByLabel('Diver name').fill('Griff')
  await page.getByRole('button', { name: 'Solo drop' }).click()
  await expect(page).toHaveURL(/\/dive\//)
  await dismissWarbondIntro(page)

  // Spin the wheel from its hub.
  await page.locator('.hub').click()
  await expect(page.locator('.phone-wheel .card').first()).toBeVisible()

  const scroll = page.locator('.phone-wheel .scroll')
  await expect(scroll).toBeVisible()
  const overflow = await scroll.evaluate(el => getComputedStyle(el).overflowY)
  expect(overflow).toBe('auto')

  // The cards need more room than the fold: the region scrolls.
  const before = await scroll.evaluate(el => ({ client: el.clientHeight, content: el.scrollHeight }))
  expect(before.content).toBeGreaterThan(before.client)

  // Scrolling down brings the strain card (whole-operation faction commitment)
  // into view above where the wheel was.
  await scroll.evaluate((el) => {
    el.scrollTop = el.scrollHeight
  })
  await expect(page.locator('.phone-wheel .strain-card')).toBeInViewport()

  await context.close()
})
