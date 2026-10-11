import { ALL_WARBOND_CODES } from '../data/catalog'
import { FRONTS } from '../data/fronts'
import type { FrontId } from '../data/fronts'
import { STRAINS } from '../data/strains'
import {
  ACTION_LOG_CAP,
  CATCHUP_CAP,
  MAX_DIFFICULTY,
  MAX_NAME_LENGTH,
  MIN_DIFFICULTY,
  REROLL_TOKENS_PER_OPERATION,
  REWARD_TOKEN_CAP,
  SQUAD_SIZE_MAX,
  missionsPerOperation,
} from './config'
import { VARIANTS, catchUpOpsBehind, startingItemIds } from './progression'
import type { DivePhase, DiveState, DiverState, MajorOrderSelection, WheelResult } from './types'

// A freshly created room: no settings, no divers. The first joiner becomes
// host; START_DIVE applies the variant kit to everyone present.
export function createLobbyState(): DiveState {
  return {
    phase: 'lobby',
    difficulty: MIN_DIFFICULTY,
    missionIndex: 0,
    missionInOperation: 1,
    achieved: false,
    settings: null,
    divers: [],
    hostId: null,
    wheel: null,
    frontId: null,
    misfortuneAccepted: false,
    misfortuneFailed: false,
    strainId: null,
    strainAccepted: false,
    strainDecided: false,
    majorOrder: null,
    rerollTokens: REROLL_TOKENS_PER_OPERATION,
    completedCombos: [],
    personalInventories: {},
    legacyCaches: {},
    offerSeed: null,
    lastReport: null,
    bonusSeed: null,
    bonusWinnerIds: [],
    actionLog: [],
    seedHistory: [],
  }
}

// Rewards and forfeit resolve the mission that just ended: seating there
// would grant a draft (or stall forfeit) for a mission the joiner never
// dove. Complete crusades have nothing left to join.
const SEATABLE_PHASES: readonly DivePhase[] = ['lobby', 'spin', 'decision', 'strain', 'deal', 'pacts', 'diving']

// Human-readable reason a fresh join cannot seat right now, or null when it
// can. The server sends this verbatim; joinDiver enforces the same rule.
export function seatingBlocked(state: DiveState): string | null {
  if (state.divers.length >= SQUAD_SIZE_MAX) {
    return 'Dive squad is full'
  }
  if (!SEATABLE_PHASES.includes(state.phase)) {
    return 'The squad is resolving the mission — join between missions'
  }
  return null
}

// Returns null when the squad is full or the dive is past its seating window.
// Re-joining with a known playerId is idempotent (reconnect path).
export function joinDiver(state: DiveState, playerId: string, name: string): DiveState | null {
  if (state.divers.some(diver => diver.id === playerId)) {
    return state
  }
  if (seatingBlocked(state)) {
    return null
  }
  const isHost = state.divers.length === 0
  // A departed diver rejoining under the same playerId reclaims their parked
  // cache — the same Helldiver, not a replacement.
  const restoredCache = state.legacyCaches[playerId]
  const legacyCaches = Object.fromEntries(
    Object.entries(state.legacyCaches).filter(([id]) => id !== playerId),
  )
  let inventory: string[]
  let catchUpGranted = 0
  if (restoredCache) {
    inventory = restoredCache
  }
  else {
    inventory = state.settings ? startingItemIds(state.settings.variant, state.settings.mode) : []
    if (state.settings) {
      catchUpGranted = Math.min(
        CATCHUP_CAP,
        catchUpOpsBehind(state.difficulty, state.settings.variant),
      )
    }
  }
  const diver: DiverState = {
    id: playerId,
    name,
    isHost,
    pactsLocked: false,
    pactIds: [],
    failedPactIds: [],
    pickedOptionId: null,
    // Warbonds are personal purchases — every diver declares their own set
    // (self-service SET_WARBONDS); the app defaults to all.
    warbondCodes: [...ALL_WARBOND_CODES],
    catchUpGranted,
    catchUpOwed: catchUpGranted,
    skipsCurrentDraft: state.phase === 'diving',
    rewardTokens: 0,
    // Requisition currency is personal and does not survive leaving a dive:
    // a rejoining Helldiver starts their purse empty again.
    sampleBank: 0,
    bannedItemIds: [],
    rewardRerollSeed: null,
    rewardBanned: false,
    away: false,
  }
  return {
    ...state,
    divers: [...state.divers, diver],
    hostId: isHost ? playerId : state.hostId,
    legacyCaches,
    personalInventories: { ...state.personalInventories, [playerId]: inventory },
  }
}

// A complete crusade has nothing left to continue; every other phase resumes
// exactly where the save stopped.
const FORKABLE_PHASES: readonly DivePhase[] = ['lobby', 'spin', 'decision', 'strain', 'deal', 'pacts', 'diving', 'rewards', 'forfeit']

// Phases whose decisions all read the wheel: a forked save without one could
// never decide or report, so such a snapshot is refused instead of soft-locked.
const WHEEL_PHASES: readonly DivePhase[] = ['decision', 'strain', 'deal', 'pacts', 'diving', 'rewards']

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : fallback
  return Math.min(Math.max(n, min), max)
}

function stringArray(value: unknown, cap = 300): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter((entry): entry is string => typeof entry === 'string').slice(0, cap)
}

// Honors can be shared — a tie names every tied diver — so winners live in a
// list. A room stored before that change carries a single `bonusWinnerId`; read
// either shape. Rooms are unversioned, so this mirrors the save chain's
// v14 → v15 step.
function sanitizeBonusWinnerIds(state: DiveState): string[] {
  if (Array.isArray(state.bonusWinnerIds)) {
    return stringArray(state.bonusWinnerIds)
  }
  const legacy = state as DiveState & { bonusWinnerId?: unknown }
  return typeof legacy.bonusWinnerId === 'string' ? [legacy.bonusWinnerId] : []
}

// A forked save is client-supplied: normalizeSaveDoc only validates the outer
// dive, so every diver field is defaulted here. A malformed snapshot must
// never seat a half-shaped diver or smuggle an unbounded list into storage.
function sanitizeDiver(raw: unknown): DiverState | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }
  const diver = raw as Partial<DiverState>
  if (typeof diver.id !== 'string' || diver.id.length === 0 || diver.id.length > 64) {
    return null
  }
  return {
    id: diver.id,
    name: typeof diver.name === 'string' ? diver.name.slice(0, MAX_NAME_LENGTH) : 'Diver',
    isHost: diver.isHost === true,
    pactsLocked: diver.pactsLocked === true,
    pactIds: stringArray(diver.pactIds),
    failedPactIds: stringArray(diver.failedPactIds),
    pickedOptionId: typeof diver.pickedOptionId === 'string' ? diver.pickedOptionId : null,
    forfeitedItemId: typeof diver.forfeitedItemId === 'string' ? diver.forfeitedItemId : null,
    warbondCodes: stringArray(diver.warbondCodes),
    catchUpGranted: clampInt(diver.catchUpGranted, 0, CATCHUP_CAP, 0),
    catchUpOwed: clampInt(diver.catchUpOwed, 0, CATCHUP_CAP, 0),
    skipsCurrentDraft: diver.skipsCurrentDraft === true,
    rewardTokens: clampInt(diver.rewardTokens, 0, REWARD_TOKEN_CAP, 0),
    sampleBank: clampInt(diver.sampleBank, 0, 1_000_000, 0),
    bannedItemIds: stringArray(diver.bannedItemIds),
    rewardRerollSeed: typeof diver.rewardRerollSeed === 'number' && Number.isFinite(diver.rewardRerollSeed)
      ? diver.rewardRerollSeed
      : null,
    rewardBanned: diver.rewardBanned === true,
    draftExcludedIds: Array.isArray(diver.draftExcludedIds) ? stringArray(diver.draftExcludedIds, 2000) : null,
    away: false,
  }
}

function sanitizeWheel(raw: unknown): WheelResult | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }
  const wheel = raw as Partial<WheelResult>
  if (typeof wheel.seed !== 'number' || !Number.isFinite(wheel.seed) || typeof wheel.misfortuneId !== 'string' || !wheel.misfortuneId) {
    return null
  }
  return { seed: wheel.seed, misfortuneId: wheel.misfortuneId }
}

function sanitizeMajorOrder(raw: unknown): MajorOrderSelection | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }
  const order = raw as Partial<MajorOrderSelection>
  const known = new Set<string>(FRONTS.map(front => front.id))
  const fronts = Array.isArray(order.fronts)
    ? [...new Set(order.fronts)].filter((id): id is FrontId => typeof id === 'string' && known.has(id))
    : []
  if (fronts.length === 0) {
    return null
  }
  const selection: MajorOrderSelection = { fronts }
  if (order.live === true) {
    selection.live = true
  }
  if (typeof order.title === 'string' && order.title.trim()) {
    selection.title = order.title.trim().slice(0, 120)
  }
  if (typeof order.expiresAt === 'string') {
    selection.expiresAt = order.expiresAt.slice(0, 40)
  }
  if (Array.isArray(order.planets)) {
    selection.planets = order.planets.slice(0, 20).flatMap((planet) => {
      if (!planet || typeof planet !== 'object') {
        return []
      }
      const entry = planet as { index?: unknown, name?: unknown, front?: unknown, liberation?: unknown }
      if (typeof entry.front !== 'string' || !known.has(entry.front) || typeof entry.name !== 'string') {
        return []
      }
      return [{
        index: clampInt(entry.index, 0, 1000, 0),
        name: entry.name.slice(0, 80),
        front: entry.front as FrontId,
        liberation: clampInt(entry.liberation, 0, 100, 0),
      }]
    })
  }
  return selection
}

// A forked host is the only diver left at the forfeit screen, so nobody may be
// left to choose: nothing earned beyond the starting kit, a mid-mission seating
// that dove nothing,
// or an item already chosen with every other diver gone. The failure would
// deadlock. Resolve it the way the reducer settles a forfeit: apply the chosen
// item, or — when the host owed nothing — strip one item from a parked cache
// (the squad's loss still stands), then restart the operation. Mirrors
// resetOperation.
function resolveStrandedForfeit(state: DiveState): DiveState {
  if (state.phase !== 'forfeit') {
    return state
  }
  const owner = state.divers[0]
  if (!owner) {
    return state
  }
  const kit = state.personalInventories[owner.id] ?? []
  const chosen = owner.forfeitedItemId ?? null
  const starting = new Set(state.settings
    ? startingItemIds(state.settings.variant, state.settings.mode)
    : [])
  const owes = !owner.skipsCurrentDraft && kit.some(id => !starting.has(id))
  if (!chosen && owes) {
    return state
  }
  let legacyCaches = state.legacyCaches
  if (!chosen) {
    for (const [id, items] of Object.entries(legacyCaches)) {
      if (items.length > 0) {
        legacyCaches = { ...legacyCaches, [id]: items.slice(1) }
        break
      }
    }
  }
  return {
    ...state,
    personalInventories: chosen
      ? { ...state.personalInventories, [owner.id]: kit.filter(id => id !== chosen) }
      : state.personalInventories,
    phase: 'spin',
    missionInOperation: 1,
    rerollTokens: REROLL_TOKENS_PER_OPERATION,
    wheel: null,
    misfortuneAccepted: false,
    misfortuneFailed: false,
    strainAccepted: false,
    strainDecided: false,
    offerSeed: null,
    lastReport: null,
    bonusSeed: null,
    bonusWinnerIds: [],
    divers: state.divers.map(diver => ({
      ...diver,
      pactsLocked: false,
      pactIds: [],
      failedPactIds: [],
      pickedOptionId: null,
      forfeitedItemId: null,
      skipsCurrentDraft: false,
      rewardRerollSeed: null,
      rewardBanned: false,
      draftExcludedIds: null,
    })),
    legacyCaches,
  }
}

// Seed a brand-new room from a personal session save: the forker takes their
// seat as host exactly where the crusade stopped, and every other diver leaves
// — their kits park as legacy caches any new joiner can claim instead of a
// Field Promotion. No past-player matching: caches are communal gear. Returns
// null when the save cannot be continued (complete crusade or malformed wheel
// state); an unstarted lobby continues as a fresh lobby.
export function forkCrusade(
  state: DiveState,
  preferredOwnerId?: string | null,
  name?: string,
): DiveState | null {
  if (!FORKABLE_PHASES.includes(state.phase)) {
    return null
  }
  if (!state.settings || !VARIANTS.some(variant => variant.id === state.settings?.variant)) {
    return createLobbyState()
  }
  const divers = (Array.isArray(state.divers) ? state.divers : [])
    .map(sanitizeDiver)
    .filter((diver): diver is DiverState => diver !== null)
    .slice(0, SQUAD_SIZE_MAX)
  if (divers.length === 0) {
    return createLobbyState()
  }

  const difficulty = clampInt(state.difficulty, MIN_DIFFICULTY, MAX_DIFFICULTY, MIN_DIFFICULTY)
  const wheel = sanitizeWheel(state.wheel)
  if (WHEEL_PHASES.includes(state.phase) && !wheel) {
    return null
  }
  const frontId: FrontId | null = state.frontId && FRONTS.some(front => front.id === state.frontId)
    ? state.frontId
    : null
  // Every post-spin phase carries the operation's front; a draw phase without
  // one is malformed, not a fresh operation.
  if (state.phase !== 'spin' && !frontId) {
    return null
  }
  const strainId = frontId && state.strainId && STRAINS.some(strain => strain.id === state.strainId && strain.frontId === frontId)
    ? state.strainId
    : null

  const owner = divers.find(diver => diver.id === preferredOwnerId)
    ?? divers.find(diver => diver.id === state.hostId)
    ?? divers[0]!

  const inventories: Record<string, string[]> = {}
  for (const diver of divers) {
    inventories[diver.id] = stringArray(state.personalInventories?.[diver.id], 1000)
  }
  const legacyCaches: Record<string, string[]> = {}
  for (const [id, items] of Object.entries(state.legacyCaches ?? {})) {
    const kept = stringArray(items, 1000)
    if (id !== owner.id && kept.length > 0) {
      legacyCaches[id] = kept
    }
  }
  for (const diver of divers) {
    if (diver.id !== owner.id && inventories[diver.id]!.length > 0) {
      legacyCaches[diver.id] = inventories[diver.id]!
    }
  }

  // Requisition and reward tokens belong to the session they were earned in:
  // a new session continues the crusade and the kit, never the purse.
  const ownerDiver: DiverState = {
    ...owner,
    name: typeof name === 'string' && name.trim() ? name.trim().slice(0, MAX_NAME_LENGTH) : owner.name,
    isHost: true,
    sampleBank: 0,
    rewardTokens: 0,
  }

  const forked: DiveState = {
    ...state,
    phase: state.phase === 'pacts' && ownerDiver.pactsLocked ? 'diving' : state.phase,
    settings: {
      variant: state.settings.variant,
      ...(state.settings.mode === 'seaf' || state.settings.mode === 'penance' ? { mode: state.settings.mode } : {}),
    },
    difficulty,
    missionIndex: clampInt(state.missionIndex, 0, 100_000, 0),
    missionInOperation: clampInt(state.missionInOperation, 1, missionsPerOperation(difficulty), 1),
    achieved: state.achieved === true,
    divers: [ownerDiver],
    hostId: owner.id,
    wheel,
    frontId,
    misfortuneAccepted: state.misfortuneAccepted === true,
    misfortuneFailed: state.misfortuneFailed === true,
    strainId,
    strainAccepted: state.strainAccepted === true,
    strainDecided: state.strainDecided === true,
    majorOrder: sanitizeMajorOrder(state.majorOrder),
    rerollTokens: clampInt(state.rerollTokens, 0, 10, REROLL_TOKENS_PER_OPERATION),
    completedCombos: stringArray(state.completedCombos, 2000),
    personalInventories: { [owner.id]: inventories[owner.id]! },
    legacyCaches,
    offerSeed: typeof state.offerSeed === 'number' && Number.isFinite(state.offerSeed) ? state.offerSeed : null,
    lastReport: state.lastReport ?? null,
    bonusSeed: typeof state.bonusSeed === 'number' && Number.isFinite(state.bonusSeed) ? state.bonusSeed : null,
    bonusWinnerIds: sanitizeBonusWinnerIds(state),
    actionLog: Array.isArray(state.actionLog) ? state.actionLog.slice(-ACTION_LOG_CAP) : [],
    seedHistory: Array.isArray(state.seedHistory) ? state.seedHistory.slice(-ACTION_LOG_CAP) : [],
  }
  return resolveStrandedForfeit(forked)
}
