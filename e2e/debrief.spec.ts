import { expect, test, type Browser, type Page } from '@playwright/test'
import { dismissWarbondIntro, fileCallsign, settleDebrief } from './helpers'

// The stats screen comes up after the report, so a rule only it can prove is
// settled on the debrief before the draft opens. The pact hand is random: redeal fresh solo
// dives until a hand offers a stats-verified pact, then swear it.
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
}

test('debrief: attesting the stats pact held opens the full draft', async ({ browser }) => {
  const page = await diveWithStatsPact(browser)
  await fileSuccess(page)

  const debrief = page.locator('.debrief')
  await expect(debrief.getByRole('heading', { name: 'Mission secured' })).toBeVisible()
  await expect(debrief.getByLabel('Mission report')).toBeVisible()
  await expect(debrief.getByLabel('Stats check')).toContainText('pact')
  // The offer stays face-down until every rule is settled.
  await expect(page.locator('.loot-card')).toHaveCount(0)

  await debrief.locator('.stat-rule-act .held').click()
  await settleDebrief(page)
  await expect(page.getByRole('heading', { name: 'Bank one item' })).toBeVisible()
  await expect(page.locator('.loot-card')).toHaveCount(3)
  await page.context().close()
})

test('debrief: a broke mark takes two taps and costs one reward option', async ({ browser }) => {
  const page = await diveWithStatsPact(browser)
  await fileSuccess(page)

  const debrief = page.locator('.debrief')
  await expect(debrief).toBeVisible()
  await debrief.locator('.stat-rule-act .broke').click()
  // The mark is one-way: the first tap only arms it.
  await expect(debrief.locator('.stat-rule-act .broke')).toContainText('Confirm?')
  await debrief.locator('.stat-rule-act .broke').click()
  await expect(debrief.locator('.stat-rule.broke')).toBeVisible()

  await settleDebrief(page)
  await expect(page.locator('.loot-card')).toHaveCount(2)
  await page.context().close()
})
