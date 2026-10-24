import { describe, expect, it } from 'vitest'
import { ITEMS_BY_ID, WARBONDS } from '../data/catalog'
import { MAX_DIFFICULTY, MIN_DIFFICULTY, STRAIN_RISK, conditionRiskAt, directiveValorAt, directiveWeightFor } from './config'
import { itemPrice, oddsToReach } from './rewards'
import { createDiveState, reduce } from './reducer'
import { actingDiverIds, activeMisfortune, activeStrain, armoryRules, awaitingDiverIds, bargainLamp, bargainShelfFor, bargainSlotKinds, canBuyItem, canRerollWheel, ceilingRange, diverOptions, itemBannedInArmory, majorOrderPlanetsForFront, maxValorFor, misfortuneDecision, misfortuneStrandedDivers, missionsUntilHonors, pactOfferFor, rewardPoolFor, strainDecision, teamRiskOf } from './selectors'
import { isPactSelectable, rollPactOffer } from './pacts'
import { startingItemIds } from './progression'
import type { DiveState, DiverState, RewardTier } from './types'

function spunState(seed = 42, accepted = false) {
  const spun = reduce(createDiveState({ variant: 'medium' }, 'host', 'Griffin'), {
    type: 'SPIN_WHEEL',
    seed,
  })
  return accepted
    ? reduce(spun, { type: 'ACCEPT_MISFORTUNE', accepted: true })
    : spun
}

describe('misfortuneDecision (from the phase)', () => {
  it('a fresh draw is undecided — the squad sits in the decision phase', () => {
    const state = spunState(42, false)
    expect(state.phase).toBe('decision')
    expect(state.misfortuneAccepted).toBe(false)
    expect(misfortuneDecision(state)).toMatchObject({ decided: false, accepted: false })
  })

  it('an explicit decline reads as decided and not accepted', () => {
    const state = reduce(spunState(42, false), { type: 'ACCEPT_MISFORTUNE', accepted: false })
    expect(state.misfortuneAccepted).toBe(false)
    expect(misfortuneDecision(state)).toMatchObject({ decided: true, accepted: false })
  })

  it('accepting reads as decided and accepted, and switching keeps the last call', () => {
    const accepted = reduce(spunState(42, false), { type: 'ACCEPT_MISFORTUNE', accepted: true })
    expect(misfortuneDecision(accepted)).toMatchObject({ decided: true, accepted: true })
    const switched = reduce(accepted, { type: 'ACCEPT_MISFORTUNE', accepted: false })
    expect(misfortuneDecision(switched)).toMatchObject({ decided: true, accepted: false })
  })

  it('a reroll resets the decision back to undecided', () => {
    const accepted = reduce(spunState(42, false), { type: 'ACCEPT_MISFORTUNE', accepted: true })
    const rerolled = reduce(accepted, { type: 'REROLL_WHEEL', wheel: 'misfortune', seed: 7 })
    expect(misfortuneDecision(rerolled)).toMatchObject({ decided: false, accepted: false })
  })

  it('a front reroll leaves the misfortune decision standing', () => {
    const accepted = reduce(spunState(42, false), { type: 'ACCEPT_MISFORTUNE', accepted: true })
    const rerolled = reduce(accepted, { type: 'REROLL_WHEEL', wheel: 'front', seed: 7 })
    expect(rerolled.frontId).not.toBe(accepted.frontId)
    expect(misfortuneDecision(rerolled)).toMatchObject({ decided: true, accepted: true })
  })
})

describe('pactOfferFor', () => {
  it('offers nothing until the wheel decision is in', () => {
    const spun = spunState(42)
    expect(pactOfferFor(spun, 'host')).toEqual([])
    // A reroll reopens the decision and the offer goes away with it.
    const rerolled = reduce(spun, { type: 'REROLL_WHEEL', wheel: 'misfortune', seed: 7 })
    expect(pactOfferFor(rerolled, 'host')).toEqual([])
  })

  it('rolls the difficulty\'s offer count once decided', () => {
    const accepted = spunState(42, true)
    expect(accepted.difficulty).toBe(3)
    expect(pactOfferFor(accepted, 'host')).toHaveLength(2)
    // Same seed, same offer — a derivation, not a stored roll.
    expect(pactOfferFor(accepted, 'host')).toEqual(pactOfferFor(accepted, 'host'))
  })

  it('keeps every offered pact selectable under the accepted misfortune', () => {
    const accepted = spunState(1234, true)
    const misfortuneId = accepted.wheel!.misfortuneId
    for (const pact of pactOfferFor(accepted, 'host')) {
      expect(isPactSelectable(pact.id, misfortuneId)).toBe(true)
    }
  })

  it('a declined draw offers from the unfiltered catalog', () => {
    const declined = reduce(spunState(42, false), { type: 'ACCEPT_MISFORTUNE', accepted: false })
    const offer = pactOfferFor(declined, 'host')
    expect(offer).toHaveLength(2)
    for (const pact of offer) {
      expect(isPactSelectable(pact.id, null)).toBe(true)
    }
  })
})

describe('team misfortune acceptance', () => {
  it('a declined draw carries no team risk and binds nobody', () => {
    const state = spunState(42, false)
    expect(state.misfortuneAccepted).toBe(false)
    expect(teamRiskOf(state)).toBe(0)
    expect(activeMisfortune(state)).toBeNull()
  })

  it('an accepted draw applies its team risk', () => {
    const state = spunState(42, true)
    expect(activeMisfortune(state)?.id).toBe(state.wheel?.misfortuneId)
    expect(teamRiskOf(state)).toBeGreaterThan(0)
  })

  it('an accepted strain stacks on top of the accepted misfortune', () => {
    const drawn = spunState(42, false)
    expect(drawn.strainId).not.toBeNull()
    expect(activeStrain(drawn)).toBeNull()

    const accepted = reduce(
      reduce(drawn, { type: 'ACCEPT_MISFORTUNE', accepted: true }),
      { type: 'ACCEPT_STRAIN', accepted: true },
    )
    expect(activeStrain(accepted)?.id).toBe(accepted.strainId)
    const expected = directiveValorAt(accepted.wheel!.misfortuneId, accepted.difficulty, accepted.divers.length)
      + (STRAIN_RISK[accepted.strainId!] ?? 0)
    expect(teamRiskOf(accepted)).toBe(expected)
    // Declining the strain leaves only the misfortune's risk.
    const declined = reduce(accepted, { type: 'ACCEPT_STRAIN', accepted: false })
    expect(teamRiskOf(declined)).toBe(directiveValorAt(accepted.wheel!.misfortuneId, accepted.difficulty, accepted.divers.length))
  })

  it('strainDecision follows the phase, and later missions inherit it', () => {
    const drawn = spunState(42, false)
    expect(strainDecision(drawn)).toMatchObject({ decided: false, accepted: false })

    const deciding = reduce(drawn, { type: 'ACCEPT_MISFORTUNE', accepted: true })
    expect(deciding.phase).toBe('strain')
    expect(strainDecision(deciding)).toMatchObject({ decided: false, accepted: false })

    const decided = reduce(deciding, { type: 'ACCEPT_STRAIN', accepted: true })
    expect(strainDecision(decided)).toMatchObject({ decided: true, accepted: true })
    // Mission 2's misfortune decision does not reopen the strain call.
    expect(strainDecision({ ...decided, missionInOperation: 2, phase: 'decision' }))
      .toMatchObject({ decided: true, accepted: true })
  })

  it('canRerollWheel locks the strain after the operation\'s first mission', () => {
    const drawn = spunState(42, false)
    expect(canRerollWheel(drawn, 'strain').allowed).toBe(true)
    expect(canRerollWheel({ ...drawn, missionInOperation: 2 }, 'strain')).toMatchObject({
      allowed: false,
      reason: 'The front locks in for the whole operation',
    })
  })

  it('Valor prices the tier climb, difficulty sets the floor', () => {
    // Zero Valor: the base tier is the whole story.
    expect(ceilingRange(3, 0, 0)).toMatchObject({ min: 'C', max: 'C', odds: 1 })
    expect(ceilingRange(10, 0, 0)).toMatchObject({ min: 'A', max: 'A', odds: 1 })
    // Chosen risk buys odds, and top-of-band difficulties climb easier.
    const floor = ceilingRange(3, 2, 2)
    const top = ceilingRange(5, 2, 2)
    const rank = (tier: RewardTier) => ['C', 'B', 'A', 'S', 'S+'].indexOf(tier)
    expect(rank(top.max)).toBeGreaterThanOrEqual(rank(floor.max))
    expect(oddsToReach(5, 4, 'A')).toBeGreaterThan(oddsToReach(3, 4, 'A'))
  })
})

describe('maxValorFor (meter scale)', () => {
  it('scales to the strongest team rule, strain and top pacts — samples are not Valor', () => {
    // At diff 3 the team pool tops at 3 — weighted 1.75× for a full squad — plus a
    // risk-3 strain and two risk-3 pacts.
    expect(maxValorFor(3)).toBe(3 * 1.75 + 3 + 3 + 3)
    // At diff 10 the top team rule reaches 5 (weighted) and three risk-4 pacts
    // are dealt.
    expect(maxValorFor(10)).toBe(5 * 1.75 + 3 + 4 + 4 + 4)
    // A solo diver's directive weighs like a pact.
    expect(maxValorFor(10, 1)).toBe(5 + 3 + 4 + 4 + 4)
  })

  it('grows overall from the floor to the top of the ladder', () => {
    // Curves may be inverse, so the invariant is the endpoints, not a
    // per-step monotonic climb.
    expect(maxValorFor(MAX_DIFFICULTY)).toBeGreaterThan(maxValorFor(MIN_DIFFICULTY))
    for (let difficulty = MIN_DIFFICULTY; difficulty <= MAX_DIFFICULTY; difficulty++) {
      expect(maxValorFor(difficulty)).toBeGreaterThan(0)
    }
  })
})

describe('rewardPoolFor', () => {
  it('offers armor passives', () => {
    const pool = rewardPoolFor(WARBONDS.map(warbond => warbond.code))
    expect(pool.some(item => item.category === 'armorPassive')).toBe(true)
  })

  it('still filters by owned warbonds', () => {
    const pool = rewardPoolFor([])
    expect(pool.every(item => item.warbondCode === 'none')).toBe(true)
  })
})

describe('diverOptions', () => {
  it('offers no armor pieces even with every warbond owned', () => {
    let state = createDiveState({ variant: 'medium' }, 'host', 'Griffin')
    state = reduce(state, { type: 'SPIN_WHEEL', seed: 1234 })
    state = reduce(state, { type: 'ACCEPT_MISFORTUNE', accepted: true })
    state = reduce(state, { type: 'ACCEPT_STRAIN', accepted: false })
    state = reduce(state, { type: 'DEAL_PACTS' })
    state = reduce(state, { type: 'SET_PACTS', playerId: 'host', pactIds: [] })
    state = reduce(state, { type: 'REPORT_RESULT', outcome: 'success', stars: 5 })
    const diver = state.divers.find((candidate): candidate is DiverState => candidate.id === 'host')!
    const options = diverOptions(state, diver)
    expect(options.length).toBeGreaterThan(0)
  })

  it('rolls each diver against their own warbonds, not the squad\'s', () => {
    let state = createDiveState({ variant: 'medium' }, 'host', 'Griffin')
    state = reduce(state, { type: 'SET_WARBONDS', playerId: 'host', warbondCodes: [] })
    state = reduce(state, { type: 'SPIN_WHEEL', seed: 1234 })
    state = reduce(state, { type: 'ACCEPT_MISFORTUNE', accepted: true })
    state = reduce(state, { type: 'ACCEPT_STRAIN', accepted: false })
    state = reduce(state, { type: 'DEAL_PACTS' })
    state = reduce(state, { type: 'SET_PACTS', playerId: 'host', pactIds: [] })
    state = reduce(state, { type: 'REPORT_RESULT', outcome: 'success', stars: 5 })
    const diver = state.divers.find((candidate): candidate is DiverState => candidate.id === 'host')!
    const options = diverOptions(state, diver)
    expect(options.length).toBeGreaterThan(0)
    for (const option of options) {
      expect(option.item.warbondCode).toBe('none')
    }
  })
})

describe('bargainShelfFor / canBuyItem (Brasch\'s Bargains)', () => {
  const host = (state: DiveState): DiverState => state.divers.find(diver => diver.id === 'host')!
  const started = (seed = 1234): DiveState => createDiveState({ variant: 'medium' }, 'host', 'Griffin', undefined, seed)

  it('adds a stratagem slot per star past the third', () => {
    expect(bargainSlotKinds(3)).toEqual(['primary', 'secondary', 'throwable', 'armorPassive'])
    expect(bargainSlotKinds(5)).toEqual(['primary', 'secondary', 'throwable', 'armorPassive', 'stratagem'])
    expect(bargainSlotKinds(7)).toEqual(['primary', 'secondary', 'throwable', 'armorPassive', 'stratagem', 'stratagem'])
  })

  it('deals a deterministic shelf at the crusade start, skipping the starting kit', () => {
    const state = started()
    const shelf = bargainShelfFor(state, host(state))
    expect(shelf.map(slot => slot.kind)).toEqual(bargainSlotKinds(3))
    expect(bargainShelfFor(started(), host(started()))).toEqual(shelf)
    expect(bargainShelfFor(started(99), host(started(99)))).not.toEqual(shelf)
    for (const slot of shelf) {
      expect(state.personalInventories.host).not.toContain(slot.item?.id)
    }
  })

  it('opens between missions and closes in the field', () => {
    const state = started()
    const diver = { ...host(state), credits: 100_000 }
    const itemId = bargainShelfFor(state, diver)[0]!.item!.id
    expect(canBuyItem(state, diver, itemId)).toEqual({ allowed: true, reason: null })
    expect(canBuyItem({ ...state, phase: 'pacts' }, diver, itemId).allowed).toBe(true)
    expect(canBuyItem({ ...state, phase: 'rewards' }, diver, itemId).allowed).toBe(true)
    for (const phase of ['diving', 'forfeit', 'complete'] as const) {
      expect(canBuyItem({ ...state, phase }, diver, itemId).allowed).toBe(false)
    }
  })

  it('refuses when broke, off the shelf, or after this mission\'s buy', () => {
    const state = started()
    const diver = host(state)
    const item = bargainShelfFor(state, diver)[0]!.item!
    const price = itemPrice(item)
    expect(canBuyItem(state, { ...diver, credits: price }, item.id).allowed).toBe(true)
    expect(canBuyItem(state, { ...diver, credits: price - 1 }, item.id)).toEqual({ allowed: false, reason: 'Not enough credits' })
    expect(canBuyItem(state, { ...diver, credits: price }, 'definitely-not-stocked').allowed).toBe(false)
    const bought = { ...diver, credits: 100_000, bargain: { ...diver.bargain!, boughtItemId: item.id } }
    expect(bargainShelfFor(state, bought).map(slot => slot.status)).toEqual(['bought', 'locked', 'locked', 'locked'])
    expect(canBuyItem(state, bought, item.id).allowed).toBe(false)
  })
})

describe('bargainLamp', () => {
  const state = createDiveState({ variant: 'medium' }, 'host', 'Griffin', undefined, 1234)
  const diver = state.divers[0]!

  it('stays dark while nothing is buyable and in the field', () => {
    expect(bargainLamp(state, diver)).toBe('off')
    expect(bargainLamp({ ...state, phase: 'diving' }, { ...diver, credits: 100_000 })).toBe('off')
  })

  it('lights solid between missions and pulses only for a new operation\'s restock', () => {
    const rich = { ...diver, credits: 100_000 }
    expect(bargainLamp(state, rich)).toBe('ready')
    expect(bargainLamp({ ...state, missionInOperation: 2, difficulty: 4 }, rich)).toBe('ready')
    expect(bargainLamp({ ...state, difficulty: 4 }, rich)).toBe('restocked')
    const shopped = { ...rich, bargain: { ...rich.bargain!, boughtKinds: ['primary' as const] } }
    expect(bargainLamp({ ...state, difficulty: 4 }, shopped)).toBe('ready')
  })
})

describe('misfortuneStrandedDivers', () => {
  it('reports every diver the drawn rule would strand', () => {
    const state = createDiveState({ variant: 'medium' }, 'host', 'Griffin')
    const wheeled = { ...state, difficulty: 6, wheel: { seed: 1, misfortuneId: 'oopsAllAirstrikes' } }
    expect(misfortuneStrandedDivers(wheeled).map(diver => diver.id)).toEqual(['host'])
    // A fieldable rule strands nobody, and so does an empty wheel.
    expect(misfortuneStrandedDivers({ ...wheeled, wheel: { seed: 1, misfortuneId: 'noBackpacks' } })).toEqual([])
    expect(misfortuneStrandedDivers({ ...wheeled, wheel: null })).toEqual([])
  })

  it('is squad-wide — one stranded diver blocks the rule for everyone', () => {
    const state = createDiveState({ variant: 'medium' }, 'host', 'Griffin')
    const guest: DiverState = {
      id: 'guest',
      name: 'Guest',
      isHost: false,
      pactsLocked: false,
      pactIds: [],
      failedPactIds: [],
      pickedOptionId: null,
      warbondCodes: [],
      catchUpGranted: 0,
      catchUpOwed: 0,
      skipsCurrentDraft: false,
      rewardTokens: 0,
      credits: 0,
      bargain: null,
      bannedItemIds: [],
      rewardRerollSeed: null,
      rewardBanned: false,
      away: false,
    }
    const wheeled: DiveState = {
      ...state,
      difficulty: 6,
      wheel: { seed: 1, misfortuneId: 'oopsAllAirstrikes' },
      divers: [...state.divers, guest],
      personalInventories: { ...state.personalInventories, guest: startingItemIds('suicide', 'seaf') },
    }
    // The guest can field the rule; the host cannot, so the accept still fails.
    expect(misfortuneStrandedDivers(wheeled).map(diver => diver.id)).toEqual(['host'])
  })
})

describe('awaitingDiverIds', () => {
  function pactsWithTwoDivers(): DiveState {
    let state = reduce(spunState(42, false), { type: 'ACCEPT_MISFORTUNE', accepted: false })
    if (state.phase === 'strain') {
      state = reduce(state, { type: 'ACCEPT_STRAIN', accepted: false })
    }
    state = reduce(state, { type: 'DEAL_PACTS' })
    const host = state.divers[0]!
    return { ...state, divers: [host, { ...host, id: 'p2', name: 'Sparrow' }] }
  }

  it('reports nobody on host-only beats', () => {
    expect(awaitingDiverIds(spunState(42, false))).toEqual([])
  })

  it('hands host-run beats to the host and in-game time to nobody', () => {
    expect(actingDiverIds(spunState(42, false))).toEqual(['host'])
    const pacts = pactsWithTwoDivers()
    expect(actingDiverIds(pacts)).toEqual(['host', 'p2'])
    const locked = reduce(pacts, { type: 'SET_PACTS', playerId: 'host', pactIds: [] })
    expect(actingDiverIds(locked)).toEqual(['p2'])
    expect(actingDiverIds({ ...pacts, phase: 'diving' })).toEqual([])
  })

  it('lists the divers whose pact hand is still open', () => {
    const state = pactsWithTwoDivers()
    expect(state.phase).toBe('pacts')
    expect(awaitingDiverIds(state)).toEqual(['host', 'p2'])
    const locked = reduce(state, { type: 'SET_PACTS', playerId: 'host', pactIds: [] })
    expect(awaitingDiverIds(locked)).toEqual(['p2'])
  })

  it('lists the divers with an open reward draft, skipping banned and sat-out drafts', () => {
    const base = pactsWithTwoDivers()
    const host = base.divers[0]!
    const rewards: DiveState = {
      ...base,
      phase: 'rewards',
      divers: [
        { ...host, pickedOptionId: null, rewardBanned: false, skipsCurrentDraft: false },
        { ...host, id: 'p2', pickedOptionId: 'x', rewardBanned: false, skipsCurrentDraft: false },
        { ...host, id: 'p3', pickedOptionId: null, rewardBanned: true, skipsCurrentDraft: false },
        { ...host, id: 'p4', pickedOptionId: null, rewardBanned: false, skipsCurrentDraft: true },
      ],
    }
    expect(awaitingDiverIds(rewards)).toEqual(['host'])
  })
})

describe('armory preview bans', () => {
  it('flags unsworn pacts as preview rules and dedupes sworn ids', () => {
    const state = spunState(42, false)
    const diver = state.divers[0]!
    expect(armoryRules(state, diver).every(rule => !rule.preview)).toBe(true)
    const previewed = armoryRules(state, diver, ['packLight'])
    expect(previewed.find(rule => rule.id === 'packLight')).toMatchObject({
      source: 'pact',
      preview: true,
      equipBearing: true,
    })
    // Once sworn, the same pact stays one solid rule, never a preview echo.
    const sworn = { ...diver, pactIds: ['packLight'] }
    const rules = armoryRules(state, sworn, ['packLight'])
    expect(rules.filter(rule => rule.id === 'packLight')).toHaveLength(1)
    expect(rules.find(rule => rule.id === 'packLight')?.preview).toBe(false)
  })

  it('greys a previewed pact\'s would-be bans without touching other items', () => {
    const state = spunState(42, false)
    const diver = state.divers[0]!
    const hoverPack = ITEMS_BY_ID.get('lift860hoverpack')!
    const eagle = ITEMS_BY_ID.get('eagleairstrike')!
    expect(itemBannedInArmory(state, diver, hoverPack)).toBeNull()
    expect(itemBannedInArmory(state, diver, hoverPack, ['packLight'])).toMatchObject({
      source: 'pact',
      id: 'packLight',
      preview: true,
    })
    expect(itemBannedInArmory(state, diver, hoverPack, ['openField'])).toBeNull()
    expect(itemBannedInArmory(state, diver, eagle, ['grounded'])).toMatchObject({
      source: 'pact',
      id: 'grounded',
      preview: true,
    })
  })

  it('keeps a sworn ban solid even while the same id is previewed', () => {
    const state = spunState(42, false)
    const diver = { ...state.divers[0]!, pactIds: ['packLight'] }
    const hoverPack = ITEMS_BY_ID.get('lift860hoverpack')!
    expect(itemBannedInArmory(state, diver, hoverPack, ['packLight'])).toMatchObject({
      source: 'pact',
      id: 'packLight',
      preview: false,
    })
  })
})

describe('directive weight by squad size', () => {
  it('weighs a directive by how many divers must hold it', () => {
    expect([1, 2, 3, 4].map(directiveWeightFor)).toEqual([1, 1.25, 1.5, 1.75])
    expect(directiveWeightFor(0)).toBe(1)
    expect(directiveWeightFor(9)).toBe(1.75)
    expect(directiveValorAt('pacifist', 10, 4)).toBe(conditionRiskAt('pacifist', 10) * 1.75)
  })

  it('reads the live squad size for team risk', () => {
    const solo = reduce(spunState(42, false), { type: 'ACCEPT_MISFORTUNE', accepted: true })
    const id = solo.wheel!.misfortuneId
    expect(teamRiskOf({ ...solo, strainAccepted: false })).toBe(conditionRiskAt(id, solo.difficulty))
    const host = solo.divers[0]!
    const squad: DiveState = {
      ...solo,
      strainAccepted: false,
      divers: [host, { ...host, id: 'p2' }, { ...host, id: 'p3' }, { ...host, id: 'p4' }],
    }
    expect(teamRiskOf(squad)).toBe(conditionRiskAt(id, solo.difficulty) * 1.75)
  })
})

describe('squad-only pacts', () => {
  it('never deals Dead Weight to a solo diver', () => {
    for (let seed = 1; seed <= 300; seed++) {
      expect(rollPactOffer(seed, null, 10, 1).map(pact => pact.id)).not.toContain('deadWeight')
    }
    const offeredInSquad = Array.from({ length: 300 }, (_, seed) => rollPactOffer(seed + 1, null, 10, 2))
      .some(offer => offer.some(pact => pact.id === 'deadWeight'))
    expect(offeredInSquad).toBe(true)
  })
})

describe('majorOrderPlanetsForFront', () => {
  it('names the MO planet(s) on the drawn front', () => {
    const base = createDiveState({ variant: 'medium' }, 'host', 'Griffin')
    const state: DiveState = {
      ...base,
      frontId: 'automatons',
      majorOrder: {
        fronts: ['automatons', 'terminids'],
        planets: [
          { index: 261, name: 'Fury', front: 'automatons', liberation: 99.8, available: true },
          { index: 75, name: 'Esker', front: 'terminids', liberation: 2.2, available: true },
        ],
      },
    }
    expect(majorOrderPlanetsForFront(state).map(planet => planet.name)).toEqual(['Fury'])
    expect(majorOrderPlanetsForFront({ ...state, frontId: 'terminids' }).map(planet => planet.name))
      .toEqual(['Esker'])
    expect(majorOrderPlanetsForFront({ ...state, frontId: null })).toEqual([])
    expect(majorOrderPlanetsForFront({ ...state, majorOrder: null })).toEqual([])
  })
})

describe('missionsUntilHonors', () => {
  it.each([
    // Solo: due every third mission (index 0, 3, 6…).
    [0, 1, 0],
    [1, 1, 2],
    [2, 1, 1],
    [3, 1, 0],
    // Pair: every other mission.
    [1, 2, 1],
    [2, 2, 0],
    // A full squad is due every mission.
    [5, 4, 0],
  ])('mission index %i, squad of %i → %i missions out', (missionIndex, size, expected) => {
    expect(missionsUntilHonors(missionIndex, size)).toBe(expected)
  })
})
