import { expect, test, type Page } from '@playwright/test'
import { dismissWarbondIntro } from './helpers'

const VIEWPORT = { width: 390, height: 844 }

// Room creation is rate-limited per address and the suite already spends most
// of the budget, so this spec dives from its own (forwarded) address.
const fromAddress = (ip: string) => ({ extraHTTPHeaders: { 'x-forwarded-for': ip } })

// The phone dive's bottom bar is one fixed frame: info above, secondary +
// primary action below, on every screen — never absent, never reshaped.
async function expectPinnedBar(page: Page, label: string): Promise<void> {
  const bar = page.locator('.phone-bar')
  await expect(bar, label).toBeVisible()
  await expect(page.locator('#phone-bar-primary > *').first(), `${label}: primary action`).toBeVisible()
  const box = await bar.boundingBox()
  expect(box, label).not.toBeNull()
  expect(box!.y + box!.height, `${label}: bar sits at the bottom edge`).toBeCloseTo(VIEWPORT.height, 0)
  expect(box!.width, `${label}: bar spans the column`).toBeGreaterThanOrEqual(VIEWPORT.width - 4)
  const primary = await page.locator('#phone-bar-primary > *').first().boundingBox()
  expect(primary!.height, `${label}: primary hit area`).toBeGreaterThanOrEqual(54)
  if (process.env.SHOTS) {
    await page.screenshot({ path: `${process.env.SHOTS}/${label}.png` })
  }
}

test('phone: the action bar is pinned on every screen of a dive', async ({ browser }) => {
  const context = await browser.newContext({ viewport: VIEWPORT, reducedMotion: 'reduce', ...fromAddress('10.20.0.1') })
  const page = await context.newPage()

  await page.goto('/')
  await page.getByRole('button', { name: 'Host an online dive' }).click()
  await expect(page).toHaveURL(/\/dive\/[A-Z0-9]{6}/)
  await page.getByLabel('Your name').fill('Host')
  await page.getByRole('button', { name: 'Join the dive' }).click()
  await dismissWarbondIntro(page)

  // Setup stands alone (no dive bars); its launch CTA pins to the bottom edge.
  const launch = page.getByRole('button', { name: /^Launch crusade/ })
  const launchBox = await launch.boundingBox()
  expect(launchBox!.y + launchBox!.height).toBeGreaterThan(VIEWPORT.height - 40)
  expect(launchBox!.height).toBeGreaterThanOrEqual(54)
  await launch.click()
  await expect(page.locator('.phone-call')).toBeVisible()

  await expectPinnedBar(page, '2-wheel-spin')
  await page.locator('#phone-bar-primary').getByRole('button', { name: 'Spin the wheel' }).click()
  await expect(page.locator('.directive .take')).toBeVisible()
  await expectPinnedBar(page, '3-wheel-decision')

  // Opting out of both calls keeps the flow deterministic (no stranded rules).
  await page.locator('.directive .skip').click()
  await page.locator('.strain .skip').click()
  await expectPinnedBar(page, '4-wheel-deal')
  await page.locator('#phone-bar-primary').getByRole('button', { name: 'Deal the pacts' }).click()

  await expect(page.locator('.phone-pacts')).toBeVisible()
  await expectPinnedBar(page, '5-pacts')
  await page.locator('#phone-bar-primary').getByRole('button', { name: 'Dive with no pacts' }).click()
  await expectPinnedBar(page, '6-diving')

  await page.locator('#phone-bar-primary').getByRole('button', { name: 'Extracted' }).click()
  await expect(page.getByRole('heading', { name: 'Mission report' })).toBeVisible()
  await expectPinnedBar(page, '7-report')

  // Honors moved to the report window: spin while the numbers are in hand.
  await page.getByRole('button', { name: 'Spin the stat' }).click()
  await expect(page.getByText('Host banked the token.', { exact: true })).toBeVisible()

  await page.locator('#phone-bar-primary').getByRole('button', { name: 'File report' }).click()

  await expect(page.locator('.phone-loot .loot-card').first()).toBeVisible()
  await expectPinnedBar(page, '8-draft')
  await page.locator('.phone-loot .loot-card').first().click()
  await expectPinnedBar(page, '9-draft-banked')
  await page.locator('#phone-bar-primary').getByRole('button', { name: /^Bank / }).click()
  await expect(page.locator('#phone-bar-primary').getByRole('button', { name: 'Next mission' })).toBeVisible()

  await context.close()
})

test('phone: a failed mission lands on the pinned remove bar', async ({ browser }) => {
  const context = await browser.newContext({ viewport: VIEWPORT, reducedMotion: 'reduce', ...fromAddress('10.20.0.2') })
  const page = await context.newPage()

  await page.goto('/')
  await page.getByRole('button', { name: 'Host an online dive' }).click()
  await expect(page).toHaveURL(/\/dive\/[A-Z0-9]{6}/)
  await page.getByLabel('Your name').fill('Host')
  await page.getByRole('button', { name: 'Join the dive' }).click()
  await dismissWarbondIntro(page)

  const primary = page.locator('#phone-bar-primary')
  async function diveToPacts(firstMission: boolean): Promise<void> {
    await primary.getByRole('button', { name: 'Spin the wheel' }).click()
    await page.locator('.directive .skip').click()
    // The strain call only opens on an operation's first mission.
    if (firstMission) {
      await page.locator('.strain .skip').click()
    }
    await primary.getByRole('button', { name: 'Deal the pacts' }).click()
    await primary.getByRole('button', { name: 'Dive with no pacts' }).click()
  }

  await page.getByRole('button', { name: 'Launch crusade' }).click()
  await diveToPacts(true)

  // Failure only takes earned gear, so clear mission 1 and bank a reward first.
  await primary.getByRole('button', { name: 'Extracted' }).click()
  await primary.getByRole('button', { name: 'File report' }).click()
  await page.locator('.phone-loot .loot-card').first().click()
  await primary.getByRole('button', { name: /^Bank / }).click()
  await primary.getByRole('button', { name: /Next mission/ }).click()
  await diveToPacts(false)

  await page.locator('#phone-bar-secondary').getByRole('button', { name: 'Mission failed' }).click()
  await expectPinnedBar(page, '10-diving-confirm-failure')
  await page.locator('#phone-bar-primary').getByRole('button', { name: 'File failure' }).click()

  await expect(page.getByRole('heading', { name: 'Mission failed' }).first()).toBeVisible()
  await expectPinnedBar(page, '11-forfeit')

  // Picking an item arms the hold-to-confirm remove.
  await page.locator('.sur-tile').first().click()
  await expect(page.locator('#phone-bar-primary').getByRole('button', { name: /Remove/ })).toBeEnabled()
  await expectPinnedBar(page, '12-forfeit-armed')

  await context.close()
})
