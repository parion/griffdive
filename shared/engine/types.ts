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
  // Pacts broken in the field and marked failed: their risk is voided and
  // each costs a reward option. Reset with the pacts every mission.
  failedPactIds: string[]
  pickedOptionId: string | null
  warbondCodes: string[]
  // Field Promotion bookkeeping for mid-crusade joiners: what they were
  // granted at seating and what is still unclaimed (0 when joined at the
  // start or fully claimed). Catch-up restores altitude, never rarity.
  catchUpGranted: number
  catchUpOwed: number
  // Seated mid-mission (phase 'diving'): the squad already dove the current
  // mission, so the joiner skips its reward draft instead of blocking on it.
  skipsCurrentDraft: boolean
  // Bonus-honors reward tokens: banked across the crusade, spent to reroll
  // this diver's offer or to ban offered items from their personal pools.
  rewardTokens: number
  // Offered items this diver has banned from their personal reward and
  // catch-up pools for the rest of the crusade — never re-offered.
  bannedItemIds: string[]
  // Client seed of the current mission's reward reroll, if the diver spent a
  // token on one. Reset with the pacts every mission.
  rewardRerollSeed: number | null
  // The diver spent this draft on bans instead of a reward: the draft counts
  // as complete without a pick. Reset with the pacts every mission.
  rewardBanned: boolean
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

// Samples recovered on a mission, by rarity. Squad-level team performance feeds
// a small Valor bonus on top of chosen risk.
export interface SampleCounts {
  common: number
  rare: number
  super: number
}

export interface MissionReport {
  outcome: MissionOutcome
  stars: number
  timePct?: number
  samples?: SampleCounts
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
  wheel: WheelResult | null
  // The front is drawn once per operation and persists across its missions —
  // each mission draws only a fresh misfortune.
  frontId: FrontId | null
  misfortuneAccepted: boolean
  rerollTokens: number
  completedCombos: string[]
  personalInventories: Record<string, string[]>
  // Inventories parked by departed divers (kicked or left mid-crusade): a
  // late joiner may claim one instead of rolling their Field Promotion.
  legacyCaches: Record<string, string[]>
  offerSeed: number | null
  lastReport: MissionReport | null
  // Bonus honors for the current mission's reward window: the host-spun
  // contest seed (like the Wheel, spun on click) and the diver the host
  // awarded. Awarding banks the token immediately. Both reset every mission;
  // the ceremony is a soft gate on ADVANCE.
  bonusSeed: number | null
  bonusWinnerId: string | null
  actionLog: EngineAction[]
  seedHistory: number[]
}

export type EngineAction
  = | { type: 'START_DIVE', settings: CrusadeSettings }
    | { type: 'SPIN_WHEEL', seed: number }
    | { type: 'ACCEPT_MISFORTUNE', accepted: boolean }
    | { type: 'REROLL_WHEEL', wheel: 'misfortune' | 'front', seed: number }
    | { type: 'SET_PACTS', playerId: string, pactIds: string[] }
    | { type: 'FAIL_PACT', playerId: string, pactId: string }
    | { type: 'SET_WARBONDS', playerId: string, warbondCodes: string[] }
    | { type: 'REPORT_RESULT', outcome: MissionOutcome, stars: number, timePct?: number, samples?: SampleCounts }
    | { type: 'FORFEIT_ITEM', itemRef: ItemRef }
    | { type: 'PICK_REWARD', playerId: string, optionId: string, choiceItemId?: string }
    | { type: 'CLAIM_CATCHUP_OPTION', playerId: string, optionId: string }
    | { type: 'CLAIM_CACHE', playerId: string, cacheOwnerId: string }
    | { type: 'REROLL_REWARDS', playerId: string, seed: number }
    | { type: 'BAN_REWARDS', playerId: string, optionIds: string[] }
    | { type: 'SPIN_BONUS', seed: number }
    | { type: 'AWARD_BONUS', playerId: string }
    | { type: 'LEAVE_DIVE', playerId: string }
    | { type: 'ADVANCE' }
    | { type: 'END_DIVE' }
    | { type: 'KICK_DIVER', playerId: string }
    | { type: 'SET_NAME', playerId: string, name: string }
    | { type: 'TRANSFER_HOST', playerId: string }
