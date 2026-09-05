import { describe, expect, it } from 'vitest'
import { deriveSpin, eligibleMisfortunes } from './wheel'

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

describe('deriveSpin', () => {
  it('is deterministic per seed and difficulty', () => {
    expect(deriveSpin(1234, 5)).toEqual(deriveSpin(1234, 5))
  })

  it('always lands in the eligible pool and a valid front', () => {
    const fronts = new Set(['terminids', 'automatons', 'illuminate'])
    for (let seed = 0; seed < 200; seed++) {
      const spin = deriveSpin(seed, 4)
      const pool = eligibleMisfortunes(4).map(misfortune => misfortune.id)
      expect(pool).toContain(spin.misfortuneId)
      expect(fronts.has(spin.front)).toBe(true)
      expect(spin.seed).toBe(seed)
    }
  })

  it('varies results across seeds', () => {
    const results = new Set(
      Array.from({ length: 50 }, (_, seed) => deriveSpin(seed, 6).misfortuneId),
    )
    expect(results.size).toBeGreaterThan(1)
  })
})
