import { expect, test } from '@playwright/test'
import { dismissWarbondIntro, expectJoinerLanded } from './helpers'

test('any seated diver forks the crusade into a new session', async ({ browser }) => {
  const contextA = await browser.newContext()
  const contextB = await browser.newContext()
  const contextC = await browser.newContext()
  const pageA = await contextA.newPage()
  const pageB = await contextB.newPage()
  const pageC = await contextC.newPage()

  await pageA.goto('/')
  await pageA.getByRole('button', { name: 'Host an online dive' }).click()
  await pageA.getByLabel('Your name').fill('Host')
  await pageA.getByRole('button', { name: 'Join the dive' }).click()
  await dismissWarbondIntro(pageA)
  await pageA.getByRole('button', { name: 'Launch crusade' }).click()
  await expect(pageA.getByRole('heading', { name: /Make the squad/ })).toBeVisible()

  await pageB.goto(pageA.url())
  await pageB.getByLabel('Your name').fill('Duo')
  await pageB.getByRole('button', { name: 'Join the dive' }).click()
  await expectJoinerLanded(pageB)
  await expect(pageB.locator('.dock .chip')).toHaveCount(2)

  // The host continues the crusade as a brand-new session: a fresh code, the
  // host seated where the dive stopped, the current room untouched.
  const oldUrl = pageA.url()
  await pageA.getByRole('button', { name: 'Session menu' }).click()
  await pageA.getByRole('dialog', { name: 'Session' })
    .getByRole('button', { name: /Start a new session/ }).click()
  const dialog = pageA.getByRole('dialog', { name: 'Start a new session?' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Start new session' }).click()

  await expect(pageA).not.toHaveURL(oldUrl)
  await expect(pageA).toHaveURL(/\/dive\/[A-Z0-9]{6}/)
  await expect(pageA.getByRole('heading', { name: /Make the squad/ })).toBeVisible()
  await expect(pageA.locator('.dock .chip')).toHaveCount(1)

  // A new diver comes aboard the new session through its invite link.
  await pageC.goto(pageA.url())
  await pageC.getByLabel('Your name').fill('Late')
  await pageC.getByRole('button', { name: 'Join the dive' }).click()
  await expectJoinerLanded(pageC)
  await expect(pageA.locator('.dock .chip')).toHaveCount(2)
  await expect(pageC.locator('.dock .chip.self')).toBeVisible()

  await contextA.close()
  await contextB.close()
  await contextC.close()
})

test('a solo save hosts an online session from the home record', async ({ browser }) => {
  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto('/')
  await page.getByLabel('Diver name').fill('Griffon')
  await page.getByRole('button', { name: 'Solo drop' }).click()
  await dismissWarbondIntro(page)
  await expect(page).toHaveURL(/\/dive\/[0-9a-f-]{36}/)

  // Back to the Bridge: the local save is on the record with a HOST action.
  await page.getByRole('button', { name: 'Session menu' }).click()
  await page.getByRole('dialog', { name: 'Session' }).getByRole('link', { name: /Bridge/ }).click()
  const card = page.locator('.record-card').filter({ hasText: 'Griffon' })
  await expect(card).toBeVisible()
  await card.getByRole('button', { name: 'HOST' }).click()

  await expect(page).toHaveURL(/\/dive\/[A-Z0-9]{6}/)
  await expect(page.locator('.dock .chip')).toHaveCount(1)
  // The local owner's name carries into the new online session, so there is
  // no second name gate.
  await expect(page.getByLabel('Your name')).toHaveCount(0)
  await expect(page.locator('.dock .chip.self')).toContainText('Griffon')

  // A second browser joins the new online session.
  const contextB = await browser.newContext()
  const pageB = await contextB.newPage()
  await pageB.goto(page.url())
  await pageB.getByLabel('Your name').fill('Late')
  await pageB.getByRole('button', { name: 'Join the dive' }).click()
  await expectJoinerLanded(pageB)
  await expect(pageB.locator('.dock .chip')).toHaveCount(2)

  await context.close()
  await contextB.close()
})
