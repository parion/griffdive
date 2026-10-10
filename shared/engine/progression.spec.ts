import { describe, expect, it } from 'vitest'
import { SEAF_SUPPORT_KIT, STARTING_KITS, VARIANTS, assertKitsValid, startingItemIds } from './progression'

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
    expect(startingItemIds('suicide', 'penance')).toEqual(bare)
  })

  it('appends the SEAF Support Package only for the seaf mode', () => {
    const seaf = startingItemIds('hard', 'seaf')
    expect(seaf.length).toBeGreaterThan(startingItemIds('hard').length)
    for (const id of [...SEAF_SUPPORT_KIT.stratagems, ...SEAF_SUPPORT_KIT.boosters]) {
      expect(seaf).toContain(id)
      expect(startingItemIds('hard', 'penance')).not.toContain(id)
    }
  })

  it('builds one personal kit per diver — stratagems included, no shared pool', () => {
    const kit = startingItemIds('medium')
    expect(kit).toContain('r2124constitution')
    expect(kit).toContain('onetrueflag')
    expect(kit.length).toBe(STARTING_KITS.medium.stratagems.length
      + STARTING_KITS.medium.primaries.length
      + STARTING_KITS.medium.secondaries.length
      + STARTING_KITS.medium.throwables.length
      + STARTING_KITS.medium.armorPassives.length
      + STARTING_KITS.medium.boosters.length)
  })
})
