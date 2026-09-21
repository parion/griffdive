import { describe, expect, it } from 'vitest'
import { MAX_DIFFICULTY, MIN_DIFFICULTY, S_PLUS_OVERFLOW_CAP, S_PLUS_UNLOCK_DIFFICULTY, S_PLUS_UPGRADE_CAP, VALOR_METER_MAX } from './config'
import { oddsToReach, rollCeiling } from './rewards'
import { mulberry32 } from './rng'
import type { RewardTier } from './types'

// Max chosen Valor = the strongest accepted misfortune (5) + every playable pact (8),
// so 13 is the ceiling the QA session tested at altitude.
const MAX_VALOR = 13
const LADDER: readonly RewardTier[] = ['C', 'B', 'A', 'S', 'S+']

function rank(tier: RewardTier): number {
  return LADDER.indexOf(tier)
}

function empiricalShare(difficulty: number, valor: number, tier: RewardTier, trials: number): number {
  let hits = 0
  for (let seed = 0; seed < trials; seed++) {
    if (rank(rollCeiling(mulberry32(seed), difficulty, valor)) >= rank(tier)) {
      hits++
    }
  }
  return hits / trials
}

describe('S+ (Diver\'s Choice) rarity', () => {
  it('scales S+ up with difficulty, from the super-sample bands to altitude', () => {
    // The Cross becomes a real chase where supers appear (diff 6) and keeps
    // climbing: strictly more attainable at each step up the ladder.
    let previous = 0
    for (let difficulty = S_PLUS_UNLOCK_DIFFICULTY; difficulty <= MAX_DIFFICULTY; difficulty++) {
      const odds = oddsToReach(difficulty, VALOR_METER_MAX, 'S+')
      expect(odds).toBeGreaterThan(previous)
      previous = odds
    }
  })

  it('keeps S+ under the overflow ceiling at the meter top', () => {
    for (let difficulty = MIN_DIFFICULTY; difficulty <= MAX_DIFFICULTY; difficulty++) {
      expect(oddsToReach(difficulty, VALOR_METER_MAX, 'S+')).toBeLessThanOrEqual(S_PLUS_OVERFLOW_CAP)
    }
  })

  it('lets overflow Luck lift the jackpot without handing it out', () => {
    // Overstacking past the meter's top is the point: max Valor (13) is over
    // the 11 cap, so it buys extra S+ odds — still under the overflow ceiling.
    expect(oddsToReach(MAX_DIFFICULTY, MAX_VALOR, 'S+'))
      .toBeGreaterThan(oddsToReach(MAX_DIFFICULTY, VALOR_METER_MAX, 'S+'))
    expect(oddsToReach(MAX_DIFFICULTY, MAX_VALOR, 'S+')).toBeLessThanOrEqual(S_PLUS_OVERFLOW_CAP)
  })

  it('stays reachable at altitude, so the jackpot is real', () => {
    expect(oddsToReach(MAX_DIFFICULTY, MAX_VALOR, 'S+')).toBeGreaterThan(0.01)
    expect(empiricalShare(MAX_DIFFICULTY, MAX_VALOR, 'S+', 4000)).toBeGreaterThan(0.01)
  })

  it('rolls S+ in line with the preview odds', () => {
    // The roll, the preview and the priced climb share one step-odds function,
    // so the empirical rate must track oddsToReach.
    const odds = oddsToReach(MAX_DIFFICULTY, MAX_VALOR, 'S+')
    const share = empiricalShare(MAX_DIFFICULTY, MAX_VALOR, 'S+', 4000)
    expect(Math.abs(share - odds)).toBeLessThan(0.02)
  })

  it('prices the S+ rung well below the rest of the ladder', () => {
    expect(S_PLUS_UPGRADE_CAP).toBeLessThanOrEqual(0.1)
    expect(oddsToReach(MAX_DIFFICULTY, MAX_VALOR, 'S'))
      .toBeGreaterThan(oddsToReach(MAX_DIFFICULTY, MAX_VALOR, 'S+') * 4)
  })
})
