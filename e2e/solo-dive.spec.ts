import { expect, test } from '@playwright/test'
import { dismissWarbondIntro, lockMisfortune } from './helpers'

test('solo dive flow: spin → pacts → report → rewards → advance', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Diver name').fill('Griffon')
  await page.getByRole('button', { name: 'Solo drop' }).click()

  await expect(page).toHaveURL(/\/dive\/[0-9a-f-]{36}/)
  await dismissWarbondIntro(page)
  await expect(page.getByText('Medium', { exact: true })).toBeVisible()
  await expect(page.locator('.diff-icon')).toBeVisible()

  await page.getByRole('button', { name: 'Spin', exact: true }).click()
  await expect(page.getByRole('img', { name: 'Decision pending' })).toBeVisible()
  await expect(page.locator('.tier-badge').first()).toBeVisible()

  // The team locks the drawn misfortune in — chosen risk raises everyone's Valor.
  await lockMisfortune(page)
  await expect(page.getByRole('img', { name: 'Locked in — team-wide' })).toBeVisible()

  // The operation's first mission also draws a strain: an optional, op-long
  // team risk. Declining keeps the dive at the misfortune's risk alone.
  await expect(page.getByRole('img', { name: 'Strain call pending' })).toBeVisible()
  await page.locator('.strain').getByRole('button', { name: 'Opt out' }).click()
  // The host deals the hand before the dedicated pacts screen (no wheel).
  await page.getByRole('button', { name: 'Deal the pacts' }).click()
  await expect(page.getByRole('heading', { name: 'Swear your pacts' })).toBeVisible()

  // The squad strip shows who still has to decide.
  await expect(page.getByRole('img', { name: 'choosing pacts' })).toBeVisible()

  // The rail opens on the Kit; the Valor tab swaps in the meter, which
  // reflects the team risk and grows as pacts are added.
  const valor = page.getByRole('progressbar', { name: 'Valor' })
  await expect(page.getByRole('tab', { name: 'Kit' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('region', { name: 'Kit' })).toBeVisible()
  await expect(valor).toBeHidden()
  await page.getByRole('tab', { name: /^Valor/ }).click()
  await expect(valor).toBeVisible()
  const teamValor = Number(await valor.getAttribute('aria-valuenow'))
  await page.locator('.pact:not([disabled])').first().click()
  expect(Number(await valor.getAttribute('aria-valuenow'))).toBeGreaterThan(teamValor)
  await page.getByRole('button', { name: 'Lock in & dive' }).click()

  // The briefing carries the same locked Valor through (QA-U1).
  await expect(page.getByRole('heading', { name: 'Briefing' })).toBeVisible()
  await expect(valor).toBeVisible()
  // Brasch's Bargains shuts while the squad is in the field.
  await expect(page.getByRole('button', { name: /Brasch's Bargains.*Closed during the mission/ })).toBeDisabled()

  await page.getByRole('button', { name: 'Mission complete' }).click()
  // The victory banner + big stars, then the sample tube sliders and the
  // click-to-set time bar. The editable number is the keyboard path.
  await expect(page.getByRole('heading', { name: 'Mission complete' })).toBeVisible()
  const commonSamples = page.getByRole('slider', { name: 'Common samples' })
  await expect(commonSamples).toHaveAttribute('aria-valuenow', '0')
  await page.getByLabel('Common sample count').fill('12')
  await expect(commonSamples).toHaveAttribute('aria-valuenow', '12')
  const timeBar = page.getByRole('progressbar', { name: 'Time remaining percent' })
  await expect(timeBar).toBeVisible()
  await page.getByRole('button', { name: 'Set time remaining percent to 60 percent' }).click()
  await expect(timeBar).toHaveAttribute('aria-valuenow', '60')
  // The report form opens at the difficulty's best result — 3 stars at Medium.
  await expect(page.getByRole('radio', { name: '3 stars' })).toHaveAttribute('aria-checked', 'true')
  await page.getByRole('button', { name: 'File report' }).click()

  await expect(page.getByRole('heading', { name: 'Reward Draft' })).toBeVisible()
  await expect(page.getByRole('img', { name: 'choosing reward' })).toBeVisible()
  await page.locator('.pod-card .pod-hit').first().click()

  // The draft hands off to the settlement screen: Squad Honors.
  await page.getByRole('button', { name: 'Squad Honors' }).click()
  await expect(page.getByRole('region', { name: 'Squad honors' })).toBeVisible()

  // Brasch's Bargains opens from the header between missions: one slot each
  // for primary, secondary, throwable and armor passive at Medium. One
  // mission's haul (12 commons at 60% time → 9 credits) can't cover a C slot.
  await page.getByRole('button', { name: /Brasch's Bargains, 9 credits/ }).click()
  const bargains = page.getByRole('dialog', { name: 'Brasch\'s Bargains' })
  await expect(bargains.locator('.bb-card')).toHaveCount(4)
  await expect(bargains.getByText('Not enough credits').first()).toBeVisible()
  await bargains.getByRole('button', { name: /^Close/ }).click()
  await expect(bargains).toBeHidden()

  // The host spins the stat contest (on click, like the wheel) and banks the
  // winner's token.
  await expect(page.getByRole('heading', { name: 'Squad Honors' })).toBeVisible()
  // Solo: the only diver is always the winner, so the spin auto-banks the
  // token — no selection step.
  await page.getByRole('button', { name: 'Spin the honors stat' }).click()
  await expect(page.getByText('Token banked')).toBeVisible()

  await page.getByRole('button', { name: /Next mission/ }).click()
  // Medium runs 2-mission operations. The tracker advances to the second
  // segment; the overall mission count lives in its accessible label.
  await expect(page.getByRole('img', { name: /operation mission 2 of 2/i })).toBeVisible()
  await expect(page.locator('.rung[data-state="current"]')).toHaveAttribute('aria-label', /mission 2 of 2/)
  // The front persists, but mission 2 begins at the spin: a fresh misfortune
  // awaits the squad's decision.
  await page.getByRole('button', { name: 'Spin', exact: true }).click()
  await expect(page.getByRole('img', { name: 'Decision pending' })).toBeVisible()

  // Play mission 2 out so the banked honors token can be spent.
  await page.locator('.misfortune').getByRole('button', { name: 'Opt out' }).click()
  await page.getByRole('button', { name: 'Deal the pacts' }).click()
  await page.locator('.pact:not([disabled])').first().click()
  await page.getByRole('button', { name: 'Lock in & dive' }).click()
  await page.getByRole('button', { name: 'Mission complete' }).click()
  await page.getByRole('button', { name: 'File report' }).click()

  // Banning is a separate flow alongside reroll, and it forfeits the reward
  // pick: the landed pods become the purge selector, so select a pod, hold to
  // confirm, and the draft resolves with no reward.
  await expect(page.locator('.token-bar').getByRole('img', { name: /1 of 3 reward tokens/ })).toBeVisible()
  await page.getByRole('button', { name: 'Ban items' }).click()
  await expect(page.getByText('Select items above')).toBeVisible()
  await expect(page.locator('.cabinet .pod-card').first()).toBeVisible()
  await page.locator('.cabinet .pod-card .pod-hit').first().click()
  await expect(page.locator('.cabinet .pod-card.picked')).toHaveCount(1)
  const banConfirm = page.getByRole('button', { name: /forfeit this pick/ })
  await banConfirm.hover()
  await page.mouse.down()
  await page.waitForTimeout(1000)
  await page.mouse.up()
  await expect(page.getByText('Rewards banned')).toBeVisible()

  // Honors aren't due on mission 2 (the solo cadence is every third mission), so
  // the settlement opens with the honors panel disabled and the host can advance.
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByRole('region', { name: 'Squad honors unavailable' })).toBeVisible()
  await page.getByRole('button', { name: /Complete operation/ }).click()
})

test('a live Major Order renders the panel, pins the front, and tags the card', async ({ page }) => {
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
        planets: [{ index: 198, name: 'Marfark', front: 'automatons', liberation: 89.7 }],
        expiresAt: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
      },
    }),
  }))

  await page.goto('/')
  await page.getByLabel('Diver name').fill('Griffon')
  await page.getByRole('button', { name: 'Solo drop' }).click()
  await dismissWarbondIntro(page)

  // The in-game-style panel renders in the faction card's pre-roll slot.
  await expect(page.getByRole('heading', { name: 'Major Order' })).toBeVisible()
  await expect(page.getByText('Marfark')).toBeVisible()
  await page.getByRole('button', { name: /Play this order/ }).click()
  // Chosen, the order collapses to a pinned strip — the details don't come back.
  await expect(page.getByText(/major order run/i)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Major Order' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Change' })).toBeVisible()

  await page.getByRole('button', { name: 'Spin', exact: true }).click()
  const frontCard = page.locator('.front-card')
  await expect(frontCard.getByText('Automatons')).toBeVisible()
  // A live order tags the front card for the operation.
  await expect(frontCard.getByText(/Major Order/)).toBeVisible()
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
  await page.getByLabel('Diver name').fill('Griffon')
  // The band's CTA starts the campaign with the order already committed.
  await page.locator('.mo-start').click()

  await expect(page).toHaveURL(/\/dive\/[0-9a-f-]{36}/)
  await dismissWarbondIntro(page)
  // Pre-seeded: the picker opens collapsed to the pinned strip, no second pick.
  await expect(page.getByRole('heading', { name: 'Major Order' })).toHaveCount(0)
  await expect(page.getByText(/major order run/i)).toBeVisible()

  await page.getByRole('button', { name: 'Spin', exact: true }).click()
  const frontCard = page.locator('.front-card')
  await expect(frontCard.getByText('Automatons')).toBeVisible()
  await expect(frontCard.getByText(/Major Order/)).toBeVisible()
})

test('a manual faction pick pins the front without a Major Order tag', async ({ page }) => {
  // Force the no-order state so the manual prompt is deterministic.
  await page.route('**/api/war/major-order', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ status: 'none', order: null }),
  }))

  await page.goto('/')
  await page.getByLabel('Diver name').fill('Griffon')
  await page.getByRole('button', { name: 'Solo drop' }).click()
  await dismissWarbondIntro(page)

  await expect(page.getByText(/No active Major Order/)).toBeVisible()
  const picker = page.getByRole('group', { name: 'Major Order front' })
  await picker.getByRole('button', { name: 'Automatons', exact: true }).click()
  await expect(page.getByText(/major order run/i)).toBeVisible()

  await page.getByRole('button', { name: 'Spin', exact: true }).click()
  const frontCard = page.locator('.front-card')
  await expect(frontCard.getByText('Automatons')).toBeVisible()
  // Manual picks carry no carrot, so no Major Order tag.
  await expect(frontCard.getByText(/Major Order/)).toHaveCount(0)
})

test('a failed mission labels the operation failed and removes an earned item', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Diver name').fill('Griffon')
  await page.getByRole('button', { name: 'Solo drop' }).click()
  await dismissWarbondIntro(page)

  await page.getByRole('button', { name: 'Spin', exact: true }).click()
  await lockMisfortune(page)
  await page.locator('.strain').getByRole('button', { name: 'Opt out' }).click()
  await page.getByRole('button', { name: 'Deal the pacts' }).click()
  await page.locator('.pact:not([disabled])').first().click()
  await page.getByRole('button', { name: 'Lock in & dive' }).click()

  // Failure only takes earned gear, so clear mission 1 and bank a reward first.
  await page.getByRole('button', { name: 'Mission complete' }).click()
  await page.getByRole('button', { name: 'File report' }).click()
  await page.locator('.pod-card .pod-hit').first().click()
  await page.getByRole('button', { name: 'Squad Honors' }).click()
  await page.getByRole('button', { name: 'Spin the honors stat' }).click()
  await page.getByRole('button', { name: /Next mission/ }).click()

  await page.getByRole('button', { name: 'Spin', exact: true }).click()
  await page.locator('.misfortune').getByRole('button', { name: 'Opt out' }).click()
  await page.getByRole('button', { name: 'Deal the pacts' }).click()
  await page.locator('.pact:not([disabled])').first().click()
  await page.getByRole('button', { name: 'Lock in & dive' }).click()
  await page.getByRole('button', { name: 'Mission failed' }).click()
  await page.getByRole('button', { name: 'File failure' }).click()

  // The header track reads the failed mission, not a stale live index.
  await expect(page.getByRole('img', { name: /Operation failed/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Mission failed' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Choose an item to remove' })).toBeVisible()

  // Pick one item from the dealt offer, then hold to confirm — once every diver
  // has chosen the forfeit restarts the operation at mission 1.
  await page.locator('.sur-tile:not([disabled])').first().click()
  const remove = page.getByRole('button', { name: /Remove the selected item/ })
  await remove.hover()
  await page.mouse.down()
  await page.waitForTimeout(900)
  await page.mouse.up()
  await expect(page.getByRole('img', { name: /operation mission 1 of 2/i })).toBeVisible()
})
