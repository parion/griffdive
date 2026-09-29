import { expect, test } from '@playwright/test'
import { dismissWarbondIntro } from './helpers'

test('phone host moderation: tap a squadmate, hand over or kick', async ({ browser }) => {
  const contextA = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const contextB = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const pageA = await contextA.newPage()
  const pageB = await contextB.newPage()

  await pageA.goto('/')
  await pageA.getByRole('button', { name: 'Host an online dive' }).click()
  await expect(pageA).toHaveURL(/\/dive\/[A-Z0-9]{6}/)
  await pageA.getByLabel('Your name').fill('Host')
  await pageA.getByRole('button', { name: 'Join the dive' }).click()
  await dismissWarbondIntro(pageA)

  await pageB.goto(pageA.url())
  await pageB.getByLabel('Your name').fill('Duo')
  await pageB.getByRole('button', { name: 'Join the dive' }).click()
  await dismissWarbondIntro(pageB)

  // The host's phone squad bar offers moderation on the joiner (not self).
  const duo = pageA.getByRole('button', { name: /Duo: / })
  await expect(duo).toBeVisible()
  await duo.click()
  await expect(pageA.getByRole('dialog', { name: 'Moderate diver' })).toBeVisible()
  await expect(pageA.getByRole('button', { name: 'Make host' })).toBeVisible()

  // Hand host over — the joiner's bar now offers moderation, the host's does not.
  await pageA.getByRole('button', { name: 'Make host' }).click()
  await expect(pageB.getByRole('button', { name: /Host: / })).toBeVisible()
})
