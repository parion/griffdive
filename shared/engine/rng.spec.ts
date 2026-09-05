import { describe, expect, it } from 'vitest'
import { deriveSeed, hashString, mulberry32, pickWeighted } from './rng'

describe('mulberry32', () => {
  it('is deterministic for a given seed', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    const seqA = [a(), a(), a(), a()]
    const seqB = [b(), b(), b(), b()]
    expect(seqA).toEqual(seqB)
  })

  it('produces values in [0, 1)', () => {
    const rng = mulberry32(7)
    for (let i = 0; i < 1000; i++) {
      const value = rng()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  it('differs across seeds', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)())
  })
})

describe('pickWeighted', () => {
  it('returns the only entry regardless of roll', () => {
    const rng = mulberry32(1)
    expect(pickWeighted(rng, [{ value: 'x', weight: 5 }])).toBe('x')
  })

  it('respects zero-weight exclusion', () => {
    const rng = mulberry32(3)
    for (let i = 0; i < 50; i++) {
      const value = pickWeighted(rng, [
        { value: 'never', weight: 0 },
        { value: 'always', weight: 1 },
      ])
      expect(value).toBe('always')
    }
  })
})

describe('deriveSeed / hashString', () => {
  it('is stable for the same inputs', () => {
    expect(deriveSeed(123, 456)).toBe(deriveSeed(123, 456))
    expect(hashString('host')).toBe(hashString('host'))
  })

  it('differs across salts', () => {
    expect(deriveSeed(123, 1)).not.toBe(deriveSeed(123, 2))
  })
})
