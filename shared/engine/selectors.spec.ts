import { describe, expect, it } from 'vitest'
import { WARBONDS } from '../data/catalog'
import { oddsToReach } from './rewards'
import { createDiveState, reduce } from './reducer'
import { activeMisfortune, ceilingRange, diverOptions, rewardPoolFor, teamRiskOf } from './selectors'
import type { DiverState, RewardTier } from './types'

function spunState(seed = 42, accepted = false) {
  const spun = reduce(createDiveState(
    { variant: 'standard', ownedWarbondCodes: WARBONDS.map(warbond => warbond.code) },
    'host',
    'Griffin',
  ), { type: 'SPIN_WHEEL', seed })
  return accepted
    ? reduce(spun, { type: 'ACCEPT_MISFORTUNE', accepted: true })
    : spun
}

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
    let state = createDiveState(
      { variant: 'standard', ownedWarbondCodes: WARBONDS.map(warbond => warbond.code) },
      'host',
      'Griffin',
    )
    state = reduce(state, { type: 'SPIN_WHEEL', seed: 1234 })
    state = reduce(state, { type: 'SET_PACTS', playerId: 'host', pactIds: [] })
    state = reduce(state, { type: 'REPORT_RESULT', outcome: 'success', stars: 5 })
    const diver = state.divers.find((candidate): candidate is DiverState => candidate.id === 'host')!
    const options = diverOptions(state, diver)
    expect(options.length).toBeGreaterThan(0)
    for (const option of options) {
      expect(option.item.category).not.toBe('armor')
    }
  })
})
