import { expect, test } from '@playwright/test'

test('two divers sync one dive; late joiner gets the snapshot', async ({ browser }) => {
  const contextA = await browser.newContext()
  const contextB = await browser.newContext()
  const pageA = await contextA.newPage()
  const pageB = await contextB.newPage()

  await pageA.goto('/')
  await pageA.getByRole('button', { name: 'Host an online dive' }).click()
  await expect(pageA).toHaveURL(/\/dive\/[A-Z0-9]{6}/)

  await pageA.getByRole('button', { name: 'Launch crusade' }).click()
  await expect(pageA.getByText('Wheel of Misfortune')).toBeVisible()

  // A second browser joins through the same invite link.
  await pageB.goto(pageA.url())
  await expect(pageB.locator('.diver-chip')).toHaveCount(2)
  await expect(pageB.getByText('(you)')).toBeVisible()
  await expect(pageB.getByRole('button', { name: 'Spin', exact: true })).toBeDisabled()

  // The joiner claims a name via their inline chip editor; it syncs to the host.
  const nameBox = pageB.getByLabel('Your name')
  await nameBox.fill('Duo')
  await nameBox.blur()
  await expect(pageB.getByLabel('Your name')).toHaveValue('Duo')
  await expect(pageA.locator('.diver-chip').filter({ hasText: 'Duo' })).toBeVisible()

  // Host spins; the seeded result syncs to the joiner. The joiner's card shows
  // the pending decision — only the host can lock the misfortune in.
  await pageA.getByRole('button', { name: 'Spin', exact: true }).click()
  await expect(pageB.getByText('Awaiting host')).toBeVisible()
  await pageA.getByRole('button', { name: 'Lock it in' }).click()
  await expect(pageB.getByText('Locked in — team-wide')).toBeVisible()

  // Both lock pacts — the dive only starts once the whole squad is in.
  await pageB.locator('.pact:not([disabled])').first().click()
  await pageB.getByRole('button', { name: 'Lock in & dive' }).click()
  await expect(pageB.getByText('Pacts locked')).toBeVisible()

  await pageA.locator('.pact:not([disabled])').first().click()
  await pageA.getByRole('button', { name: 'Lock in & dive' }).click()

  await expect(pageB.getByRole('heading', { name: 'Briefing' })).toBeVisible()
  await expect(pageA.getByRole('heading', { name: 'Briefing' })).toBeVisible()

  // Presence: both divers show online dots on the host page.
  await expect(pageA.locator('.dot.on')).toHaveCount(2)

  // The joiner's home page lists the live dive under Continue → Online.
  const roomCode = pageA.url().slice(-6)
  await pageB.goto('/')
  await expect(pageB.getByText('Checking for live dives…')).toBeHidden()
  const onlineSlot = pageB.locator('.slot').filter({ hasText: roomCode })
  await expect(onlineSlot).toBeVisible()
  await expect(onlineSlot.getByText(/2 divers/)).toBeVisible()
  await expect(onlineSlot.getByRole('link', { name: 'Rejoin' })).toBeVisible()

  await contextA.close()
  await contextB.close()
})

test('host kicks a stuck diver and the dive continues', async ({ browser }) => {
  const contextA = await browser.newContext()
  const contextB = await browser.newContext()
  const pageA = await contextA.newPage()
  const pageB = await contextB.newPage()

  await pageA.goto('/')
  await pageA.getByRole('button', { name: 'Host an online dive' }).click()
  await pageA.getByRole('button', { name: 'Launch crusade' }).click()
  await expect(pageA.getByText('Wheel of Misfortune')).toBeVisible()

  await pageB.goto(pageA.url())
  await expect(pageB.locator('.diver-chip')).toHaveCount(2)

  // Host spins; the joiner stalls before locking pacts.
  await pageA.getByRole('button', { name: 'Spin', exact: true }).click()
  await expect(pageB.getByRole('button', { name: 'Lock in & dive' })).toBeVisible()

  // Hovering the joiner's chip reveals the kick affordance.
  await pageA.locator('.diver-chip').nth(1).hover()
  await pageA.getByRole('button', { name: /Kick/ }).click()
  await expect(pageA.locator('.diver-chip')).toHaveCount(1)

  // The removed diver sees a removal notice…
  await expect(pageB.getByText('You were removed from this dive by the host.')).toBeVisible()

  // …and the dive no longer waits on them: the host locks pacts alone.
  await pageA.getByRole('button', { name: 'Lock in & dive' }).click()
  await expect(pageA.getByRole('heading', { name: 'Briefing' })).toBeVisible()

  await contextA.close()
  await contextB.close()
})
