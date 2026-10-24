import { expect, test } from '@playwright/test'
import { dismissWarbondIntro, expectJoinerLanded, lockMisfortune } from './helpers'

// Picking a reward is self-service. The phone draft once gated it on host
// control, so every non-host diver on a phone was locked out of their own pick.
test('phone draft: a non-host diver can bank their reward', async ({ browser }) => {
  const contextA = await browser.newContext({ reducedMotion: 'reduce' })
  const contextB = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 390, height: 844 } })
  const pageA = await contextA.newPage()
  const pageB = await contextB.newPage()

  await pageA.goto('/')
  await pageA.getByRole('button', { name: 'Host an online dive' }).click()
  await expect(pageA).toHaveURL(/\/dive\/[A-Z0-9]{6}/)
  await pageA.getByLabel('Your name').fill('Host')
  await pageA.getByRole('button', { name: 'Join the dive' }).click()
  await dismissWarbondIntro(pageA)
  await pageA.getByRole('button', { name: 'Launch crusade' }).click()
  await expect(pageA.getByRole('heading', { name: /Make the squad/ })).toBeVisible()

  await pageB.goto(pageA.url())
  await pageB.getByLabel('Your name').fill('Duo')
  await pageB.getByRole('button', { name: 'Join the dive' }).click()
  await expectJoinerLanded(pageB)

  await pageA.getByRole('button', { name: 'Spin', exact: true }).click()
  await lockMisfortune(pageA)
  await pageA.locator('.strain-card').getByRole('button', { name: 'Skip' }).click()
  await pageA.getByRole('button', { name: 'Deal the pacts' }).click()

  // The phone joiner locks an empty hand; the host locks on desktop.
  await pageB.locator('#phone-bar-primary').getByRole('button', { name: 'Dive with no pacts' }).click()
  await pageA.getByRole('button', { name: 'Dive with no pacts' }).click()

  await pageA.getByRole('button', { name: 'Extracted' }).click()
  await pageA.getByRole('button', { name: 'File report' }).click()

  const option = pageB.locator('.phone-loot .loot-card').first()
  await expect(option).toBeEnabled()
  await option.click()
  await expect(pageB.locator('#phone-bar-primary')).toContainText('Bank')
  await pageB.locator('#phone-bar-primary').getByRole('button', { name: /^Bank / }).click()
  await expect(pageB.locator('#phone-bar-primary')).toContainText('Banked')
  await expect(pageA.locator('.squad-pick.done')).toHaveCount(1)

  // The joiner never sees a dead advance control: their bar confirms the bank
  // while the host finishes their own pick.
  await expect(pageB.locator('#phone-bar-primary')).toContainText('Banked')
  await pageA.locator('.loot-card').first().click()
  await pageA.getByRole('button', { name: /^Bank / }).click()

  // The squad cannot move on until the host names the Squad Honors winner.
  const locked = pageA.getByRole('button', { name: 'Award Squad Honors first' })
  await expect(locked).toBeDisabled()
  await pageA.getByRole('button', { name: 'Award Squad Honors token to Duo' }).click()
  await pageA.getByRole('button', { name: 'Award', exact: true }).click()
  await expect(pageA.getByRole('button', { name: /Next mission/ })).toBeEnabled()

  await contextA.close()
  await contextB.close()
})
