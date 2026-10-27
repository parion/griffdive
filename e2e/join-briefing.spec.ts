import { expect, test } from '@playwright/test'
import type { Browser, Page } from '@playwright/test'
import { dismissBriefing, expectJoinerLanded } from './helpers'

async function namedPage(browser: Browser, name: string | null): Promise<Page> {
  const context = await browser.newContext()
  if (name) {
    await context.addInitScript(stored => localStorage.setItem('griffdive:name', stored), name)
  }
  return context.newPage()
}

// One room for the whole flow: room creation is rate-limited per IP, and the
// suite runs in parallel.
test('squadmates read one briefing page; the host keeps the tutorial', async ({ browser }) => {
  // A host who already has a name opens a fresh room with no gate at all, and
  // the host tutorial opens on its own.
  const host = await namedPage(browser, 'Captain')
  await host.goto('/')
  await host.getByRole('button', { name: 'Host an online dive' }).click()
  await expect(host).toHaveURL(/\/dive\/[A-Z0-9]{6}/)
  await expect(host.getByRole('heading', { name: 'You hold the wheel.' })).toBeVisible()
  await expect(host.getByRole('heading', { name: 'You\'ve been drafted.' })).toBeHidden()
  await dismissBriefing(host)

  // A fresh browser on the invite link gets the one-screen briefing with the
  // cursor already in the name field and the squad, the five-beat loop and
  // the way in all on show.
  const joiner = await namedPage(browser, null)
  await joiner.goto(host.url())
  await expect(joiner.getByRole('heading', { name: 'You\'ve been drafted.' })).toBeVisible()
  await expect(joiner.getByRole('heading', { name: 'You hold the wheel.' })).toBeHidden()
  const callsign = joiner.getByRole('textbox', { name: 'Your name' })
  await expect(callsign).toBeFocused()
  await expect(joiner.getByLabel('The squad').getByText('CAPTAIN', { exact: true })).toBeVisible()
  await expect(joiner.getByRole('region', { name: 'How a mission goes' }).getByRole('listitem')).toHaveCount(5)

  // Joining waits on a name only: the button is there from the start, shut.
  const join = joiner.getByRole('button', { name: 'Join the dive' })
  await expect(join).toBeDisabled()
  await expect(joiner.getByRole('button', { name: 'Set warbonds' })).toBeVisible()
  await callsign.fill('Duo')
  await expect(join).toBeEnabled()
  await expect(joiner.getByLabel('The squad').getByText('DUO', { exact: true })).toBeVisible()

  // Everything a first dive can skip waits in one fold.
  const gear = joiner.getByRole('group', { name: 'Starting gear' })
  await expect(gear).toBeHidden()
  await joiner.getByText('More', { exact: true }).click()
  await expect(gear.getByRole('img').first()).toBeVisible()

  // The fold opens the real Armory over the page.
  await joiner.getByRole('button', { name: 'Open the armory' }).click()
  const codex = joiner.getByRole('dialog', { name: 'Armory' })
  await expect(codex).toBeVisible()
  await codex.getByRole('button', { name: 'Close armory' }).click()
  await expect(codex).toBeHidden()

  // Enter in the name field joins, like the button.
  await callsign.press('Enter')
  await expectJoinerLanded(joiner)
  await expect(host.locator('.bays .bay').filter({ hasText: 'Duo' })).toBeVisible()

  // The session menu replays the briefing for a squadmate, never the host's tutorial.
  await joiner.getByRole('button', { name: 'Session menu' }).click()
  const joinerMenu = joiner.getByRole('dialog', { name: 'Session' })
  await joinerMenu.getByRole('button', { name: /Tutorial \/ field manual/ }).click()
  const manual = joiner.getByRole('dialog', { name: 'Field manual' })
  await expect(manual).toBeVisible()
  await expect(joiner.getByRole('heading', { name: 'You hold the wheel.' })).toBeHidden()
  await manual.getByRole('button', { name: 'Back to the dive' }).click()
  await expect(manual).toBeHidden()

  // The host's menu still opens the host tutorial.
  await host.getByRole('button', { name: 'Session menu' }).click()
  const hostMenu = host.getByRole('dialog', { name: 'Session' })
  await hostMenu.getByRole('button', { name: /Tutorial \/ field manual/ }).click()
  await expect(host.getByRole('dialog', { name: 'Host tutorial' })).toBeVisible()
  await dismissBriefing(host)

  // A diver with a saved name still reads the briefing before their first
  // join, with the name filled in and the way in already open.
  const veteran = await namedPage(browser, 'Veteran')
  await veteran.goto(host.url())
  await expect(veteran.getByRole('textbox', { name: 'Your name' })).toHaveValue('Veteran')
  await expect(veteran.getByLabel('The squad').getByText('DUO', { exact: true })).toBeVisible()
  await veteran.getByRole('button', { name: 'Join the dive' }).click()
  await expectJoinerLanded(veteran)
  await expect(host.locator('.bays .bay').filter({ hasText: 'Veteran' })).toBeVisible()
})
