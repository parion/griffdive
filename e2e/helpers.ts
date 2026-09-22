import { expect, type Page } from '@playwright/test'

// The dive primer and the Warbonds panel auto-open once per browser at dive
// start, the primer first; close whichever is showing so the spec can reach the
// dive underneath.
export async function dismissWarbondIntro(page: Page): Promise<void> {
  const guide = page.getByRole('dialog', { name: 'How a dive works' })
  const warbonds = page.getByRole('dialog', { name: 'Warbonds' })
  await expect(guide.or(warbonds).first()).toBeVisible()
  if (await guide.isVisible()) {
    await guide.getByRole('button', { name: 'Close how a dive works' }).click()
    await expect(guide).toBeHidden()
  }
  await expect(warbonds).toBeVisible()
  await warbonds.getByRole('button', { name: 'Close warbonds' }).click()
  await expect(warbonds).toBeHidden()
}
