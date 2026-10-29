import { expect, test } from '@playwright/test'
import { dismissWarbondIntro, expectJoinerLanded } from './helpers'

// Sterilizer is a C-tier stratagem in the community default list.
const SHARE_CODE = 'GD1:Squad%20Test:s=tx41sterilizer'

test('the Tier Maker drags, keys and taps an item between tiers, and saves the list', async ({ page }) => {
  await page.goto('/tiers')
  await expect(page.getByRole('heading', { name: 'Tier Maker' })).toBeVisible()
  // Supply alone keeps every row on screen for the mouse.
  await page.getByRole('radio', { name: 'Supply' }).click()
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
  await expect(page.getByRole('button', { name: /^Sterilizer, .*S tier, moved from C/ })).toBeVisible()
  await expect(page.locator('.tm-tile.landed.t-s')).toBeVisible()
  await expect(page.locator('.tm-moved')).toContainText('1 moved')

  // The keyboard moves it too, and keeps focus on it.
  await page.getByRole('button', { name: /^Sterilizer,/ }).press('a')
  await expect(page.getByRole('button', { name: /^Sterilizer, .*A tier, moved from C/ })).toBeFocused()

  // A click opens the inspector; its tier buttons move it as well.
  await page.getByRole('button', { name: /^Sterilizer,/ }).click()
  const inspector = page.getByRole('region', { name: 'Selected item' })
  await inspector.getByRole('radio', { name: /^S tier/ }).click()
  await expect(page.getByRole('button', { name: /^Sterilizer, .*S tier, moved from C/ })).toBeVisible()

  await page.getByRole('textbox', { name: 'List name' }).fill('Flame On')
  await page.getByRole('button', { name: 'Save to my lists' }).click()
  await expect(page.locator('.tm-head')).toContainText('Next crusade')

  await page.reload()
  await expect(page.getByRole('textbox', { name: 'List name' })).toHaveValue('Flame On')
  await expect(page.locator('.tm-moved')).toContainText('1 moved')
})

test('on a phone a tap opens the inspector in the bottom bar and moves the item', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  const page = await context.newPage()
  await page.goto('/tiers')
  await page.getByRole('radio', { name: 'Supply' }).tap()
  await page.getByRole('button', { name: /^Sterilizer,/ }).tap()
  const bar = page.getByRole('region', { name: 'Tier list actions' })
  await bar.getByRole('radio', { name: /^S tier/ }).tap()
  await expect(page.getByRole('button', { name: /^Sterilizer, .*S tier, moved from C/ })).toBeVisible()
  await bar.getByRole('button', { name: 'Close item' }).tap()
  await expect(bar.getByRole('button', { name: 'Save' })).toBeVisible()
  // Nothing on the board spills sideways.
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await context.close()
})

test('a share link imports a list the host launches with, and the squad can read it', async ({ browser }) => {
  const contextA = await browser.newContext()
  const contextB = await browser.newContext()
  const pageA = await contextA.newPage()
  const pageB = await contextB.newPage()

  await pageA.goto(`/tiers#${encodeURIComponent(SHARE_CODE)}`)
  await expect(pageA.getByText(/Imported Squad Test: 1 items moved/)).toBeVisible()
  await pageA.getByRole('button', { name: 'Save to my lists' }).click()

  await pageA.goto('/')
  await pageA.getByRole('button', { name: 'Host an online dive' }).click()
  await expect(pageA).toHaveURL(/\/dive\/[A-Z0-9]{6}/)
  await pageA.getByLabel('Your name').fill('Host')
  await pageA.getByRole('button', { name: 'Start the dive' }).click()
  await dismissWarbondIntro(pageA)
  // Saving picked the list, so setup opens on it.
  await expect(pageA.getByRole('radio', { name: /Squad Test, 1 items moved/ })).toBeChecked()

  await pageB.goto(pageA.url())
  await pageB.getByLabel('Your name').fill('Duo')
  await pageB.getByRole('button', { name: 'Join the dive' }).click()
  await expectJoinerLanded(pageB)

  // The squadmate reads the host's list before launch.
  await pageB.getByRole('button', { name: /Custom tier list Squad Test/ }).click()
  const changes = pageB.getByRole('dialog', { name: 'Squad Test' })
  await expect(changes.locator('.tl-move').filter({ hasText: 'Sterilizer' })).toBeVisible()
  await changes.getByRole('button', { name: 'Close dialog' }).click()

  // Switching back to the default clears it for the whole squad.
  await pageA.getByRole('radio', { name: /^Default tiers/ }).click()
  await expect(pageB.locator('.standby-tiers')).toContainText('Default tiers')
  await pageA.getByRole('radio', { name: /Squad Test/ }).click()
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
