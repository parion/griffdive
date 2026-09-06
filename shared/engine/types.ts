import type { FrontId } from '../data/fronts'

export type RewardTier = 'C' | 'B' | 'A' | 'S' | 'S+'

export type CrusadeVariant = 'standard' | 'soloDuo' | 'super' | 'soloDuoSuper' | 'quickplay'

export interface CrusadeSettings {
  variant: CrusadeVariant
}

export type DivePhase
  = | 'lobby'
    | 'spin'
    | 'decision'
    | 'pacts'
    | 'diving'
    | 'rewards'
    | 'forfeit'
    | 'complete'

export interface DiverState {
  id: string
  name: string
  isHost: boolean
  pactsLocked: boolean
  pactIds: string[]
  pickedOptionId: string | null
  warbondCodes: string[]
}

export interface WheelResult {
  seed: number
  misfortuneId: string
}

export interface ItemRef {
  ownerId: string
  itemId: string
}

export type MissionOutcome = 'success' | 'failure'

export interface MissionReport {
  outcome: MissionOutcome
  stars: number
  timePct?: number
}

export interface DiveState {
  phase: DivePhase
  difficulty: number
  missionIndex: number
  missionInOperation: number
  achieved: boolean
  settings: CrusadeSettings | null
  divers: DiverState[]
  hostId: string | null
  openToLobby: boolean
  wheel: WheelResult | null
  // The front is drawn once per operation and persists across its missions —
  // each mission draws only a fresh misfortune.
  frontId: FrontId | null
  misfortuneAccepted: boolean
  rerollTokens: number
  completedCombos: string[]
  personalInventories: Record<string, string[]>
  offerSeed: number | null
  lastReport: MissionReport | null
  actionLog: EngineAction[]
  seedHistory: number[]
}

export type EngineAction
  = | { type: 'START_DIVE', settings: CrusadeSettings }
    | { type: 'SPIN_WHEEL', seed: number }
    | { type: 'ACCEPT_MISFORTUNE', accepted: boolean }
    | { type: 'REROLL_WHEEL', wheel: 'misfortune' | 'front', seed: number }
    | { type: 'SET_PACTS', playerId: string, pactIds: string[] }
    | { type: 'SET_WARBONDS', playerId: string, warbondCodes: string[] }
    | { type: 'REPORT_RESULT', outcome: MissionOutcome, stars: number, timePct?: number }
    | { type: 'FORFEIT_ITEM', itemRef: ItemRef }
    | { type: 'PICK_REWARD', playerId: string, optionId: string, choiceItemId?: string }
    | { type: 'ADVANCE' }
    | { type: 'END_DIVE' }
    | { type: 'KICK_DIVER', playerId: string }
    | { type: 'SET_NAME', playerId: string, name: string }
    | { type: 'TRANSFER_HOST', playerId: string }
    | { type: 'TOGGLE_OPEN', open: boolean }
