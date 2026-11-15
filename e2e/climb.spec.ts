import { expect, test, type Browser, type Page } from '@playwright/test'
import { dismissWarbondIntro, fileCallsign, settleClimb, settleDebrief } from './helpers'

// HD2's stats screen is up right after the report, so a rule only it can prove
// is settled in the debrief, before the roll. The pact hand is random: redeal fresh
// solo dives until a hand offers a stats-verified pact, then swear it.
async function diveWithStatsPact(browser: Browser): Promise<Page> {
  for (let attempt = 0; attempt < 14; attempt++) {
    const context = await browser.newContext({ reducedMotion: 'reduce' })
    const page = await context.newPage()
    await page.goto('/')
    await page.getByRole('button', { name: 'Solo drop' }).click()
    await fileCallsign(page, 'Griffon')
    await dismissWarbondIntro(page)
    await page.getByRole('button', { name: 'Spin', exact: true }).click()
    // Skip the directive so the check under test is the pact's alone.
    await page.locator('.directive-card').getByRole('button', { name: 'Skip' }).click()
    await page.locator('.strain-card').getByRole('button', { name: 'Skip' }).click()
    await page.getByRole('button', { name: 'Deal the pacts' }).click()
    const statsCard = page.locator('.condition', { hasText: 'end-of-mission stats' }).first()
    await expect(page.getByRole('heading', { name: 'Swear your pacts' })).toBeVisible()
    if (await statsCard.count() > 0) {
      await statsCard.click()
      await page.getByRole('button', { name: /^Swear 1 pact/ }).click()
      await expect(page.getByRole('heading', { name: 'Hold the line' })).toBeVisible()
      return page
    }
    await context.close()
  }
  throw new Error('no hand offered a stats-verified pact')
}

async function fileSuccess(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Extracted' }).click()
  await page.getByRole('button', { name: 'File report' }).click()
  // The debrief opens first; the draft waits for the host's roll.
  await expect(page.getByRole('heading', { name: 'Read the stats screen' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Bank one item' })).toBeHidden()
}

async function bank(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { name: 'Bank one item' })).toBeVisible()
  await page.locator('.loot-card').first().click()
  await page.getByRole('button', { name: /^Bank / }).click()
  await expect(page.locator('.climb')).toBeVisible()
}

test('debrief: stats rules are held by default, so the roll is open', async ({ browser }) => {
  const page = await diveWithStatsPact(browser)
  await fileSuccess(page)

  const debrief = page.locator('.debrief')
  await expect(debrief.getByLabel('Mission report')).toBeVisible()
  await expect(debrief.getByLabel('Stats check')).toContainText('Held by default')
  await expect(debrief.locator('.rule-row.held')).toBeVisible()
  await expect(debrief.locator('.cta')).toBeEnabled()

  await settleDebrief(page)
  await bank(page)
  await settleClimb(page)
  await expect(page.locator('.climb').getByLabel('Stats check')).toHaveCount(0)
  await page.context().close()
})

test('debrief: a broke mark takes two taps and costs this draft an option', async ({ browser }) => {
  const page = await diveWithStatsPact(browser)
  await fileSuccess(page)

  const debrief = page.locator('.debrief')
  await debrief.locator('.act.broke').click()
  // The mark is one-way: the first tap only arms it.
  await expect(debrief.locator('.act.broke')).toContainText('Confirm?')
  await debrief.locator('.act.broke').click()
  await expect(debrief.locator('.rule-row.broke')).toContainText('loot option lost')

  await settleDebrief(page)
  // A full-star clear deals three options; the broken pact costs one.
  await expect(page.locator('.loot-card')).toHaveCount(2)
  await bank(page)

  // Nothing is owed: the next mission swears no forced pact.
  await settleClimb(page)
  await page.locator('.climb .cta').click()
  await page.getByRole('button', { name: 'Spin', exact: true }).click()
  await page.locator('.directive-card').getByRole('button', { name: 'Skip' }).click()
  await page.getByRole('button', { name: 'Deal the pacts' }).click()
  await expect(page.getByRole('region', { name: 'Penance owed' })).toHaveCount(0)
  await page.context().close()
})
