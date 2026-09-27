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

// Specs that aren't about the first run seed the tour-seen flag (and a name)
// before the app boots, so they land on the base instead of /start.
export async function seedOnboarded(page: Page, name = 'Griffon'): Promise<void> {
  await page.addInitScript((diverName) => {
    localStorage.setItem('griffdive:onboarding:v1', '1')
    localStorage.setItem('griffdive:name', diverName)
  }, name)
}

// Walk the real first-run briefing: name, then skip straight to the deploy.
export async function completeOnboarding(page: Page, name: string): Promise<void> {
  await expect(page).toHaveURL(/\/start(\?.*)?$/)
  await page.getByLabel('Diver name').fill(name)
  await page.getByRole('button', { name: 'Skip the tour' }).click()
}
