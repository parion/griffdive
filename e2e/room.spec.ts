import { expect, test } from '@playwright/test'
import type { Browser, Page } from '@playwright/test'
import { dismissWarbondIntro, expectJoinerLanded, lockMisfortune, settleDebrief } from './helpers'

async function leaveDive(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Session menu' }).click()
  await page.getByRole('dialog', { name: 'Session' })
    .getByRole('button', { name: /Leave dive/ }).click()
  await expect(page).toHaveURL(/\/$/)
}

test('two divers sync one dive; late joiner gets the snapshot', async ({ browser }) => {
  const contextA = await browser.newContext()
  const contextB = await browser.newContext()
  const pageA = await contextA.newPage()
  const pageB = await contextB.newPage()

  await pageA.goto('/')
  await pageA.getByRole('button', { name: 'Host an online dive' }).click()
  await expect(pageA).toHaveURL(/\/dive\/[A-Z0-9]{6}/)

  // The host tutorial takes their callsign.
  await pageA.getByLabel('Your name').fill('Host')
  await pageA.getByRole('button', { name: 'Start the dive' }).click()
  await dismissWarbondIntro(pageA)
  await pageA.getByRole('button', { name: 'Launch crusade' }).press('Enter')
  await expect(pageA.getByRole('heading', { name: /Make the squad/ })).toBeVisible()
  // The invite lives in the squad dock on every beat.
  await expect(pageA.getByLabel(/Copy invite link/)).toBeVisible()

  // A second browser joins through the same invite link — the name gate
  // blocks seating until they provide a name.
  await pageB.goto(pageA.url())
  await expect(pageB.getByLabel('Your name')).toBeVisible()
  await expect(pageB.locator('.dock .seat')).toHaveCount(0)
  await pageB.getByLabel('Your name').fill('Duo')
  await pageB.getByRole('button', { name: 'Join the dive' }).click()
  await expectJoinerLanded(pageB)

  await expect(pageB.locator('.dock .seat')).toHaveCount(2)
  await expect(pageB.locator('.dock .seat.self')).toContainText('DUO')
  // Only the host gets the wheel control.
  await expect(pageB.getByRole('button', { name: 'Spin', exact: true })).toBeDisabled()
  await expect(pageB.getByLabel(/Copy invite link/)).toBeVisible()
  await expect(pageA.locator('.dock .seat').filter({ hasText: 'Duo' })).toBeVisible()

  // Host spins; the seeded result syncs to the joiner. The joiner's card shows
  // the pending decision — only the host can take or skip it.
  await pageA.getByRole('button', { name: 'Spin', exact: true }).click()
  await expect(pageB.locator('.directive-card .dc-waiting')).toBeVisible()
  await lockMisfortune(pageA)
  await expect(pageB.locator('.directive-card .dc-verdict')).toBeVisible()

  // The operation's first mission also draws a strain — an optional, op-long
  // team risk. The host declines it; the call syncs to the joiner.
  await expect(pageB.locator('.strain-card')).toBeVisible()
  await pageA.locator('.strain-card').getByRole('button', { name: 'Skip' }).click()
  // The host deals the hand; the call syncs to the joiner.
  await pageA.getByRole('button', { name: 'Deal the pacts' }).click()
  await expect(pageB.getByRole('heading', { name: 'Swear your pacts' })).toBeVisible()

  // Both swear a pact — the dive only starts once the whole squad is in. A hand
  // is local: a teammate locking in syncs the room but must not clear yours.
  await pageA.locator('.condition:not([disabled])').first().click()
  await expect(pageA.locator('.condition[aria-pressed="true"]')).toHaveCount(1)
  await pageB.locator('.condition:not([disabled])').first().click()
  await pageB.getByRole('button', { name: /^Swear 1 pact/ }).click()
  await expect(pageB.locator('.locked-row')).toBeVisible()
  await expect(pageA.locator('.condition[aria-pressed="true"]')).toHaveCount(1)
  await pageA.getByRole('button', { name: /^Swear 1 pact/ }).click()

  await expect(pageB.getByRole('heading', { name: 'Hold the line' })).toBeVisible()
  await expect(pageA.getByRole('heading', { name: 'Hold the line' })).toBeVisible()

  // Presence: both divers show online dots on the host page.
  await expect(pageA.locator('.dock .seat .lamp.teal')).toHaveCount(2)

  // Rewards: the host reports success, then the squad board shows the other
  // diver's whole offer with their banked pick lit — and it stays up after
  // the host banks their own.
  await pageA.getByRole('button', { name: 'Extracted' }).click()
  await pageA.getByRole('button', { name: 'File report' }).click()
  await settleDebrief(pageA)
  await settleDebrief(pageB)
  await expect(pageB.getByRole('heading', { name: 'Bank one item' })).toBeVisible()
  await expect(pageB.locator('.squad-pick[aria-label*=": Choosing"]')).toHaveCount(1)

  // A pick is local: a teammate banking syncs the room but must not clear it.
  await pageA.locator('.loot-card').first().click()
  await expect(pageA.locator('.loot-card.selected')).toHaveCount(1)
  await pageB.locator('.loot-card').first().click()
  await pageB.getByRole('button', { name: /^Bank / }).click()
  await expect(pageA.locator('.loot-card.selected')).toHaveCount(1)
  await expect(pageA.locator('.squad-pick.done')).toHaveCount(1)
  await expect(pageA.locator('.squad-pick.done .tile.banked img')).toBeVisible()
  await pageA.getByRole('button', { name: /^Bank / }).click()
  await expect(pageA.locator('.squad-pick.done .tile.banked')).toHaveCount(1)
  await expect(pageB.locator('.squad-pick.done .tile.banked')).toHaveCount(1)

  // The joiner's home page lists the live dive under Continue → Online.
  const roomCode = pageA.url().slice(-6)
  await pageB.goto('/')
  await expect(pageB.getByText('Checking for live dives…')).toBeHidden()
  const onlineSlot = pageB.locator('.record-card').filter({ hasText: roomCode })
  await expect(onlineSlot).toBeVisible()
  await expect(onlineSlot.locator('.rc-avatar')).toHaveCount(2)
  await expect(onlineSlot.getByRole('link', { name: 'RESUME' })).toBeVisible()

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
  await pageA.getByLabel('Your name').fill('Host')
  await pageA.getByRole('button', { name: 'Start the dive' }).click()
  await dismissWarbondIntro(pageA)
  await pageA.getByRole('button', { name: 'Launch crusade' }).press('Enter')
  await expect(pageA.getByRole('heading', { name: /Make the squad/ })).toBeVisible()

  await pageB.goto(pageA.url())
  await pageB.getByLabel('Your name').fill('Sidekick')
  await pageB.getByRole('button', { name: 'Join the dive' }).click()
  await expectJoinerLanded(pageB)
  await expect(pageB.locator('.dock .seat')).toHaveCount(2)

  // Host spins, takes the directive and declines the operation's strain;
  // the joiner stalls before locking pacts.
  await pageA.getByRole('button', { name: 'Spin', exact: true }).click()
  await lockMisfortune(pageA)
  await pageA.locator('.strain-card').getByRole('button', { name: 'Skip' }).click()
  await pageA.getByRole('button', { name: 'Deal the pacts' }).click()
  await expect(pageB.getByRole('button', { name: /^Swear|Dive with no pacts/ })).toBeVisible()

  // The dock's manage menu kicks the stalled diver.
  await pageA.getByRole('button', { name: 'Manage Sidekick' }).click()
  await pageA.getByRole('menuitem', { name: 'Kick diver' }).click()
  await expect(pageA.locator('.dock .seat')).toHaveCount(1)

  // The removed diver sees a removal notice…
  await expect(pageB.getByText('You were removed from this dive by the host.')).toBeVisible()

  // …and the link no longer reseats them: a reload is refused.
  await pageB.reload()
  await expect(pageB.getByRole('heading', { name: 'Removed from this dive' })).toBeVisible()
  await expect(pageB.getByText('You were removed from this dive by the host.')).toBeVisible()

  // …and the dive no longer waits on them: the host locks pacts alone.
  await pageA.locator('.condition').first().click()
  await pageA.getByRole('button', { name: /^Swear 1 pact/ }).click()
  await expect(pageA.getByRole('heading', { name: 'Hold the line' })).toBeVisible()

  await contextA.close()
  await contextB.close()
})

test('the Armory slide-over keeps the host seated', async ({ browser }) => {
  const contextA = await browser.newContext()
  const contextB = await browser.newContext()
  const pageA = await contextA.newPage()
  const pageB = await contextB.newPage()

  await pageA.goto('/')
  await pageA.getByRole('button', { name: 'Host an online dive' }).click()
  await pageA.getByLabel('Your name').fill('Host')
  await pageA.getByRole('button', { name: 'Start the dive' }).click()
  await dismissWarbondIntro(pageA)
  await pageA.getByRole('button', { name: 'Launch crusade' }).press('Enter')
  await expect(pageA.getByRole('heading', { name: /Make the squad/ })).toBeVisible()

  await pageB.goto(pageA.url())
  await pageB.getByLabel('Your name').fill('Duo')
  await pageB.getByRole('button', { name: 'Join the dive' }).click()
  await expectJoinerLanded(pageB)
  await expect(pageB.locator('.dock .seat')).toHaveCount(2)

  // Opening the Armory docks it in the sidebar beside the session — the socket
  // stays mounted, so the host is never migrated away.
  const side = pageA.getByRole('complementary', { name: 'Dive tools' })
  await side.getByRole('button', { name: 'Armory', exact: true }).click()
  await expect(side.getByRole('heading', { name: 'Armory' })).toBeVisible()
  await expect(side.getByText('S Tier')).toBeVisible()

  await pageA.keyboard.press('Escape')
  await expect(side.getByRole('heading', { name: 'Armory' })).toBeHidden()

  // Still host, still connected, still seated with the peer.
  await expect(pageA.locator('.dock .seat')).toHaveCount(2)
  await expect(pageA.locator('.dock .seat').filter({ hasText: 'Duo' })).toBeVisible()

  await contextA.close()
  await contextB.close()
})

// Its own address: the rest of the suite spends localhost's room-creation
// budget (10 a minute), and these specs create rooms of their own.
const ownAddress = { extraHTTPHeaders: { 'x-forwarded-for': '10.42.0.1' } }

test('the host manages the Steam lobby from a dock bar', async ({ browser }) => {
  const contextA = await browser.newContext(ownAddress)
  const contextB = await browser.newContext(ownAddress)
  const page = await contextA.newPage()
  const pageB = await contextB.newPage()

  await page.goto('/')
  await page.getByRole('button', { name: 'Host an online dive' }).click()
  await page.getByLabel('Your name').fill('Host')
  await page.getByRole('button', { name: 'Start the dive' }).click()
  await dismissWarbondIntro(page)
  await page.getByRole('button', { name: 'Launch crusade' }).press('Enter')
  await expect(page.getByRole('heading', { name: /Make the squad/ })).toBeVisible()

  // The dock control is a disclosure, not a dialog, for the host. Individual
  // seats carry no Steam buttons.
  await expect(page.getByRole('button', { name: /Steam profile/ })).toHaveCount(0)
  const toggle = page.getByRole('button', { name: 'Steam lobby settings' })
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')

  const bar = page.getByRole('region', { name: 'Steam Lobby' })
  await expect(bar).toBeVisible()
  const input = bar.getByLabel('Steam lobby link')
  await expect(input).toBeFocused()
  const editorHeight = (await bar.boundingBox())!.height

  // A bad paste must not change the bar's height either.
  await input.fill('not-a-lobby-link')
  await expect(bar.getByText('Not a Helldivers 2 lobby link.')).toBeVisible()
  expect((await bar.boundingBox())!.height).toBe(editorHeight)

  await input.fill('steam://joinlobby/553850/42/7')
  await bar.getByRole('button', { name: 'Pin lobby' }).click()

  // The pinned link swaps the editor for the join card without resizing or
  // closing the bar.
  await expect(bar.getByRole('link', { name: /Join Lobby/ }))
    .toHaveAttribute('href', 'steam://joinlobby/553850/42/7')
  expect((await bar.boundingBox())!.height).toBe(editorHeight)

  // A squadmate gets a direct Join Lobby link instead of the host's control.
  await pageB.goto(page.url())
  await pageB.getByLabel('Your name').fill('Duo')
  await pageB.getByRole('button', { name: 'Join the dive' }).click()
  await expectJoinerLanded(pageB)
  const joinerLink = pageB.getByRole('link', { name: 'Join Game' })
  await expect(joinerLink).toHaveAttribute('href', 'steam://joinlobby/553850/42/7')
  await expect(pageB.getByRole('button', { name: 'Steam lobby settings' })).toHaveCount(0)
  await expect(pageB.getByRole('button', { name: /Steam profile/ })).toHaveCount(0)

  await bar.getByRole('button', { name: 'Change' }).click()
  await expect(input).toHaveValue('steam://joinlobby/553850/42/7')
  expect((await bar.boundingBox())!.height).toBe(editorHeight)
  await bar.getByRole('button', { name: 'Cancel' }).click()

  // Removing the link closes the bar and takes the squadmate's link with it.
  await bar.getByRole('button', { name: 'Remove' }).click()
  await expect(bar).toBeHidden()
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(joinerLink).toHaveCount(0)

  // Reopening shows the empty editor; the bar's close control dismisses it.
  await toggle.click()
  await expect(bar.getByLabel('Steam lobby link')).toBeFocused()
  await bar.getByRole('button', { name: 'Close Steam lobby' }).click()
  await expect(bar).toBeHidden()

  await contextA.close()
  await contextB.close()
})

async function squadAtTheWheel(browser: Browser) {
  const contextA = await browser.newContext(ownAddress)
  const contextB = await browser.newContext(ownAddress)
  const pageA = await contextA.newPage()
  const pageB = await contextB.newPage()

  await pageA.goto('/')
  await pageA.getByRole('button', { name: 'Host an online dive' }).click()
  await pageA.getByLabel('Your name').fill('Host')
  await pageA.getByRole('button', { name: 'Start the dive' }).click()
  await dismissWarbondIntro(pageA)
  await pageA.getByRole('button', { name: 'Launch crusade' }).press('Enter')
  await expect(pageA.getByRole('heading', { name: /Make the squad/ })).toBeVisible()

  await pageB.goto(pageA.url())
  await pageB.getByLabel('Your name').fill('Duo')
  await pageB.getByRole('button', { name: 'Join the dive' }).click()
  await expectJoinerLanded(pageB)
  await expect(pageB.locator('.dock .seat')).toHaveCount(2)
  return { contextA, contextB, pageA, pageB, code: pageA.url().split('/').pop()! }
}

test('when the whole squad leaves, the room waits and RESUME puts everyone back', async ({ browser }) => {
  const { contextA, contextB, pageA, pageB, code } = await squadAtTheWheel(browser)

  await leaveDive(pageB)
  await expect(pageA.locator('.dock .seat').filter({ hasText: 'Duo' })).toContainText('Away')
  await leaveDive(pageA)

  // The room is still listed on both Bridges — nothing was reset — but its card
  // says "Idle room" now: the record outlives the squad, so the label follows
  // the live connection list rather than the fact that the room exists.
  for (const page of [pageA, pageB]) {
    await page.reload()
    await expect(page.getByText(`Idle room ${code}`)).toBeVisible()
  }

  // The guest is back first and takes the helm; the host is still away.
  await pageB.getByRole('link', { name: 'RESUME' }).click()
  await expect(pageB.locator('.call')).toBeVisible()
  await expect(pageB.locator('.dock .seat')).toHaveCount(2)
  await expect(pageB.locator('.dock .seat.away')).toContainText('HOST')
  await expect(pageB.getByRole('button', { name: 'Spin', exact: true })).toBeEnabled()

  await pageA.getByRole('link', { name: 'RESUME' }).click()
  await expect(pageA.locator('.call')).toBeVisible()
  await expect(pageB.locator('.dock .seat.away')).toHaveCount(0)

  await contextA.close()
  await contextB.close()
})

test('the squad never waits on a diver who left', async ({ browser }) => {
  const { contextA, contextB, pageA, pageB } = await squadAtTheWheel(browser)
  await leaveDive(pageB)

  await pageA.getByRole('button', { name: 'Spin', exact: true }).click()
  await lockMisfortune(pageA)
  await pageA.locator('.strain-card').getByRole('button', { name: 'Skip' }).click()
  await pageA.getByRole('button', { name: 'Deal the pacts' }).click()
  await pageA.getByRole('button', { name: 'Dive with no pacts' }).click()
  await expect(pageA.getByRole('heading', { name: 'Hold the line' })).toBeVisible()

  await contextA.close()
  await contextB.close()
})
