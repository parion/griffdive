// Captures promo stills of the real UI. Usage: node scripts/capture-marketing.mjs [baseURL] [outDir]
// Needs a running production build (GRIFFDIVE_DISABLE_MO_API=1 node .output/server/index.mjs).
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const base = process.argv[2] ?? 'http://localhost:3180'
const out = process.argv[3] ?? 'docs/marketing/images'
mkdirSync(out, { recursive: true })

const order = {
  status: 'active',
  order: {
    fronts: ['automatons'],
    live: true,
    title: 'Liberate the designated planets.',
    planets: [{ index: 198, name: 'Marfark', front: 'automatons', liberation: 89.7, available: true }],
    expiresAt: new Date(Date.now() + 5 * 3600_000).toISOString(),
  },
}

const browser = await chromium.launch()

async function run(label, viewport, scale) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: scale, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await page.route('**/api/war/major-order', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(order) }))
  const shot = async (name) => {
    await page.waitForTimeout(600)
    await page.screenshot({ path: `${out}/${label}-${name}.png` })
  }
  const click = async (role, name, opts = {}) => page.getByRole(role, { name, ...opts }).click()

  await page.goto(base)
  await page.waitForTimeout(1200)
  await shot('01-bridge')

  await click('button', 'Solo drop')
  await page.locator('#jb-callsign').fill('Griffon')
  await page.locator('#jb-callsign').press('Enter')
  await click('button', 'Start the dive')
  const warbonds = page.getByRole('dialog', { name: 'Warbonds' })
  if (await warbonds.isVisible().catch(() => false)) await warbonds.getByRole('button', { name: 'Close warbonds' }).click()
  await shot('02-wheel')

  await click('button', 'Spin the wheel')
  await page.getByRole('button', { name: 'Take it', exact: true }).first().waitFor()
  await shot('03-directive')

  const accept = page.getByRole('button', { name: 'Take it', exact: true }).first()
  for (let i = 0; i < 5 && await accept.isDisabled(); i++) {
    await page.getByRole('button', { name: /^Reroll directive/ }).click()
    await page.waitForTimeout(200)
  }
  await accept.click()
  const strain = page.locator('.strain-card').getByRole('button', { name: 'Skip' })
  if (await strain.isVisible({ timeout: 1500 }).catch(() => false)) await strain.click()
  await click('button', 'Deal the pacts')
  await page.getByRole('heading', { name: 'Swear your pacts' }).waitFor()
  await page.locator('.condition').first().hover()
  await shot('04-pacts')
  await page.locator('.condition').first().click()
  await shot('05-pacts-sworn')
  await click('button', /^Swear 1 pact/)

  await page.getByRole('heading', { name: 'Hold the line' }).waitFor()
  await click('button', 'Extracted')
  await page.getByRole('heading', { name: 'Mission report' }).waitFor()
  await page.getByLabel('Common sample count').fill('12')
  await shot('06-report')
  await click('button', 'File report')
  await page.getByRole('heading', { name: 'Bank one item' }).waitFor()
  await shot('07-rewards')
  await ctx.close()
}

await run('desktop', { width: 1600, height: 900 }, 1)
await run('phone', { width: 390, height: 844 }, 3)
await browser.close()
