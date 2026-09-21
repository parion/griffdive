import { expect, type Page } from '@playwright/test'

// The Warbonds panel auto-opens once per browser at dive start; close it so the
// spec can reach the dive underneath.
export async function dismissWarbondIntro(page: Page): Promise<void> {
  const drawer = page.getByRole('dialog', { name: 'Warbonds' })
  await expect(drawer).toBeVisible()
  await drawer.getByRole('button', { name: 'Close warbonds' }).click()
  await expect(drawer).toBeHidden()
}
