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
