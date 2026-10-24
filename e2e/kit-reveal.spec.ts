import { expect, test } from '@playwright/test'
import { dismissWarbondIntro } from './helpers'

test('solo: a SEAF launch deals the pack into the "?" boxes before the wheel', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /^Variant and warbonds/ }).click()
  const setup = page.getByRole('dialog', { name: 'Variant & warbonds' })
  await setup.getByRole('radio', { name: /^Suicide Mission/ }).click()
  // The setup kit tells weapons apart and ends each section in "?" boxes.
  for (const heading of ['Primary', 'Secondary', 'Throwables', 'Armor passives', 'Boosters', 'Stratagems']) {
    await expect(setup.getByRole('heading', { name: heading, exact: true })).toBeVisible()
  }
  await expect(setup.locator('.tile.mystery')).toHaveCount(11)
  await page.keyboard.press('Escape')

  await page.getByLabel('Diver name').fill('Griffon')
  await page.getByRole('button', { name: 'Solo drop' }).click()
  await dismissWarbondIntro(page)

  const reveal = page.getByRole('heading', { name: 'Resupply inbound' })
  await expect(reveal).toBeVisible()
  await expect(page.getByText('11 / 11 dispatched')).toBeVisible()
  await expect(page.locator('.tile.mystery')).toHaveCount(0)
  await page.getByRole('button', { name: 'To the wheel' }).click()
  await expect(reveal).toBeHidden()
  await expect(page.getByRole('button', { name: 'Spin the wheel' })).toBeVisible()
})

test('solo: a start with no pack goes straight to the wheel', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Diver name').fill('Griffon')
  await page.getByRole('button', { name: 'Solo drop' }).click()
  await dismissWarbondIntro(page)
  await expect(page.getByRole('button', { name: 'Spin the wheel' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Resupply inbound' })).toHaveCount(0)
})

test('online: the launch and a late joiner each get their own pack dealt', async ({ browser }) => {
  const contextA = await browser.newContext()
  const contextB = await browser.newContext()
  const pageA = await contextA.newPage()
  const pageB = await contextB.newPage()

  await pageA.goto('/')
  await pageA.getByRole('button', { name: 'Host an online dive' }).click()
  await expect(pageA).toHaveURL(/\/dive\/[A-Z0-9]{6}/)
  await pageA.getByLabel('Your name').fill('Host')
  await pageA.getByLabel('Your name').press('Enter')
  await pageA.getByRole('button', { name: 'Start the dive' }).click()
  await dismissWarbondIntro(pageA)

  await pageA.getByRole('radio', { name: /^Hard/ }).click()
  await expect(pageA.locator('.tile.mystery')).toHaveCount(6)
  await pageA.getByRole('button', { name: 'Launch crusade' }).click()

  const reveal = pageA.getByRole('heading', { name: 'Resupply inbound' })
  await expect(reveal).toBeVisible()
  await expect(pageA.getByText('6 / 6 dispatched')).toBeVisible()
  await pageA.getByRole('button', { name: 'To the wheel' }).click()
  await expect(pageA.getByRole('button', { name: 'Spin', exact: true })).toBeVisible()

  await pageB.goto(pageA.url())
  await pageB.getByLabel('Your name').fill('Duo')
  await pageB.getByLabel('Your name').press('Enter')
  await pageB.getByRole('button', { name: 'Join the dive' }).click()
  await expect(pageB.getByRole('heading', { name: 'Resupply inbound' })).toBeVisible()
  await expect(pageB.getByText('6 / 6 dispatched')).toBeVisible()
  await pageB.getByRole('button', { name: 'To the wheel' }).click()
  await expect(pageB.locator('.dock .seat.self')).toContainText('DUO')

  // A reload of a seated diver never replays the reveal.
  await pageB.reload()
  await expect(pageB.locator('.dock .seat.self')).toContainText('DUO')
  await expect(pageB.getByRole('heading', { name: 'Resupply inbound' })).toHaveCount(0)

  await contextA.close()
  await contextB.close()
})
