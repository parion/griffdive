import { expect, type Page } from '@playwright/test'

// The first-run Griffdiver briefing is a full-screen overlay over the dive:
// close it first when this browser hasn't seen it yet.
export async function dismissBriefing(page: Page): Promise<void> {
  // The tour's final CTA is "Begin dive" (last beat); the header's "Back to
  // base" closes it from any beat.
  const begin = page.getByRole('button', { name: 'Begin dive' })
  const base = page.getByRole('button', { name: 'Back to base' })
  const target = begin.or(base).first()
  if (await target.isVisible().catch(() => false)) {
    await target.click()
    await expect(target).toBeHidden()
  }
}

// The dive primer and the Warbonds panel auto-open once per browser at dive
// start, the primer first; close whichever is showing so the spec can reach the
// dive underneath. The briefing replaces the guide on a fresh browser.
export async function dismissWarbondIntro(page: Page): Promise<void> {
  const guide = page.getByRole('dialog', { name: 'How a dive works' })
  const warbonds = page.getByRole('dialog', { name: 'Warbonds' })
  const begin = page.getByRole('button', { name: 'Begin dive' })
  const base = page.getByRole('button', { name: 'Back to base' })
  // Wait for whichever first-run surface this browser gets.
  await expect(begin.or(base).or(guide).or(warbonds).first()).toBeVisible()
  await dismissBriefing(page)
  await expect(guide.or(warbonds).first()).toBeVisible()
  if (await guide.isVisible()) {
    await guide.getByRole('button', { name: 'Close how a dive works' }).click()
    await expect(guide).toBeHidden()
  }
  await expect(warbonds).toBeVisible()
  await warbonds.getByRole('button', { name: 'Close warbonds' }).click()
  await expect(warbonds).toBeHidden()
}

// The wheel draw is random, and a rule the squad can't field (e.g. Oops, All
// Airstrikes on the standard kit) disables "Lock it in" outright. Reroll the
// directive until it is fieldable so the flow stays deterministic — the engine
// refuses a reroll that returns the same draw, so a token always moves it. The
// specs run with reduced motion, so the reveal never transiently disables the
// lock; a disabled lock here means a genuinely stranded rule.
export async function lockMisfortune(page: Page): Promise<void> {
  const card = page.locator('.misfortune')
  const accept = card.getByRole('button', { name: 'Lock it in' })
  const reroll = page.getByRole('button', { name: /^Reroll the directive/ })
  for (let attempt = 0; attempt < 5 && (await accept.isDisabled()); attempt++) {
    if (await reroll.isDisabled().catch(() => true)) {
      break
    }
    await reroll.click()
    await page.waitForTimeout(150)
  }
  if (await accept.isDisabled()) {
    // No fieldable draw and no reroll left: fall back to the zero-risk opt-out.
    await card.getByRole('button', { name: 'Opt out' }).click()
    return
  }
  await accept.click()
}
