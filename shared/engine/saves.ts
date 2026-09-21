import { CATALOG_VERSION, ITEMS_BY_ID } from '../data/catalog'
import type { FrontId } from '../data/fronts'
import { SAVE_SCHEMA_VERSION } from '../types/save'
import type { SaveDoc } from '../types/save'
import { ENGINE_VERSION } from './config'
import { resetOperation } from './reducer'
import type { DiveState, DiverState } from './types'

// Pre-v8 (pre-alpha) divers may be missing any field whose shape landed after
// their save was written — Field Promotion bookkeeping, failed-pact marks,
// reward tokens, bans and the bonus-honors ceremony all default in
// migrateV7toV8.
type LegacyDiver = Omit<
  DiverState,
  | 'catchUpGranted'
  | 'catchUpOwed'
  | 'skipsCurrentDraft'
  | 'failedPactIds'
  | 'rewardTokens'
  | 'bannedItemIds'
  | 'rewardRerollSeed'
  | 'rewardBanned'
>
& Partial<Pick<
  DiverState,
  | 'catchUpGranted'
  | 'catchUpOwed'
  | 'skipsCurrentDraft'
  | 'failedPactIds'
  | 'rewardTokens'
  | 'bannedItemIds'
  | 'rewardRerollSeed'
  | 'rewardBanned'
>>

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

// The save schema is frozen from alpha (v8) on: every later shape change adds
// a version-gated step here (see AGENTS.md, Save model). The chain resumes at
// v7 → v8, the alpha baseline, which defaults the fields whose shapes landed
// during pre-alpha. v5 moved warbond ownership to each diver; v6 dropped the
// shared stratagem pool (all stratagems are personal) — no migration steps:
// pre-v6 divers read their personal inventories only, and stratagems that
// lived in the old shared pool are gone.
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
  if (migrated.schemaVersion < 8) {
    migrated = migrateV7toV8(migrated)
  }
  if (migrated.schemaVersion < 9) {
    migrated = migrateV8toV9(migrated)
  }
  migrated.schemaVersion = SAVE_SCHEMA_VERSION
  migrated.engineVersion = Math.max(migrated.engineVersion, ENGINE_VERSION)
  return migrated
}

// v8 (alpha baseline): the schema freezes here. Pre-alpha docs predate the
// Field Promotion bookkeeping, failed-pact marks, reward tokens, bans and the
// bonus-honors ceremony; this step defaults them into the frozen shape.
function migrateV7toV8(doc: SaveDoc): SaveDoc {
  return {
    ...doc,
    state: {
      ...doc.state,
      legacyCaches: doc.state.legacyCaches ?? {},
      bonusSeed: doc.state.bonusSeed ?? null,
      bonusWinnerId: doc.state.bonusWinnerId ?? null,
      divers: (doc.state.divers ?? []).map((diver) => {
        const legacy = diver as LegacyDiver
        return {
          ...legacy,
          catchUpGranted: legacy.catchUpGranted ?? 0,
          catchUpOwed: legacy.catchUpOwed ?? 0,
          skipsCurrentDraft: legacy.skipsCurrentDraft ?? false,
          // Pre-v8 saves carry no failed-pact marks — an empty list is the
          // truthful default for them.
          failedPactIds: legacy.failedPactIds ?? [],
          rewardTokens: legacy.rewardTokens ?? 0,
          bannedItemIds: legacy.bannedItemIds ?? [],
          rewardRerollSeed: legacy.rewardRerollSeed ?? null,
          rewardBanned: legacy.rewardBanned ?? false,
        }
      }),
    },
  }
}

// v9: strains landed. A front now draws an optional subfaction whose risk can
// be accepted for the whole operation; pre-v9 saves have no strain, and the
// completed-combo key gained a strain segment. Legacy two-part keys are
// rewritten with the 'none' suffix — they can never match a drawn strain, so
// the stricter combo economy applies from here on (intended).
function migrateV8toV9(doc: SaveDoc): SaveDoc {
  return {
    ...doc,
    state: {
      ...doc.state,
      strainId: null,
      strainAccepted: false,
      completedCombos: (doc.state.completedCombos ?? []).map((key) => {
        const parts = key.split(':')
        return parts.length >= 3 ? key : `${key}:none`
      }),
    },
  }
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
