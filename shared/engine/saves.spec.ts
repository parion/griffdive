import { describe, expect, it } from 'vitest'
import { ITEMS_BY_ID } from '../data/catalog'
import { SAVE_SCHEMA_VERSION } from '../types/save'
import { ENGINE_VERSION } from './config'
import { normalizeSaveDoc } from './saves'
import type { SaveDoc } from '../types/save'

function firstIdOf(category: 'armor' | 'armorPassive'): string {
  for (const item of ITEMS_BY_ID.values()) {
    if (item.category === category) {
      return item.id
    }
  }
  throw new Error(`catalog has no ${category} items`)
}

function v1Doc(overrides: Partial<SaveDoc['state']> = {}): SaveDoc {
  return {
    schemaVersion: 1,
    engineVersion: 1,
    catalogVersion: 1,
    savedAt: '2025-01-01T00:00:00.000Z',
    slotName: 'Crusade',
    state: {
      phase: 'spin',
      difficulty: 3,
      missionIndex: 0,
      missionInOperation: 1,
      achieved: false,
      settings: { variant: 'standard', ownedWarbondCodes: [] },
      divers: [],
      hostId: null,
      openToLobby: false,
      wheel: null,
      misfortuneAccepted: false,
      rerollTokens: 1,
      completedCombos: [],
      sharedStratagemIds: [],
      personalInventories: {},
      offerSeed: null,
      lastReport: null,
      actionLog: [],
      seedHistory: [],
      ...overrides,
    },
  }
}

describe('save migration v1 → v2 (armor passives)', () => {
  it('strips armor pieces from personal inventories, keeps passives', () => {
    const pieceId = firstIdOf('armor')
    const passiveId = firstIdOf('armorPassive')
    const doc = v1Doc({
      personalInventories: { host: [passiveId, pieceId, 'r2124constitution'] },
    })
    const migrated = normalizeSaveDoc(doc)
    expect(migrated).not.toBeNull()
    expect(migrated!.state.personalInventories.host).toEqual([passiveId, 'r2124constitution'])
  })

  it('stamps the current schema + engine versions', () => {
    const migrated = normalizeSaveDoc(v1Doc())
    expect(migrated!.schemaVersion).toBe(SAVE_SCHEMA_VERSION)
    expect(migrated!.engineVersion).toBe(ENGINE_VERSION)
  })

  it('marks held wheels as accepted (misfortunes were forced pre-v3)', () => {
    const doc = v1Doc({
      phase: 'diving',
      wheel: { seed: 9, misfortuneId: 'noBackpacks', front: 'terminids' },
    })
    const migrated = normalizeSaveDoc(doc)!
    expect(migrated.state.misfortuneAccepted).toBe(true)

    const unspun = normalizeSaveDoc(v1Doc())!
    expect(unspun.state.misfortuneAccepted).toBe(false)
  })

  it('re-floors a forfeit-phase crusade left with nothing to lose', () => {
    const pieceId = firstIdOf('armor')
    const doc = v1Doc({
      phase: 'forfeit',
      missionInOperation: 3,
      rerollTokens: 0,
      wheel: { seed: 7, misfortuneId: 'noBackpacks', front: 'terminids' },
      lastReport: { outcome: 'failure', stars: 2 },
      offerSeed: null,
      personalInventories: { host: [pieceId] },
    })
    const migrated = normalizeSaveDoc(doc)!
    expect(migrated.state.phase).toBe('pacts')
    expect(migrated.state.wheel?.seed).toBe(7)
    expect(migrated.state.missionInOperation).toBe(1)
    expect(migrated.state.rerollTokens).toBe(1)
  })

  it('leaves a forfeit-phase crusade with real holdings untouched', () => {
    const doc = v1Doc({
      phase: 'forfeit',
      personalInventories: { host: [firstIdOf('armorPassive')] },
    })
    const migrated = normalizeSaveDoc(doc)!
    expect(migrated.state.phase).toBe('forfeit')
  })

  it('rejects malformed docs', () => {
    expect(normalizeSaveDoc(null)).toBeNull()
    expect(normalizeSaveDoc({ slotName: 'x' })).toBeNull()
  })
})
