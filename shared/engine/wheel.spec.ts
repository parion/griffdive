import { describe, expect, it } from 'vitest'
import { MISFORTUNES } from '../data/misfortunes'
import { MIN_DIFFICULTY, MISFORTUNE_MIN_DIFFICULTY, MISFORTUNE_RISK } from './config'
import { deriveFront, deriveMisfortune, eligibleMisfortunes } from './wheel'

describe('misfortune catalog integrity', () => {
  it('every misfortune has risk, an entry difficulty, and an accountability channel', () => {
    for (const misfortune of MISFORTUNES) {
      expect(MISFORTUNE_RISK[misfortune.id]).toBeGreaterThan(0)
      expect(MISFORTUNE_MIN_DIFFICULTY[misfortune.id]).toBeGreaterThanOrEqual(MIN_DIFFICULTY)
      expect(['loadout', 'field', 'stats']).toContain(misfortune.accountability)
    }
    expect(new Set(MISFORTUNES.map(misfortune => misfortune.name)).size).toBe(MISFORTUNES.length)
  })

  it('the hardest restrictions wait for the highest difficulties', () => {
    expect(MISFORTUNE_MIN_DIFFICULTY.pacifist).toBe(9)
    expect(MISFORTUNE_MIN_DIFFICULTY.noReserves).toBe(7)
    expect(MISFORTUNE_RISK.pacifist).toBe(5)
    expect(MISFORTUNE_RISK.noReserves).toBe(4)
  })
})

describe('eligibleMisfortunes', () => {
  it('starts with only the difficulty-3 pool', () => {
    const ids = eligibleMisfortunes(3).map(misfortune => misfortune.id)
    expect(ids).toEqual(['noBackpacks', 'noSentries', 'noBoosters', 'noResupplies'])
  })

  it('unlocks the full pool by difficulty 9', () => {
    const ids = eligibleMisfortunes(9).map(misfortune => misfortune.id)
    expect(ids).toContain('noStratagems')
    expect(ids).toContain('meleeOnly')
    expect(ids).toContain('pacifist')
    expect(ids).toContain('noReserves')
    expect(ids).toHaveLength(15)
  })
})

describe('deriveMisfortune / deriveFront', () => {
  it('is deterministic per seed and difficulty', () => {
    expect(deriveMisfortune(1234, 5).id).toBe(deriveMisfortune(1234, 5).id)
    expect(deriveFront(1234)).toBe(deriveFront(1234))
  })

  it('always lands in the eligible pool and a valid front', () => {
    const fronts = new Set(['terminids', 'automatons', 'illuminate'])
    for (let seed = 0; seed < 200; seed++) {
      const pool = eligibleMisfortunes(4).map(misfortune => misfortune.id)
      expect(pool).toContain(deriveMisfortune(seed, 4).id)
      expect(fronts.has(deriveFront(seed))).toBe(true)
    }
  })

  it('varies results across seeds', () => {
    const misfortunes = new Set(
      Array.from({ length: 50 }, (_, seed) => deriveMisfortune(seed, 6).id),
    )
    expect(misfortunes.size).toBeGreaterThan(1)
    const fronts = new Set(Array.from({ length: 50 }, (_, seed) => deriveFront(seed)))
    expect(fronts.size).toBe(3)
  })

  it('draws the misfortune and the front from independent streams', () => {
    // The same seed must draw the same front regardless of which misfortune
    // pool the difficulty offers — the per-mission redraw never disturbs it.
    for (const difficulty of [3, 9]) {
      expect(deriveFront(4242)).toBe(deriveFront(4242))
      expect(eligibleMisfortunes(difficulty)).toContain(deriveMisfortune(4242, difficulty))
    }
  })
})
