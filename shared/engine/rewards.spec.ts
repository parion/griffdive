import { describe, expect, it } from 'vitest'
import { ALL_ITEMS } from '../data/catalog'
import type { Item, ItemCategory, Tier } from '../data/types'
import { SAMPLE_POINTS, SAMPLE_PRICE_TIER, SAMPLE_PRICE_TYPE, TIME_HAUL_FLOOR, VALOR_METER_MAX, sPlusValorFloorFor, sValorFloorFor } from './config'
import { ceilingOddsPercent, DIVERS_CHOICE_ITEM, DIVERS_CHOICE_OPTION_ID, haulValue, itemPrice, maxCeiling, missionHaul, oddsToReach, optionsForDiver, optionsForStars, rollCeiling, rollRewardOptions, rollShopStock, tierWeight, timeHaulMultiplier, valorOf } from './rewards'
import { mulberry32 } from './rng'
import type { RewardTier } from './types'

function makeItem(tier: Tier, category: ItemCategory): Item {
  return { id: `${category}-${tier}`, displayName: 'x', type: 'equipment', category, tags: [], warbondCode: 'none', tier }
}

describe('valorOf', () => {
  it('adds chosen team and pact risk only — samples are a separate currency', () => {
    expect(valorOf(0, 0)).toBe(0)
    expect(valorOf(5, 6)).toBe(11)
  })
})

describe('haulValue / timeHaulMultiplier / missionHaul', () => {
  it('prices samples by rarity', () => {
    expect(haulValue(undefined)).toBe(0)
    expect(haulValue({ common: 2, rare: 0, super: 0 })).toBe(2 * SAMPLE_POINTS.common)
    expect(haulValue({ common: 0, rare: 2, super: 0 })).toBe(2 * SAMPLE_POINTS.rare)
    expect(haulValue({ common: 0, rare: 0, super: 2 })).toBe(2 * SAMPLE_POINTS.super)
    expect(haulValue({ common: 1, rare: 1, super: 1 })).toBe(SAMPLE_POINTS.common + SAMPLE_POINTS.rare + SAMPLE_POINTS.super)
  })

  it('floors negative counts to zero', () => {
    expect(haulValue({ common: -5, rare: 0, super: 0 })).toBe(0)
  })

  it('scales from the floor to a full clock', () => {
    expect(timeHaulMultiplier(undefined)).toBe(TIME_HAUL_FLOOR)
    expect(timeHaulMultiplier(0)).toBe(TIME_HAUL_FLOOR)
    expect(timeHaulMultiplier(50)).toBeCloseTo(0.75)
    expect(timeHaulMultiplier(100)).toBe(1)
    expect(timeHaulMultiplier(250)).toBe(1)
  })

  it('banks the floored haul, zero without a report or samples', () => {
    expect(missionHaul(null)).toBe(0)
    expect(missionHaul({ outcome: 'success', stars: 3, timePct: 100, samples: { common: 18, rare: 0, super: 0 } })).toBe(18)
    expect(missionHaul({ outcome: 'success', stars: 3, timePct: 0, samples: { common: 18, rare: 0, super: 0 } })).toBe(9)
    expect(missionHaul({ outcome: 'success', stars: 3, timePct: 50, samples: { common: 0, rare: 2, super: 0 } })).toBe(7)
    expect(missionHaul({ outcome: 'success', stars: 3, timePct: 100 })).toBe(0)
  })
})

describe('itemPrice', () => {
  it('is tier first, then type', () => {
    expect(SAMPLE_PRICE_TIER.c).toBe(25)
    expect(SAMPLE_PRICE_TIER.s).toBe(450)
    expect(itemPrice(makeItem('c', 'armorPassive'))).toBe(Math.round(25 * (SAMPLE_PRICE_TYPE.armorPassive ?? 1)))
    expect(itemPrice(makeItem('c', 'booster'))).toBe(Math.round(25 * 1.5))
    // A booster always out-prices an armor passive at the same tier.
    expect(itemPrice(makeItem('s', 'booster'))).toBeGreaterThan(itemPrice(makeItem('s', 'armorPassive')))
    // Unknown categories fall back to the default multiplier.
    expect(itemPrice(makeItem('b', 'Orbital'))).toBe(SAMPLE_PRICE_TIER.b)
  })
})

describe('rollShopStock', () => {
  const pool = ALL_ITEMS
  const none = new Set<string>()

  it('is deterministic and returns distinct items', () => {
    const a = rollShopStock(1234, 'C', 'C', 3, pool, none)
    const b = rollShopStock(1234, 'C', 'C', 3, pool, none)
    expect(a.map(o => o.optionId)).toEqual(b.map(o => o.optionId))
    expect(new Set(a.map(o => o.optionId)).size).toBe(a.length)
  })

  it('never injects the Liberty’s Cross choice slot, even at an S+ ceiling', () => {
    const stock = rollShopStock(99, 'S+', 'C', 5, pool, none)
    expect(stock.every(option => !option.choice)).toBe(true)
    expect(stock.every(option => option.optionId !== DIVERS_CHOICE_OPTION_ID)).toBe(true)
  })

  it('honors the exclusion set', () => {
    const poolIds = new Set(pool.map(item => item.id))
    const excluded = pool.find(item => item.tier === 's' && item.category !== 'armor')
    if (!excluded) {
      throw new Error('expected a tier-s item')
    }
    const exclude = new Set([excluded.id])
    const stock = rollShopStock(7, 'S', 'S', 4, pool, exclude)
    expect(stock.every(option => option.optionId !== excluded.id)).toBe(true)
    expect(poolIds.has(excluded.id)).toBe(true)
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

  it('keeps A and S rare in the early bands, even for a stacked squad', () => {
    // Playtest: a full squad on directives, a strain and stacked pacts banked
    // A and S gear before diff 5. Even max overstack stays scavenged there.
    for (const difficulty of [3, 4, 5]) {
      expect(oddsToReach(difficulty, 14, 'A')).toBeLessThan(0.3)
      expect(oddsToReach(difficulty, 14, 'S')).toBeLessThan(0.1)
      expect(oddsToReach(difficulty, 8, 'S')).toBeGreaterThan(0)
    }
    expect(oddsToReach(3, 8, 'S')).toBeLessThan(0.02)
  })

  it('pays a stacked early pact on every rung, not just S', () => {
    // Playtest: at diff 5 a +3 pact (Valor 6.5 → 9.5) moved only S, by a
    // point — B and A had already hit flat caps.
    for (const tier of ['B', 'A', 'S'] as const) {
      expect(oddsToReach(5, 9.5, tier) - oddsToReach(5, 6.5, tier)).toBeGreaterThan(0.025)
    }
  })

  it('always rewards more chosen risk with better odds', () => {
    for (let difficulty = 3; difficulty <= 10; difficulty++) {
      for (const tier of ['B', 'A', 'S', 'S+'] as const) {
        for (let valor = 0; valor < 16; valor++) {
          expect(oddsToReach(difficulty, valor + 1, tier))
            .toBeGreaterThanOrEqual(oddsToReach(difficulty, valor, tier))
        }
      }
    }
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

  it('gates S and S+ behind the difficulty-scaled Valor floors', () => {
    for (let seed = 0; seed < 200; seed++) {
      for (const difficulty of [3, 6, 10]) {
        // Below the S floor, S is unreachable.
        expect(rollCeiling(mulberry32(seed), difficulty, sValorFloorFor(difficulty) - 1))
          .not.toBe('S')
        // Below the S+ floor, the jackpot is unreachable.
        expect(rollCeiling(mulberry32(seed), difficulty, sPlusValorFloorFor(difficulty) - 1))
          .not.toBe('S+')
      }
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
    // Stacked Valor previews S in the low bands, but the reach-scaled S+ rung
    // stays under the preview floor there and the priced climb is a longshot.
    expect(maxCeiling(3, 11)).toBe('S')
    expect(maxCeiling(8, 11)).toBe('S+')
    expect(oddsToReach(3, 11, 'S')).toBeGreaterThan(0)
    expect(oddsToReach(3, 11, 'S')).toBeLessThan(0.05)
    expect(oddsToReach(3, 11, 'S+')).toBeLessThan(0.005)
    expect(oddsToReach(3, 2, 'B')).toBeLessThan(oddsToReach(5, 2, 'B'))
  })
})

describe('ceilingOddsPercent (preview ladder)', () => {
  it('lights exactly the tiers it prices above 0%', () => {
    const ladder = ['C', 'B', 'A', 'S', 'S+'] as const
    for (let difficulty = 3; difficulty <= 10; difficulty++) {
      for (let valor = 0; valor <= 16; valor += 0.25) {
        const max = ladder.indexOf(maxCeiling(difficulty, valor))
        ladder.forEach((tier, index) => {
          const pct = ceilingOddsPercent(difficulty, valor, tier)
          expect(pct > 0).toBe(index <= max)
        })
      }
    }
  })
})

describe('meter overflow luck', () => {
  it('turns Valor past the meter top into top-rung odds', () => {
    for (const difficulty of [6, 8, 10]) {
      expect(oddsToReach(difficulty, VALOR_METER_MAX + 1, 'S'))
        .toBeGreaterThan(oddsToReach(difficulty, VALOR_METER_MAX, 'S'))
      expect(oddsToReach(difficulty, VALOR_METER_MAX + 1, 'S+'))
        .toBeGreaterThan(oddsToReach(difficulty, VALOR_METER_MAX, 'S+'))
    }
  })

  it('never guarantees the top rungs, even at absolute max overstack', () => {
    for (const difficulty of [3, 6, 8, 10]) {
      expect(oddsToReach(difficulty, 13.5, 'S')).toBeLessThan(1)
      expect(oddsToReach(difficulty, 13.5, 'S+')).toBeLessThan(1)
    }
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

describe('optionsForDiver', () => {
  it('forfeits one option per failed pact', () => {
    expect(optionsForDiver(5, 'B', 0)).toBe(4)
    expect(optionsForDiver(5, 'B', 1)).toBe(3)
    expect(optionsForDiver(3, 'B', 1)).toBe(2)
  })

  it('never drops below one option, so the draft can always complete', () => {
    expect(optionsForDiver(0, 'C', 5)).toBe(1)
    expect(optionsForDiver(5, 'B', 99)).toBe(1)
  })

  it('keeps the S+ bonus option before the failed-pact penalty', () => {
    expect(optionsForDiver(5, 'S+', 0)).toBe(5)
    expect(optionsForDiver(5, 'S+', 2)).toBe(3)
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

  it('lands exactly one option at the rolled ceiling — no top-tier flood', () => {
    for (let seed = 0; seed < 100; seed++) {
      const options = rollRewardOptions(seed, 'S', 'B', 4, ALL_ITEMS, new Set())
      expect(options.filter(option => option.item.tier === 's' && !option.choice)).toHaveLength(1)
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
