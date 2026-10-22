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

  // A fresh browser on the invite link gets the briefing page with the cursor
  // already in the registry's callsign field; the squad card waits for it.
  const joiner = await namedPage(browser, null)
  await joiner.goto(host.url())
  await expect(joiner.getByRole('heading', { name: 'You\'ve been drafted.' })).toBeVisible()
  await expect(joiner.getByRole('dialog', { name: 'Griffdive tutorial' })).toBeHidden()
  const callsign = joiner.getByRole('textbox', { name: /^Callsign/ })
  await expect(callsign).toBeFocused()
  await expect(joiner.getByLabel('The squad')).toBeHidden()

  // Joining waits on a callsign.
  const join = joiner.getByRole('button', { name: 'Join the dive' })
  await expect(join).toBeDisabled()

  // Filing the callsign (Enter) stamps the registry and opens the squad card.
  await callsign.fill('Duo')
  await callsign.press('Enter')
  await expect(joiner.getByLabel('The squad').getByText('Captain', { exact: true })).toBeVisible()
  await expect(join).toBeEnabled()

  // The surplus kit is laid out beside the Class E copy.
  await expect(joiner.getByRole('group', { name: 'Issued kit · surplus' }).getByRole('img').first()).toBeVisible()

  // The gear legend opens the real Codex over the page.
  await joiner.getByRole('button', { name: 'Open the Codex' }).click()
  const codex = joiner.getByRole('dialog', { name: 'Codex' })
  await expect(codex).toBeVisible()
  await codex.getByRole('button', { name: 'Close codex' }).click()
  await expect(codex).toBeHidden()

  // Scrolled into view, the dial sweeps to Valor 6 at difficulty 5; both stay
  // hand-adjustable and read the engine's real ceiling odds.
  const valor = joiner.getByLabel('Chosen risk', { exact: true })
  await valor.scrollIntoViewIfNeeded()
  await expect(valor).toHaveValue('6')
  await expect(joiner.getByRole('slider', { name: 'Difficulty' })).toHaveValue('5')
  await valor.fill('0')
  await expect(joiner.getByLabel(/^Tier odds/).getByText('Base')).toBeVisible()

  await join.click()
  await expectJoinerLanded(joiner)
  await expect(host.locator('.dock .chip').filter({ hasText: 'Duo' })).toBeVisible()

  // The session menu replays the briefing for a squadmate, never the host's tutorial.
  await joiner.getByRole('button', { name: 'Session menu' }).click()
  const joinerMenu = joiner.getByRole('dialog', { name: 'Session' })
  await joinerMenu.getByRole('button', { name: /Tutorial \/ field manual/ }).click()
  const manual = joiner.getByRole('dialog', { name: 'Field manual' })
  await expect(manual).toBeVisible()
  await expect(joiner.getByRole('dialog', { name: 'Griffdive tutorial' })).toBeHidden()
  await manual.getByRole('button', { name: 'Back to the dive' }).click()
  await expect(manual).toBeHidden()

  // The host's menu still opens the host tutorial.
  await host.getByRole('button', { name: 'Session menu' }).click()
  const hostMenu = host.getByRole('dialog', { name: 'Session' })
  await hostMenu.getByRole('button', { name: /Tutorial \/ field manual/ }).click()
  await expect(host.getByRole('dialog', { name: 'Griffdive tutorial' })).toBeVisible()
  await dismissBriefing(host)

  // A diver with a saved name still reads the briefing before their first
  // join: the callsign is filled in and files itself, opening the squad card.
  const veteran = await namedPage(browser, 'Veteran')
  await veteran.goto(host.url())
  await expect(veteran.getByRole('textbox', { name: /^Callsign/ })).toHaveValue('Veteran')
  await expect(veteran.getByLabel('The squad').getByText('Duo', { exact: true })).toBeVisible()
  await veteran.getByRole('button', { name: 'Join the dive' }).click()
  await expectJoinerLanded(veteran)
  await expect(host.locator('.dock .chip').filter({ hasText: 'Veteran' })).toBeVisible()
})
