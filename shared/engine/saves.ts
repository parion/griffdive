import { CATALOG_VERSION, ITEMS_BY_ID } from '../data/catalog'
import type { FrontId } from '../data/fronts'
import { SAVE_SCHEMA_VERSION } from '../types/save'
import type { SaveDoc } from '../types/save'
import { ENGINE_VERSION } from './config'
import { earnedKit } from './progression'
import { resetOperation } from './reducer'
import { hashString } from './rng'
import type { CrusadeVariant, DiveState, DiverState, LegacyCache } from './types'

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
  if (migrated.schemaVersion < 10) {
    migrated = migrateV9toV10(migrated)
  }
  if (migrated.schemaVersion < 11) {
    migrated = migrateV10toV11(migrated)
  }
  if (migrated.schemaVersion < 12) {
    migrated = migrateV11toV12(migrated)
  }
  if (migrated.schemaVersion < 13) {
    migrated = migrateV12toV13(migrated)
  }
  if (migrated.schemaVersion < 14) {
    migrated = migrateV13toV14(migrated)
  }
  if (migrated.schemaVersion < 15) {
    migrated = migrateV14toV15(migrated)
  }
  if (migrated.schemaVersion < 16) {
    migrated = migrateV15toV16(migrated)
  }
  if (migrated.schemaVersion < 17) {
    migrated = migrateV16toV17(migrated)
  }
  migrated.schemaVersion = SAVE_SCHEMA_VERSION
  migrated.engineVersion = Math.max(migrated.engineVersion, ENGINE_VERSION)
  // A session mirror can carry a pre-v13 room's settings under the current
  // schema version (a room is normalized on read, but a mirror written before
  // that normalization existed is not), so the variant remap and the field
  // defaults also run unconditionally.
  return { ...migrated, state: normalizeRoomState(migrated.state) }
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
      bonusWinnerIds: [],
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
      strainDecided: false,
      completedCombos: (doc.state.completedCombos ?? []).map((key) => {
        const parts = key.split(':')
        return parts.length >= 3 ? key : `${key}:none`
      }),
    },
  }
}

// v10: Major Orders landed. An operation can be pinned to the live MO's
// front(s) and banks an extra reroll token on completion; pre-v10 saves carry
// no commitment, and the next operation reopens the call anyway.
function migrateV9toV10(doc: SaveDoc): SaveDoc {
  return {
    ...doc,
    state: {
      ...doc.state,
      majorOrder: null,
    },
  }
}

// v11: a broken team directive can be marked failed in the field — its shared
// risk is voided and each diver forfeits one reward option. Pre-v11 saves carry
// no failure mark, and the next mission reset clears it anyway.
function migrateV10toV11(doc: SaveDoc): SaveDoc {
  return {
    ...doc,
    state: {
      ...doc.state,
      misfortuneFailed: false,
    },
  }
}

// A pre-v17 diver's purse, before sample points were renamed to credits.
type LegacyPurse = Partial<DiverState> & { sampleBank?: number }

// v12: samples became Requisition currency — a personal purse banked from each
// mission's haul and spent in the post-draft rotating stock. Pre-v12 saves have
// no purse; an empty bank is the truthful default.
function migrateV11toV12(doc: SaveDoc): SaveDoc {
  return {
    ...doc,
    state: {
      ...doc.state,
      divers: (doc.state.divers ?? []).map(diver => ({
        ...diver,
        sampleBank: (diver as LegacyPurse).sampleBank ?? 0,
      })),
    },
  }
}

// v13: the five squad-size/kit variants collapsed into three starting
// difficulties (medium/hard/suicide) with a hard/suicide mode. Old ids remap by
// start altitude; Quickplay's extra gear becomes the SEAF Support Package mode.
// The in-flight difficulty is untouched — a legacy difficulty-4 start now reads
// against a difficulty-3 baseline, which only shifts joiner catch-up by one op.
const LEGACY_VARIANT_MAP: Readonly<Record<string, CrusadeVariant>> = {
  standard: 'medium',
  soloDuo: 'medium',
  super: 'medium',
  soloDuoSuper: 'medium',
  quickplay: 'suicide',
}

function migrateV12toV13(doc: SaveDoc): SaveDoc {
  const settings = doc.state.settings
  if (!settings) {
    return doc
  }
  const legacyVariant = settings.variant as string
  return {
    ...doc,
    state: {
      ...doc.state,
      settings: {
        variant: LEGACY_VARIANT_MAP[legacyVariant] ?? 'medium',
        mode: legacyVariant === 'quickplay' ? 'seaf' : undefined,
      },
    },
  }
}

// Rooms persist without a schema version (see server-architecture.md), so the
// versioned chain above cannot run on them: it would wipe live fields that
// predate a step (a re-run of v9→v10 would drop a pinned Major Order). This is
// the idempotent subset applied to stored room states and to every save doc as
// the chain's tail — it remaps pre-v13 variant ids and fills only fields that
// are absent, never overwriting a value the state already holds.
export function normalizeRoomState(state: DiveState): DiveState {
  let settings = state.settings
  if (settings) {
    const legacyVariant = settings.variant as string
    const mapped = LEGACY_VARIANT_MAP[legacyVariant]
    if (mapped) {
      settings = {
        variant: mapped,
        mode: legacyVariant === 'quickplay' ? 'seaf' : undefined,
      }
    }
  }
  return {
    ...state,
    settings,
    ...repairKits(state, settings),
    misfortuneFailed: state.misfortuneFailed ?? false,
    bonusWinnerIds: Array.isArray(state.bonusWinnerIds)
      ? state.bonusWinnerIds
      : legacyWinnerIds(state),
    bargainSeed: state.bargainSeed ?? (state.settings ? hashString(state.hostId ?? '') : null),
    divers: (state.divers ?? []).map((diver) => {
      const { sampleBank, ...rest } = diver as LegacyPurse & DiverState
      return {
        ...rest,
        credits: rest.credits ?? sampleBank ?? 0,
        bargain: rest.bargain ?? (state.settings ? legacyBargain(state, rest) : null),
        away: rest.away ?? false,
      }
    }),
  }
}

// A crusade saved before Brasch's Bargains became an always-open shop has no
// deal for the mission underway: deal one against what the diver holds now, as
// for a diver seated mid-crusade.
function legacyBargain(state: DiveState, diver: DiverState): DiverState['bargain'] {
  return {
    excludedIds: [...(state.personalInventories?.[diver.id] ?? []), ...(diver.bannedItemIds ?? [])],
    boughtItemId: null,
    boughtKinds: [],
  }
}

// Caches once parked whole inventories and claims stacked them onto the
// starting kit, so earlier rooms carry repeated ids and starting-kit-only
// caches. Inventories become sets and caches keep only earned gear.
function repairKits(
  state: DiveState,
  settings: DiveState['settings'],
): Pick<DiveState, 'personalInventories' | 'legacyCaches'> {
  const personalInventories = Object.fromEntries(
    Object.entries(state.personalInventories ?? {}).map(([id, items]) => [id, [...new Set(items)]]),
  )
  const legacyCaches: Record<string, LegacyCache> = {}
  for (const [id, raw] of Object.entries(state.legacyCaches ?? {})) {
    const cache = cacheOf(raw)
    const itemIds = settings ? earnedKit(cache.itemIds, settings.variant, settings.mode) : [...new Set(cache.itemIds)]
    if (itemIds.length > 0) {
      legacyCaches[id] = { name: cache.name, itemIds }
    }
  }
  return { personalInventories, legacyCaches }
}

// Before v16 a cache was a bare item list; the departed diver's name was never
// kept, so those kits read as an anonymous fallen diver.
const UNNAMED_CACHE = 'Fallen diver'

function cacheOf(raw: unknown): LegacyCache {
  if (Array.isArray(raw)) {
    return { name: UNNAMED_CACHE, itemIds: raw.filter((id): id is string => typeof id === 'string') }
  }
  const cache = (raw ?? {}) as Partial<LegacyCache>
  return {
    name: typeof cache.name === 'string' && cache.name.trim() ? cache.name : UNNAMED_CACHE,
    itemIds: Array.isArray(cache.itemIds) ? cache.itemIds.filter((id): id is string => typeof id === 'string') : [],
  }
}

// v16: a cache names the diver who carried it ({ name, itemIds } instead of
// a bare item list). Rooms are unversioned, so normalizeRoomState performs the
// same reshape; this step pins it to the version.
function migrateV15toV16(doc: SaveDoc): SaveDoc {
  return {
    ...doc,
    state: {
      ...doc.state,
      legacyCaches: Object.fromEntries(
        Object.entries(doc.state.legacyCaches ?? {}).map(([id, raw]) => [id, cacheOf(raw)]),
      ),
    },
  }
}

// A state saved before honors became shareable carries a single
// `bonusWinnerId` instead of a list.
function legacyWinnerIds(state: DiveState): string[] {
  const legacy = state as DiveState & { bonusWinnerId?: unknown }
  return typeof legacy.bonusWinnerId === 'string' ? [legacy.bonusWinnerId] : []
}

// v14: presence entered the state — a diver who steps away keeps their seat but
// stops gating the squad. Every diver in an older save was present.
function migrateV13toV14(doc: SaveDoc): SaveDoc {
  return {
    ...doc,
    state: {
      ...doc.state,
      divers: (doc.state.divers ?? []).map(diver => ({
        ...diver,
        away: (diver as Partial<DiverState>).away ?? false,
      })),
    },
  }
}

// v15: squad honors can be shared. A tie on HD2's stats screen honors every
// tied diver, so the single winner id became a list. A legacy award maps to a
// one-element list; an unawarded contest stays empty.
function migrateV14toV15(doc: SaveDoc): SaveDoc {
  return {
    ...doc,
    state: {
      ...doc.state,
      bonusWinnerIds: legacyWinnerIds(doc.state),
    },
  }
}

// v17: Brasch's Bargains became an always-open shop paid in credits. The
// sample purse carries over as credits; the deal itself is filled in by
// normalizeRoomState, which rooms share.
function migrateV16toV17(doc: SaveDoc): SaveDoc {
  return {
    ...doc,
    state: {
      ...doc.state,
      divers: (doc.state.divers ?? []).map((diver) => {
        const { sampleBank, ...rest } = diver as LegacyPurse & DiverState
        return { ...rest, credits: sampleBank ?? 0 }
      }),
    },
  }
}

// v2: armor rewards became passives — armor pieces left the catalog, so any
// piece ids still held from v1 inventories no longer resolve and get stripped.
// A crusade paused mid-forfeit whose holdings were all armor has nothing left
// to lose: restart the operation exactly as the reducer's empty-holdings path.
// The front persists across the restart; the retry draws a fresh misfortune,
// so the phase resumes at spin.
function migrateV1toV2(doc: SaveDoc): SaveDoc {
  const personalInventories: Record<string, string[]> = {}
  for (const [diverId, ids] of Object.entries(doc.state.personalInventories ?? {})) {
    personalInventories[diverId] = ids.filter((id) => {
      const item = ITEMS_BY_ID.get(id)
      return item !== undefined
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
