import type { DiveState, EngineAction } from '../engine/types'

export type ClientMessage
  = | { type: 'hello', name?: string, playerId?: string }
    | { type: 'action', action: EngineAction }

export type ServerMessage
  = | { type: 'welcome', selfId: string, hostId: string | null, roomCode: string, snapshot: DiveState, online: string[] }
    | { type: 'state', snapshot: DiveState, applied: EngineAction | null, online: string[] }
    | { type: 'error', code: string, message: string }

export const HOST_ONLY_ACTIONS = [
  'START_DIVE',
  'SPIN_WHEEL',
  'ACCEPT_MISFORTUNE',
  'ACCEPT_STRAIN',
  'SET_MAJOR_ORDER',
  'REROLL_WHEEL',
  'REPORT_RESULT',
  'FORFEIT_ITEM',
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
  'SPIN_WHEEL',
  'ACCEPT_MISFORTUNE',
  'ACCEPT_STRAIN',
  'SET_MAJOR_ORDER',
  'REROLL_WHEEL',
  'SET_PACTS',
  'FAIL_PACT',
  'SET_WARBONDS',
  'REPORT_RESULT',
  'FORFEIT_ITEM',
  'PICK_REWARD',
  'CLAIM_CATCHUP_OPTION',
  'CLAIM_CACHE',
  'REROLL_REWARDS',
  'BAN_REWARDS',
  'SPIN_BONUS',
  'AWARD_BONUS',
  'LEAVE_DIVE',
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
