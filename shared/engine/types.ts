import type { FrontId } from '../data/fronts'

export type BargainSlotKind = 'primary' | 'secondary' | 'throwable' | 'armorPassive' | 'stratagem'

export type RewardTier = 'C' | 'B' | 'A' | 'S' | 'S+'

export type CrusadeVariant = 'medium' | 'hard' | 'suicide'

// The optional mode layered on the hard/suicide starts, mutually exclusive:
// 'seaf' ships the SEAF Support Package (extra gear + a flat per-mission Valor
// bump), 'penance' is Super Penance (bare surplus kit + a larger flat Valor
// stake). Undefined on the medium start, which offers neither.
export type CrusadeMode = 'seaf' | 'penance'

export interface CrusadeSettings {
  variant: CrusadeVariant
  mode?: CrusadeMode
}

// Every phase a dive can sit in, in mission order. The array is the runtime
// truth (the observability layer enumerates it); the type derives from it, so
// the two can never drift.
export const DIVE_PHASES = [
  'lobby',
  'spin',
  'decision',
  'strain',
  // The wheel decision is in but the host has not dealt the pact hand yet:
  // the wheel screen holds with a "Deal the pacts" CTA (host-only). Keeps the
  // hand from being dealt (or the offer shown) before the squad is ready.
  'deal',
  'pacts',
  'diving',
  'rewards',
  'forfeit',
  'complete',
] as const

export type DivePhase = (typeof DIVE_PHASES)[number]

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
  // The item this diver chose to lose from their forfeit offer after a failed
  // mission. Held until every diver owing one has chosen, then all are removed
  // together so the offers never reshuffle mid-choice. Absent (older saves)
  // reads as null. Reset with the pacts every mission.
  forfeitedItemId?: string | null
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
  // Credits exchanged for the samples recovered in the field, banked into a
  // personal purse and spent in Brasch's Bargains. Belongs to the session, like
  // reward tokens: stepping away keeps it, a benched diver's rejoin and a forked
  // session start empty.
  credits: number
  // This mission's Brasch's Bargains deal: what the shelf skips, the one item
  // bought from it and the kinds bought this operation. Dealt at every mission
  // start and on seating; null before the crusade starts.
  bargain: BargainDeal | null
  // Offered items this diver has banned from their personal reward and
  // catch-up pools for the rest of the crusade — never re-offered.
  bannedItemIds: string[]
  // Client seed of the current mission's reward reroll, if the diver spent a
  // token on one. Reset with the pacts every mission.
  rewardRerollSeed: number | null
  // The diver spent this draft on bans instead of a reward: the draft counts
  // as complete without a pick. Reset with the pacts every mission.
  rewardBanned: boolean
  // What the current draft was dealt against: the diver's holdings and bans
  // when the mission reported. The offer derives from this snapshot, not live
  // holdings, so a pick, a purchase or a ban never reshuffles an offer the
  // squad has already seen. Absent (older saves) falls back to live holdings.
  // Reset with the pacts every mission.
  draftExcludedIds?: string[] | null
  // The diver stepped away (Leave, or their connection stayed down past the
  // server's grace window). Their seat, kit and purse stay put, but the squad
  // never waits on them: pact lock-in, reward picks and squad size count only
  // divers who are present. Cleared the moment they reconnect.
  away: boolean
}

// What a diver's Brasch's Bargains shelf was dealt against. Frozen for the
// mission so a draft pick or a ban never reshuffles the shelf.
export interface BargainDeal {
  // Holdings and bans at the deal: never stocked.
  excludedIds: string[]
  // The one item bought this mission. Once set, nothing else is offered.
  boughtItemId: string | null
  // Slot kinds bought this operation: not rolled again until the next one.
  boughtKinds: BargainSlotKind[]
}

export interface WheelResult {
  seed: number
  misfortuneId: string
}

// A Major Order is the live war's operation-long commitment, set by the host
// before the operation's first spin. It pins the operation's front draw to the
// MO's front(s) — the squad plays where Super Earth needs them — and banks an
// extra reroll token when the operation completes. The metadata fields are
// display-only (Phase B fills them from the war API; manual entry leaves them
// unset). The engine reads `fronts` alone.
export interface MajorOrderPlanet {
  index: number
  name: string
  front: FrontId
  // Liberation progress, 0–100, for the order-overview bar.
  liberation: number
}

export interface MajorOrderSelection {
  fronts: FrontId[]
  // True only for a selection that came from the live war API. The reroll-token
  // carrot pays for playing the actual order, so a manual front pick (live
  // unset) pins the front but banks nothing.
  live?: boolean
  title?: string
  planets?: MajorOrderPlanet[]
  expiresAt?: string
}

export type MissionOutcome = 'success' | 'failure'

// Samples recovered on a mission, by rarity. The squad's haul is exchanged for
// credits banked into every diver's purse.
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

// A fallen diver's kit: who carried it (so the squad knows whose gear it is)
// and the earned items it holds — never the starting kit.
export interface LegacyCache {
  name: string
  itemIds: string[]
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
  // The accepted team directive broken in the field and marked failed by the
  // host while diving: its shared risk is voided for the whole squad and every
  // diver forfeits one reward option. Reset with the pacts every mission.
  misfortuneFailed: boolean
  // The strain is a subfaction rolled with the front and persisting with it.
  // It is optional: the squad accepts or declines it on the operation's first
  // mission (phase 'strain'), and an accepted strain adds its team risk to
  // every mission of the operation.
  strainId: string | null
  strainAccepted: boolean
  // Whether the strain call has been answered this operation. Separate from
  // `strainAccepted` so the call can be answered before the misfortune without
  // the phase having to carry it.
  strainDecided: boolean
  // The operation's Major Order commitment, host-set before the first spin: it
  // pins the front draw to the MO's front(s) for the operation and banks an
  // extra reroll token on completion. null = no Major Order. Chosen fresh each
  // operation; a failure restart keeps it with the locked front.
  majorOrder: MajorOrderSelection | null
  rerollTokens: number
  completedCombos: string[]
  personalInventories: Record<string, string[]>
  // Earned gear parked by departed divers (kicked, left, or left behind by a
  // new session), keyed by their playerId: a late joiner may claim one instead
  // of rolling their Field Promotion.
  legacyCaches: Record<string, LegacyCache>
  offerSeed: number | null
  lastReport: MissionReport | null
  // Bonus honors for the current mission's reward window: the host-spun
  // contest seed (like the Wheel, spun on click) and the divers the host
  // honored. Honors can be shared — a tie names every tied diver — so the
  // winners are a list. Awarding banks each token immediately. Both reset
  // every mission; the ceremony is a soft gate on ADVANCE.
  bonusSeed: number | null
  bonusWinnerIds: string[]
  // Seeds every diver's Brasch's Bargains shelf for the current mission. Set
  // at the crusade start and re-derived at every mission start, a failure
  // restart included.
  bargainSeed: number | null
  actionLog: EngineAction[]
  seedHistory: number[]
}

export type EngineAction
  = | { type: 'START_DIVE', settings: CrusadeSettings, seed?: number }
    | { type: 'SPIN_WHEEL', seed: number }
    | { type: 'ACCEPT_MISFORTUNE', accepted: boolean }
    | { type: 'ACCEPT_STRAIN', accepted: boolean }
    | { type: 'DEAL_PACTS' }
    | { type: 'SET_MAJOR_ORDER', order: MajorOrderSelection | null }
    | { type: 'REROLL_WHEEL', wheel: 'misfortune' | 'front' | 'strain', seed: number }
    | { type: 'SET_PACTS', playerId: string, pactIds: string[] }
    | { type: 'FAIL_PACT', playerId: string, pactId: string }
    | { type: 'FAIL_MISFORTUNE' }
    | { type: 'SET_WARBONDS', playerId: string, warbondCodes: string[] }
    | { type: 'REPORT_RESULT', outcome: MissionOutcome, stars: number, timePct?: number, samples?: SampleCounts }
    | { type: 'FORFEIT_ITEM', playerId: string, itemId: string }
    | { type: 'PICK_REWARD', playerId: string, optionId: string, choiceItemId?: string }
    | { type: 'BUY_ITEM', playerId: string, itemId: string }
    | { type: 'CLAIM_CATCHUP_OPTION', playerId: string, optionId: string }
    | { type: 'CLAIM_CACHE', playerId: string, cacheOwnerId: string }
    | { type: 'REROLL_REWARDS', playerId: string, seed: number }
    | { type: 'BAN_REWARDS', playerId: string, optionIds: string[] }
    | { type: 'SPIN_BONUS', seed: number, stars?: number, outcome?: MissionOutcome }
    | { type: 'AWARD_BONUS', playerIds: string[] }
    | { type: 'LEAVE_DIVE', playerId: string }
    | { type: 'SET_AWAY', playerId: string, away: boolean }
    | { type: 'ADVANCE' }
    | { type: 'END_DIVE' }
    | { type: 'KICK_DIVER', playerId: string }
    | { type: 'SET_NAME', playerId: string, name: string }
    | { type: 'TRANSFER_HOST', playerId: string }
