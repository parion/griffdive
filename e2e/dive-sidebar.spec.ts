import { expect, test } from '@playwright/test'
import { dismissWarbondIntro } from './helpers'

test('desktop: one persistent sidebar hosts Kit, Codex, Warbonds and Bargains', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await page.getByLabel('Diver name').fill('Griffon')
  await page.getByRole('button', { name: 'Solo drop' }).click()
  await dismissWarbondIntro(page)

  const side = page.getByRole('complementary', { name: 'Dive tools' })
  const rail = side.getByRole('navigation', { name: 'Tools' })
  await expect(rail.getByRole('button')).toHaveCount(4)
  // The rail is always there; the panel only opens on demand outside the field.
  await expect(side.getByRole('heading', { level: 2 })).toHaveCount(0)

  // One panel at a time, switched from the rail, never a modal.
  await rail.getByRole('button', { name: 'Codex', exact: true }).click()
  await expect(side.getByRole('heading', { name: 'Codex', level: 2 })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await rail.getByRole('button', { name: 'Warbonds', exact: true }).click()
  await expect(side.getByRole('heading', { name: 'Warbonds', level: 2 })).toBeVisible()
  await expect(side.getByRole('heading', { name: 'Codex', level: 2 })).toHaveCount(0)
  await expect(rail.getByRole('button', { name: 'Warbonds', exact: true })).toHaveAttribute('aria-expanded', 'true')

  // The stage stays live beside it.
  await expect(page.getByRole('button', { name: 'Spin', exact: true })).toBeEnabled()

  await rail.getByRole('button', { name: 'Warbonds', exact: true }).click()
  await expect(side.getByRole('heading', { level: 2 })).toHaveCount(0)

  await rail.getByRole('button', { name: /Brasch's Bargains/ }).click()
  await expect(side.getByRole('region', { name: 'Brasch\'s Bargains' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(side.getByRole('heading', { level: 2 })).toHaveCount(0)
})

test('phone: the rail pins above the action bar and the panel rises over the stage', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', hasTouch: true, isMobile: true })
  const page = await context.newPage()
  await page.goto('/')
  await page.getByLabel('Diver name').fill('Griffon')
  await page.getByRole('button', { name: 'Solo drop' }).click()
  await dismissWarbondIntro(page)

  const side = page.getByRole('complementary', { name: 'Dive tools' })
  const rail = side.getByRole('navigation', { name: 'Tools' })
  const bar = page.getByRole('contentinfo', { name: 'Dive actions' })
  await expect(rail.getByRole('button')).toHaveCount(4)
  const railBox = await rail.boundingBox()
  const barBox = await bar.boundingBox()
  expect(railBox!.y + railBox!.height).toBeLessThanOrEqual(barBox!.y + 1)

  await rail.getByRole('button', { name: 'Kit', exact: true }).click()
  const panel = side.getByRole('heading', { name: 'Kit', level: 2 })
  await expect(panel).toBeVisible()
  const panelBox = await panel.boundingBox()
  expect(panelBox!.y).toBeLessThan(railBox!.y)
  // The rail never moves when a panel opens.
  expect(await rail.boundingBox()).toEqual(railBox)

  await side.getByRole('button', { name: 'Hide kit' }).click()
  await expect(panel).toBeHidden()
  await context.close()
})
