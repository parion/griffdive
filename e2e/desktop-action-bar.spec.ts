import { expect, test, type Page } from '@playwright/test'
import { dismissWarbondIntro, fileCallsign, settleClimb } from './helpers'

const VIEWPORTS = [
  { width: 1024, height: 768 },
  { width: 1180, height: 820 },
  { width: 1280, height: 720 },
  { width: 1280, height: 800 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
]

async function expectPinnedAction(page: Page, label: string | RegExp, logMeasurement = false): Promise<void> {
  const action = page.locator('#dive-action-content').getByRole('button', { name: label }).first()
  await expect(action, `${label} is in the desktop action slot`).toBeVisible()
  await expect(page.getByRole('button', { name: label }), `${label} is not duplicated`).toHaveCount(1)

  const measurement = await action.evaluate((button) => {
    const actionSlot = document.querySelector<HTMLElement>('#dive-action-content')
    const bar = document.querySelector<HTMLElement>('.desktop-action-bar')
    const dock = document.querySelector<HTMLElement>('.dock-stack')
    const stage = document.querySelector<HTMLElement>('main.stage')
    if (!bar || !dock || !stage || !actionSlot) {
      return null
    }

    const actionElement = button as HTMLButtonElement
    const buttonRect = actionElement.getBoundingClientRect()
    const barRect = bar.getBoundingClientRect()
    const dockRect = dock.getBoundingClientRect()
    const hit = document.elementFromPoint(
      buttonRect.left + buttonRect.width / 2,
      buttonRect.top + buttonRect.height / 2,
    )
    const round = (value: number) => Math.round(value * 10) / 10

    return {
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      viewportHeight: window.innerHeight,
      button: { top: round(buttonRect.top), bottom: round(buttonRect.bottom), height: round(buttonRect.height) },
      bar: { top: round(barRect.top), bottom: round(barRect.bottom) },
      dockTop: round(dockRect.top),
      pageScrollTop: document.scrollingElement?.scrollTop ?? 0,
      gap: round(dockRect.top - barRect.bottom),
      hit: Boolean(hit && actionElement.contains(hit)),
      domOrder: Boolean(stage.compareDocumentPosition(actionSlot) & Node.DOCUMENT_POSITION_FOLLOWING)
        && Boolean(actionSlot.compareDocumentPosition(dock) & Node.DOCUMENT_POSITION_FOLLOWING),
    }
  })

  expect(measurement, `${label}: action geometry is available`).not.toBeNull()
  if (!measurement) {
    return
  }
  if (logMeasurement) {
    console.log(`desktop CTA ${measurement.viewport}: button y=${measurement.button.top}..${measurement.button.bottom}, row y=${measurement.bar.top}..${measurement.bar.bottom}, dock y=${measurement.dockTop}, gap=${measurement.gap}, hit=${measurement.hit}`)
  }
  expect(measurement.button.top, `${label}: action is inside the viewport`).toBeGreaterThanOrEqual(0)
  expect(measurement.button.bottom, `${label}: action is fully visible`).toBeLessThanOrEqual(measurement.viewportHeight)
  expect(measurement.button.height, `${label}: action has a usable hit area`).toBeGreaterThanOrEqual(44)
  expect(measurement.gap, `${label}: action row clears the squad dock`).toBeGreaterThanOrEqual(0)
  expect(measurement.hit, `${label}: elementFromPoint reaches the action`).toBe(true)
  expect(measurement.domOrder, `${label}: action follows stage content and precedes the dock`).toBe(true)
  expect(measurement.pageScrollTop, `${label}: action needs no page scroll`).toBe(0)
}

test('desktop actions stay pinned above the dock across viewports and dive beats', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Solo drop' }).click()
  await fileCallsign(page, 'Griffon')
  await dismissWarbondIntro(page)

  await expectPinnedAction(page, 'Spin the wheel')
  await page.locator('#dive-action-content').getByRole('button', { name: 'Spin the wheel' }).click()
  await page.locator('.directive-card').getByRole('button', { name: 'Skip' }).click()
  await page.locator('.strain-card').getByRole('button', { name: 'Skip' }).click()
  await expectPinnedAction(page, 'Deal the pacts')
  await expect(page.locator('#dive-action-content').getByRole('button', { name: /Reroll directive/ })).toBeVisible()
  await page.locator('#dive-action-content').getByRole('button', { name: 'Deal the pacts' }).click()

  await expect(page.getByRole('heading', { name: 'Swear your pacts' })).toBeVisible()
  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport)
    await expectPinnedAction(page, 'Dive with no pacts', true)
  }

  await page.setViewportSize({ width: 1280, height: 800 })
  await page.locator('#dive-action-content').getByRole('button', { name: 'Dive with no pacts' }).click()
  await expectPinnedAction(page, 'Extracted')
  await expect(page.locator('#dive-action-content').getByRole('button', { name: 'Mission failed' })).toBeVisible()
  await page.locator('#dive-action-content').getByRole('button', { name: 'Extracted' }).click()

  await expectPinnedAction(page, 'File report')
  await expect(page.locator('#dive-action-content').getByRole('button', { name: 'Back to the field' })).toBeVisible()
  await page.locator('#dive-action-content').getByRole('button', { name: 'File report' }).click()

  await page.locator('.loot-card').first().click()
  await expectPinnedAction(page, /^Bank /)
  await page.locator('#dive-action-content').getByRole('button', { name: /^Bank / }).click()

  await expect(page.locator('.climb')).toBeVisible()
  await settleClimb(page)
  await expectPinnedAction(page, 'Next mission')
})
