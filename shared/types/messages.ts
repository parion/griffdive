import type { DiveState, EngineAction } from '../engine/types'

// A saved dive is a server-side pin on the shared room record: it keeps the one
// authoritative room past the idle TTL so a squad can pick the crusade back up.
// It is not per-diver state and never lives in DiveState.
export interface DiveSaveInfo {
  name: string
  savedAt: number
  savedBy: string
}

// A Steam lobby deep link the host pasted so every seated diver can jump
// straight into the in-game lobby. Like a saved dive, it is room metadata,
// never DiveState: cosmetic, host-owned, and outside the engine.
export interface SteamLobbyInfo {
  link: string
  setAt: number
  setBy: string
}

export type ClientMessage
  = | { type: 'hello', name?: string, playerId?: string, knownIds?: string[], warbondCodes?: string[] }
    | { type: 'action', action: EngineAction }
    | { type: 'save-dive', name?: string }
    | { type: 'unsave-dive' }
    | { type: 'set-steam', link: string }

export type ServerMessage
  = | { type: 'welcome', selfId: string, hostId: string | null, roomCode: string, snapshot: DiveState, online: string[], saved: DiveSaveInfo | null, steam: SteamLobbyInfo | null }
    | { type: 'state', snapshot: DiveState, applied: EngineAction | null, online: string[], saved: DiveSaveInfo | null, steam: SteamLobbyInfo | null }
    | { type: 'error', code: string, message: string }
    | { type: 'restarting' }

export const HOST_ONLY_ACTIONS = [
  'START_DIVE',
  'SET_TIER_LIST',
  'SPIN_WHEEL',
  'ACCEPT_MISFORTUNE',
  'ACCEPT_STRAIN',
  'DEAL_PACTS',
  'REROLL_WHEEL',
  'REPORT_RESULT',
  'FAIL_MISFORTUNE',
  'HOLD_MISFORTUNE',
  'SPIN_BONUS',
  'AWARD_BONUS',
  'ADVANCE',
  'END_DIVE',
  'KICK_DIVER',
  'TRANSFER_HOST',
] as const

export type HostOnlyAction = (typeof HOST_ONLY_ACTIONS)[number]

export function isHostOnlyAction(type: string): boolean {
  return (HOST_ONLY_ACTIONS as readonly string[]).includes(type)
}

// The transport boundary rejects anything outside the reducer's union before
// it reaches the engine: an unknown action type must never be reduced (the
// reducer has no case for it) or persisted.
export const ENGINE_ACTION_TYPES = [
  'START_DIVE',
  'SET_TIER_LIST',
  'SPIN_WHEEL',
  'ACCEPT_MISFORTUNE',
  'ACCEPT_STRAIN',
  'DEAL_PACTS',
  'REROLL_WHEEL',
  'SET_PACTS',
  'FAIL_PACT',
  'HOLD_PACT',
  'FAIL_MISFORTUNE',
  'HOLD_MISFORTUNE',
  'SET_WARBONDS',
  'REPORT_RESULT',
  'FORFEIT_ITEM',
  'PICK_REWARD',
  'BUY_ITEM',
  'BUY_ARMOR_PACK',
  'CLAIM_CATCHUP_OPTION',
  'CLAIM_CACHE',
  'REROLL_REWARDS',
  'BAN_REWARDS',
  'SPIN_BONUS',
  'AWARD_BONUS',
  'LEAVE_DIVE',
  'SET_AWAY',
  'ADVANCE',
  'END_DIVE',
  'KICK_DIVER',
  'SET_NAME',
  'TRANSFER_HOST',
] as const

export type EngineActionType = (typeof ENGINE_ACTION_TYPES)[number]

export function isEngineActionType(type: string): type is EngineActionType {
  return (ENGINE_ACTION_TYPES as readonly string[]).includes(type)
}
