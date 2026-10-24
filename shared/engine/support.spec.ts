import { describe, expect, it } from 'vitest'
import { ALL_WARBOND_CODES, ITEMS_BY_ID } from '../data/catalog'
import { SEAF_SUPPORT_ROLLS, SEAF_SUPPORT_TIER } from './config'
import { startingItemIds } from './progression'
import { rollSupportKit } from './support'

const HARD = { variant: 'hard', mode: 'seaf' } as const
const SUICIDE = { variant: 'suicide', mode: 'seaf' } as const

function countKinds(ids: readonly string[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const id of ids) {
    const item = ITEMS_BY_ID.get(id)!
    const kind = item.type === 'stratagem' ? 'stratagem' : item.category
    counts[kind] = (counts[kind] ?? 0) + 1
  }
  return counts
}

describe('rollSupportKit', () => {
  it('deals the difficulty-5 pack: 1 primary, 1 secondary, 1 throwable, 2 stratagems, 1 passive', () => {
    const kit = rollSupportKit(HARD, 'p1', ALL_WARBOND_CODES)
    expect(countKinds(kit)).toEqual({ primary: 1, secondary: 1, throwable: 1, stratagem: 2, armorPassive: 1 })
  })

  it('deals the difficulty-7 pack: 2 primaries, 1 secondary, 1 throwable, 4 stratagems, 2 passives, 1 booster', () => {
    const kit = rollSupportKit(SUICIDE, 'p1', ALL_WARBOND_CODES)
    expect(countKinds(kit)).toEqual({
      primary: SEAF_SUPPORT_ROLLS[7]!.primary,
      secondary: 1,
      throwable: 1,
      stratagem: 4,
      armorPassive: 2,
      booster: 1,
    })
  })

  it('deals nothing without the seaf mode', () => {
    expect(rollSupportKit({ variant: 'suicide', mode: 'penance' }, 'p1', ALL_WARBOND_CODES)).toEqual([])
    expect(rollSupportKit({ variant: 'suicide' }, 'p1', ALL_WARBOND_CODES)).toEqual([])
    expect(rollSupportKit({ variant: 'medium', mode: 'seaf' }, 'p1', ALL_WARBOND_CODES)).toEqual([])
  })

  it('rolls only support-tier items, never repeats one and never repeats the surplus kit', () => {
    const surplus = new Set(startingItemIds('suicide'))
    for (let n = 0; n < 200; n++) {
      const kit = rollSupportKit(SUICIDE, `diver-${n}`, ALL_WARBOND_CODES)
      expect(new Set(kit).size).toBe(kit.length)
      for (const id of kit) {
        expect(ITEMS_BY_ID.get(id)!.tier).toBe(SEAF_SUPPORT_TIER)
        expect(surplus.has(id)).toBe(false)
      }
    }
  })

  it('always fields an anti-tank item without changing the pack\'s shape', () => {
    for (const settings of [HARD, SUICIDE]) {
      for (let n = 0; n < 500; n++) {
        const kit = rollSupportKit(settings, `diver-${n}`, ALL_WARBOND_CODES)
        expect(kit.some(id => ITEMS_BY_ID.get(id)!.antitank)).toBe(true)
      }
    }
    expect(countKinds(rollSupportKit(HARD, 'diver-3', ALL_WARBOND_CODES)))
      .toEqual({ primary: 1, secondary: 1, throwable: 1, stratagem: 2, armorPassive: 1 })
  })

  it('draws only from the diver\'s own warbonds', () => {
    const owned = ['warbond3']
    for (let n = 0; n < 100; n++) {
      for (const id of rollSupportKit(SUICIDE, `diver-${n}`, owned)) {
        const code = ITEMS_BY_ID.get(id)!.warbondCode
        expect(code === 'none' || owned.includes(code)).toBe(true)
      }
    }
  })

  it('is deterministic per diver and differs between divers', () => {
    expect(rollSupportKit(SUICIDE, 'p1', ALL_WARBOND_CODES)).toEqual(rollSupportKit(SUICIDE, 'p1', ALL_WARBOND_CODES))
    const packs = new Set(Array.from({ length: 20 }, (_, n) => rollSupportKit(SUICIDE, `diver-${n}`, ALL_WARBOND_CODES).join()))
    expect(packs.size).toBeGreaterThan(15)
  })

  it('keeps each kind on its own stream — a diver\'s primaries do not move with their stratagems', () => {
    const hard = rollSupportKit(HARD, 'p1', ALL_WARBOND_CODES)
    const suicide = rollSupportKit(SUICIDE, 'p1', ALL_WARBOND_CODES)
    const secondary = (ids: string[]) => ids.find(id => ITEMS_BY_ID.get(id)!.category === 'secondary')
    expect(secondary(hard)).toBe(secondary(suicide))
  })
})
