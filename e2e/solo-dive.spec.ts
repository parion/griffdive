import { expect, test } from '@playwright/test'
import { dismissWarbondIntro } from './helpers'

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
  await page.locator('.misfortune').getByRole('button', { name: 'Lock it in' }).click()
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

  // The Valor meter reflects the team risk and grows as pacts are added.
  const valor = page.getByRole('progressbar', { name: 'Valor' })
  await expect(valor).toBeVisible()
  const teamValor = Number(await valor.getAttribute('aria-valuenow'))
  await page.locator('.pact:not([disabled])').first().click()
  expect(Number(await valor.getAttribute('aria-valuenow'))).toBeGreaterThan(teamValor)
  await page.getByRole('button', { name: 'Lock in & dive' }).click()

  // The briefing carries the same locked Valor through (QA-U1).
  await expect(page.getByRole('heading', { name: 'Briefing' })).toBeVisible()
  await expect(valor).toBeVisible()

  await page.getByRole('button', { name: 'Mission complete' }).click()
  // The victory banner + big stars, then stepped sample canisters and the
  // click-to-set time bar.
  await expect(page.getByRole('heading', { name: 'Mission complete' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Common: 0 of 18' })).toBeVisible()
  await page.getByRole('button', { name: 'Add a common' }).click()
  await expect(page.getByRole('group', { name: 'Common: 1 of 18' })).toBeVisible()
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

  // Bonus honors is its own screen, reached from the draft's bottom bar: the
  // host spins the stat contest (on click, like the wheel) and banks the
  // winner's token.
  await page.getByRole('button', { name: 'Squad Honors' }).click()
  await expect(page.getByRole('heading', { name: 'Squad Honors' })).toBeVisible()
  // Solo: the only diver is always the winner, so the spin auto-banks the
  // token — no selection step.
  await page.getByRole('button', { name: 'Spin the honors stat' }).click()
  await expect(page.getByText('Token banked')).toBeVisible()

  await page.getByRole('button', { name: /Next mission/ }).click()
  // Medium runs 2-mission operations. The tracker advances to the second
  // segment; the overall mission count lives in its accessible label.
  await expect(page.getByRole('img', { name: /operation mission 2 of 2/i })).toBeVisible()
  await expect(page.locator('.rung[data-state="current"]')).toContainText('Mission 2/2')
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

  await page.getByRole('button', { name: 'Spin', exact: true }).click()
  const frontCard = page.locator('.front-card')
  await expect(frontCard.getByText('Automatons')).toBeVisible()
  // A live order tags the front card for the operation.
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
  await expect(page.getByText('Manual front pick — no reroll bonus.')).toBeVisible()

  await page.getByRole('button', { name: 'Spin', exact: true }).click()
  const frontCard = page.locator('.front-card')
  await expect(frontCard.getByText('Automatons')).toBeVisible()
  // Manual picks carry no carrot, so no Major Order tag.
  await expect(frontCard.getByText(/Major Order/)).toHaveCount(0)
})

test('a failed mission labels the operation failed and restarts it', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Diver name').fill('Griffon')
  await page.getByRole('button', { name: 'Solo drop' }).click()
  await dismissWarbondIntro(page)

  await page.getByRole('button', { name: 'Spin', exact: true }).click()
  await page.locator('.misfortune').getByRole('button', { name: 'Lock it in' }).click()
  await page.locator('.strain').getByRole('button', { name: 'Opt out' }).click()
  await page.getByRole('button', { name: 'Deal the pacts' }).click()
  await page.locator('.pact:not([disabled])').first().click()
  await page.getByRole('button', { name: 'Lock in & dive' }).click()

  await page.getByRole('button', { name: 'Mission failed' }).click()
  await page.getByRole('button', { name: 'File failure' }).click()

  // The header track reads the failed mission, not a stale live index.
  await expect(page.getByRole('img', { name: /Operation failed/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Mission failed' })).toBeVisible()

  // Surrender is a two-step ceremony: pick one item, hold to confirm, then
  // respin the wheel — the forfeit restarts the operation at mission 1.
  await page.locator('.sur-tile:not([disabled])').first().click()
  const surrender = page.getByRole('button', { name: /Surrender the selected item/ })
  await surrender.hover()
  await page.mouse.down()
  await page.waitForTimeout(900)
  await page.mouse.up()
  await page.getByRole('button', { name: 'Respin the wheel' }).click()
  await expect(page.getByRole('img', { name: /operation mission 1 of 2/i })).toBeVisible()
})
