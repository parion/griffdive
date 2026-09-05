import { CATALOG_VERSION, ITEMS_BY_ID } from '../data/catalog'
import { SAVE_SCHEMA_VERSION } from '../types/save'
import type { SaveDoc } from '../types/save'
import { ENGINE_VERSION } from './config'
import { resetOperation } from './reducer'
import type { DiveState } from './types'

export function createSaveDoc(state: DiveState, slotName: string, savedAt: string): SaveDoc {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    engineVersion: ENGINE_VERSION,
    catalogVersion: CATALOG_VERSION,
    savedAt,
    slotName,
    state,
  }
}

export function normalizeSaveDoc(raw: unknown): SaveDoc | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }
  const doc = raw as Partial<SaveDoc>
  if (
    typeof doc.schemaVersion !== 'number'
    || typeof doc.engineVersion !== 'number'
    || typeof doc.catalogVersion !== 'number'
    || typeof doc.savedAt !== 'string'
    || typeof doc.slotName !== 'string'
    || !doc.state
    || typeof doc.state !== 'object'
    || typeof doc.state.phase !== 'string'
    || typeof doc.state.difficulty !== 'number'
  ) {
    return null
  }
  return migrateSaveDoc(doc as SaveDoc)
}

// Migration chain: bump SAVE_SCHEMA_VERSION, then rewrite older shapes here
// step by step. v1 is the baseline.
export function migrateSaveDoc(doc: SaveDoc): SaveDoc {
  let migrated = doc
  if (migrated.schemaVersion < 2) {
    migrated = migrateV1toV2(migrated)
  }
  if (migrated.schemaVersion < 3) {
    migrated = migrateV2toV3(migrated)
  }
  migrated.schemaVersion = SAVE_SCHEMA_VERSION
  migrated.engineVersion = Math.max(migrated.engineVersion, ENGINE_VERSION)
  return migrated
}

// v2: armor rewards became passives — armor pieces are free shells, so any
// piece ids still held from v1 inventories are dead weight and get stripped.
// A crusade paused mid-forfeit whose holdings were all armor has nothing left
// to lose: restart the operation exactly as the reducer's empty-holdings path.
// The wheel persists across the restart, so the phase resumes at pacts.
function migrateV1toV2(doc: SaveDoc): SaveDoc {
  const personalInventories: Record<string, string[]> = {}
  for (const [diverId, ids] of Object.entries(doc.state.personalInventories ?? {})) {
    personalInventories[diverId] = ids.filter((id) => {
      const item = ITEMS_BY_ID.get(id)
      return item !== undefined && item.category !== 'armor'
    })
  }
  const state: DiveState = { ...doc.state, personalInventories }
  const holdingsEmpty = state.sharedStratagemIds.length === 0
    && Object.values(personalInventories).every(ids => ids.length === 0)
  if (state.phase === 'forfeit' && holdingsEmpty) {
    return {
      ...doc,
      state: { ...state, ...resetOperation(state), phase: 'pacts' },
    }
  }
  return {
    ...doc,
    state,
  }
}

// v3: team misfortunes became optional. Old saves ran under forced
// misfortunes, so any state holding a wheel counts as accepted; the spin and
// lobby phases had nothing in force yet.
function migrateV2toV3(doc: SaveDoc): SaveDoc {
  return {
    ...doc,
    state: {
      ...doc.state,
      misfortuneAccepted: doc.state.wheel !== null,
    },
  }
}
