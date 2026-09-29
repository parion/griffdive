import { describe, expect, it } from 'vitest'
import { FRONTS } from '../data/fronts'
import { MISFORTUNES } from '../data/misfortunes'
import { STRAINS } from '../data/strains'
import type { FrontId } from '../data/fronts'
import { MIN_DIFFICULTY, STRAIN_MIN_DIFFICULTY, STRAIN_RISK, conditionRiskAt } from './config'
import { deriveFront, deriveMisfortune, deriveStrain, eligibleMisfortunes, eligibleStrains } from './wheel'

const FRONT_IDS: readonly FrontId[] = ['terminids', 'automatons', 'illuminate']

describe('condition catalog integrity', () => {
  it('every misfortune has risk, an accountability channel and a unique name', () => {
    for (const misfortune of MISFORTUNES) {
      expect(conditionRiskAt(misfortune.id, MIN_DIFFICULTY)).toBeGreaterThan(0)
      expect(['loadout', 'field', 'stats']).toContain(misfortune.accountability)
    }
    expect(new Set(MISFORTUNES.map(misfortune => misfortune.name)).size).toBe(MISFORTUNES.length)
  })

  it('scales each condition\'s risk with difficulty, inverse allowed', () => {
    // A team rule that grows into the top band at altitude.
    expect(conditionRiskAt('noStratagems', MIN_DIFFICULTY)).toBeLessThan(conditionRiskAt('noStratagems', 10))
    expect(conditionRiskAt('noStratagems', 10)).toBe(5)
    // A personal rule that is inverse: it matters less once the war is the threat.
    expect(conditionRiskAt('stimAbstinent', 10)).toBeLessThan(conditionRiskAt('stimAbstinent', MIN_DIFFICULTY))
    // Every condition stays on the 1–5 scale at every rung.
    for (const difficulty of [3, 5, 7, 10]) {
      for (const id of ['noBackpacks', 'pacifist', 'stimAbstinent', 'untouchable']) {
        const risk = conditionRiskAt(id, difficulty)
        expect(risk).toBeGreaterThanOrEqual(1)
        expect(risk).toBeLessThanOrEqual(5)
      }
    }
  })
})

describe('eligibleMisfortunes', () => {
  it('returns the whole team pool at every difficulty — nothing is gated', () => {
    const ids = eligibleMisfortunes().map(misfortune => misfortune.id)
    expect(ids).toHaveLength(MISFORTUNES.length)
    expect(ids).toContain('noBackpacks')
    expect(ids).toContain('pacifist')
    expect(ids).toContain('meleeOnly')
  })
})

describe('deriveMisfortune / deriveFront', () => {
  it('is deterministic per seed', () => {
    expect(deriveMisfortune(1234).id).toBe(deriveMisfortune(1234).id)
    expect(deriveFront(1234)).toBe(deriveFront(1234))
  })

  it('always lands in the pool and a valid front', () => {
    const fronts = new Set(['terminids', 'automatons', 'illuminate'])
    const pool = eligibleMisfortunes().map(misfortune => misfortune.id)
    for (let seed = 0; seed < 200; seed++) {
      expect(pool).toContain(deriveMisfortune(seed).id)
      expect(fronts.has(deriveFront(seed))).toBe(true)
    }
  })

  it('varies results across seeds', () => {
    const misfortunes = new Set(
      Array.from({ length: 50 }, (_, seed) => deriveMisfortune(seed).id),
    )
    expect(misfortunes.size).toBeGreaterThan(1)
    const fronts = new Set(Array.from({ length: 50 }, (_, seed) => deriveFront(seed)))
    expect(fronts.size).toBe(3)
  })

  it('draws the misfortune and the front from independent streams', () => {
    // The front is a separate stream from the misfortune draw.
    expect(deriveFront(4242)).toBe(deriveFront(4242))
    expect(eligibleMisfortunes()).toContain(deriveMisfortune(4242))
  })

  it('restricts the draw to an eligible pool (Major Order front)', () => {
    const pool = FRONTS.filter(front => front.id === 'illuminate')
    for (let seed = 0; seed < 50; seed++) {
      expect(deriveFront(seed, pool)).toBe('illuminate')
    }
    const two = FRONTS.filter(front => front.id !== 'terminids')
    for (let seed = 0; seed < 50; seed++) {
      expect(two.map(front => front.id)).toContain(deriveFront(seed, two))
    }
  })

  it('falls back to the full roster when the pool is empty', () => {
    const fronts = new Set(Array.from({ length: 50 }, (_, seed) => deriveFront(seed, [])))
    expect(fronts.size).toBeGreaterThan(1)
  })
})

describe('strain catalog integrity', () => {
  it('every strain belongs to a front and carries risk, an entry difficulty and flavor', () => {
    for (const strain of STRAINS) {
      expect(STRAIN_RISK[strain.id]).toBeGreaterThan(0)
      expect(STRAIN_MIN_DIFFICULTY[strain.id]).toBeGreaterThanOrEqual(MIN_DIFFICULTY)
      expect(FRONT_IDS).toContain(strain.frontId)
      expect(strain.blurb.length).toBeGreaterThan(0)
    }
    expect(new Set(STRAINS.map(strain => strain.id)).size).toBe(STRAINS.length)
    expect(new Set(STRAINS.map(strain => strain.name)).size).toBe(STRAINS.length)
  })

  it('gives every front at least two strains at the crusade floor, so a reroll can move', () => {
    for (const front of FRONT_IDS) {
      expect(eligibleStrains(MIN_DIFFICULTY, front).length).toBeGreaterThanOrEqual(2)
    }
  })

  it('gates the brutal strains behind altitude', () => {
    expect(eligibleStrains(3, 'terminids').map(strain => strain.id))
      .not.toContain('sporeBurstStrain')
    expect(eligibleStrains(6, 'terminids').map(strain => strain.id))
      .toContain('sporeBurstStrain')
  })
})

describe('deriveStrain', () => {
  it('is deterministic per seed, difficulty and front', () => {
    const first = deriveStrain(1234, 6, 'terminids')
    expect(first?.id).toBe(deriveStrain(1234, 6, 'terminids')?.id)
  })

  it('always lands in that front\'s eligible pool', () => {
    for (let seed = 0; seed < 200; seed++) {
      const front = deriveFront(seed)
      const drawn = deriveStrain(seed, 5, front)
      expect(drawn).not.toBeNull()
      expect(eligibleStrains(5, front).map(strain => strain.id)).toContain(drawn!.id)
      // The strain belongs to the front it was drawn with, never another.
      expect(drawn!.frontId).toBe(front)
    }
  })

  it('returns null when a front has no eligible subfaction', () => {
    expect(deriveStrain(7, 3, 'terminids')).not.toBeNull()
    // The catalog gates every front's pool at the crusade floor, so an empty
    // pool only arises below it (Trivial/Easy, outside the ladder).
    expect(deriveStrain(7, 1, 'terminids')).toBeNull()
  })

  it('varies results across seeds', () => {
    const drawn = new Set(
      Array.from({ length: 50 }, (_, seed) => deriveStrain(seed, 6, 'terminids')?.id),
    )
    expect(drawn.size).toBeGreaterThan(1)
  })
})
