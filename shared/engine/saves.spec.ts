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

// v1 docs predate v7 fields — overrides type loosely because legacy state is
// untrusted by design (normalizeSaveDoc re-validates).
function v1Doc(overrides: Record<string, unknown> = {}): SaveDoc {
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
      settings: { variant: 'standard' },
      divers: [],
      hostId: null,
      wheel: null,
      frontId: null,
      misfortuneAccepted: false,
      rerollTokens: 1,
      completedCombos: [],
      personalInventories: {},
      offerSeed: null,
      lastReport: null,
      actionLog: [],
      seedHistory: [],
      ...overrides,
      // Legacy shape: missing v7 fields on purpose, untrusted by design.
    } as unknown as SaveDoc['state'],
  }
}

describe('save migration v7 → v8 (alpha baseline freeze)', () => {
  it('defaults the pre-alpha fields into the frozen shape', () => {
    const doc = v1Doc({
      divers: [
        {
          id: 'host',
          name: 'Griffin',
          isHost: true,
          pactsLocked: false,
          pactIds: [],
          pickedOptionId: null,
          warbondCodes: [],
        },
      ],
    })
    const migrated = normalizeSaveDoc(doc)!
    expect(migrated.schemaVersion).toBe(SAVE_SCHEMA_VERSION)
    expect(migrated.state.legacyCaches).toEqual({})
    expect(migrated.state.bonusSeed).toBeNull()
    expect(migrated.state.bonusWinnerId).toBeNull()
    expect(migrated.state.divers[0]).toMatchObject({
      catchUpGranted: 0,
      catchUpOwed: 0,
      skipsCurrentDraft: false,
      failedPactIds: [],
      rewardTokens: 0,
      bannedItemIds: [],
      rewardRerollSeed: null,
      rewardBanned: false,
    })
  })

  it('defaults a v7 doc without re-running the legacy chain', () => {
    const doc: SaveDoc = { ...v1Doc(), schemaVersion: 7, engineVersion: 16 }
    const migrated = normalizeSaveDoc(doc)!
    expect(migrated.schemaVersion).toBe(SAVE_SCHEMA_VERSION)
    expect(migrated.engineVersion).toBe(ENGINE_VERSION)
    expect(migrated.state.divers).toEqual([])
  })
})

describe('save migration v8 → v9 (strains)', () => {
  it('defaults the strain fields and widens legacy combo keys', () => {
    const doc: SaveDoc = {
      ...v1Doc(),
      schemaVersion: 8,
      state: {
        ...v1Doc().state,
        completedCombos: ['noBackpacks:terminids', 'stealth:automatons'],
      },
    }
    const migrated = normalizeSaveDoc(doc)!
    expect(migrated.schemaVersion).toBe(SAVE_SCHEMA_VERSION)
    expect(migrated.state.strainId).toBeNull()
    expect(migrated.state.strainAccepted).toBe(false)
    expect(migrated.state.strainDecided).toBe(false)
    expect(migrated.state.completedCombos).toEqual([
      'noBackpacks:terminids:none',
      'stealth:automatons:none',
    ])
  })

  it('leaves already-widened combo keys untouched', () => {
    const doc: SaveDoc = {
      ...v1Doc(),
      schemaVersion: 8,
      state: {
        ...v1Doc().state,
        completedCombos: ['pacifist:illuminate:voteSnatchers'],
      },
    }
    const migrated = normalizeSaveDoc(doc)!
    expect(migrated.state.completedCombos).toEqual(['pacifist:illuminate:voteSnatchers'])
  })
})

describe('save migration v9 → v10 (Major Orders)', () => {
  it('defaults the Major Order to none', () => {
    const doc: SaveDoc = { ...v1Doc(), schemaVersion: 9 }
    const migrated = normalizeSaveDoc(doc)!
    expect(migrated.schemaVersion).toBe(SAVE_SCHEMA_VERSION)
    expect(migrated.state.majorOrder).toBeNull()
  })
})

// v1–v3 wheels carried the front; the legacy shape reads it during migration.
function legacyWheel(seed: number, misfortuneId: string, front: string): SaveDoc['state']['wheel'] {
  return { seed, misfortuneId, front } as SaveDoc['state']['wheel']
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
      wheel: legacyWheel(9, 'noBackpacks', 'terminids'),
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
      wheel: legacyWheel(7, 'noBackpacks', 'terminids'),
      lastReport: { outcome: 'failure', stars: 2 },
      offerSeed: null,
      personalInventories: { host: [pieceId] },
    })
    const migrated = normalizeSaveDoc(doc)!
    expect(migrated.state.phase).toBe('spin')
    expect(migrated.state.wheel).toBeNull()
    expect(migrated.state.frontId).toBe('terminids')
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

  it('accepts pre-v5 docs whose settings carried squad warbonds (diagnostics only)', () => {
    const doc = v1Doc()
    const settings = doc.state.settings as unknown as Record<string, unknown>
    settings.ownedWarbondCodes = ['warbond3']
    const migrated = normalizeSaveDoc(doc)
    expect(migrated).not.toBeNull()
    expect(migrated!.state.settings).toMatchObject({ variant: 'standard' })
    expect(migrated!.schemaVersion).toBe(SAVE_SCHEMA_VERSION)
  })
})

describe('save migration v3 → v4 (misfortune per mission, front on the state)', () => {
  it('moves the front off the wheel and keeps running missions coherent', () => {
    const doc = v1Doc({
      phase: 'pacts',
      missionIndex: 1,
      missionInOperation: 2,
      wheel: legacyWheel(11, 'noSentries', 'automatons'),
      misfortuneAccepted: true,
    })
    const migrated = normalizeSaveDoc(doc)!
    expect(migrated.state.frontId).toBe('automatons')
    expect(migrated.state.wheel).toEqual({ seed: 11, misfortuneId: 'noSentries' })
  })

  it('leaves frontless states (pre-spin, lobby, complete) with no front', () => {
    const migrated = normalizeSaveDoc(v1Doc())!
    expect(migrated.state.frontId).toBeNull()
    expect(migrated.state.wheel).toBeNull()
  })
})
