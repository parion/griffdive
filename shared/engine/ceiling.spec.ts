import { describe, expect, it } from 'vitest'
import { MAX_DIFFICULTY, MIN_DIFFICULTY, S_PLUS_UPGRADE_CAP } from './config'
import { oddsToReach, rollCeiling } from './rewards'
import { mulberry32 } from './rng'
import type { RewardTier } from './types'

// Max luck = the strongest accepted misfortune (5) + every playable pact (8),
// so 13 is the ceiling the QA session tested at altitude.
const MAX_LUCK = 13
const LADDER: readonly RewardTier[] = ['C', 'B', 'A', 'S', 'S+']

function rank(tier: RewardTier): number {
  return LADDER.indexOf(tier)
}

function empiricalShare(difficulty: number, luck: number, tier: RewardTier, trials: number): number {
  let hits = 0
  for (let seed = 0; seed < trials; seed++) {
    if (rank(rollCeiling(mulberry32(seed), difficulty, luck)) >= rank(tier)) {
      hits++
    }
  }
  return hits / trials
}

describe('S+ (Diver\'s Choice) rarity', () => {
  it('stays under 10% at max luck on every difficulty', () => {
    for (let difficulty = MIN_DIFFICULTY; difficulty <= MAX_DIFFICULTY; difficulty++) {
      expect(oddsToReach(difficulty, MAX_LUCK, 'S+')).toBeLessThanOrEqual(0.1)
    }
  })

  it('stays reachable at altitude, so the jackpot is real', () => {
    expect(oddsToReach(MAX_DIFFICULTY, MAX_LUCK, 'S+')).toBeGreaterThan(0.01)
    expect(empiricalShare(MAX_DIFFICULTY, MAX_LUCK, 'S+', 4000)).toBeGreaterThan(0.01)
  })

  it('rolls S+ in line with the preview odds', () => {
    // The roll, the preview and the priced climb share one step-odds function,
    // so the empirical rate must track oddsToReach.
    const odds = oddsToReach(MAX_DIFFICULTY, MAX_LUCK, 'S+')
    const share = empiricalShare(MAX_DIFFICULTY, MAX_LUCK, 'S+', 4000)
    expect(Math.abs(share - odds)).toBeLessThan(0.02)
  })

  it('prices the S+ rung well below the rest of the ladder', () => {
    expect(S_PLUS_UPGRADE_CAP).toBeLessThanOrEqual(0.1)
    expect(oddsToReach(MAX_DIFFICULTY, MAX_LUCK, 'S'))
      .toBeGreaterThan(oddsToReach(MAX_DIFFICULTY, MAX_LUCK, 'S+') * 5)
  })
})
