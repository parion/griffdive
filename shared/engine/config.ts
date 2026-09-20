import type { RewardTier } from './types'

export const ENGINE_VERSION = 15

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

// Team performance is felt at every star: 1★=1, 2★=2, 3★=3, 4★=4, 5★=4 (cap).
export const STARS_TO_OPTIONS = [1, 1, 2, 3, 4, 4] as const
export const MAX_OPTIONS = 4
export const S_PLUS_BONUS_OPTIONS = 1
// Each pact marked failed in the field forfeits this many reward options —
// the stake the diver never actually carried (AGENTS.md: Reward math).
export const OPTIONS_LOST_PER_FAILED_PACT = 1
// Field Promotion cap: a mid-crusade joiner rolls at most this many catch-up
// options (one per operation behind, capped). Catch-up buys altitude at the
// current base tier with zero Valor — never rarity.
export const CATCHUP_CAP = 4
export const TIER_ROLL_WEIGHT_BASE = 2
export const MAX_NAME_LENGTH = 32

// Helldivers 2 requires four equipped stratagems to ready up. Every diver must
// always be able to field this many, so a pact can never strand them below it.
export const STRATAGEM_SLOTS_REQUIRED = 4
// Baseline non-lethal surplus every diver always owns (all warbond-free, all in
// the starting kit) and that no pact may remove. Smoke/stun/shield only: a
// mis-call never smuggles power back into a restricted loadout, and because at
// least four reserve stratagems survive any pact combination, no set of pacts
// can make a loadout illegal.
export const RESERVE_STRATAGEMS = [
  'orbitalemsstrike',
  'orbitalsmokestrike',
  'eaglesmokestrike',
  'emsmortarsentry',
  'shieldgeneratorrelay',
] as const

// Reward scale-back: difficulty alone buys a base tier — C on diffs 3–5,
// B on 6–7, A on 8+. S and S+ are reachable only through chosen risk
// ("Valor": an accepted team misfortune plus personal pacts, plus a small
// team-performance bonus), which buys odds on each tier step, never a guarantee.
export const UPGRADE_CAP = 0.8
export const UPGRADE_STEP = 3
// S and S+ are earned, never bought by altitude: the top rungs only open once
// the diver's Valor clears a floor, then ramp toward the cap. Without this a
// single low-risk misfortune reached S ~80% of the time at difficulties 8–10
// (base tier A is one rung from S).
export const S_VALOR_FLOOR = 4
export const S_UPGRADE_DIVISOR = 18
export const S_PLUS_VALOR_FLOOR = 8
export const S_PLUS_UPGRADE_DIVISOR = 40
// The final S→S+ rung is capped far below the rest of the ladder: altitude
// alone must never make Liberty's Cross routine. Max chosen Valor (13) tops out
// around 8% at altitude and lower in the low bands.
export const S_PLUS_UPGRADE_CAP = 0.1
// Tiers with per-step odds below this are too unlikely to preview. Kept at or
// below the S+ cap so the jackpot can still preview at max Valor, and at or
// below the S floor's opening odds so a reachable S is never hidden.
export const UPGRADE_PREVIEW_FLOOR = 0.05

// Team performance feeds a small third Valor term on top of chosen risk, from
// the mission just reported. Capped so chosen risk still dominates: a perfect
// timed clear is worth 0.2 and samples up to 0.3, so time + samples together
// never exceed 0.5 against the 13-point chosen ceiling.
//
// Sample values are calibrated against wiki.gg/Sample "availability by
// difficulty": commons 15–18 (diff 3) climb to 40, rares enter at 4 and supers
// at 6, so the game's own mix does the difficulty scaling — a full haul ramps
// ~0.03 (Medium) to 0.3 (Helldive+). Small per-sample values keep loads from
// saturating the cap.
export const TIME_VALOR_MAX = 0.2
export const SAMPLE_VALOR_CAP = 0.3
export const SAMPLE_VALOR_WEIGHTS: Readonly<Record<'common' | 'rare' | 'super', number>> = {
  common: 0.0015,
  rare: 0.004,
  super: 0.02,
}

// wiki.gg/Sample "availability by difficulty": the most of each rarity a map
// can hold at a difficulty (ranges capped at their upper bound). Drives the
// report form's slider maxima, and is why sample Valor scales with altitude —
// rares are absent at 3, supers until 6.
export const SAMPLE_AVAILABILITY: Readonly<Record<number, { common: number, rare: number, super: number }>> = {
  3: { common: 18, rare: 0, super: 0 },
  4: { common: 25, rare: 13, super: 0 },
  5: { common: 29, rare: 20, super: 0 },
  6: { common: 35, rare: 25, super: 3 },
  7: { common: 40, rare: 30, super: 4 },
  8: { common: 40, rare: 35, super: 5 },
  9: { common: 40, rare: 40, super: 6 },
  10: { common: 40, rare: 41, super: 7 },
}

export function sampleAvailability(
  difficulty: number,
): { common: number, rare: number, super: number } {
  return SAMPLE_AVAILABILITY[difficulty] ?? SAMPLE_AVAILABILITY[MAX_DIFFICULTY]!
}

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
export function upgradeOdds(valor: number, bandPos: number, step: number): number {
  return Math.min(UPGRADE_CAP, (valor * (1 + bandPos)) / UPGRADE_STEP ** step)
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
  oopsAllAirstrikes: 3,
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
  oopsAllAirstrikes: 6,
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
  stimAbstinent: 3,
  loadoutLoyalist: 2,
  primaryConcern: 2,
  grounded: 2,
  shipSilent: 2,
  openField: 2,
  untouchable: 3,
}
