import { MIN_DIFFICULTY, REROLL_TOKENS_PER_OPERATION, SQUAD_SIZE_MAX } from './config'
import { personalKitIds } from './progression'
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
    misfortuneAccepted: false,
    rerollTokens: REROLL_TOKENS_PER_OPERATION,
    completedCombos: [],
    sharedStratagemIds: [],
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
    pickedOptionId: null,
  }
  const kit = state.settings ? personalKitIds(state.settings.variant) : []
  return {
    ...state,
    divers: [...state.divers, diver],
    hostId: isHost ? playerId : state.hostId,
    personalInventories: { ...state.personalInventories, [playerId]: [...kit] },
  }
}
