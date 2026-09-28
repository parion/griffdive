import { expect, type Page } from '@playwright/test'

// The first-run Griffdiver briefing is a full-screen overlay over the dive:
// close it first when this browser hasn't seen it yet.
export async function dismissBriefing(page: Page): Promise<void> {
  const begin = page.getByRole('button', { name: 'Begin dive' })
  if (await begin.isVisible().catch(() => false)) {
    await begin.click()
    await expect(begin).toBeHidden()
  }
}

// The dive primer and the Warbonds panel auto-open once per browser at dive
// start, the primer first; close whichever is showing so the spec can reach the
// dive underneath. The briefing replaces the guide on a fresh browser.
export async function dismissWarbondIntro(page: Page): Promise<void> {
  const guide = page.getByRole('dialog', { name: 'How a dive works' })
  const warbonds = page.getByRole('dialog', { name: 'Warbonds' })
  const begin = page.getByRole('button', { name: 'Begin dive' })
  // Wait for whichever first-run surface this browser gets.
  await expect(begin.or(guide).or(warbonds).first()).toBeVisible()
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
