import { describe, expect, it } from 'vitest'
import { ALL_ITEMS } from '../data/catalog'
import { DIVERS_CHOICE_ITEM, DIVERS_CHOICE_OPTION_ID, maxCeiling, oddsToReach, optionsForStars, performanceValor, rollCeiling, rollRewardOptions, tierWeight, valorOf } from './rewards'
import { mulberry32 } from './rng'
import type { RewardTier } from './types'

describe('valorOf', () => {
  it('adds team risk, pact risk, and the team-performance term', () => {
    expect(valorOf(0, 0)).toBe(0)
    expect(valorOf(5, 6)).toBe(11)
    expect(valorOf(5, 6, 0.5)).toBe(11.5)
  })
})

describe('performanceValor', () => {
  it('is zero with no report', () => {
    expect(performanceValor(null)).toBe(0)
  })

  it('prices time remaining up to the time cap', () => {
    expect(performanceValor({ outcome: 'success', stars: 3, timePct: 0 })).toBe(0)
    expect(performanceValor({ outcome: 'success', stars: 3, timePct: 50 })).toBeCloseTo(0.1)
    expect(performanceValor({ outcome: 'success', stars: 3, timePct: 100 })).toBeCloseTo(0.2)
    expect(performanceValor({ outcome: 'success', stars: 3, timePct: 250 })).toBeCloseTo(0.2)
  })

  it('prices samples at the chart-calibrated per-rarity rates', () => {
    expect(performanceValor({ outcome: 'success', stars: 3, samples: { common: 2, rare: 0, super: 0 } })).toBeCloseTo(0.003)
    expect(performanceValor({ outcome: 'success', stars: 3, samples: { common: 0, rare: 2, super: 0 } })).toBeCloseTo(0.008)
    expect(performanceValor({ outcome: 'success', stars: 3, samples: { common: 0, rare: 0, super: 2 } })).toBeCloseTo(0.04)
    expect(performanceValor({ outcome: 'success', stars: 3, samples: { common: 99, rare: 99, super: 99 } })).toBeCloseTo(0.3)
  })

  it('scales with the difficulty-shaped sample mix', () => {
    // wiki.gg/Sample midpoints: Medium is commons only; Super Helldive adds
    // rares and supers, so the same extraction effort is worth more at altitude.
    const medium = performanceValor({ outcome: 'success', stars: 3, samples: { common: 17, rare: 0, super: 0 } })
    const helldive = performanceValor({ outcome: 'success', stars: 3, samples: { common: 40, rare: 38, super: 5 } })
    expect(medium).toBeGreaterThan(0)
    expect(medium).toBeLessThan(helldive)
    expect(helldive).toBeCloseTo(0.3)
  })

  it('combines time and samples but never exceeds 0.5', () => {
    expect(performanceValor({
      outcome: 'success',
      stars: 3,
      timePct: 100,
      samples: { common: 40, rare: 38, super: 5 },
    })).toBeCloseTo(0.5)
  })
})

describe('rollCeiling (probabilistic tier ladder)', () => {
  it('keeps zero Valor at the base tier on every difficulty', () => {
    const bases: [number, RewardTier][] = [[3, 'C'], [5, 'C'], [6, 'B'], [7, 'B'], [8, 'A'], [10, 'A']]
    for (const [difficulty, base] of bases) {
      for (let seed = 0; seed < 50; seed++) {
        expect(rollCeiling(mulberry32(seed), difficulty, 0)).toBe(base)
      }
    }
  })

  it('never leaves S/S+ to anything but chosen Valor', () => {
    for (let seed = 0; seed < 200; seed++) {
      expect(rollCeiling(mulberry32(seed), 10, 0)).toBe('A')
    }
  })

  it('is monotonic in Valor for the same rng seed', () => {
    const rank = (tier: RewardTier) => ['C', 'B', 'A', 'S', 'S+'].indexOf(tier)
    for (let seed = 0; seed < 100; seed++) {
      const weak = rollCeiling(mulberry32(seed), 5, 2)
      const strong = rollCeiling(mulberry32(seed), 5, 11)
      expect(rank(strong)).toBeGreaterThanOrEqual(rank(weak))
    }
  })

  it('stacked Valor can reach S and S+ but never guarantees it', () => {
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
    // diff 3 (band floor) vs diff 5 (band top), same Valor and seed stream:
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
  it('previews the base tier at zero Valor', () => {
    expect(maxCeiling(3, 0)).toBe('C')
    expect(maxCeiling(10, 0)).toBe('A')
    expect(oddsToReach(10, 0, 'A')).toBe(1)
  })

  it('previews only plausible tiers and prices the climb', () => {
    // Stacked Valor opens the S+ rung even in the low bands (its per-step cap
    // clears the preview floor), but the priced climb stays a longshot.
    expect(maxCeiling(3, 11)).toBe('S+')
    expect(oddsToReach(3, 11, 'S')).toBeGreaterThan(0)
    expect(oddsToReach(3, 11, 'S')).toBeLessThan(0.5)
    expect(oddsToReach(3, 11, 'S+')).toBeLessThan(0.1)
    expect(oddsToReach(3, 2, 'B')).toBeLessThan(oddsToReach(5, 2, 'B'))
  })
})

describe('optionsForStars', () => {
  it('follows the stars lookup table', () => {
    expect([0, 1, 2, 3, 4, 5].map(stars => optionsForStars(stars, 'B')))
      .toEqual([1, 1, 2, 3, 4, 4])
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
  it('forbids tiers above the ceiling and below the floor', () => {
    expect(tierWeight('a', 'C', 'B')).toBe(0)
    expect(tierWeight('s', 'C', 'A')).toBe(0)
    expect(tierWeight('c', 'A', 'S')).toBe(0)
  })

  it('weights higher tiers exponentially toward the ceiling', () => {
    expect(tierWeight('c', 'C', 'S')).toBe(1)
    expect(tierWeight('b', 'C', 'S')).toBe(2)
    expect(tierWeight('a', 'C', 'S')).toBe(4)
    expect(tierWeight('s', 'C', 'S')).toBe(8)
  })

  it('floors at the base tier and prices S+ as S', () => {
    expect(tierWeight('a', 'A', 'S+')).toBe(1)
    expect(tierWeight('s', 'A', 'S+')).toBe(2)
    expect(tierWeight('b', 'A', 'S+')).toBe(0)
  })
})

describe('rollRewardOptions', () => {
  it('is deterministic per seed', () => {
    const a = rollRewardOptions(99, 'S', 'C', 3, ALL_ITEMS, new Set())
    const b = rollRewardOptions(99, 'S', 'C', 3, ALL_ITEMS, new Set())
    expect(a.map(option => option.optionId)).toEqual(b.map(option => option.optionId))
  })

  it('never offers tiers above the ceiling', () => {
    for (let seed = 0; seed < 50; seed++) {
      const options = rollRewardOptions(seed, 'B', 'C', 3, ALL_ITEMS, new Set())
      for (const option of options) {
        expect(['c', 'b']).toContain(option.item.tier)
      }
    }
  })

  it('never offers tiers below the difficulty floor', () => {
    for (let seed = 0; seed < 50; seed++) {
      const options = rollRewardOptions(seed, 'S', 'A', 4, ALL_ITEMS, new Set())
      for (const option of options) {
        expect(['a', 's']).toContain(option.item.tier)
      }
    }
  })

  it('leads with Diver\'s Choice at S+ and still rolls a guaranteed S option', () => {
    for (let seed = 0; seed < 50; seed++) {
      const options = rollRewardOptions(seed, 'S+', 'C', 3, ALL_ITEMS, new Set())
      // The choice slot comes first and names the sentinel, not an item.
      expect(options[0]).toMatchObject({ optionId: DIVERS_CHOICE_OPTION_ID, choice: true })
      // The bonus slot is the choice, so the remaining roll fills count - 1.
      expect(options).toHaveLength(3)
      expect(options.some(option => option.item.tier === 's' && !option.choice)).toBe(true)
    }
  })

  it('falls back to the highest available tier when the S pool is empty', () => {
    // No S items in the pool: the S+ guarantee lands on A instead of vanishing.
    const pool = ALL_ITEMS.filter(item => item.tier !== 's')
    const options = rollRewardOptions(3, 'S+', 'C', 3, pool, new Set())
    expect(options[0]).toMatchObject({ optionId: DIVERS_CHOICE_OPTION_ID, choice: true })
    expect(options).toHaveLength(3)
    expect(options[1]!.item.tier).toBe('a')
  })

  it('offers only the choice slot when S+ leaves no room to roll', () => {
    const options = rollRewardOptions(7, 'S+', 'C', 1, ALL_ITEMS, new Set())
    expect(options).toEqual([{ optionId: DIVERS_CHOICE_OPTION_ID, item: DIVERS_CHOICE_ITEM, choice: true }])
  })

  it('never offers the choice slot below S+', () => {
    for (const ceiling of ['C', 'B', 'A', 'S'] as const) {
      const options = rollRewardOptions(3, ceiling, 'C', 2, ALL_ITEMS, new Set())
      expect(options.some(option => option.choice)).toBe(false)
    }
  })

  it('excludes owned items and dedupes within the offer', () => {
    const owned = new Set(['ar23liberator'])
    const options = rollRewardOptions(5, 'S', 'C', 4, ALL_ITEMS, owned)
    const ids = options.map(option => option.optionId)
    expect(ids).not.toContain('ar23liberator')
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('degrades the tier filter rather than offering nothing when the band is exhausted', () => {
    // Own every C/B/A item; an A-ceiling draft must still offer something.
    const bandIds = new Set(
      ALL_ITEMS.filter(item => ['c', 'b', 'a'].includes(item.tier)).map(item => item.id),
    )
    const options = rollRewardOptions(11, 'A', 'A', 2, ALL_ITEMS, bandIds)
    expect(options.length).toBeGreaterThan(0)
  })
})
