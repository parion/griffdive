import { describe, expect, it } from 'vitest'
import { HERO_POOL, MISSION_STRATAGEMS, REINFORCE_ID, STRATAGEM_CODES, heroStratagem } from './stratagemCodes'
import { stratagems } from './stratagems'

describe('stratagem codes', () => {
  it('gives every catalog stratagem a code', () => {
    const missing = stratagems.map(item => item.id).filter(id => !STRATAGEM_CODES[id])
    expect(missing).toEqual([])
  })

  it('keys codes only by catalog ids', () => {
    const ids = new Set(stratagems.map(item => item.id))
    expect(Object.keys(STRATAGEM_CODES).filter(id => !ids.has(id))).toEqual([])
  })

  it('writes every code over U/D/L/R, three to nine arrows long', () => {
    for (const entry of HERO_POOL) {
      expect(entry.code, entry.id).toMatch(/^[UDLR]{3,9}$/)
    }
  })

  it('keeps mission stratagem ids apart from catalog ids', () => {
    for (const mission of MISSION_STRATAGEMS) {
      expect(STRATAGEM_CODES[mission.id]).toBeUndefined()
    }
  })

  it('sorts the pool by id so seeded rounds derive the same everywhere', () => {
    const ids = HERO_POOL.map(entry => entry.id)
    expect(ids).toEqual([...ids].sort())
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('carries Reinforce as the game codes it', () => {
    expect(heroStratagem(REINFORCE_ID)?.code).toBe('UDRLU')
  })
})
