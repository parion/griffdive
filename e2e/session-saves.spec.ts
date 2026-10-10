import { expect, test } from '@playwright/test'
import { dismissWarbondIntro } from './helpers'

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
  await expect(pageA.getByRole('heading', { name: 'Wheel of Adversity' })).toBeVisible()

  await pageB.goto(pageA.url())
  await pageB.getByLabel('Your name').fill('Duo')
  await pageB.getByRole('button', { name: 'Join the dive' }).click()
  await dismissWarbondIntro(pageB)
  await expect(pageB.locator('.diver-chip')).toHaveCount(2)

  // The host continues the crusade as a brand-new session: a fresh code, the
  // host seated where the dive stopped, the current room untouched.
  const oldUrl = pageA.url()
  await pageA.getByRole('button', { name: 'New session' }).click()
  const dialog = pageA.getByRole('dialog', { name: 'Start a new session?' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Start new session' }).click()

  await expect(pageA).not.toHaveURL(oldUrl)
  await expect(pageA).toHaveURL(/\/dive\/[A-Z0-9]{6}/)
  await expect(pageA.getByRole('heading', { name: 'Wheel of Adversity' })).toBeVisible()
  await expect(pageA.locator('.diver-chip')).toHaveCount(1)

  // A new diver comes aboard the new session through its invite link.
  await pageC.goto(pageA.url())
  await pageC.getByLabel('Your name').fill('Late')
  await pageC.getByRole('button', { name: 'Join the dive' }).click()
  await dismissWarbondIntro(pageC)
  await expect(pageA.locator('.diver-chip')).toHaveCount(2)
  await expect(pageC.getByText('(you)')).toBeVisible()

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
  await page.getByRole('link', { name: 'Griffdive bridge' }).click()
  const card = page.locator('.record-card').filter({ hasText: 'Griffon' })
  await expect(card).toBeVisible()
  await card.getByRole('button', { name: 'HOST' }).click()

  await expect(page).toHaveURL(/\/dive\/[A-Z0-9]{6}/)
  await expect(page.locator('.diver-chip')).toHaveCount(1)
  // The local owner's name carries into the new online session.
  await expect(page.getByLabel('Your name')).toHaveValue('Griffon')

  // A second browser joins the new online session.
  const contextB = await browser.newContext()
  const pageB = await contextB.newPage()
  await pageB.goto(page.url())
  await pageB.getByLabel('Your name').fill('Late')
  await pageB.getByRole('button', { name: 'Join the dive' }).click()
  await dismissWarbondIntro(pageB)
  await expect(pageB.locator('.diver-chip')).toHaveCount(2)

  await context.close()
  await contextB.close()
})
