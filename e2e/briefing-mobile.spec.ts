import { expect, test, type Page } from '@playwright/test'
import { fileCallsign } from './helpers'

// The host tutorial is a full page. On a phone the squad box's two actions
// must fit the viewport width, the start must be in the first screen, and the
// page must never scroll sideways.
const PHONE = { viewport: { width: 390, height: 844 } }

async function openBriefing(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: 'Solo drop' }).click()
  await fileCallsign(page, 'Griff')
  await expect(page).toHaveURL(/\/dive\//)
  await expect(page.getByRole('heading', { name: 'You hold the wheel.' })).toBeVisible()
}

test('mobile host tutorial: no sideways scroll, both squad-box actions show', async ({ browser }) => {
  const context = await browser.newContext(PHONE)
  const page = await context.newPage()
  await openBriefing(page)

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)

  await expect(page.getByRole('button', { name: 'Set warbonds' })).toBeVisible()
  const start = page.getByRole('button', { name: 'Start the dive' })
  // The page is one screen's worth: the way in sits in the first viewport.
  await expect(start).toBeInViewport()
  await start.click()
  await expect(page.getByRole('heading', { name: 'You hold the wheel.' })).toBeHidden()
  await context.close()
})
