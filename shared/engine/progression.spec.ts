import { describe, expect, it } from 'vitest'
import { STARTING_KITS, VARIANTS, assertKitsValid, earnedKit, startingItemIds, supportRollsFor } from './progression'

describe('variants', () => {
  it('matches the AGENTS.md start difficulties (three, squad-size-free)', () => {
    const byId = Object.fromEntries(VARIANTS.map(variant => [variant.id, variant]))
    expect(STARTING_KITS.medium.startDifficulty).toBe(3)
    expect(STARTING_KITS.hard.startDifficulty).toBe(5)
    expect(STARTING_KITS.suicide.startDifficulty).toBe(7)
    expect(Object.keys(byId)).toHaveLength(3)
  })
})

describe('starting kits', () => {
  it('references only catalog items', () => {
    expect(() => assertKitsValid()).not.toThrow()
  })

  it('gives every difficulty the same bare surplus kit', () => {
    const bare = startingItemIds('medium')
    expect(startingItemIds('hard')).toEqual(bare)
    expect(startingItemIds('suicide')).toEqual(bare)
  })

  it('rolls the SEAF Support Package only for the seaf mode, by start difficulty', () => {
    expect(supportRollsFor('medium', 'seaf')).toBeNull()
    expect(supportRollsFor('hard')).toBeNull()
    expect(supportRollsFor('hard', 'penance')).toBeNull()
    expect(supportRollsFor('hard', 'seaf')).toEqual({
      primary: 1, secondary: 1, throwable: 1, stratagem: 2, armorPassive: 1, booster: 0,
    })
    expect(supportRollsFor('suicide', 'seaf')).toEqual({
      primary: 2, secondary: 1, throwable: 1, stratagem: 4, armorPassive: 2, booster: 1,
    })
  })

  it('keeps the dealt support pack out of a parked cache', () => {
    const base = startingItemIds('hard')
    const items = [...base, 'uavrecon', 'orbitallaser']
    expect(earnedKit(items, 'hard')).toEqual(['uavrecon', 'orbitallaser'])
    expect(earnedKit(items, 'hard', ['uavrecon'])).toEqual(['orbitallaser'])
  })

  it('builds one personal kit per diver — stratagems included, no shared pool', () => {
    const kit = startingItemIds('medium')
    expect(kit).toContain('r2124constitution')
    expect(kit).toContain('cqc1onetrueflag')
    expect(kit.length).toBe(STARTING_KITS.medium.stratagems.length
      + STARTING_KITS.medium.primaries.length
      + STARTING_KITS.medium.secondaries.length
      + STARTING_KITS.medium.throwables.length
      + STARTING_KITS.medium.armorPassives.length
      + STARTING_KITS.medium.boosters.length)
  })
})
