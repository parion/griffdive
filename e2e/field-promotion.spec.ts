import { expect, test, type Page } from '@playwright/test'
import { createDiveState, reduce } from '../shared/engine/reducer'
import { joinDiver } from '../shared/engine/room'
import { createSaveDoc } from '../shared/engine/saves'
import type { DiveState } from '../shared/engine/types'
import { expectJoinerLanded } from './helpers'

// A crusade one operation up (difficulty 4 on the medium start) whose two
// other divers each earned gear — forked into a new session by its host, so
// both wait as fallen divers' kits. One room serves the whole flow: room
// creation is rate-limited per address and the suite shares one.
function climbedSave(): unknown {
  let state: DiveState = createDiveState({ variant: 'medium' }, 'host-seat', 'Host')
  state = joinDiver(state, 'fallen-seat', 'Fallen')!
  state = joinDiver(state, 'other-seat', 'Other')!
  state = reduce(state, { type: 'SPIN_WHEEL', seed: 42 })
  state = {
    ...state,
    difficulty: 4,
    phase: 'spin',
    wheel: null,
    personalInventories: {
      ...state.personalInventories,
      'fallen-seat': [...state.personalInventories['fallen-seat']!, 'orbitallaser'],
      'other-seat': [...state.personalInventories['other-seat']!, 'uavrecon'],
    },
  }
  return { ...createSaveDoc(state, 'Climbed', new Date().toISOString()), roomCode: 'SOURCE', ownerId: 'host-seat' }
}

async function joinAs(page: Page, code: string, name: string): Promise<void> {
  await page.goto(`/dive/${code}`)
  await page.getByLabel('Your name').fill(name)
  await page.getByRole('button', { name: 'Join the dive' }).click()
  await expectJoinerLanded(page)
}

test('joiners settle their Field Promotion before they dive; a forked-out diver reclaims their kit', async ({ browser }) => {
  const returning = await browser.newContext()
  // This browser still remembers the seat it held in the source room.
  await returning.addInitScript(() => {
    localStorage.setItem('griffdive:player:SOURCE', 'fallen-seat')
  })
  const claimer = await browser.newContext()
  const picker = await browser.newContext()
  const pageR = await returning.newPage()
  const pageC = await claimer.newPage()
  const pageP = await picker.newPage()

  const response = await pageR.request.post('/api/rooms', { data: { save: climbedSave(), name: 'Host' } })
  expect(response.ok()).toBe(true)
  const { code } = await response.json() as { code: string }

  // The returning diver is recognized: their own kit, no promotion to settle.
  await joinAs(pageR, code, 'Fallen')
  await expect(pageR.getByText('(you)')).toBeVisible()
  await expect(pageR.getByRole('dialog', { name: 'Field Promotion' })).toHaveCount(0)

  // A new joiner is held at the gate and claims the one kit left.
  await joinAs(pageC, code, 'Claimer')
  const gate = pageC.getByRole('dialog', { name: 'Field Promotion' })
  await expect(gate).toBeVisible()
  await expect(gate.getByRole('button', { name: /^Claim .+'s kit/ })).toHaveCount(1)
  await gate.getByRole('button', { name: /^Claim Other's kit: UAV Recon/ }).click()
  await expect(gate).toBeHidden()
  await expect(pageC.getByRole('heading', { name: 'Wheel of Adversity' })).toBeVisible()

  // No kits remain, so the next joiner takes their one promotion pick.
  await joinAs(pageP, code, 'Picker')
  const gateP = pageP.getByRole('dialog', { name: 'Field Promotion' })
  await expect(gateP).toBeVisible()
  await expect(gateP.getByRole('button', { name: /^Claim .+'s kit/ })).toHaveCount(0)
  await expect(gateP.getByText('No kits on the field')).toBeVisible()
  await gateP.getByRole('button', { name: /^Promotion picks/ }).click()
  await gateP.getByRole('button', { name: /^Claim .+ tier/ }).first().click()
  await expect(gateP).toBeHidden()
  await expect(pageR.locator('.diver-chip')).toHaveCount(4)

  await returning.close()
  await claimer.close()
  await picker.close()
})
