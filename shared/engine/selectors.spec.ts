import { describe, expect, it } from 'vitest'
import { WARBONDS } from '../data/catalog'
import { oddsToReach } from './rewards'
import { createDiveState, reduce } from './reducer'
import { activeMisfortune, ceilingRange, diverOptions, misfortuneDecision, pactOfferFor, rewardPoolFor, teamRiskOf } from './selectors'
import { isPactSelectable } from './pacts'
import type { DiverState, RewardTier } from './types'

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

  it('luck prices the tier climb, difficulty sets the floor', () => {
    // Zero luck: the base tier is the whole story.
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
