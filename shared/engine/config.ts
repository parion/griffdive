import type { RewardTier } from './types'

export const ENGINE_VERSION = 7

export const MIN_DIFFICULTY = 3
export const MAX_DIFFICULTY = 10
export const SQUAD_SIZE_MAX = 4

// wiki.gg/Difficulty: an operation runs 1 mission on Trivial/Easy, 2 on
// Medium/Challenging, and 3 from Hard upward.
export const MISSIONS_PER_OPERATION: Readonly<Record<number, number>> = {
  1: 1,
  2: 1,
  3: 2,
  4: 2,
  5: 3,
  6: 3,
  7: 3,
  8: 3,
  9: 3,
  10: 3,
}

export function missionsPerOperation(difficulty: number): number {
  return MISSIONS_PER_OPERATION[difficulty] ?? 3
}

// wiki.gg/Missions (Mission Result): each star unlocks at a difficulty floor —
// 1st from Trivial (1), 2nd from Easy (2), 3rd from Medium (3), 4th from Hard
// (5), 5th from Suicide (7) — and a completed mission never awards zero stars.
const STAR_UNLOCK_DIFFICULTY = [1, 2, 3, 5, 7] as const

export function maxStarsFor(difficulty: number): number {
  return STAR_UNLOCK_DIFFICULTY.filter(min => difficulty >= min).length
}

export const MAX_PACTS = 3
// Pacts come as a rolled offer, not the whole catalog: 2 options on diffs 3–6,
// 3 from 7 up (values must stay within MAX_PACTS). The diver picks any subset
// of what the wheel offers.
export const PACT_OPTIONS: Readonly<Record<number, number>> = {
  3: 2,
  4: 2,
  5: 2,
  6: 2,
  7: 3,
  8: 3,
  9: 3,
  10: 3,
}

export function pactOptionsFor(difficulty: number): number {
  return PACT_OPTIONS[difficulty] ?? 2
}

export const REROLL_TOKENS_PER_OPERATION = 1
export const ACTION_LOG_CAP = 200

export const STARS_TO_OPTIONS = [1, 1, 2, 2, 3, 4] as const
export const MAX_OPTIONS = 4
export const S_PLUS_BONUS_OPTIONS = 1
export const TIER_ROLL_WEIGHT_BASE = 2
export const MAX_NAME_LENGTH = 32

// Reward scale-back: difficulty alone buys a base tier — C on diffs 3–5,
// B on 6–7, A on 8+. S and S+ are reachable only through chosen risk
// ("luck": an accepted team misfortune plus personal pacts), which buys
// odds on each tier step, never a guarantee.
export const UPGRADE_CAP = 0.8
export const UPGRADE_STEP = 3
// Tiers with per-step odds below this are too unlikely to preview.
export const UPGRADE_PREVIEW_FLOOR = 0.2

export function baseTierFor(difficulty: number): RewardTier {
  if (difficulty >= 8) {
    return 'A'
  }
  if (difficulty >= 6) {
    return 'B'
  }
  return 'C'
}

// 0 at the band floor, 1 at the band top: higher difficulties inside a tier
// band roll into the next tier more readily.
export function bandPosition(difficulty: number): number {
  if (difficulty >= 8) {
    return (difficulty - 8) / 2
  }
  if (difficulty >= 6) {
    return difficulty - 6
  }
  return (difficulty - 3) / 2
}

// Odds of upgrading one tier on a given step (1 = C→B, 2 = B→A, …).
export function upgradeOdds(luck: number, bandPos: number, step: number): number {
  return Math.min(UPGRADE_CAP, (luck * (1 + bandPos)) / UPGRADE_STEP ** step)
}

export const MISFORTUNE_RISK: Readonly<Record<string, number>> = {
  noBackpacks: 1,
  noSentries: 1,
  noBoosters: 1,
  noEagles: 2,
  fragileLiberty: 2,
  noOrbitals: 2,
  primaryOnly: 3,
  stealth: 3,
  oopsAllOrbitals: 3,
  noResupplies: 4,
  zeroDeaths: 4,
  noReserves: 4,
  noStratagems: 5,
  meleeOnly: 5,
  pacifist: 5,
}

export const MISFORTUNE_MIN_DIFFICULTY: Readonly<Record<string, number>> = {
  noBackpacks: 3,
  noSentries: 3,
  noBoosters: 3,
  noResupplies: 3,
  noEagles: 4,
  fragileLiberty: 4,
  noOrbitals: 5,
  primaryOnly: 5,
  stealth: 5,
  oopsAllOrbitals: 6,
  zeroDeaths: 7,
  noReserves: 7,
  noStratagems: 9,
  meleeOnly: 9,
  pacifist: 9,
}

export const PACT_RISK: Readonly<Record<string, number>> = {
  packLight: 1,
  thirsty: 1,
  emptyPockets: 1,
  antiTankAbstinent: 2,
  deadWeight: 2,
  stimAbstinent: 2,
  loadoutLoyalist: 2,
  primaryConcern: 2,
  grounded: 2,
  shipSilent: 2,
  openField: 2,
  barebones: 3,
  untouchable: 3,
}
