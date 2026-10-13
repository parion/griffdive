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
  await expect(host.getByRole('dialog', { name: 'Griffdive tutorial' })).toBeVisible()
  await expect(host.getByRole('heading', { name: 'You\'ve been drafted.' })).toBeHidden()
  await dismissBriefing(host)

  // A fresh browser on the invite link gets the briefing page, naming the squad.
  const joiner = await namedPage(browser, null)
  await joiner.goto(host.url())
  await expect(joiner.getByRole('heading', { name: 'You\'ve been drafted.' })).toBeVisible()
  await expect(joiner.getByRole('dialog', { name: 'Griffdive tutorial' })).toBeHidden()
  await expect(joiner.getByLabel('The squad').getByText('Captain', { exact: true })).toBeVisible()

  // Joining waits on a callsign.
  const join = joiner.getByRole('button', { name: 'Join the dive' })
  await expect(join).toBeDisabled()

  // The gear legend opens the real Codex over the page.
  await joiner.getByRole('button', { name: 'Open the Codex' }).click()
  const codex = joiner.getByRole('dialog', { name: 'Codex' })
  await expect(codex).toBeVisible()
  await codex.getByRole('button', { name: 'Close codex' }).click()
  await expect(codex).toBeHidden()

  // The Valor dial previews the squad's real ceiling odds.
  await joiner.getByLabel('Valor', { exact: true }).fill('0')
  await expect(joiner.getByLabel(/^Ceiling odds/).getByText('Base')).toBeVisible()

  await joiner.getByLabel('Your name').fill('Duo')
  await join.click()
  await expectJoinerLanded(joiner)
  await expect(host.locator('.diver-chip').filter({ hasText: 'Duo' })).toBeVisible()

  // The Tutorial control replays the briefing for a squadmate, never the host's tutorial.
  await joiner.getByRole('button', { name: 'Tutorial', exact: true }).click()
  const manual = joiner.getByRole('dialog', { name: 'Field manual' })
  await expect(manual).toBeVisible()
  await expect(joiner.getByRole('dialog', { name: 'Griffdive tutorial' })).toBeHidden()
  await manual.getByRole('button', { name: 'Back to the dive' }).click()
  await expect(manual).toBeHidden()

  // The host's Tutorial control still opens the host tutorial.
  await host.getByRole('button', { name: 'Tutorial', exact: true }).click()
  await expect(host.getByRole('dialog', { name: 'Griffdive tutorial' })).toBeVisible()
  await dismissBriefing(host)

  // A diver with a saved name still reads the briefing before their first
  // join, with the callsign filled in.
  const veteran = await namedPage(browser, 'Veteran')
  await veteran.goto(host.url())
  await expect(veteran.getByLabel('Your name')).toHaveValue('Veteran')
  await expect(veteran.getByLabel('The squad').getByText('Duo', { exact: true })).toBeVisible()
  await veteran.getByRole('button', { name: 'Join the dive' }).click()
  await expectJoinerLanded(veteran)
  await expect(host.locator('.diver-chip').filter({ hasText: 'Veteran' })).toBeVisible()
})
