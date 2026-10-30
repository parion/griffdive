import { expect, test } from '@playwright/test'
import { defaultTierList, encodeTierList, tierListToJson } from '../shared/engine/tierList'
import { dismissWarbondIntro, expectJoinerLanded } from './helpers'

// Sterilizer is a C-tier stratagem in the default tiers; this list is the
// default tiers with it raised to S.
const SQUAD_LIST = { name: 'Squad Test', tiers: { ...defaultTierList('x').tiers, tx41sterilizer: 's' as const } }

test('the Tier Maker drags, keys and taps an item between tiers, and saves the list', async ({ page }) => {
  await page.goto('/tiers')
  await expect(page.getByRole('heading', { name: 'Tier Maker' })).toBeVisible()
  // Supply alone, in small nameless tiles, keeps every row on screen for the mouse.
  await page.getByRole('radio', { name: 'Supply' }).click()
  await page.getByRole('radio', { name: 'Small tiles' }).click()
  await page.getByRole('button', { name: 'Show item names' }).click()
  await page.getByPlaceholder('Find item').fill('Sterilizer')
  const tile = page.getByRole('button', { name: /^Sterilizer,/ })

  // Drag it into the S row with the mouse.
  const from = (await tile.boundingBox())!
  const to = (await page.locator('[data-drop-tier="s"]').boundingBox())!
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 })
  await expect(page.locator('[data-drop-tier="s"]')).toHaveClass(/over/)
  await page.mouse.up()
  await expect(page.getByRole('button', { name: /^Sterilizer, .*S tier, was C/ })).toBeVisible()
  await expect(page.locator('.tm-tile.landed.t-s')).toBeVisible()
  await expect(page.locator('.tm-head')).toContainText('Unsaved')

  // The keyboard moves it too, keeps focus on it, and D undoes back to the saved tier.
  await page.getByRole('button', { name: /^Sterilizer,/ }).press('a')
  await expect(page.getByRole('button', { name: /^Sterilizer, .*A tier, was C/ })).toBeFocused()
  await page.getByRole('button', { name: /^Sterilizer,/ }).press('d')
  await expect(page.getByRole('button', { name: /^Sterilizer, .*C tier$/ })).toBeFocused()

  // A click opens the inspector; its tier buttons move it as well.
  await page.getByRole('button', { name: /^Sterilizer,/ }).click()
  const inspector = page.getByRole('region', { name: 'Selected item' })
  await inspector.getByRole('radio', { name: /^S tier/ }).click()
  await expect(page.getByRole('button', { name: /^Sterilizer, .*S tier, was C/ })).toBeVisible()

  await page.getByRole('textbox', { name: 'List name' }).fill('Flame On')
  await page.getByRole('button', { name: 'Save to my lists' }).click()
  await expect(page.locator('.tm-head')).toContainText('Next crusade')
  await expect(page.getByRole('button', { name: /^Sterilizer, .*S tier$/ })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('textbox', { name: 'List name' })).toHaveValue('Flame On')
  await page.getByRole('radio', { name: 'Supply' }).click()
  await expect(page.getByRole('button', { name: /^Sterilizer, .*S tier$/ })).toBeVisible()
})

test('boosters and armor passives close out every row', async ({ page }) => {
  await page.goto('/tiers')
  const chips = await page.getByRole('radiogroup', { name: 'Show items' }).getByRole('radio').allTextContents()
  expect(chips.slice(-2).map(chip => chip.trim())).toEqual(['Armor', 'Boosters'])
  for (const tier of ['s', 'a', 'b', 'c']) {
    const labels = await page.locator(`[data-drop-tier="${tier}"] [data-item]`).evaluateAll(tiles =>
      tiles.map(tile => tile.getAttribute('aria-label') ?? ''))
    const firstTrailing = labels.findIndex(label => /, (Armor passives|Boosters),/.test(label))
    if (firstTrailing >= 0) {
      expect(labels.slice(firstTrailing).every(label => /, (Armor passives|Boosters),/.test(label))).toBe(true)
    }
  }
})

test('names and tile size are display toggles beside the search', async ({ page }) => {
  await page.goto('/tiers')
  await page.getByRole('radio', { name: 'Supply' }).click()
  const tile = page.locator('.tm-tile').first()
  await expect(tile.locator('.tm-caption')).toBeVisible()
  await page.getByRole('button', { name: 'Show item names' }).click()
  await expect(tile.locator('.tm-caption')).toHaveCount(0)

  const medium = (await tile.boundingBox())!.width
  await page.getByRole('radio', { name: 'Large tiles' }).click()
  await expect.poll(async () => (await tile.boundingBox())!.width).toBeGreaterThan(medium)

  // The choice sticks across visits.
  await page.reload()
  await expect(page.getByRole('radio', { name: 'Large tiles' })).toBeChecked()
  await expect(page.locator('.tm-caption')).toHaveCount(0)
})

test('on a phone a tap opens the inspector in the bottom bar and moves the item', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  const page = await context.newPage()
  await page.goto('/tiers')
  await page.getByRole('radio', { name: 'Supply' }).tap()
  await page.getByRole('button', { name: /^Sterilizer,/ }).tap()
  const bar = page.getByRole('region', { name: 'Tier list actions' })
  await bar.getByRole('radio', { name: /^S tier/ }).tap()
  await expect(page.getByRole('button', { name: /^Sterilizer, .*S tier, was C/ })).toBeVisible()
  await bar.getByRole('button', { name: 'Close item' }).tap()
  await expect(bar.getByRole('button', { name: 'Save' })).toBeVisible()
  // Nothing on the board spills sideways.
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await context.close()
})

test('a JSON file imports a whole list, and items it leaves out are flagged new', async ({ page }) => {
  const { tx41sterilizer: _sterilizer, ...rest } = SQUAD_LIST.tiers
  await page.goto('/tiers')
  await page.getByRole('button', { name: 'Import' }).click()
  const dialog = page.getByRole('dialog', { name: 'Import a tier list' })
  await dialog.locator('input[type="file"]').setInputFiles({
    name: 'squad.json',
    mimeType: 'application/json',
    buffer: Buffer.from(tierListToJson({ name: 'From file', tiers: rest })),
  })
  await expect(page.getByRole('textbox', { name: 'List name' })).toHaveValue('From file')
  await expect(page.getByText(/1 items aren't rated in it yet/)).toBeVisible()
  await page.getByRole('radio', { name: 'Supply' }).click()
  await expect(page.getByRole('button', { name: /^Sterilizer, .*C tier, not rated yet/ })).toBeVisible()
})

test('a share link imports a list, hosts a crusade with it, and the squad can read it', async ({ browser }) => {
  const contextA = await browser.newContext()
  const contextB = await browser.newContext()
  const pageA = await contextA.newPage()
  const pageB = await contextB.newPage()

  await pageA.goto(`/tiers#${encodeTierList(SQUAD_LIST)}`)
  await expect(pageA.getByText(/Imported Squad Test\./)).toBeVisible()
  await pageA.getByRole('button', { name: 'Save to my lists' }).click()

  // Hosting straight from the Tier Maker opens a lobby already on the list.
  await pageA.getByRole('button', { name: 'Host a crusade with this list' }).click()
  await expect(pageA).toHaveURL(/\/dive\/[A-Z0-9]{6}/)
  await pageA.getByLabel('Your name').fill('Host')
  await pageA.getByRole('button', { name: 'Start the dive' }).click()
  await dismissWarbondIntro(pageA)
  await expect(pageA.getByRole('radio', { name: /^Squad Test:/ })).toBeChecked()

  await pageB.goto(pageA.url())
  await pageB.getByLabel('Your name').fill('Duo')
  await pageB.getByRole('button', { name: 'Join the dive' }).click()
  await expectJoinerLanded(pageB)

  // The squadmate reads the host's whole list, and how it differs from the default.
  await pageB.getByRole('button', { name: /Custom tier list Squad Test/ }).click()
  const view = pageB.getByRole('dialog', { name: 'Squad Test' })
  await expect(view.getByRole('region', { name: 'S tier' })).toContainText('Sterilizer')
  await view.getByRole('tab', { name: /Vs default/ }).click()
  await expect(view.locator('.tl-move').filter({ hasText: 'Sterilizer' })).toBeVisible()
  await view.getByRole('button', { name: 'Close dialog' }).click()

  // Switching back to the default clears it for the whole squad.
  await pageA.getByRole('radio', { name: /^Default tiers/ }).click()
  await expect(pageB.locator('.standby-tiers')).toContainText('Default tiers')
  await pageA.getByRole('radio', { name: /^Squad Test:/ }).click()
  await expect(pageB.locator('.standby-tiers')).toContainText('Squad Test')

  // Launched, the Armory reads the squad's tiers.
  await pageA.getByRole('button', { name: 'Launch crusade' }).press('Enter')
  await expect(pageA.getByRole('heading', { name: /Make the squad/ })).toBeVisible()
  await pageB.getByRole('complementary', { name: 'Dive tools' })
    .getByRole('navigation', { name: 'Tools' })
    .getByRole('button', { name: 'Armory', exact: true }).click()
  await expect(pageB.locator('.codex-list')).toHaveText('Squad Test')

  await contextA.close()
  await contextB.close()
})
