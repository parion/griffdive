// Captures the hero's component stills from a four-diver room on a maxed Suicide Mission dive.
// Usage: node scripts/capture-hero.mjs [baseURL] [outDir]
// Needs a running production build (GRIFFDIVE_DISABLE_MO_API=1 node .output/server/index.mjs).
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const base = process.argv[2] ?? 'http://localhost:3180'
const out = process.argv[3] ?? 'docs/marketing/images/hero-parts'
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

async function diver(scale) {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: scale, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await page.route('**/api/war/major-order', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(order) }))
  return page
}

const part = async (locator, name) => {
  await locator.first().scrollIntoViewIfNeeded()
  await locator.first().screenshot({ path: `${out}/${name}.png` })
}

const host = await diver(2)
await host.goto(base)
await host.getByRole('button', { name: 'Host an online dive' }).click()
await host.getByLabel('Your name').fill('Griffon')
await host.getByLabel('Your name').press('Enter')
await host.getByRole('button', { name: 'Start the dive' }).click()
const warbonds = host.getByRole('dialog', { name: 'Warbonds' })
if (await warbonds.isVisible({ timeout: 2000 }).catch(() => false)) await warbonds.getByRole('button', { name: 'Close warbonds' }).click()

const squad = []
for (const name of ['Liberty', 'Freedom', 'Democracy']) {
  const page = await diver(1)
  await page.goto(host.url())
  await page.getByLabel('Your name').fill(name)
  await page.getByLabel('Your name').press('Enter')
  await page.getByRole('button', { name: 'Join the dive' }).click()
  squad.push(page)
}

await host.getByRole('radio', { name: /^Suicide Mission/ }).click()
await host.getByRole('radio', { name: /Super Penance/ }).click()
await host.waitForTimeout(400)
await host.screenshot({ path: `${out}/lobby.png` })
// The hero shows the kit itself; tiers are told by the loot.
const hideTiers = await host.addStyleTag({ content: 'section[aria-labelledby="setup-kit-h"] .tier-badge{visibility:hidden}' })
await part(host.locator('section[aria-labelledby="setup-kit-h"]'), 'kit')
await hideTiers.evaluate(el => el.remove())
await host.getByRole('button', { name: /^Launch crusade/ }).click()

await host.getByRole('button', { name: 'Spin the wheel' }).click()
const accept = host.getByRole('button', { name: 'Take it', exact: true }).first()
await accept.waitFor()
// Feature a directive with real teeth: reroll until the drawn rule stakes three skulls or more.
for (let i = 0; i < 6; i++) {
  const risk = await host.locator('.directive-card').innerText()
  const reroll = host.getByRole('button', { name: /^Reroll directive/ })
  if (!(await accept.isDisabled()) && /RISK [345]/i.test(await host.locator('.wheel-wrap').innerText())) break
  if (await reroll.isDisabled().catch(() => true)) break
  await reroll.click()
  await host.waitForTimeout(250)
  void risk
}
await accept.click()
const strainTake = host.locator('.strain-card').getByRole('button', { name: 'Take it' })
if (await strainTake.isVisible({ timeout: 1000 }).catch(() => false)) await strainTake.click()
await host.waitForTimeout(500)
await part(host.locator('.wheel-wrap'), 'wheel')
await part(host.locator('.directive-card'), 'directive')
await part(host.locator('.front-card'), 'front')
await host.screenshot({ path: `${out}/call.png` })

await host.getByRole('button', { name: 'Deal the pacts' }).click()
await host.getByRole('heading', { name: 'Swear your pacts' }).waitFor()

async function swearAll(page) {
  await page.getByRole('heading', { name: 'Swear your pacts' }).waitFor()
  const cards = page.locator('.condition')
  for (let i = 0; i < await cards.count(); i++) {
    const card = cards.nth(i)
    if (!(await card.isDisabled()) && (await card.getAttribute('aria-pressed')) !== 'true') await card.click()
  }
}

await swearAll(host)
await host.waitForTimeout(500)
await host.screenshot({ path: `${out}/pacts.png` })
for (const [i, card] of (await host.locator('.condition').all()).entries()) await card.screenshot({ path: `${out}/pact-${i + 1}.png` })
await part(host.locator('.roll-strip').locator('xpath=..'), 'pact-odds')

for (const page of squad) {
  await swearAll(page)
  await page.getByRole('button', { name: /^Swear \d+ pacts?/ }).click()
}
await host.getByRole('button', { name: /^Swear \d+ pacts?/ }).click()

await host.getByRole('heading', { name: 'Hold the line' }).waitFor()
await host.getByRole('button', { name: 'Extracted' }).click()
await host.getByRole('heading', { name: 'Mission report' }).waitFor()
for (const [label, n] of [['Common sample count', '24'], ['Rare sample count', '8'], ['Super sample count', '2']]) {
  const field = host.getByLabel(label)
  if (await field.isVisible().catch(() => false)) await field.fill(n)
}
await host.screenshot({ path: `${out}/report.png` })
await host.getByRole('button', { name: 'File report' }).click()
await host.getByRole('heading', { name: 'Bank one item' }).waitFor()
await host.waitForTimeout(800)

const award = host.getByRole('button', { name: 'Award Squad Honors token to GRIFFON' })
if (await award.isVisible({ timeout: 1500 }).catch(() => false)) {
  await award.click()
  await host.locator('.honors-award').click()
  await host.waitForTimeout(500)
}

const tierOf = async () => (await host.locator('.loot-card').allInnerTexts()).join(' ')
// One honors token buys one reroll: spend it only when the first draft shows no S.
if (!/\bS\b/.test(await tierOf())) {
  const reroll = host.getByRole('button', { name: /^Reroll · 1 token/ })
  if (await reroll.isEnabled().catch(() => false)) {
    await reroll.click()
    await host.waitForTimeout(800)
  }
}
await host.screenshot({ path: `${out}/rewards.png` })
for (const [i, card] of (await host.locator('.loot-card').all()).entries()) await card.screenshot({ path: `${out}/loot-${i + 1}.png` })
await part(host.locator('.dock'), 'dock')
console.log('loot:', (await tierOf()).replace(/\s+/g, ' '))
await browser.close()
