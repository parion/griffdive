import { CATALOG_VERSION, ITEMS_BY_ID } from '../data/catalog'
import type { FrontId } from '../data/fronts'
import { SAVE_SCHEMA_VERSION } from '../types/save'
import type { SaveDoc } from '../types/save'
import { ENGINE_VERSION } from './config'
import { resetOperation } from './reducer'
import type { DiveState, DiverState } from './types'

// Divers from pre-v7 docs predate the Field Promotion bookkeeping.
type LegacyDiver = Omit<DiverState, 'catchUpGranted' | 'catchUpOwed' | 'skipsCurrentDraft'>
  & Partial<Pick<DiverState, 'catchUpGranted' | 'catchUpOwed' | 'skipsCurrentDraft'>>

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

// Legacy chain (v1→v4), frozen pre-alpha: saves are not migratable while
// mechanics are in flux (see AGENTS.md, Save model). The chain reopens at the
// alpha release, when the schema freezes. v5 moved warbond ownership to each
// diver; v6 dropped the shared stratagem pool (all stratagems are personal) —
// no migration steps: pre-v6 divers read their personal inventories only, and
// stratagems that lived in the old shared pool are gone.
export function migrateSaveDoc(doc: SaveDoc): SaveDoc {
  let migrated = doc
  if (migrated.schemaVersion < 2) {
    migrated = migrateV1toV2(migrated)
  }
  if (migrated.schemaVersion < 3) {
    migrated = migrateV2toV3(migrated)
  }
  if (migrated.schemaVersion < 4) {
    migrated = migrateV3toV4(migrated)
  }
  // v7 fields (Field Promotion + legacy caches) default on older docs —
  // shape defaulting, not a migration step (pre-alpha policy, Save model).
  migrated = {
    ...migrated,
    state: {
      ...migrated.state,
      legacyCaches: migrated.state.legacyCaches ?? {},
      divers: (migrated.state.divers ?? []).map((diver) => {
        const legacy = diver as LegacyDiver
        return {
          ...legacy,
          catchUpGranted: legacy.catchUpGranted ?? 0,
          catchUpOwed: legacy.catchUpOwed ?? 0,
          skipsCurrentDraft: legacy.skipsCurrentDraft ?? false,
        }
      }),
    },
  }
  migrated.schemaVersion = SAVE_SCHEMA_VERSION
  migrated.engineVersion = Math.max(migrated.engineVersion, ENGINE_VERSION)
  return migrated
}

// v2: armor rewards became passives — armor pieces are free shells, so any
// piece ids still held from v1 inventories are dead weight and get stripped.
// A crusade paused mid-forfeit whose holdings were all armor has nothing left
// to lose: restart the operation exactly as the reducer's empty-holdings path.
// The front persists across the restart; the retry draws a fresh misfortune,
// so the phase resumes at spin.
function migrateV1toV2(doc: SaveDoc): SaveDoc {
  const personalInventories: Record<string, string[]> = {}
  for (const [diverId, ids] of Object.entries(doc.state.personalInventories ?? {})) {
    personalInventories[diverId] = ids.filter((id) => {
      const item = ITEMS_BY_ID.get(id)
      return item !== undefined && item.category !== 'armor'
    })
  }
  const state: DiveState = { ...doc.state, personalInventories }
  const holdingsEmpty = Object.values(personalInventories).every(ids => ids.length === 0)
  if (state.phase === 'forfeit' && holdingsEmpty) {
    // resetOperation drops the wheel (the retry draws a fresh misfortune), so
    // salvage the legacy front first — the front persists across the restart.
    const legacyWheel = state.wheel as (typeof state.wheel & { front?: FrontId }) | null
    const frontId = state.frontId ?? legacyWheel?.front ?? null
    return {
      ...doc,
      state: { ...state, ...resetOperation(state), frontId },
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

// v4: one misfortune per mission — the front moved off the wheel. It is drawn
// once per operation and now lives on the state; running missions keep the
// front their wheel carried and finish under their drawn misfortune.
function migrateV3toV4(doc: SaveDoc): SaveDoc {
  const wheel = doc.state.wheel
  const legacyWheel = wheel as (typeof wheel & { front?: FrontId }) | null
  return {
    ...doc,
    state: {
      ...doc.state,
      frontId: doc.state.frontId ?? legacyWheel?.front ?? null,
      wheel: wheel
        ? { seed: wheel.seed, misfortuneId: wheel.misfortuneId }
        : null,
    },
  }
}
