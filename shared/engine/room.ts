import { ALL_WARBOND_CODES } from '../data/catalog'
import { MIN_DIFFICULTY, REROLL_TOKENS_PER_OPERATION, SQUAD_SIZE_MAX } from './config'
import { startingItemIds } from './progression'
import type { DiveState, DiverState } from './types'

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
    offerSeed: null,
    lastReport: null,
    actionLog: [],
    seedHistory: [],
  }
}

// Returns null when the squad is full. Re-joining with a known playerId is
// idempotent (reconnect path).
export function joinDiver(state: DiveState, playerId: string, name: string): DiveState | null {
  if (state.divers.some(diver => diver.id === playerId)) {
    return state
  }
  if (state.divers.length >= SQUAD_SIZE_MAX) {
    return null
  }
  const isHost = state.divers.length === 0
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
  }
  const kit = state.settings ? startingItemIds(state.settings.variant) : []
  return {
    ...state,
    divers: [...state.divers, diver],
    hostId: isHost ? playerId : state.hostId,
    personalInventories: { ...state.personalInventories, [playerId]: [...kit] },
  }
}
