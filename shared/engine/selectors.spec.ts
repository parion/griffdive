import { describe, expect, it } from 'vitest'
import { WARBONDS } from '../data/catalog'
import { MAX_DIFFICULTY, MIN_DIFFICULTY, MISFORTUNE_RISK, SAMPLE_VALOR_CAP, STRAIN_RISK, TIME_VALOR_MAX } from './config'
import { oddsToReach } from './rewards'
import { createDiveState, reduce } from './reducer'
import { activeMisfortune, activeStrain, canRerollWheel, ceilingRange, diverOptions, maxValorFor, misfortuneDecision, misfortuneStrandedDivers, pactOfferFor, rewardPoolFor, strainDecision, teamRiskOf } from './selectors'
import { isPactSelectable } from './pacts'
import { startingItemIds } from './progression'
import type { DiveState, DiverState, RewardTier } from './types'

function spunState(seed = 42, accepted = false) {
  const spun = reduce(createDiveState({ variant: 'standard' }, 'host', 'Griffin'), {
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
    const expected = (MISFORTUNE_RISK[accepted.wheel!.misfortuneId] ?? 0)
      + (STRAIN_RISK[accepted.strainId!] ?? 0)
    expect(teamRiskOf(accepted)).toBe(expected)
    // Declining the strain leaves only the misfortune's risk.
    const declined = reduce(accepted, { type: 'ACCEPT_STRAIN', accepted: false })
    expect(teamRiskOf(declined)).toBe(MISFORTUNE_RISK[accepted.wheel!.misfortuneId] ?? 0)
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
  it('scales to the strongest eligible misfortune, strain, top pacts and performance cap', () => {
    // Diff 3's pools top out at noResupplies (4) and a risk-3 strain; two pacts (3+3).
    expect(maxValorFor(3)).toBe(4 + 3 + 3 + 3 + TIME_VALOR_MAX + SAMPLE_VALOR_CAP)
    // Diff 10 adds pacifist (5), a risk-3 strain and a third pact slot (3+3+2).
    expect(maxValorFor(10)).toBe(5 + 3 + 3 + 3 + 2 + TIME_VALOR_MAX + SAMPLE_VALOR_CAP)
  })

  it('never shrinks as difficulty rises', () => {
    for (let difficulty = MIN_DIFFICULTY + 1; difficulty <= MAX_DIFFICULTY; difficulty++) {
      expect(maxValorFor(difficulty)).toBeGreaterThanOrEqual(maxValorFor(difficulty - 1))
    }
  })
})

describe('rewardPoolFor', () => {
  it('never offers armor pieces: rewards are the passives', () => {
    const pool = rewardPoolFor(WARBONDS.map(warbond => warbond.code))
    expect(pool.some(item => item.category === 'armor')).toBe(false)
    expect(pool.some(item => item.category === 'armorPassive')).toBe(true)
  })

  it('still filters by owned warbonds', () => {
    const pool = rewardPoolFor([])
    expect(pool.every(item => item.warbondCode === 'none')).toBe(true)
  })
})

describe('diverOptions', () => {
  it('offers no armor pieces even with every warbond owned', () => {
    let state = createDiveState({ variant: 'standard' }, 'host', 'Griffin')
    state = reduce(state, { type: 'SPIN_WHEEL', seed: 1234 })
    state = reduce(state, { type: 'ACCEPT_MISFORTUNE', accepted: true })
    state = reduce(state, { type: 'ACCEPT_STRAIN', accepted: false })
    state = reduce(state, { type: 'SET_PACTS', playerId: 'host', pactIds: [] })
    state = reduce(state, { type: 'REPORT_RESULT', outcome: 'success', stars: 5 })
    const diver = state.divers.find((candidate): candidate is DiverState => candidate.id === 'host')!
    const options = diverOptions(state, diver)
    expect(options.length).toBeGreaterThan(0)
    for (const option of options) {
      expect(option.item.category).not.toBe('armor')
    }
  })

  it('rolls each diver against their own warbonds, not the squad\'s', () => {
    let state = createDiveState({ variant: 'standard' }, 'host', 'Griffin')
    state = reduce(state, { type: 'SET_WARBONDS', playerId: 'host', warbondCodes: [] })
    state = reduce(state, { type: 'SPIN_WHEEL', seed: 1234 })
    state = reduce(state, { type: 'ACCEPT_MISFORTUNE', accepted: true })
    state = reduce(state, { type: 'ACCEPT_STRAIN', accepted: false })
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

describe('misfortuneStrandedDivers', () => {
  it('reports every diver the drawn rule would strand', () => {
    const state = createDiveState({ variant: 'standard' }, 'host', 'Griffin')
    const wheeled = { ...state, difficulty: 6, wheel: { seed: 1, misfortuneId: 'oopsAllAirstrikes' } }
    expect(misfortuneStrandedDivers(wheeled).map(diver => diver.id)).toEqual(['host'])
    // A fieldable rule strands nobody, and so does an empty wheel.
    expect(misfortuneStrandedDivers({ ...wheeled, wheel: { seed: 1, misfortuneId: 'noBackpacks' } })).toEqual([])
    expect(misfortuneStrandedDivers({ ...wheeled, wheel: null })).toEqual([])
  })

  it('is squad-wide — one stranded diver blocks the rule for everyone', () => {
    const state = createDiveState({ variant: 'standard' }, 'host', 'Griffin')
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
      bannedItemIds: [],
      rewardRerollSeed: null,
      rewardBanned: false,
    }
    const wheeled: DiveState = {
      ...state,
      difficulty: 6,
      wheel: { seed: 1, misfortuneId: 'oopsAllAirstrikes' },
      divers: [...state.divers, guest],
      personalInventories: { ...state.personalInventories, guest: startingItemIds('quickplay') },
    }
    // The guest can field the rule; the host cannot, so the accept still fails.
    expect(misfortuneStrandedDivers(wheeled).map(diver => diver.id)).toEqual(['host'])
  })
})
