import { describe, expect, it } from 'vitest'
import { deriveFront, deriveMisfortune, eligibleMisfortunes } from './wheel'

describe('eligibleMisfortunes', () => {
  it('starts with only the difficulty-3 pool', () => {
    const ids = eligibleMisfortunes(3).map(misfortune => misfortune.id)
    expect(ids).toEqual(['noBackpacks', 'noSentries', 'noBoosters', 'noResupplies'])
  })

  it('unlocks the full pool by difficulty 9', () => {
    const ids = eligibleMisfortunes(9).map(misfortune => misfortune.id)
    expect(ids).toContain('noStratagems')
    expect(ids).toContain('meleeOnly')
    expect(ids).toHaveLength(14)
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
