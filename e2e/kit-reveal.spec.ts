import { expect, test } from '@playwright/test'
import { dismissBriefing, dismissWarbondIntro, fileCallsign } from './helpers'

test('solo: a SEAF launch deals the pack into the "?" boxes before the wheel', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /^Set warbonds/ }).click()
  const setup = page.getByRole('dialog', { name: 'Variant & warbonds' })
  await setup.getByRole('radio', { name: /^Suicide Mission/ }).click()
  // The setup kit tells weapons apart and ends each section in "?" boxes.
  for (const heading of ['Primary', 'Secondary', 'Throwables', 'Armor passives', 'Boosters', 'Stratagems']) {
    await expect(setup.getByRole('heading', { name: heading, exact: true })).toBeVisible()
  }
  await expect(setup.locator('.tile.mystery')).toHaveCount(11)
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: 'Solo drop' }).click()
  await fileCallsign(page, 'Griffon')

  // The reveal is a modal over the wheel, and it stays up until dismissed. A
  // first-time host reads the tutorial first, so wait for whichever lands.
  const reveal = page.getByRole('dialog', { name: 'SEAF Support Package Inbound' })
  await expect(page.getByRole('heading', { name: 'You hold the wheel.' }).or(reveal).first()).toBeVisible()
  await dismissBriefing(page)
  await expect(reveal).toBeVisible()
  await expect(reveal.getByText('We got your back... this time Griffdiver.')).toBeVisible()
  // Only the pack's own items — no surplus — and every "?" has been dealt.
  await expect(reveal.locator('.tile')).toHaveCount(11)
  await expect(reveal.locator('.tile.mystery')).toHaveCount(0)
  await page.waitForTimeout(1500)
  await expect(reveal).toBeVisible()
  await reveal.getByRole('button', { name: 'To the wheel' }).click()
  await expect(reveal).toBeHidden()
  await expect(page.getByRole('button', { name: 'Spin the wheel' })).toBeVisible()
})

test('solo: a start with no pack goes straight to the wheel', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Solo drop' }).click()
  await fileCallsign(page, 'Griffon')
  await dismissWarbondIntro(page)
  await expect(page.getByRole('button', { name: 'Spin the wheel' })).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'SEAF Support Package Inbound' })).toHaveCount(0)
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
  await pageA.getByRole('button', { name: 'Launch crusade' }).press('Enter')

  const reveal = pageA.getByRole('dialog', { name: 'SEAF Support Package Inbound' })
  await expect(reveal).toBeVisible()
  await expect(reveal.locator('.tile')).toHaveCount(6)
  await expect(reveal.locator('.tile.mystery')).toHaveCount(0)
  await reveal.getByRole('button', { name: 'To the wheel' }).click()
  await expect(reveal).toBeHidden()
  await expect(pageA.getByRole('button', { name: 'Spin', exact: true })).toBeVisible()

  await pageB.goto(pageA.url())
  await pageB.getByLabel('Your name').fill('Duo')
  await pageB.getByLabel('Your name').press('Enter')
  await pageB.getByRole('button', { name: 'Join the dive' }).click()
  const revealB = pageB.getByRole('dialog', { name: 'SEAF Support Package Inbound' })
  await expect(revealB).toBeVisible()
  await expect(revealB.locator('.tile')).toHaveCount(6)
  // Clicking out dismisses it too.
  await pageB.mouse.click(4, 4)
  await expect(revealB).toBeHidden()
  await expect(pageB.locator('.dock .seat.self')).toContainText('DUO')

  // A reload of a seated diver never replays the reveal.
  await pageB.reload()
  await expect(pageB.locator('.dock .seat.self')).toContainText('DUO')
  await expect(pageB.getByRole('dialog', { name: 'SEAF Support Package Inbound' })).toHaveCount(0)

  await contextA.close()
  await contextB.close()
})
