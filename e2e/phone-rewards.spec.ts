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
  await expect(pageA.getByRole('heading', { name: 'Wheel of Adversity' })).toBeVisible()

  await pageB.goto(pageA.url())
  await pageB.getByLabel('Your name').fill('Duo')
  await pageB.getByRole('button', { name: 'Join the dive' }).click()
  await expectJoinerLanded(pageB)

  await pageA.getByRole('button', { name: 'Spin', exact: true }).click()
  await lockMisfortune(pageA)
  await pageA.locator('.strain').getByRole('button', { name: 'Opt out' }).click()
  await pageA.getByRole('button', { name: 'Deal the pacts' }).click()

  // The phone joiner locks an empty hand; the host locks on desktop.
  await pageB.getByRole('button', { name: 'Lock in', exact: true }).click()
  await pageA.getByRole('button', { name: 'Lock in & dive' }).click()

  await pageA.getByRole('button', { name: 'Mission complete' }).click()
  await pageA.getByRole('button', { name: 'File report' }).click()

  const option = pageB.locator('.phone-rewards .row').first()
  await expect(option).toBeEnabled()
  await option.click()
  await expect(pageB.locator('.phone-bar .result')).toContainText('Banked')
  await expect(pageA.locator('.squad-pick.done')).toHaveCount(1)

  // The joiner never sees a dead advance control: they wait on the squad, then
  // the full-star clear hands them to the host-run honors ceremony.
  await expect(pageB.getByText('Waiting on squad')).toBeVisible()
  await pageA.locator('.pod-card .pod-hit').first().click()
  await expect(pageB.getByRole('region', { name: 'Squad honors' })).toBeVisible()
  await expect(pageB.getByText('Waiting for the host to spin')).toBeVisible()

  await contextA.close()
  await contextB.close()
})
