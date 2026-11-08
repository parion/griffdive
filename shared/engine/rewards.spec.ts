import { describe, expect, it } from 'vitest'
import { ALL_ITEMS } from '../data/catalog'
import type { Item, ItemCategory, Tier } from '../data/types'
import { ARMOR_PACK_SIZE, BARGAIN_SLOTS, CREDIT_PRICE_TIER, SAMPLE_CREDITS, TIME_HAUL_FLOOR, VALOR_METER_MAX, sPlusValorFloorFor, sValorFloorFor } from './config'
import { bankedOptionId, ceilingOddsPercent, DIVERS_CHOICE_ITEM, DIVERS_CHOICE_OPTION_ID, haulValue, itemPrice, maxCeiling, missionHaul, oddsToReach, optionsForDiver, optionsForStars, rollArmorPack, rollCeiling, rollBargainShelf, rollRewardOffer, rollRewardOptions, tierForRoll, tierWeight, tierZones, topTierOf, timeHaulMultiplier, valorOf } from './rewards'
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
    expect(haulValue({ common: 2, rare: 0, super: 0 })).toBe(2 * SAMPLE_CREDITS.common)
    expect(haulValue({ common: 0, rare: 2, super: 0 })).toBe(2 * SAMPLE_CREDITS.rare)
    expect(haulValue({ common: 0, rare: 0, super: 2 })).toBe(2 * SAMPLE_CREDITS.super)
    expect(haulValue({ common: 1, rare: 1, super: 1 })).toBe(SAMPLE_CREDITS.common + SAMPLE_CREDITS.rare + SAMPLE_CREDITS.super)
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
    expect(missionHaul({ outcome: 'success', stars: 3, timePct: 50, samples: { common: 0, rare: 2, super: 0 } })).toBe(4)
    expect(missionHaul({ outcome: 'success', stars: 3, timePct: 100 })).toBe(0)
  })
})

describe('itemPrice', () => {
  it('is tier first, then type', () => {
    expect(CREDIT_PRICE_TIER.c).toBe(35)
    expect(CREDIT_PRICE_TIER.s).toBe(450)
    // The tiers climb ~2.8x each through A, then flatten into S; S is a
    // one-in-six-or-seven-missions treat, not a long saving goal.
    expect(CREDIT_PRICE_TIER.s).toBeGreaterThan(CREDIT_PRICE_TIER.a)
    expect(itemPrice(makeItem('c', 'armorPassive'))).toBe(CREDIT_PRICE_TIER.c)
    expect(itemPrice(makeItem('c', 'primary'))).toBe(Math.round(35 * 1.25))
    // A primary always out-prices a stratagem at the same tier.
    expect(itemPrice(makeItem('s', 'primary'))).toBeGreaterThan(itemPrice(makeItem('s', 'Orbital')))
    // Unknown categories fall back to the default multiplier.
    expect(itemPrice(makeItem('b', 'Orbital'))).toBe(CREDIT_PRICE_TIER.b)
  })
})

describe('rollBargainShelf', () => {
  const pool = ALL_ITEMS
  const none = new Set<string>()
  const kinds = [...BARGAIN_SLOTS, 'stratagem', 'stratagem'] as const
  const tierSet = (difficulty: number, excluded = none): Set<string> => {
    const tiers = new Set<string>()
    for (let seed = 0; seed < 200; seed++) {
      for (const slot of rollBargainShelf(seed, difficulty, kinds, pool, excluded)) {
        tiers.add(slot.item!.tier)
      }
    }
    return tiers
  }

  it('is deterministic, one item of each slot kind', () => {
    const a = rollBargainShelf(1234, 7, kinds, pool, none)
    expect(rollBargainShelf(1234, 7, kinds, pool, none)).toEqual(a)
    expect(a.map(slot => slot.slotId)).toEqual(['primary', 'secondary', 'throwable', 'stratagem', 'stratagem-2'])
    for (const slot of a.slice(0, 3)) {
      expect(slot.item?.category).toBe(slot.kind)
    }
    expect(a.slice(3).every(slot => slot.item?.type === 'stratagem')).toBe(true)
    expect(a[3]!.item!.id).not.toBe(a[4]!.item!.id)
  })

  it('stocks the base tier up to one tier above it', () => {
    expect(tierSet(3)).toEqual(new Set(['c', 'b']))
    expect(tierSet(6)).toEqual(new Set(['b', 'a']))
    expect(tierSet(10)).toEqual(new Set(['a', 's']))
  })

  it('always finds a primary at the start, whose only C item is in the kit', () => {
    const lone = new Set(pool.filter(item => item.category === 'primary' && item.tier === 'c').map(item => item.id))
    expect(lone.size).toBe(1)
    for (let seed = 0; seed < 30; seed++) {
      const [primary] = rollBargainShelf(seed, 3, ['primary'], pool, lone)
      expect(primary?.item?.tier).toBe('b')
    }
  })

  it('steps an exhausted band to the nearest stocked tier, cheaper first', () => {
    const band = new Set(pool.filter(item => item.category === 'secondary' && (item.tier === 'a' || item.tier === 's')).map(item => item.id))
    const [secondary] = rollBargainShelf(1, 8, ['secondary'], pool, band)
    expect(secondary?.item?.tier).toBe('b')
  })

  it('empties a slot whose kind is exhausted', () => {
    const throwables = new Set(pool.filter(item => item.category === 'throwable').map(item => item.id))
    const shelf = rollBargainShelf(7, 5, kinds, pool, throwables)
    expect(shelf.find(slot => slot.kind === 'throwable')?.item).toBeNull()
    expect(shelf.filter(slot => slot.kind !== 'throwable').every(slot => slot.item !== null)).toBe(true)
  })
})

describe('rollArmorPack', () => {
  const passives = ALL_ITEMS.filter(item => item.category === 'armorPassive')
  const none = new Set<string>()

  it('deals three distinct, deterministic passives', () => {
    const first = rollArmorPack(1234, 7, passives, none)
    expect(first).toHaveLength(ARMOR_PACK_SIZE)
    expect(new Set(first.map(item => item.id)).size).toBe(ARMOR_PACK_SIZE)
    expect(first.every(item => item.category === 'armorPassive')).toBe(true)
    expect(rollArmorPack(1234, 7, passives, none).map(item => item.id)).toEqual(first.map(item => item.id))
  })

  it('never repeats a card the diver holds or banned', () => {
    const excluded = new Set(passives.slice(0, 20).map(item => item.id))
    for (let seed = 0; seed < 50; seed++) {
      const pack = rollArmorPack(seed, 7, passives, excluded)
      expect(pack.every(item => !excluded.has(item.id))).toBe(true)
    }
  })

  it('keeps the hit card at the band floor or above', () => {
    for (let seed = 0; seed < 100; seed++) {
      const [hit] = rollArmorPack(seed, 4, passives, none)
      expect(['b', 'a', 's']).toContain(hit!.tier)
    }
    for (let seed = 0; seed < 100; seed++) {
      const pack = rollArmorPack(seed, 10, passives, none)
      expect(pack.every(item => item.tier === 'a' || item.tier === 's')).toBe(true)
    }
  })

  it('caps the pack at one S pull and never mints one from an empty S pool', () => {
    for (let seed = 0; seed < 300; seed++) {
      const pack = rollArmorPack(seed, 10, passives, none)
      expect(pack.filter(item => item.tier === 's').length).toBeLessThanOrEqual(1)
    }
    const noS = passives.filter(item => item.tier !== 's')
    for (let seed = 0; seed < 100; seed++) {
      expect(rollArmorPack(seed, 10, noS, none).some(item => item.tier === 's')).toBe(false)
    }
  })

  it('never treats an exhausted A pool as a free S upgrade', () => {
    // No A passives remain. The hit card rolled A, so it must degrade to B/C;
    // S can only arrive through the pack's one S roll.
    const thin = passives.filter(item => item.tier !== 'a')
    let sPacks = 0
    for (let seed = 0; seed < 300; seed++) {
      if (rollArmorPack(seed, 10, thin, none).some(item => item.tier === 's')) {
        sPacks++
      }
    }
    expect(sPacks).toBeGreaterThan(0)
    expect(sPacks).toBeLessThan(90)
  })

  it('never deals more than one S, even when the pool is only S', () => {
    const onlyS = passives.filter(item => item.tier === 's')
    for (let seed = 0; seed < 100; seed++) {
      const pack = rollArmorPack(seed, 10, onlyS, none)
      expect(pack.length).toBeLessThanOrEqual(1)
      expect(pack.every(item => item.tier === 's')).toBe(true)
    }
  })

  it('deals a smaller pack when the pool is thin, and nothing when it is empty', () => {
    const one = passives.slice(0, 1)
    expect(rollArmorPack(1, 7, one, none)).toHaveLength(1)
    expect(rollArmorPack(1, 7, passives, new Set(passives.map(item => item.id)))).toEqual([])
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
    expect([0, 1, 2, 3, 4, 5].map(stars => optionsForStars(stars)))
      .toEqual([1, 1, 2, 3, 4, 4])
  })

  it('clamps out-of-range stars', () => {
    expect(optionsForStars(99)).toBe(4)
    expect(optionsForStars(-3)).toBe(1)
  })
})

describe('optionsForDiver', () => {
  it('forfeits one option per failed pact', () => {
    expect(optionsForDiver(5, 0)).toBe(4)
    expect(optionsForDiver(5, 1)).toBe(3)
    expect(optionsForDiver(3, 1)).toBe(2)
  })

  it('never drops below one option, so the draft can always complete', () => {
    expect(optionsForDiver(0, 5)).toBe(1)
    expect(optionsForDiver(5, 99)).toBe(1)
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

describe('tierZones / tierForRoll', () => {
  it('draws zones that sum to 100 and match the reach curve', () => {
    for (let difficulty = 3; difficulty <= 10; difficulty++) {
      for (let valor = 0; valor <= 16; valor += 0.5) {
        const zones = tierZones(difficulty, valor)
        expect(zones.reduce((sum, zone) => sum + zone.chance, 0)).toBeCloseTo(1, 6)
        expect(zones[0]!.start).toBe(0)
        expect(zones[zones.length - 1]!.end).toBe(100)
        expect(zones.find(zone => zone.tier === 'B')!.chance)
          .toBeCloseTo(oddsToReach(difficulty, valor, 'B') - oddsToReach(difficulty, valor, 'A'), 6)
      }
    }
  })

  it('keeps zero-Valor dives on the base tier', () => {
    expect(tierZones(3, 0).find(zone => zone.tier === 'C')!.chance).toBeCloseTo(1, 6)
    expect(tierZones(10, 0).find(zone => zone.tier === 'A')!.chance).toBeCloseTo(1, 6)
    for (let roll = 1; roll <= 100; roll++) {
      expect(tierForRoll(roll, tierZones(10, 0))).toBe('A')
    }
  })

  it('maps every face into exactly one zone', () => {
    const zones = tierZones(6, 7)
    for (let roll = 1; roll <= 100; roll++) {
      expect(zones.some(zone => zone.tier === tierForRoll(roll, zones))).toBe(true)
    }
  })
})

describe('rollRewardOffer (one d100 per option)', () => {
  it('is deterministic and stamps every option with its roll and tier', () => {
    const a = rollRewardOffer(99, 6, 7, 3, ALL_ITEMS, new Set())
    const b = rollRewardOffer(99, 6, 7, 3, ALL_ITEMS, new Set())
    expect(a.map(option => ({ id: option.optionId, roll: option.roll, tier: option.tier })))
      .toEqual(b.map(option => ({ id: option.optionId, roll: option.roll, tier: option.tier })))
    for (const option of a) {
      expect(option.roll).toBeGreaterThanOrEqual(1)
      expect(option.roll).toBeLessThanOrEqual(100)
      expect(option.tier).toBeDefined()
    }
  })

  it('never offers a tier below the difficulty floor', () => {
    for (let seed = 0; seed < 100; seed++) {
      const options = rollRewardOffer(seed, 8, 4, 4, ALL_ITEMS, new Set())
      for (const option of options) {
        expect(['a', 's']).toContain(option.item.tier)
      }
    }
  })

  it('can roll Liberty’s Cross on the top tier without adding an extra slot', () => {
    const options = rollRewardOffer(4, 10, 24, 4, ALL_ITEMS, new Set())
    expect(options).toHaveLength(4)
    const cross = options.filter(option => option.choice)
    expect(cross.length).toBeLessThanOrEqual(1)
    for (const option of cross) {
      expect(option.optionId).toBe(DIVERS_CHOICE_OPTION_ID)
      expect(option.tier).toBe('S+')
    }
  })

  it('excludes owned items and never repeats an item', () => {
    const owned = new Set(['ar23liberator'])
    const options = rollRewardOffer(5, 6, 7, 4, ALL_ITEMS, owned)
    const ids = options.filter(option => !option.choice).map(option => option.optionId)
    expect(ids).not.toContain('ar23liberator')
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('reports the top rolled tier for the squad board', () => {
    const options = rollRewardOffer(12, 6, 7, 3, ALL_ITEMS, new Set())
    expect(topTierOf(options)).toBe(options.map(option => option.tier).sort((a, b) => {
      const rank = ['C', 'B', 'A', 'S', 'S+']
      return rank.indexOf(a!) - rank.indexOf(b!)
    }).at(-1))
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

describe('bankedOptionId', () => {
  const item = ALL_ITEMS[0]!
  const offer = [
    { optionId: item.id, item },
    { optionId: DIVERS_CHOICE_OPTION_ID, item: DIVERS_CHOICE_ITEM, choice: true },
  ]

  it('is null before a pick', () => {
    expect(bankedOptionId(offer, null)).toBeNull()
  })

  it('matches a regular option by its item id', () => {
    expect(bankedOptionId(offer, item.id)).toBe(item.id)
  })

  it('resolves a Cross claim (any other item id) to the Cross option', () => {
    expect(bankedOptionId(offer, ALL_ITEMS[1]!.id)).toBe(DIVERS_CHOICE_OPTION_ID)
    expect(bankedOptionId([offer[0]!], ALL_ITEMS[1]!.id)).toBeNull()
  })
})
