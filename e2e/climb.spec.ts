import { expect, test, type Browser, type Page } from '@playwright/test'
import { dismissWarbondIntro, fileCallsign, settleClimb } from './helpers'

// The stats screen comes up after the report and the draft, so a rule only it
// can prove is settled on the climbs page. The pact hand is random: redeal fresh
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

async function fileSuccessAndBank(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Extracted' }).click()
  await page.getByRole('button', { name: 'File report' }).click()
  // The draft opens at once; the stats check waits for the climbs page.
  await expect(page.getByRole('heading', { name: 'Bank one item' })).toBeVisible()
  await page.locator('.loot-card').first().click()
  await page.getByRole('button', { name: /^Bank / }).click()
  await expect(page.locator('.climb')).toBeVisible()
}

test('climbs page: the draft is never held up, and Held opens the next drop', async ({ browser }) => {
  const page = await diveWithStatsPact(browser)
  await fileSuccessAndBank(page)

  const climb = page.locator('.climb')
  await expect(climb.getByRole('heading', { name: 'Mission secured' })).toBeVisible()
  await expect(climb.getByLabel('Mission report')).toBeVisible()
  await expect(climb.getByLabel('Stats check')).toContainText('pact')
  // The call to drop is gated on the stats rule.
  await expect(climb.locator('.cta')).toBeDisabled()

  await climb.locator('.rule-act .held').click()
  await settleClimb(page)
  await expect(climb.locator('.cta')).toBeEnabled()
  await page.context().close()
})

test('climbs page: a broke mark takes two taps and is owed back as Penance next mission', async ({ browser }) => {
  const page = await diveWithStatsPact(browser)
  await fileSuccessAndBank(page)

  const climb = page.locator('.climb')
  await climb.locator('.rule-act .broke').click()
  // The mark is one-way: the first tap only arms it.
  await expect(climb.locator('.rule-act .broke')).toContainText('Confirm?')
  await climb.locator('.rule-act .broke').click()
  await expect(climb.locator('.rule-row.broke')).toContainText('Penance next mission')

  await settleClimb(page)
  await climb.locator('.cta').click()

  // Next mission: the broken pact is sworn again without a say.
  await page.getByRole('button', { name: 'Spin', exact: true }).click()
  await page.locator('.directive-card').getByRole('button', { name: 'Skip' }).click()
  await page.getByRole('button', { name: 'Deal the pacts' }).click()
  const owed = page.getByRole('region', { name: 'Penance owed' })
  await expect(owed).toBeVisible()
  await expect(owed).toContainText('Hold it and keep')
  await page.getByRole('button', { name: 'Dive with no pacts' }).click()
  await expect(page.getByRole('region', { name: 'Pacts sworn' }).locator('.penance-tag')).toBeVisible()

  // Holding it on the next climbs page keeps the reward.
  await fileSuccessAndBank(page)
  const row = page.locator('.climb .rule-row.penance')
  await expect(row).toBeVisible()
  await row.locator('.held').click()
  await expect(row).toContainText('kept')
  await page.context().close()
})
