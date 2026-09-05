import type { CrusadeVariant, DiveState, EngineAction } from '../engine/types'
import type { FrontId } from '../data/fronts'

export interface LobbyEntry {
  roomCode: string
  squadSize: number
  slotsFree: number
  difficulty: number
  variant: CrusadeVariant | null
  front: FrontId | null
  hostName: string
}

export type ClientMessage
  = | { type: 'hello', name?: string, playerId?: string }
    | { type: 'action', action: EngineAction }

export type ServerMessage
  = | { type: 'welcome', selfId: string, hostId: string | null, roomCode: string, snapshot: DiveState, online: string[] }
    | { type: 'state', snapshot: DiveState, applied: EngineAction | null, online: string[] }
    | { type: 'lobby', rooms: LobbyEntry[] }
    | { type: 'error', code: string, message: string }

// Pseudo room code for lobby listeners (never a valid room code: 9 chars).
export const LOBBY_ROOM = '__lobby__'

export function isLobbyRoom(roomCode: string): boolean {
  return roomCode === LOBBY_ROOM
}

export const HOST_ONLY_ACTIONS = [
  'START_DIVE',
  'SPIN_WHEEL',
  'ACCEPT_MISFORTUNE',
  'REROLL_WHEEL',
  'REPORT_RESULT',
  'FORFEIT_ITEM',
  'ADVANCE',
  'END_DIVE',
  'TRANSFER_HOST',
  'TOGGLE_OPEN',
] as const

export type HostOnlyAction = (typeof HOST_ONLY_ACTIONS)[number]

export function isHostOnlyAction(type: string): boolean {
  return (HOST_ONLY_ACTIONS as readonly string[]).includes(type)
}
