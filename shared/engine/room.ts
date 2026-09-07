import { ALL_WARBOND_CODES } from '../data/catalog'
import { CATCHUP_CAP, MIN_DIFFICULTY, REROLL_TOKENS_PER_OPERATION, SQUAD_SIZE_MAX } from './config'
import { catchUpOpsBehind, startingItemIds } from './progression'
import type { DivePhase, DiveState, DiverState } from './types'

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
    openToLobby: false,
    wheel: null,
    frontId: null,
    misfortuneAccepted: false,
    rerollTokens: REROLL_TOKENS_PER_OPERATION,
    completedCombos: [],
    personalInventories: {},
    legacyCaches: {},
    offerSeed: null,
    lastReport: null,
    actionLog: [],
    seedHistory: [],
  }
}

// Rewards and forfeit resolve the mission that just ended: seating there
// would grant a draft (or stall forfeit) for a mission the joiner never
// dove. Complete crusades have nothing left to join.
const SEATABLE_PHASES: readonly DivePhase[] = ['lobby', 'spin', 'decision', 'pacts', 'diving']

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
    inventory = state.settings ? startingItemIds(state.settings.variant) : []
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
  }
  return {
    ...state,
    divers: [...state.divers, diver],
    hostId: isHost ? playerId : state.hostId,
    legacyCaches,
    personalInventories: { ...state.personalInventories, [playerId]: inventory },
  }
}
