import { expect, test, type Page } from '@playwright/test'
import { dismissWarbondIntro, fileCallsign } from './helpers'

// The shop only opens after the first operation, and the first pack is cheap
// enough that a funded test account can buy several and watch the price climb.
// Seed the save's purse and altitude through localStorage so the test exercises
// the live purchase/reveal rather than a mocked engine.
async function stockedDive(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: 'Solo drop' }).click()
  await fileCallsign(page, 'Griffon')
  await dismissWarbondIntro(page)
  await page.waitForFunction(() => localStorage.getItem('griffdive:saves:v2'))
  await page.evaluate(() => {
    const key = 'griffdive:saves:v2'
    const index = JSON.parse(localStorage.getItem(key) || '{}')
    const id = Object.keys(index)[0]!
    const doc = index[id]
    doc.state.difficulty = 4
    for (const diver of doc.state.divers) {
      diver.credits = 1000
    }
    localStorage.setItem(key, JSON.stringify(index))
  })
  await page.reload()
  await expect(page.getByRole('button', { name: /Brasch's Bargains, 1000 credits/ })).toBeEnabled()
}

const counter = (page: Page) => page.getByRole('dialog', { name: 'Brasch\'s Bargains' })
const reveal = (page: Page) => page.getByRole('dialog', { name: 'Armor Pack' })

test('the Armor Pack is a card in the shelf row and opens over the counter', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await stockedDive(page)

  await page.getByRole('button', { name: /Brasch's Bargains, 1000 credits/ }).click()
  const shop = counter(page)
  await expect(shop).toBeVisible()
  await expect(shop.locator('.shelf .slot')).toHaveCount(3)

  // The pack is side stock in the row, not a banner below it.
  const pack = shop.locator('.pack-card')
  await expect(pack).toContainText('Armor Pack')
  await expect(pack).toContainText('3 armor passives')
  await expect(pack).toContainText('S 1%')
  await expect(pack.locator('.mini')).toHaveCount(3)

  await pack.getByRole('button', { name: 'Open Armor Pack 1 for 25 credits' }).click()
  const fan = reveal(page)
  await expect(fan).toBeVisible()
  // A contained stage over the counter, not a viewport takeover. The counter
  // stays painted underneath but is inert while the pack has focus.
  const box = await fan.boundingBox()
  expect(box!.x).toBeGreaterThan(0)
  expect(box!.y).toBeGreaterThan(0)
  expect(box!.width).toBeLessThan(1440)
  expect(box!.height).toBeLessThan(900)
  await expect(page.locator('.brasch-dialog')).toBeVisible()
  await expect(fan.locator('.card-slot')).toHaveCount(3)
  await fan.getByRole('button', { name: 'To the shelf' }).click()
  await expect(fan).toBeHidden()

  // The counter never closed; it shows the opened pack and the next price.
  await expect(shop).toBeVisible()
  await expect(pack.locator('.pack-count')).toHaveText('1')
  await expect(pack.getByRole('button', { name: 'Open Armor Pack 2 for 38 credits' })).toBeVisible()
  await expect(pack.getByRole('button', { name: 'View the newest Armor Pack pull' })).toBeVisible()
})

test('a second pack costs more and the replay opens the settled fan', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await stockedDive(page)

  await page.getByRole('button', { name: /Brasch's Bargains, 1000 credits/ }).click()
  const shop = counter(page)
  const pack = shop.locator('.pack-card')

  await pack.getByRole('button', { name: 'Open Armor Pack 1 for 25 credits' }).click()
  const first = reveal(page)
  await expect(first).toBeVisible()
  await first.getByRole('button', { name: 'To the shelf' }).click()
  await expect(first).toBeHidden()

  await pack.getByRole('button', { name: 'Open Armor Pack 2 for 38 credits' }).click()
  const second = reveal(page)
  await expect(second).toBeVisible()
  await second.getByRole('button', { name: 'To the shelf' }).click()
  await expect(second).toBeHidden()
  await expect(pack.locator('.pack-count')).toHaveText('2')
  await expect(pack.getByRole('button', { name: 'Open Armor Pack 3 for 56 credits' })).toBeVisible()

  // The replay is instant and still shows the newest pull.
  await pack.getByRole('button', { name: 'View the newest Armor Pack pull' }).click()
  const replay = reveal(page)
  await expect(replay).toBeVisible()
  await expect(replay).toHaveClass(/settled/)
  await expect(replay.locator('.card-slot')).toHaveCount(3)
  await replay.getByRole('button', { name: 'To the shelf' }).click()
  await expect(replay).toBeHidden()
})

test('the phone opens the counter and the pack fullscreen', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  })
  const page = await context.newPage()
  await stockedDive(page)

  await page.getByRole('button', { name: /Brasch's Bargains, 1000 credits/ }).tap()
  const shop = counter(page)
  await expect(shop).toBeVisible()
  await expect(await shop.boundingBox()).toMatchObject({ x: 0, y: 0, width: 390, height: 844 })

  const pack = shop.locator('.pack-card')
  await pack.getByRole('button', { name: 'Open Armor Pack 1 for 25 credits' }).tap()
  const fan = reveal(page)
  await expect(fan).toBeVisible()
  await expect(await fan.boundingBox()).toMatchObject({ x: 0, y: 0, width: 390, height: 844 })
  await expect(fan.locator('.card-slot')).toHaveCount(3)
  await fan.getByRole('button', { name: 'To the shelf' }).tap()
  await expect(fan).toBeHidden()

  // The phone counter stays open under the stage and shows the pull count.
  await expect(shop).toBeVisible()
  await expect(pack.locator('.pack-count')).toHaveText('1')
  await context.close()
})
