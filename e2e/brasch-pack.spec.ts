import { expect, test, type Page } from '@playwright/test'
import { dismissWarbondIntro, fileCallsign } from './helpers'

// The shop only opens after the first operation, and a pack costs a real save.
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

test('Brasch sells one Armor Pack per operation and opens the pull', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await stockedDive(page)

  await page.getByRole('button', { name: /Brasch's Bargains, 1000 credits/ }).click()
  const shop = page.getByRole('region', { name: 'Brasch\'s Bargains' })
  const pack = shop.locator('.bb-pack')
  await expect(pack).toContainText('Armor Pack')
  await expect(pack).toContainText('Up to 3 armor passives')
  await expect(shop.locator('.bb-side')).toContainText('One pack per operation')

  await pack.locator('.bb-pack-btn').click()
  const dialog = page.getByRole('dialog', { name: 'Armor Pack' })
  await expect(dialog).toBeVisible()
  // Not a dialog card: the pack stage owns the viewport.
  const box = await dialog.boundingBox()
  expect(box).toMatchObject({ x: 0, y: 0, width: 1440, height: 900 })
  await expect(dialog.locator('.card-slot')).toHaveCount(3)
  await expect(dialog.locator('.card-name')).toHaveCount(3)
  await dialog.getByRole('button', { name: 'To the shelf' }).click()
  await expect(dialog).toBeHidden()

  // The shelf keeps its three slots; the side table now shows the pull.
  await expect(shop.locator('.bb-card')).toHaveCount(3)
  await expect(pack).toContainText('Opened this operation')
  await expect(pack.getByRole('button', { name: 'View pull' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Brasch's Bargains, 840 credits/ })).toBeEnabled()
})

test('the pack opens on a tap and settles the fan', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await stockedDive(page)

  await page.getByRole('button', { name: /Brasch's Bargains, 1000 credits/ }).click()
  await page.getByRole('region', { name: 'Brasch\'s Bargains' }).locator('.bb-pack-btn').click()
  const dialog = page.getByRole('dialog', { name: 'Armor Pack' })
  await expect(dialog).toHaveClass(/sealed/)
  await dialog.locator('.tap-zone').click()
  await expect(dialog).toHaveClass(/bursting|drawing/)
  // The deck deals and the fan settles; the single CTA is the end state.
  await expect(dialog.getByRole('button', { name: 'To the shelf' })).toBeVisible({ timeout: 10_000 })
  await expect(dialog.locator('.card-slot')).toHaveCount(3)
})

test('the Armor Pack reveal stacks over the phone shop', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  })
  const page = await context.newPage()
  await stockedDive(page)

  await page.getByRole('button', { name: /Brasch's Bargains, 1000 credits/ }).tap()
  const shop = page.getByRole('region', { name: 'Brasch\'s Bargains' })
  await shop.locator('.bb-pack-btn').tap()
  const dialog = page.getByRole('dialog', { name: 'Armor Pack' })
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('.card-slot')).toHaveCount(3)
  await dialog.getByRole('button', { name: 'To the shelf' }).tap()
  await expect(dialog).toBeHidden()
  // The phone sidebar stays open under the stage (the click-outside lock).
  await expect(shop).toContainText('Opened this operation')
  await context.close()
})
