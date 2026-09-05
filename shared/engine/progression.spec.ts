import { describe, expect, it } from 'vitest'
import { STARTING_KITS, VARIANTS, assertKitsValid, startingItemIds } from './progression'

describe('variants', () => {
  it('matches the AGENTS.md start difficulties', () => {
    const byId = Object.fromEntries(VARIANTS.map(variant => [variant.id, variant]))
    expect(STARTING_KITS.standard.startDifficulty).toBe(3)
    expect(STARTING_KITS.soloDuo.startDifficulty).toBe(3)
    expect(STARTING_KITS.super.startDifficulty).toBe(4)
    expect(STARTING_KITS.soloDuoSuper.startDifficulty).toBe(4)
    expect(STARTING_KITS.quickplay.startDifficulty).toBe(7)
    expect(Object.keys(byId)).toHaveLength(5)
  })
})

describe('starting kits', () => {
  it('references only catalog items', () => {
    expect(() => assertKitsValid()).not.toThrow()
  })

  it('grants Orbital Precision Strike to solo variants', () => {
    expect(STARTING_KITS.soloDuo.stratagems).toContain('orbitalprecisionstrike')
    expect(STARTING_KITS.soloDuoSuper.stratagems).toContain('orbitalprecisionstrike')
    expect(STARTING_KITS.standard.stratagems).not.toContain('orbitalprecisionstrike')
  })

  it('restricts Super variants to melee secondaries', () => {
    expect(STARTING_KITS.super.secondaries).not.toContain('p2peacemaker')
    expect(STARTING_KITS.super.secondaries.length).toBeGreaterThan(0)
    expect(STARTING_KITS.soloDuoSuper.secondaries).toEqual(STARTING_KITS.super.secondaries)
  })

  it('packs extra gear for quickplay', () => {
    expect(STARTING_KITS.quickplay.stratagems.length).toBeGreaterThan(STARTING_KITS.standard.stratagems.length)
    expect(STARTING_KITS.quickplay.boosters).toContain('uavrecon')
  })

  it('builds one personal kit per diver — stratagems included, no shared pool', () => {
    const kit = startingItemIds('standard')
    expect(kit).toContain('r2124constitution')
    expect(kit).toContain('onetrueflag')
    expect(kit.length).toBe(STARTING_KITS.standard.stratagems.length
      + STARTING_KITS.standard.primaries.length
      + STARTING_KITS.standard.secondaries.length
      + STARTING_KITS.standard.throwables.length
      + STARTING_KITS.standard.armorPassives.length
      + STARTING_KITS.standard.boosters.length)
  })
})
