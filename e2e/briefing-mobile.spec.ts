import { expect, test, type Page } from '@playwright/test'

// The first-run Griffdiver briefing is a fixed, no-scroll overlay. On a phone
// the desktop layout used to blow the main column past the viewport, pushing
// the forward CTA off-screen and locking mobile players out.
const PHONE = { viewport: { width: 390, height: 844 } }

async function openBriefing(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByLabel('Diver name').fill('Griff')
  await page.getByRole('button', { name: 'Solo drop' }).click()
  await expect(page).toHaveURL(/\/dive\//)
  await expect(page.getByRole('dialog', { name: 'Griffdiver briefing' })).toBeVisible()
}

test('mobile briefing: the forward CTA is reachable on every beat', async ({ browser }) => {
  const context = await browser.newContext(PHONE)
  const page = await context.newPage()
  await openBriefing(page)

  // No horizontal overflow: the fixed overlay must fit the viewport.
  const overflow = await page.evaluate(() => {
    const brief = document.querySelector('.brief')!
    return brief.scrollWidth - brief.clientWidth
  })
  expect(overflow).toBeLessThanOrEqual(0)

  for (const title of ['Spin', 'Pact', 'Reward', 'Warbonds']) {
    const cta = page.locator('.brief-next')
    await expect(cta).toBeInViewport()
    await cta.click()
    await expect(page.locator('.brief-title')).toHaveText(title)
  }

  const cta = page.locator('.brief-next')
  await expect(cta).toBeInViewport()
  await cta.click()
  await expect(page.locator('.brief-title')).toHaveText('Deploy')
  await expect(cta).toBeInViewport()
  await expect(cta).toContainText('Enter Griffdive')
  await cta.click()
  await expect(page.getByRole('dialog', { name: 'Griffdiver briefing' })).toBeHidden()
  await context.close()
})

test('mobile briefing: skip the tour lands on deploy', async ({ browser }) => {
  const context = await browser.newContext(PHONE)
  const page = await context.newPage()
  await openBriefing(page)

  await page.getByRole('button', { name: 'Skip the tour' }).click()
  await expect(page.locator('.brief-title')).toHaveText('Deploy')
  await expect(page.locator('.brief-next')).toContainText('Enter Griffdive')
  await context.close()
})
