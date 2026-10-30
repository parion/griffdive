import { expect, test } from '@playwright/test'
import { dismissWarbondIntro, fileCallsign, lockMisfortune } from './helpers'

test('call: the CTA, odds line and front pin hold one layout across the draw', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Solo drop' }).click()
  await fileCallsign(page, 'Griffon')
  await dismissWarbondIntro(page)

  const call = page.locator('.call')
  // Pre-spin already shows the settled layout: placeholder directive, odds
  // line and the primary spin control.
  await expect(call.locator('.directive-card.empty-call')).toBeVisible()
  await expect(call.locator('.roll-strip')).toBeVisible()
  await expect(call.locator('.roll-note')).toContainText('Base odds')
  const spin = call.getByRole('button', { name: 'Spin the wheel' })
  await expect(spin).toBeVisible()
  await spin.click()

  // The same column order survives the draw, with the primary action now the
  // deal gate. A shrinking tier reads settled odds, never a red negative.
  const card = call.locator('.directive-card')
  await expect(card.getByRole('button', { name: 'Take it' })).toBeVisible()
  await expect(call.locator('.decision-side .roll-strip')).toBeVisible()
  const labels = await call.locator('.zone-label .letter').allInnerTexts()
  expect(labels.filter(Boolean).some(label => label.includes('-'))).toBe(false)
  // The front line moved out from under the wheel and now follows the card.
  await expect(call.locator('.decision-side .front-pin')).toBeVisible()

  // The call is a toggle, not a one-shot: flip it and flip it back.
  await lockMisfortune(page)
  const verdict = card.locator('.dc-verdict')
  await expect(verdict).toBeVisible()
  const taken = await verdict.evaluate(el => el.classList.contains('taken'))
  await verdict.getByRole('button', { name: taken ? 'Skipped' : 'Taken' }).click()
  await expect(verdict).toHaveClass(taken ? /skipped/ : /taken/)
  await verdict.getByRole('button', { name: taken ? 'Taken' : 'Skipped' }).click()
  await expect(verdict).toHaveClass(taken ? /taken/ : /skipped/)
})

test('solo dive flow: spin → pacts → report → rewards → advance', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Solo drop' }).click()
  await fileCallsign(page, 'Griffon')

  await expect(page).toHaveURL(/\/dive\/[0-9a-f-]{36}/)
  await dismissWarbondIntro(page)
  await expect(page.getByText('Medium', { exact: true })).toBeVisible()
  await expect(page.locator('.diff-emblem')).toBeVisible()

  await page.getByRole('button', { name: 'Spin', exact: true }).click()
  // The directive lands as one lit card over the odds line.
  await expect(page.locator('.directive-card .dc-actions')).toBeVisible()
  await expect(page.locator('.roll-strip')).toBeVisible()

  // The team takes the drawn directive — chosen risk raises everyone's Valor.
  await lockMisfortune(page)
  await expect(page.locator('.directive-card .dc-verdict')).toBeVisible()

  // The operation's first mission also draws a strain: an optional, op-long
  // team risk. Declining keeps the dive at the misfortune's risk alone.
  await expect(page.locator('.strain-card')).toBeVisible()
  await page.locator('.strain-card').getByRole('button', { name: 'Skip' }).click()
  // The host deals the hand before the dedicated pacts screen (no wheel).
  await page.getByRole('button', { name: 'Deal the pacts' }).click()
  await expect(page.getByRole('heading', { name: 'Swear your pacts' })).toBeVisible()

  // The pact hand is self-service, and the odds strip previews each pick
  // before it is sworn.
  const strip = page.locator('.roll-strip')
  const before = await strip.getAttribute('aria-label')
  await page.locator('.condition:not([disabled])').first().click()
  await expect(page.getByText(/^With /)).toBeVisible()
  expect(await strip.getAttribute('aria-label')).not.toBe(before)
  await page.getByRole('button', { name: /^Swear 1 pact/ }).click()

  await expect(page.getByRole('heading', { name: 'Hold the line' })).toBeVisible()
  // The tool sidebar opens the Kit beside the stage for the field, non-modal;
  // its tab folds it away and back.
  const side = page.getByRole('complementary', { name: 'Dive tools' })
  await expect(side.getByRole('region', { name: 'Kit' })).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'Kit' })).toBeHidden()
  await side.getByRole('button', { name: 'Kit', exact: true }).click()
  await expect(side.getByRole('region', { name: 'Kit' })).toBeHidden()
  await side.getByRole('button', { name: 'Kit', exact: true }).click()
  await expect(side.getByRole('region', { name: 'Kit' })).toBeVisible()
  // Brasch's Bargains shuts while the squad is in the field.
  await expect(page.getByRole('button', { name: /Brasch's Bargains.*Closed during the mission/ })).toBeDisabled()

  await page.getByRole('button', { name: 'Extracted' }).click()
  // The report form opens at the difficulty's best result — 3 stars at Medium.
  await expect(page.getByRole('heading', { name: 'Mission report' })).toBeVisible()
  await expect(page.getByRole('radio', { name: '3 stars' })).toHaveAttribute('aria-checked', 'true')
  const commonSamples = page.getByRole('slider', { name: 'Common samples' })
  await expect(commonSamples).toHaveAttribute('aria-valuenow', '0')
  // Medium spawns at most 18 commons; the Sample Scanner can double pickups,
  // so the report ceiling is 36.
  await page.getByLabel('Common sample count').fill('30')
  await expect(commonSamples).toHaveAttribute('aria-valuenow', '30')
  await page.getByLabel('Common sample count').fill('12')
  await expect(commonSamples).toHaveAttribute('aria-valuenow', '12')
  await page.getByRole('button', { name: 'Set time remaining to 60 percent' }).click()
  await expect(page.locator('.time-value')).toContainText('60')

  // Honors are due on this mission: there is no spin button, the reel rolls
  // when the report files and the rewards screen follows it.
  await expect(page.getByRole('button', { name: 'Spin the stat' })).toHaveCount(0)
  await page.getByRole('button', { name: 'File report' }).click()

  await expect(page.getByRole('heading', { name: 'Bank one item' })).toBeVisible()
  // Every option carries its own d100 roll on the same odds line.
  await expect(page.locator('.loot-card')).toHaveCount(3)
  await expect(page.locator('.roll-pins .pin')).toHaveCount(3)
  // Armor passives are Brasch exclusives now: the draft never deals one.
  await expect(page.locator('.loot-grid')).not.toContainText('Armor Passive')
  await page.locator('.loot-card').first().click()
  await page.getByRole('button', { name: /^Bank / }).click()
  // With the whole squad banked, the dive regroups between missions: the
  // banked haul, Brasch's shelf inline, and the host's call to drop again.
  await expect(page.getByRole('heading', { name: 'Regroup' })).toBeVisible()
  await expect(page.getByRole('article', { name: 'Your haul' }).locator('img')).toBeVisible()
  await expect(page.locator('.mc .bb-card')).toHaveCount(3)

  // Brasch's Bargains stays shut until the first operation is complete; the
  // shelf is only a tease, and credits keep banking toward the first buy.
  await expect(page.locator('.mc .bb-closed')).toContainText('Opens after your first operation')
  await expect(side.getByRole('button', { name: /Brasch's Bargains, 9 credits — Opens after your first operation/ })).toBeDisabled()

  await page.getByRole('button', { name: /Next mission/ }).click()
  // Medium runs 2-mission operations. The tracker advances to the second
  // segment; the overall mission count lives in its accessible label.
  await expect(page.getByRole('img', { name: /Operation mission 2 of 2/i })).toBeVisible()

  // The front persists, but mission 2 begins at the spin: a fresh misfortune
  // awaits the squad's decision.
  await page.getByRole('button', { name: 'Spin', exact: true }).click()
  await expect(page.locator('.directive-card .dc-actions')).toBeVisible()
  await page.locator('.directive-card').getByRole('button', { name: 'Skip' }).click()
  await page.getByRole('button', { name: 'Deal the pacts' }).click()
  await page.locator('.condition:not([disabled])').first().click()
  await page.getByRole('button', { name: /^Swear 1 pact/ }).click()
  await page.getByRole('button', { name: 'Extracted' }).click()

  // Honors aren't due on mission 2 (the solo cadence is every third mission),
  // so the card says when the next spin lands instead of showing the reel.
  await expect(page.getByRole('region', { name: 'Squad Honors' })).toContainText('Next Squad Honors in 2 missions')
  await page.getByRole('button', { name: 'File report' }).click()

  // The banked honors token buys a reroll of the whole draft.
  await expect(page.locator('.roll-pins .pin')).toHaveCount(3)
  await page.getByRole('button', { name: /^Reroll · 1 token/ }).click()
  await expect(page.getByRole('button', { name: /^Reroll · 0 tokens/ })).toBeDisabled()

  await page.locator('.loot-card').first().click()
  await page.getByRole('button', { name: /^Bank / }).click()

  // Medium's two-mission operation closes on the climb screen.
  await expect(page.getByRole('heading', { name: 'The squad climbs' })).toBeVisible()
  // The climb regroups too: the operation's last haul and a last call at Brasch.
  await expect(page.getByRole('article', { name: 'Your haul' }).locator('img')).toBeVisible()
  await expect(page.locator('.cleared .bb-card')).toHaveCount(3)
  // The operation is complete, so the shop opens: one slot each for primary,
  // secondary and throwable at Medium, plus the Armor Pack side stock.
  await expect(page.locator('.cleared .bb-closed')).toHaveCount(0)
  await expect(page.locator('.cleared .bb-pack')).toContainText('Armor Pack')
  await expect(page.locator('.cleared .bb-side')).toContainText('One pack per operation')
  await side.getByRole('button', { name: /^Brasch's Bargains, \d+ credits/ }).click()
  const bargains = side.getByRole('region', { name: 'Brasch\'s Bargains' })
  await expect(bargains.locator('.bb-card')).toHaveCount(3)
  await expect(bargains.locator('.bb-pack')).toBeVisible()
  await expect(bargains.locator('.bb-pack-btn')).toBeDisabled()
  await side.getByRole('button', { name: /^Hide/ }).click()
  await expect(bargains).toBeHidden()
  await page.getByRole('button', { name: /Start operation 2/ }).click()
  await expect(page.getByRole('button', { name: 'Spin', exact: true })).toBeVisible()
})

test('a live Major Order chosen at setup pins the front for the run', async ({ page }) => {
  // Deterministic live order: the real war may have none running.
  await page.route('**/api/war/major-order', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      status: 'active',
      order: {
        fronts: ['automatons'],
        live: true,
        title: 'Liberate the designated planets.',
        planets: [
          { index: 198, name: 'Marfark', front: 'automatons', liberation: 89.7, available: true },
          { index: 7, name: 'Zea Rugosia', front: 'illuminate', liberation: 0, available: false },
        ],
        expiresAt: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
      },
    }),
  }))

  await page.goto('/')

  // The front plan is part of the crusade setup, not the call screen.
  await page.getByRole('button', { name: /^Set warbonds/ }).click()
  const setup = page.getByRole('dialog', { name: 'Variant & warbonds' })
  // A live order is the default plan, featured with its fronts.
  const orderPlan = setup.getByRole('radio', { name: /Major Order/ })
  await expect(orderPlan).toHaveAttribute('aria-checked', 'true')
  await expect(orderPlan).toContainText('Automatons')
  // The gated planet does not pin its front until it opens.
  await expect(orderPlan).not.toContainText('Illuminate')
  await setup.getByRole('button', { name: /^Close/ }).first().click()
  // Its name contains "warbonds": let it close before the dive's intro check.
  await expect(setup).toBeHidden()
  await page.getByRole('button', { name: 'Solo drop' }).click()
  await fileCallsign(page, 'Griffon')
  await dismissWarbondIntro(page)

  await expect(page.locator('.front-pin')).toContainText('Major Order')
  await expect(page.locator('.front-pin')).toContainText('Automatons')

  await page.getByRole('button', { name: 'Spin', exact: true }).click()
  await expect(page.locator('.front-pin')).toContainText('Automatons')
  // The front is a faction; the order is fought on a planet. The pin names it.
  await expect(page.locator('.front-pin')).toContainText('Marfark')
})

test('the Bridge campaign CTA seeds a dive with the live order already pinned', async ({ page }) => {
  await page.route('**/api/war/major-order', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      status: 'active',
      order: {
        fronts: ['automatons'],
        live: true,
        title: 'Liberate the designated planets.',
        planets: [{ index: 198, name: 'Marfark', front: 'automatons', liberation: 89.7 }],
        expiresAt: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
      },
    }),
  }))

  await page.goto('/')
  await expect(page.locator('.mo-band.mo-in')).toBeVisible()
  // The band's CTA starts the campaign with the order already committed.
  await page.locator('.mo-start').click()
  await fileCallsign(page, 'Griffon')

  await expect(page).toHaveURL(/\/dive\/[0-9a-f-]{36}/)
  await dismissWarbondIntro(page)
  // Pre-seeded: the front is pinned before the first spin, no second pick.
  await expect(page.locator('.front-pin')).toContainText('Automatons')

  await page.getByRole('button', { name: 'Spin', exact: true }).click()
  await expect(page.locator('.front-pin')).toContainText('Automatons')
  await expect(page.locator('.front-pin')).toContainText('Marfark')
})

test('a faction locked at setup pins the front without a Major Order tag', async ({ page }) => {
  // Force the no-order state so the manual prompt is deterministic.
  await page.route('**/api/war/major-order', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ status: 'none', order: null }),
  }))

  await page.goto('/')

  await page.getByRole('button', { name: /^Set warbonds/ }).click()
  const setup = page.getByRole('dialog', { name: 'Variant & warbonds' })
  // With no order running, the Major Order plan can't be chosen.
  await expect(setup.getByText('No active Major Order')).toBeVisible()
  await expect(setup.getByRole('radio', { name: /Major Order/ })).toBeDisabled()
  await setup.getByRole('radio', { name: /Pick one enemy/ }).click()
  await setup.getByRole('group', { name: 'Enemy' })
    .getByRole('button', { name: 'Automatons', exact: true }).click()
  await setup.getByRole('button', { name: /^Close/ }).first().click()
  // Its name contains "warbonds": let it close before the dive's intro check.
  await expect(setup).toBeHidden()
  await page.getByRole('button', { name: 'Solo drop' }).click()
  await fileCallsign(page, 'Griffon')
  await dismissWarbondIntro(page)

  await expect(page.locator('.front-pin')).toContainText('Front')
  await expect(page.locator('.front-pin')).not.toContainText('Major Order')
  await expect(page.locator('.front-pin')).toContainText('Automatons')

  await page.getByRole('button', { name: 'Spin', exact: true }).click()
  await expect(page.locator('.front-pin')).toContainText('Automatons')
})

test('a failed mission labels the operation failed and removes an earned item', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Solo drop' }).click()
  await fileCallsign(page, 'Griffon')
  await dismissWarbondIntro(page)

  await page.getByRole('button', { name: 'Spin', exact: true }).click()
  await lockMisfortune(page)
  await page.locator('.strain-card').getByRole('button', { name: 'Skip' }).click()
  await page.getByRole('button', { name: 'Deal the pacts' }).click()
  await page.locator('.condition:not([disabled])').first().click()
  await page.getByRole('button', { name: /^Swear 1 pact/ }).click()

  // Failure only takes earned gear, so clear mission 1 and bank a reward first.
  await page.getByRole('button', { name: 'Extracted' }).click()
  await page.getByRole('button', { name: 'File report' }).click()
  await page.locator('.loot-card').first().click()
  await page.getByRole('button', { name: /^Bank / }).click()
  await page.getByRole('button', { name: /Next mission/ }).click()

  await page.getByRole('button', { name: 'Spin', exact: true }).click()
  await page.locator('.directive-card').getByRole('button', { name: 'Skip' }).click()
  await page.getByRole('button', { name: 'Deal the pacts' }).click()
  await page.getByRole('button', { name: 'Dive with no pacts' }).click()
  await page.getByRole('button', { name: 'Mission failed' }).click()
  await page.getByRole('button', { name: 'File failure' }).click()

  await expect(page.getByRole('heading', { name: 'Mission failed' })).toBeVisible()

  // Pick one item from the dealt offer, then remove it — once every diver
  // has chosen the forfeit restarts the operation at mission 1.
  await page.locator('.sur-tile:not([disabled])').first().click()
  await page.getByRole('button', { name: /^Remove / }).click()
  await expect(page.getByRole('img', { name: /Operation mission 1 of 2/i })).toBeVisible()
})

test('a spinning wheel never changes the stage\'s scroll extent', async ({ page }) => {
  // The rotating rotor's corners once grew the scroll box every frame, so the
  // scrollbars flickered for the whole spin. Run with motion so it really turns.
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Solo drop' }).click()
  await fileCallsign(page, 'Griffon')
  await dismissWarbondIntro(page)

  const extent = () => page.locator('main.stage').evaluate(el => `${el.scrollWidth}x${el.scrollHeight}`)
  const before = await extent()
  await page.getByRole('button', { name: 'Spin', exact: true }).click({ force: true })
  const seen = new Set<string>()
  for (let i = 0; i < 15; i++) {
    seen.add(await extent())
    await page.waitForTimeout(100)
  }
  expect([...seen]).toEqual([before])
})
