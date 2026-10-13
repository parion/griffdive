import { expect, type Page } from '@playwright/test'

// The first-run tutorial is a dialog over the dive: close it first when this
// browser hasn't seen it yet.
export async function dismissBriefing(page: Page): Promise<void> {
  const tutorial = page.getByRole('dialog', { name: 'Griffdive tutorial' })
  if (await tutorial.isVisible().catch(() => false)) {
    await tutorial.getByRole('button', { name: 'Skip tutorial' }).click()
    await expect(tutorial).toBeHidden()
  }
}

// A fresh browser gets the tutorial at dive start (its Warbonds step replaces
// the old panel); a browser that saw an earlier primer gets the one-shot
// Warbonds panel instead. Close whichever shows so the spec reaches the dive.
export async function dismissWarbondIntro(page: Page): Promise<void> {
  const tutorial = page.getByRole('dialog', { name: 'Griffdive tutorial' })
  const warbonds = page.getByRole('dialog', { name: 'Warbonds' })
  await expect(tutorial.or(warbonds).first()).toBeVisible()
  await dismissBriefing(page)
  if (await warbonds.isVisible()) {
    await warbonds.getByRole('button', { name: 'Close warbonds' }).click()
    await expect(warbonds).toBeHidden()
  }
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

// A squadmate joining by link reads the join briefing instead of the host's
// tutorial: once they join, the dive opens with no tutorial or Warbonds panel.
export async function expectJoinerLanded(page: Page): Promise<void> {
  await expect(page.getByRole('button', { name: 'Join the dive' })).toBeHidden()
  await expect(page.getByRole('dialog', { name: 'Griffdive tutorial' })).toBeHidden()
  await expect(page.getByRole('dialog', { name: 'Warbonds' })).toBeHidden()
}
