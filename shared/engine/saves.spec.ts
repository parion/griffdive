import { describe, expect, it } from 'vitest'
import { ITEMS_BY_ID } from '../data/catalog'
import { SAVE_SCHEMA_VERSION } from '../types/save'
import { ENGINE_VERSION } from './config'
import { createDiveState } from './reducer'
import { normalizeRoomState, normalizeSaveDoc } from './saves'
import type { DiveState } from './types'
import type { SaveDoc } from '../types/save'

// A v1 armor piece id; pieces have since left the catalog.
const LEGACY_PIECE_ID = 'af50noxiousranger'

function firstArmorPassiveId(): string {
  for (const item of ITEMS_BY_ID.values()) {
    if (item.category === 'armorPassive') {
      return item.id
    }
  }
  throw new Error('catalog has no armorPassive items')
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
      settings: { variant: 'medium' },
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
    expect(migrated.state.bonusWinnerIds).toEqual([])
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

describe('save migration v10 → v11 (broken team directives)', () => {
  it('defaults the failure mark to false', () => {
    const doc: SaveDoc = { ...v1Doc(), schemaVersion: 10 }
    const migrated = normalizeSaveDoc(doc)!
    expect(migrated.schemaVersion).toBe(SAVE_SCHEMA_VERSION)
    expect(migrated.state.misfortuneFailed).toBe(false)
  })
})

describe('save migration v11 → v12 (Requisition samples)', () => {
  it('defaults the sample purse to empty', () => {
    const doc: SaveDoc = {
      ...v1Doc({
        divers: [
          { id: 'host', name: 'Griffin', isHost: true, pactsLocked: false, pactIds: [], pickedOptionId: null, warbondCodes: [] },
        ],
      }),
      schemaVersion: 11,
    }
    const migrated = normalizeSaveDoc(doc)!
    expect(migrated.schemaVersion).toBe(SAVE_SCHEMA_VERSION)
    expect(migrated.state.divers[0]?.credits).toBe(0)
  })

  it('carries a banked sample purse over as credits', () => {
    const doc: SaveDoc = {
      ...v1Doc({
        divers: [
          { id: 'host', name: 'Griffin', isHost: true, pactsLocked: false, pactIds: [], pickedOptionId: null, warbondCodes: [], sampleBank: 42 },
        ],
      }),
      schemaVersion: 11,
    }
    const migrated = normalizeSaveDoc(doc)!
    expect(migrated.state.divers[0]?.credits).toBe(42)
  })
})

describe('save migration v15 → v16 (Brasch\'s Bargains)', () => {
  it('renames the purse to credits and deals the mission underway a shelf', () => {
    const state = createDiveState({ variant: 'medium' }, 'p1', 'Griffin')
    const { credits: _credits, bargain: _bargain, ...diver } = state.divers[0]!
    const doc: SaveDoc = {
      ...v1Doc(),
      schemaVersion: 15,
      state: { ...state, bargainSeed: undefined, divers: [{ ...diver, sampleBank: 42 }] } as unknown as DiveState,
    }
    const migrated = normalizeSaveDoc(doc)!
    expect(migrated.schemaVersion).toBe(SAVE_SCHEMA_VERSION)
    expect(migrated.state.divers[0]).not.toHaveProperty('sampleBank')
    expect(migrated.state.divers[0]?.credits).toBe(42)
    expect(migrated.state.bargainSeed).toEqual(expect.any(Number))
    expect(migrated.state.divers[0]?.bargain).toEqual({
      excludedIds: state.personalInventories.p1,
      boughtItemId: null,
      boughtKinds: [],
    })
  })
})

// v1–v3 wheels carried the front; the legacy shape reads it during migration.
function legacyWheel(seed: number, misfortuneId: string, front: string): SaveDoc['state']['wheel'] {
  return { seed, misfortuneId, front } as SaveDoc['state']['wheel']
}

describe('save migration v1 → v2 (armor passives)', () => {
  it('strips armor pieces from personal inventories, keeps passives', () => {
    const pieceId = LEGACY_PIECE_ID
    const passiveId = firstArmorPassiveId()
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
    const pieceId = LEGACY_PIECE_ID
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
      personalInventories: { host: [firstArmorPassiveId()] },
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
    expect(migrated!.state.settings).toMatchObject({ variant: 'medium' })
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

describe('save migration v12 → v13 (three difficulty variants + mode)', () => {
  function v12Doc(variant: string): SaveDoc {
    const doc = v1Doc()
    return {
      ...doc,
      schemaVersion: 12,
      state: { ...doc.state, settings: { variant } as unknown as SaveDoc['state']['settings'] },
    }
  }

  it('remaps the legacy squad-size variants to the difficulty variants', () => {
    for (const legacy of ['standard', 'soloDuo', 'super', 'soloDuoSuper']) {
      expect(normalizeSaveDoc(v12Doc(legacy))!.state.settings).toMatchObject({ variant: 'medium' })
    }
  })

  it('turns Quickplay into the suicide start with the SEAF mode', () => {
    expect(normalizeSaveDoc(v12Doc('quickplay'))!.state.settings)
      .toMatchObject({ variant: 'suicide', mode: 'seaf' })
  })

  it('leaves a settings-less lobby doc untouched', () => {
    const doc = v1Doc()
    doc.schemaVersion = 12
    doc.state.settings = null
    expect(normalizeSaveDoc(doc)!.state.settings).toBeNull()
  })
})

describe('save migration v14 → v15 (shared squad honors)', () => {
  it('maps a legacy single winner id to a one-element list', () => {
    const doc = v1Doc({ bonusWinnerId: 'host' }) as SaveDoc
    doc.schemaVersion = 14
    const migrated = normalizeSaveDoc(doc)!
    expect(migrated.schemaVersion).toBe(SAVE_SCHEMA_VERSION)
    expect(migrated.state.bonusWinnerIds).toEqual(['host'])
  })

  it('leaves an unawarded contest empty', () => {
    const doc = v1Doc()
    doc.schemaVersion = 14
    expect(normalizeSaveDoc(doc)!.state.bonusWinnerIds).toEqual([])
  })
})

describe('room state normalization (unversioned storage)', () => {
  it('remaps a legacy variant even under the current schema version', () => {
    const doc = v1Doc()
    doc.schemaVersion = SAVE_SCHEMA_VERSION
    doc.state.settings = { variant: 'quickplay' } as unknown as SaveDoc['state']['settings']
    expect(normalizeSaveDoc(doc)!.state.settings).toEqual({ variant: 'suicide', mode: 'seaf' })
  })

  it('remaps pre-v13 variants and fills fields that postdate the room', () => {
    const state = createDiveState({ variant: 'medium' }, 'p1', 'Griffin')
    const legacy = {
      ...state,
      settings: { variant: 'quickplay' },
      misfortuneFailed: undefined,
      divers: [{ ...state.divers[0]!, credits: undefined, away: undefined }],
    } as unknown as DiveState
    const normalized = normalizeRoomState(legacy)
    expect(normalized.settings).toEqual({ variant: 'suicide', mode: 'seaf' })
    expect(normalized.misfortuneFailed).toBe(false)
    expect(normalized.divers[0]?.credits).toBe(0)
    expect(normalized.divers[0]?.away).toBe(false)
  })

  it('never overwrites live state', () => {
    const state = createDiveState({ variant: 'hard', mode: 'penance' }, 'p1', 'Griffin')
    const live = {
      ...state,
      misfortuneFailed: true,
      divers: state.divers.map(diver => ({ ...diver, credits: 42, away: true })),
    }
    const normalized = normalizeRoomState(live)
    expect(normalized.settings).toEqual({ variant: 'hard', mode: 'penance' })
    expect(normalized.misfortuneFailed).toBe(true)
    expect(normalized.divers[0]).toMatchObject({ credits: 42, away: true })
  })
})
