import { expect, test } from '@playwright/test'
import { dismissWarbondIntro, expectJoinerLanded } from './helpers'

test('phone host moderation: open the squad, hand over or kick', async ({ browser }) => {
  const contextA = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const contextB = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const pageA = await contextA.newPage()
  const pageB = await contextB.newPage()

  await pageA.goto('/')
  await pageA.getByRole('button', { name: 'Host an online dive' }).click()
  await expect(pageA).toHaveURL(/\/dive\/[A-Z0-9]{6}/)
  await pageA.getByLabel('Your name').fill('Host')
  await pageA.getByRole('button', { name: 'Start the dive' }).click()
  await dismissWarbondIntro(pageA)

  await pageB.goto(pageA.url())
  await pageB.getByLabel('Your name').fill('Duo')
  await pageB.getByRole('button', { name: 'Join the dive' }).click()
  await expectJoinerLanded(pageB)

  // In the hangar the host manages a squadmate from their bay.
  await pageA.getByRole('button', { name: /Bay 02, Duo.*manage/ }).click()
  const bayManage = pageA.getByRole('dialog', { name: /Bay 02 · Duo/ })
  await expect(bayManage.getByRole('button', { name: 'Kick diver' })).toBeVisible()
  await pageA.keyboard.press('Escape')
  await expect(bayManage).toBeHidden()

  // Once launched, the phone squad sheet carries moderation (never on self).
  await pageA.getByRole('button', { name: /^Launch crusade/ }).press('Enter')
  await expect(pageA.locator('.phone-call')).toBeVisible()
  await pageA.getByRole('button', { name: 'Squad' }).click()
  const squad = pageA.getByRole('dialog', { name: 'Squad' })
  await expect(squad).toBeVisible()
  await squad.getByRole('button', { name: 'Make host' }).click()

  // Hand host over — the joiner's sheet now offers moderation, the old host's
  // no longer does.
  await pageB.getByRole('button', { name: 'Squad' }).click()
  const squadB = pageB.getByRole('dialog', { name: 'Squad' })
  await expect(squadB.getByRole('button', { name: 'Kick diver' })).toBeVisible()
  await pageA.keyboard.press('Escape')
  await pageA.getByRole('button', { name: 'Squad' }).click()
  await expect(pageA.getByRole('dialog', { name: 'Squad' }).getByRole('button', { name: /^(Make host|Kick diver)$/ })).toHaveCount(0)

  await contextA.close()
  await contextB.close()
})
