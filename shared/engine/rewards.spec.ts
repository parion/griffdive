import { describe, expect, it } from 'vitest'
import { ALL_ITEMS } from '../data/catalog'
import { luckOf, maxCeiling, oddsToReach, optionsForStars, rollCeiling, rollRewardOptions, tierWeight } from './rewards'
import { mulberry32 } from './rng'
import type { RewardTier } from './types'

describe('luckOf', () => {
  it('adds team and pact risk', () => {
    expect(luckOf(0, 0)).toBe(0)
    expect(luckOf(5, 6)).toBe(11)
  })
})

describe('rollCeiling (probabilistic tier ladder)', () => {
  it('keeps zero luck at the base tier on every difficulty', () => {
    const bases: [number, RewardTier][] = [[3, 'C'], [5, 'C'], [6, 'B'], [7, 'B'], [8, 'A'], [10, 'A']]
    for (const [difficulty, base] of bases) {
      for (let seed = 0; seed < 50; seed++) {
        expect(rollCeiling(mulberry32(seed), difficulty, 0)).toBe(base)
      }
    }
  })

  it('never leaves S/S+ to anything but chosen luck', () => {
    for (let seed = 0; seed < 200; seed++) {
      expect(rollCeiling(mulberry32(seed), 10, 0)).toBe('A')
    }
  })

  it('is monotonic in luck for the same rng seed', () => {
    const rank = (tier: RewardTier) => ['C', 'B', 'A', 'S', 'S+'].indexOf(tier)
    for (let seed = 0; seed < 100; seed++) {
      const weak = rollCeiling(mulberry32(seed), 5, 2)
      const strong = rollCeiling(mulberry32(seed), 5, 11)
      expect(rank(strong)).toBeGreaterThanOrEqual(rank(weak))
    }
  })

  it('stacked luck can reach S and S+ but never guarantees it', () => {
    let sawS = false
    let sawSPlus = false
    let sawBelowS = false
    for (let seed = 0; seed < 400; seed++) {
      const ceiling = rollCeiling(mulberry32(seed), 10, 11)
      sawS = sawS || ceiling === 'S'
      sawSPlus = sawSPlus || ceiling === 'S+'
      sawBelowS = sawBelowS || ceiling === 'A'
    }
    expect(sawS).toBe(true)
    expect(sawSPlus).toBe(true)
    expect(sawBelowS).toBe(true)
  })

  it('rolls higher within a band toward the band top', () => {
    // diff 3 (band floor) vs diff 5 (band top), same luck and seed stream:
    // the top-of-band roll must never be worse.
    const rank = (tier: RewardTier) => ['C', 'B', 'A', 'S', 'S+'].indexOf(tier)
    for (let seed = 0; seed < 200; seed++) {
      const low = rollCeiling(mulberry32(seed), 3, 3)
      const high = rollCeiling(mulberry32(seed), 5, 3)
      expect(rank(high)).toBeGreaterThanOrEqual(rank(low))
    }
  })
})

describe('maxCeiling / oddsToReach (legibility preview)', () => {
  it('previews the base tier at zero luck', () => {
    expect(maxCeiling(3, 0)).toBe('C')
    expect(maxCeiling(10, 0)).toBe('A')
    expect(oddsToReach(10, 0, 'A')).toBe(1)
  })

  it('previews only plausible tiers and prices the climb', () => {
    expect(maxCeiling(3, 11)).toBe('S')
    expect(oddsToReach(3, 11, 'S')).toBeGreaterThan(0)
    expect(oddsToReach(3, 11, 'S')).toBeLessThan(0.5)
    expect(oddsToReach(3, 2, 'B')).toBeLessThan(oddsToReach(5, 2, 'B'))
  })
})

describe('optionsForStars', () => {
  it('follows the stars lookup table', () => {
    expect([0, 1, 2, 3, 4, 5].map(stars => optionsForStars(stars, 'B')))
      .toEqual([1, 1, 2, 2, 3, 4])
  })

  it('grants the S+ bonus option, capped at 5', () => {
    expect(optionsForStars(5, 'S+')).toBe(5)
    expect(optionsForStars(0, 'S+')).toBe(2)
  })

  it('clamps out-of-range stars', () => {
    expect(optionsForStars(99, 'C')).toBe(4)
    expect(optionsForStars(-3, 'C')).toBe(1)
  })
})

describe('tierWeight', () => {
  it('forbids tiers above the ceiling', () => {
    expect(tierWeight('a', 'B')).toBe(0)
    expect(tierWeight('s', 'A')).toBe(0)
  })

  it('weights the tier below the ceiling highest', () => {
    expect(tierWeight('s', 'S')).toBe(1)
    expect(tierWeight('a', 'S')).toBe(2)
    expect(tierWeight('b', 'S')).toBe(4)
    expect(tierWeight('c', 'S')).toBe(8)
  })
})

describe('rollRewardOptions', () => {
  it('is deterministic per seed', () => {
    const a = rollRewardOptions(99, 'S', 3, ALL_ITEMS, new Set())
    const b = rollRewardOptions(99, 'S', 3, ALL_ITEMS, new Set())
    expect(a.map(option => option.optionId)).toEqual(b.map(option => option.optionId))
  })

  it('never offers tiers above the ceiling', () => {
    for (let seed = 0; seed < 50; seed++) {
      const options = rollRewardOptions(seed, 'B', 3, ALL_ITEMS, new Set())
      for (const option of options) {
        expect(['c', 'b']).toContain(option.item.tier)
      }
    }
  })

  it('guarantees an S-tier option at S+', () => {
    for (let seed = 0; seed < 50; seed++) {
      const options = rollRewardOptions(seed, 'S+', 3, ALL_ITEMS, new Set())
      expect(options.some(option => option.item.tier === 's')).toBe(true)
    }
  })

  it('excludes owned items and dedupes within the offer', () => {
    const owned = new Set(['ar23liberator'])
    const options = rollRewardOptions(5, 'S', 4, ALL_ITEMS, owned)
    const ids = options.map(option => option.optionId)
    expect(ids).not.toContain('ar23liberator')
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('falls back past the ceiling when the tier pool is exhausted', () => {
    // Exclude every c/b-tier item; an A ceiling must still offer something.
    const lowTierIds = new Set(ALL_ITEMS.filter(item => ['c', 'b'].includes(item.tier)).map(item => item.id))
    const options = rollRewardOptions(11, 'A', 2, ALL_ITEMS, lowTierIds)
    expect(options.length).toBeGreaterThan(0)
  })
})
