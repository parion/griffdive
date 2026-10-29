import { expect, test } from '@playwright/test'
import { dismissWarbondIntro, expectJoinerLanded } from './helpers'

// Sterilizer is a C-tier stratagem in the community default list.
const SHARE_CODE = 'GD1:Squad%20Test:s=tx41sterilizer'

test('the Tier Maker moves an item, saves it and the list survives a reload', async ({ page }) => {
  await page.goto('/tiers')
  await expect(page.getByRole('heading', { name: 'Tier Maker' })).toBeVisible()
  await page.getByPlaceholder('Item name…').fill('Sterilizer')
  const row = page.locator('.tl-row').filter({ hasText: 'Sterilizer' })
  await row.getByRole('radio', { name: /^S tier/ }).click()
  await expect(page.locator('.tl-row.moved').filter({ hasText: 'Sterilizer' })).toBeVisible()
  await expect(page.locator('.desk-moved')).toContainText('1 moved')

  await page.getByRole('textbox', { name: 'Name' }).fill('Flame On')
  await page.getByRole('button', { name: 'Save to my lists' }).click()
  await expect(page.locator('.desk-moved')).toContainText('Next crusade')

  await page.reload()
  await expect(page.getByRole('textbox', { name: 'Name' })).toHaveValue('Flame On')
  await expect(page.locator('.desk-moved')).toContainText('1 moved')
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
