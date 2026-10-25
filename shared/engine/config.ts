import type { Tier } from '../data/types'
import type { RewardTier } from './types'

export const ENGINE_VERSION = 30

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

// Completing an operation that was played toward the live Major Order banks
// this many extra reroll tokens for the next operation — the carrot for
// aligning with the war. It never touches Valor or the tier rolls, so risk
// stays the only thing that buys rarity.
export const MAJOR_ORDER_REROLL_BONUS = 1

// A live Major Order is an operation-long team-risk commitment: it pins the
// front and replaces the strain, so it carries a fixed risk on every mission —
// the Valor a squad gives up by not drawing a strain. Only a live order pays it;
// a manual front pick is a preference with no risk and no carrot.
export const MAJOR_ORDER_RISK = 2

// A squad that neither follows the order nor locks a front rolls a fresh one
// every operation: it can't build for the enemy before the spin, so it carries
// a small fixed risk on every mission of the run.
export const FRONT_ROLL_RISK = 1

// The hard/suicide starts pick one of two mutually exclusive modes. The SEAF
// Support Package is the assisted ride: extra gear plus a small flat Valor bump
// on every mission. Super Penance is the hellish one: no support gear and a
// larger flat Valor stake on every mission — the self-imposed burden that pays
// in odds. Both are felt for the whole run, like the operation-long strain.
export const SEAF_SUPPORT_VALOR: Readonly<Record<number, number>> = {
  5: 1,
  7: 2,
}
export const PENANCE_VALOR: Readonly<Record<number, number>> = {
  5: 2,
  7: 3,
}

// The SEAF Support Package is rolled per diver at launch (and on seating), so a
// squad never fields the same pack. Counts are keyed by the start difficulty;
// every roll draws only items of SEAF_SUPPORT_TIER from the diver's own owned
// catalog, never repeating an item they already hold. One tier for every slot
// keeps divers' packs equal in power and differing only in shape.
export interface SupportRolls {
  primary: number
  secondary: number
  throwable: number
  stratagem: number
  armorPassive: number
  booster: number
}

export const SEAF_SUPPORT_TIER: Tier = 'b'
// The surplus kit fields no anti-tank at all, and an unlucky roll left a third
// of divers at difficulty 5 with none against armor. A pack always holds at
// least this many anti-tank items (a stratagem slot is re-rolled into one).
export const SEAF_SUPPORT_ANTITANK_MIN = 1
export const SEAF_SUPPORT_ROLLS: Readonly<Record<number, SupportRolls>> = {
  5: { primary: 1, secondary: 1, throwable: 1, stratagem: 2, armorPassive: 1, booster: 0 },
  7: { primary: 2, secondary: 1, throwable: 1, stratagem: 4, armorPassive: 2, booster: 1 },
}

export function seafSupportValorAt(difficulty: number): number {
  return SEAF_SUPPORT_VALOR[difficulty] ?? 0
}

export function penanceValorAt(difficulty: number): number {
  return PENANCE_VALOR[difficulty] ?? 0
}

// Team performance is felt at every star: 1★=1, 2★=2, 3★=3, 4★=4, 5★=4 (cap).
export const STARS_TO_OPTIONS = [1, 1, 2, 3, 4, 4] as const
export const MAX_OPTIONS = 4
// Each pact marked failed in the field forfeits this many reward options —
// the stake the diver never actually carried (AGENTS.md: Reward math).
export const OPTIONS_LOST_PER_FAILED_PACT = 1
// A broken team directive voids its shared risk for the whole squad and costs
// every diver this many of their reward options.
export const OPTIONS_LOST_PER_FAILED_DIRECTIVE = 1

// Team directives bind the whole squad (and share the failure), so a point of
// their risk is worth more Valor than a point of personal pact risk — and more
// the more divers must hold the rule together. A solo diver's directive is
// effectively personal, so it weighs like a pact. Applied to the accepted
// per-mission team condition only — the operation-long strain and Major Order
// keep their own fixed values (AGENTS.md: Reward math). Index = squad size.
export const TEAM_DIRECTIVE_VALOR_WEIGHTS: Readonly<Record<number, number>> = {
  1: 1,
  2: 1.25,
  3: 1.5,
  4: 1.75,
}

export function directiveWeightFor(squadSize: number): number {
  const clamped = Math.min(Math.max(Math.round(squadSize), 1), SQUAD_SIZE_MAX)
  return TEAM_DIRECTIVE_VALOR_WEIGHTS[clamped] ?? 1
}

// Bonus honors: after every reward draft the squad spins one end-of-mission
// stat contest; the host names the winner, who banks one flexible reward
// token. A token rerolls the diver's own offer or bans one offered item from
// their personal pools. Capped so a long crusade can't bank unlimited bans.
export const REWARD_TOKEN_CAP = 3

// Honors are a limited prize: a token only lands on a full-star clear, and
// only at a cadence that scales with squad size — a smaller squad earns rarer
// honors. Values are missions between awards (1 = every mission).
export const BONUS_TOKEN_INTERVAL: Readonly<Record<number, number>> = {
  1: 3,
  2: 2,
  3: 2,
  4: 1,
}

export function bonusIntervalFor(squadSize: number): number {
  const clamped = Math.min(Math.max(Math.round(squadSize), 1), SQUAD_SIZE_MAX)
  return BONUS_TOKEN_INTERVAL[clamped] ?? 1
}

export interface BonusStat {
  id: string
  // The contest as shown on the slot machine, e.g. "most kills". Direction
  // only matters to the host reading HD2's stats screen.
  label: string
  direction: 'most' | 'least'
}

// Every stat on HD2's end-of-mission screen, with its winning direction.
// Tunable: dropping a stat just removes it from the slot machine.
export const BONUS_STATS: readonly BonusStat[] = [
  { id: 'kills', label: 'most kills', direction: 'most' },
  { id: 'accuracy', label: 'best accuracy', direction: 'most' },
  { id: 'shotsFired', label: 'most shots fired', direction: 'most' },
  { id: 'shotsHit', label: 'most shots hit', direction: 'most' },
  { id: 'deaths', label: 'fewest deaths', direction: 'least' },
  { id: 'stimsUsed', label: 'fewest stims used', direction: 'least' },
  { id: 'accidentals', label: 'fewest accidentals', direction: 'least' },
  { id: 'samplesExtracted', label: 'most samples extracted', direction: 'most' },
  { id: 'stratagemsUsed', label: 'most stratagems used', direction: 'most' },
  { id: 'meleeKills', label: 'most melee kills', direction: 'most' },
  { id: 'timesReinforcing', label: 'fewest times reinforcing', direction: 'least' },
  { id: 'friendlyFireDamage', label: 'least friendly fire damage', direction: 'least' },
]
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
  'am23emsmortarsentry',
  'fx12shieldgeneratorrelay',
] as const

// Reward scale-back: difficulty alone buys a base tier — C on diffs 3–5,
// B on 6–7, A on 8+. S and S+ are reachable only through chosen risk
// ("Valor": an accepted team misfortune plus personal pacts), which buys odds
// on each tier step, never a guarantee.
//
// Each rung above the base tier is priced on its own: the first rung (C→B in
// the C band, B→A in the B band) opens readily, the second (B→A from a C base)
// is a long reach. Playtests at diffs 3–5 with a full squad, a strain and
// stacked pacts banked A and even S gear before diff 5 under the old shared
// 0.8 cap — the early ladder must feel scavenged, not looted. Each rung eases
// out toward its cap and only lands on it at the meter top at a band's top, so
// a hard flat cap never swallows a stacked pact: the old linear rungs capped
// out by Valor ~6 and a +3 pact moved nothing but S. Index = step − 1.
export const UPGRADE_STEP_CAPS = [0.95, 0.3] as const

// S and S+ are earned, never bought by altitude: the top rungs only open once
// the diver's Valor clears a floor, then ramp toward the cap. Without this a
// single low-risk misfortune reached S ~80% of the time at difficulties 8–10
// (base tier A is one rung from S).
export const S_VALOR_FLOOR = 4
export const S_UPGRADE_DIVISOR = 18
export const S_UPGRADE_CAP = 0.8
export const S_PLUS_VALOR_FLOOR = 8
export const S_PLUS_UPGRADE_DIVISOR = 40
// The final S→S+ rung is capped far below the rest of the ladder: altitude
// alone must never make Liberty's Cross routine. Below the super-sample bands
// (diff < 6) this flat cap applies; from diff 6 the cap climbs with difficulty
// (sPlusUpgradeCapFor), so the Cross is a real chase at altitude.
export const S_PLUS_UPGRADE_CAP = 0.1

// The Valor meter tops out at 11: the strongest build a squad can realistically
// stack (the absolute max is ~16.5, a strain included). Valor past the top is
// banked as Luck — the
// gauge "breaks" and each extra point buys flat odds on the S and S+ rungs, so
// overstacking risk is never wasted. Overflow can push S near certainty but
// never guarantees either top rung. (AGENTS.md: Reward math.)
export const VALOR_METER_MAX = 11
export const OVERFLOW_S_LUCK = 0.05
export const OVERFLOW_S_PLUS_LUCK = 0.015
export const S_OVERFLOW_CAP = 0.95
export const S_PLUS_OVERFLOW_CAP = 0.2

// Liberty's Cross scales with altitude instead of being a flat longshot: once
// super samples appear (diff 6) the S+ per-step ceiling climbs with difficulty,
// so the Cross is a real chase at the super-sample bands and a better one at
// altitude. Below diff 6 it stays the base jackpot cap.
export const S_PLUS_CAP_DIFF6 = 0.12
export const S_PLUS_CAP_PER_DIFFICULTY = 0.013
export const S_PLUS_UNLOCK_DIFFICULTY = 6

export function sPlusUpgradeCapFor(difficulty: number): number {
  if (difficulty < S_PLUS_UNLOCK_DIFFICULTY) {
    return S_PLUS_UPGRADE_CAP
  }
  return Math.min(
    S_PLUS_OVERFLOW_CAP,
    S_PLUS_CAP_DIFF6 + (difficulty - S_PLUS_UNLOCK_DIFFICULTY) * S_PLUS_CAP_PER_DIFFICULTY,
  )
}

// The top-rung Valor floors are constant within a difficulty band and step up
// gently as the base tier rises. Within a band the smooth ladder altitude
// (below) supplies the easier climb, so the top rungs scale with difficulty
// instead of sawtoothing at band boundaries.
const S_FLOOR_BY_BAND: Readonly<Record<string, number>> = { C: 3, B: 3.5, A: S_VALOR_FLOOR }
const S_PLUS_FLOOR_BY_BAND: Readonly<Record<string, number>> = { C: 5, B: 6.5, A: S_PLUS_VALOR_FLOOR }

// The top rungs are a high-altitude prize: below the A band their odds are
// scaled down by how far the base tier sits from A, so a low-difficulty squad
// can glimpse S (and the Cross) but never farm it. Applied after Luck, so
// overstacking still pays — just less the lower the dive.
const TOP_RUNG_REACH_BY_BAND: Readonly<Record<string, number>> = { C: 0.35, B: 0.6, A: 1 }

export function topRungReachFor(difficulty: number): number {
  return TOP_RUNG_REACH_BY_BAND[baseTierFor(difficulty)] ?? 1
}

export function sValorFloorFor(difficulty: number): number {
  return S_FLOOR_BY_BAND[baseTierFor(difficulty)] ?? S_VALOR_FLOOR
}

export function sPlusValorFloorFor(difficulty: number): number {
  return S_PLUS_FLOOR_BY_BAND[baseTierFor(difficulty)] ?? S_PLUS_VALOR_FLOOR
}

// The top rungs scale with a single altitude ramp across the whole ladder
// (1.0 at diff 3 → 2.0 at diff 10) rather than the per-band bandPosition, whose
// reset at each band boundary made S+ sawtooth (harder at a band's floor than
// the previous band's top). The ordinary C→B / B→A steps keep bandPosition.
export function topRungAltitude(difficulty: number): number {
  const span = MAX_DIFFICULTY - MIN_DIFFICULTY
  return 1 + (difficulty - MIN_DIFFICULTY) / span
}
// A tier previews only when the odds of actually reaching it (the whole climb,
// not one step) would read as at least 1% — anything rarer shows as 0% and
// unlit, so the ladder never lights a tier it prices at 0% or fades one it
// prices above zero.
export const CEILING_PREVIEW_FLOOR = 0.01

// Samples are exchanged for credits, the currency of Brasch's Bargains:
// recovered in the field, banked into a personal purse, and spent on the
// per-mission shelf. They never touch Valor. Values are calibrated against
// wiki.gg/Sample "availability by difficulty" so the game's own rarity mix does
// the difficulty scaling (commons dominate early, supers appear at 6).
export const SAMPLE_CREDITS: Readonly<Record<'common' | 'rare' | 'super', number>> = {
  common: 1,
  rare: 3,
  super: 12,
}

// Team performance is a multiplier on the credit haul, not a Valor bonus:
// extraction speed scales the purse, so a fast clear banks more credits.
// 0.5 at no time remaining, 1.0 at a full clock.
export const TIME_HAUL_FLOOR = 0.5

// Brasch's Bargains prices: tier first, then type. Tier dominates (a C primary
// is far cheaper than an S passive); the type multiplier is how a primary
// out-prices an armor passive. The curve is steep through C/B/A (~2.8x per tier)
// and flattens into S so the top stays in reach: C and B are a mission or two's
// haul, A is a short save, and S, which only
// stocks from difficulty 8, lands about once per 6-7 missions for a squad
// filing a modest share of the map's samples (scripts/simulate-economy.mjs,
// SAVER=1 models a diver who holds off small buys to afford a nearby S).
export const CREDIT_PRICE_TIER: Readonly<Record<'c' | 'b' | 'a' | 's', number>> = {
  c: 35,
  b: 100,
  a: 280,
  s: 450,
}

export const CREDIT_PRICE_TYPE: Readonly<Record<string, number>> = {
  primary: 1.25,
  armorPassive: 0.75,
}

export const CREDIT_PRICE_TYPE_DEFAULT = 1

// Brasch's Bargains: one fixed slot per category, re-dealt every mission.
// Difficulties whose missions can award more than BARGAIN_BASE_STARS stars add
// one random stratagem slot per extra star (4 stars → one, 5 → two). Stock
// spans the difficulty's base tier up to BARGAIN_TIER_REACH tiers above it.
export const BARGAIN_SLOTS = ['primary', 'secondary', 'throwable', 'armorPassive'] as const
export const BARGAIN_BASE_STARS = 3
export const BARGAIN_TIER_REACH = 1

export function bargainStratagemSlotsFor(difficulty: number): number {
  return Math.max(0, maxStarsFor(difficulty) - BARGAIN_BASE_STARS)
}

// Stream salt 5 off the mission's bargain seed.
export const BARGAIN_STREAM = 5

// A failed mission's forfeit offer: a seeded handful of the diver's own items
// (one per star the difficulty can award) to choose the one they lose, capped
// at the same Valor ceiling as a reward draft. Stream salt 6 off the per-diver
// offer seed.
export const FORFEIT_STREAM = 6

// wiki.gg/Sample "availability by difficulty": the most of each rarity a map
// can spawn at a difficulty (ranges capped at their upper bound). Drives the
// report form's base ceiling, and is why sample Valor scales with altitude —
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

// wiki.gg/Sample Scanner: a 15% chance to receive twice the samples on every
// pickup, all rarities — so a squad can recover more than the map spawned. The
// report form tops out at the all-pickups-double ceiling; the filed count stays
// honor-system.
export const SAMPLE_SCANNER_PICKUP_MULTIPLIER = 2

export function sampleReportCeiling(
  difficulty: number,
): { common: number, rare: number, super: number } {
  const available = sampleAvailability(difficulty)
  return {
    common: available.common * SAMPLE_SCANNER_PICKUP_MULTIPLIER,
    rare: available.rare * SAMPLE_SCANNER_PICKUP_MULTIPLIER,
    super: available.super * SAMPLE_SCANNER_PICKUP_MULTIPLIER,
  }
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

// Odds of upgrading one rung above the base tier (step 1 = the first rung,
// step 2 = the second). Only the ordinary rungs below S use this.
// Quadratic ease-out rather than Math.exp: plain arithmetic is bit-identical on
// every JS engine, so server and clients roll the same ceiling.
export function upgradeOdds(valor: number, bandPos: number, step: number): number {
  const index = Math.min(step, UPGRADE_STEP_CAPS.length) - 1
  const reach = Math.min(1, Math.max(0, (valor * (1 + bandPos)) / (2 * VALOR_METER_MAX)))
  return UPGRADE_STEP_CAPS[index]! * (1 - (1 - reach) ** 2)
}

// One risk curve per condition (team misfortunes and personal pacts alike).
// Nothing is gated by difficulty: every condition is always available, and the
// difficulty scales its risk/Valor value instead:
//
//   risk(difficulty) = clamp(round(base + slope * (difficulty - MIN_DIFFICULTY)), 1, 5)
//
// `slope` may be negative — a condition that matters less at altitude is worth
// less there (inverse scaling). These are the proposed defaults; they are
// deliberately plain and easy to tune. `base` is the value at difficulty 3.
export interface ConditionRiskCurve {
  base: number
  slope: number
}

export const CONDITION_RISK: Readonly<Record<string, ConditionRiskCurve>> = {
  // Team rules — squad-binding misfortunes. Most grow with the enemy's strength.
  noBackpacks: { base: 1, slope: 0 },
  noSentries: { base: 1, slope: 0.05 },
  noBoosters: { base: 1, slope: 0 },
  noResupplies: { base: 1, slope: 0.25 },
  noEagles: { base: 1, slope: 0.15 },
  fragileLiberty: { base: 1, slope: 0.15 },
  noOrbitals: { base: 1, slope: 0.2 },
  primaryOnly: { base: 2, slope: 0.15 },
  oopsAllAirstrikes: { base: 2, slope: 0.2 },
  zeroDeaths: { base: 3, slope: 0.3 },
  noReserves: { base: 2, slope: 0.35 },
  noStratagems: { base: 3, slope: 0.3 },
  meleeOnly: { base: 2, slope: 0.35 },
  pacifist: { base: 3, slope: 0.3 },

  // Personal rules — pacts. Most rise with altitude: losing healing, anti-tank
  // or your life costs more where the enemy hits harder. Dead Weight stays flat
  // — you die more often up high, but squadmates do too, so you wait less for
  // the shared reinforce.
  packLight: { base: 1, slope: 0 },
  thirsty: { base: 1, slope: 0.15 },
  emptyPockets: { base: 1, slope: 0 },
  antiTankAbstinent: { base: 1, slope: 0.45 },
  deadWeight: { base: 2, slope: 0 },
  stimAbstinent: { base: 3, slope: 0.15 },
  loadoutLoyalist: { base: 2, slope: 0 },
  primaryConcern: { base: 1, slope: 0.3 },
  grounded: { base: 2, slope: 0 },
  shipSilent: { base: 2, slope: 0 },
  openField: { base: 2, slope: 0 },
  untouchable: { base: 2.5, slope: 0.25 },
}

// A condition's risk at a difficulty, clamped to the 1–5 scale. Unknown ids
// return 0 so a stale save or catalog drift never inflates Valor.
export function conditionRiskAt(conditionId: string, difficulty: number): number {
  const curve = CONDITION_RISK[conditionId]
  if (!curve) {
    return 0
  }
  return Math.min(5, Math.max(1, Math.round(curve.base + curve.slope * (difficulty - MIN_DIFFICULTY))))
}

// The Valor an accepted team directive stakes: its scaled risk, weighted by
// how many divers must hold it (and eat a failed directive together).
export function directiveValorAt(conditionId: string, difficulty: number, squadSize: number): number {
  return conditionRiskAt(conditionId, difficulty) * directiveWeightFor(squadSize)
}

// Strains are an optional, operation-long commitment: the squad accepts or
// declines the drawn subfaction in the operation's first decision window.
// Accepting adds the risk to every mission of the operation (it compounds over
// the op's 2–3 missions), so the values stay below the misfortune scale.
export const STRAIN_RISK: Readonly<Record<string, number>> = {
  predatorStrain: 2,
  ruptureStrain: 2,
  sporeBurstStrain: 3,
  jetBrigade: 2,
  incinerationCorps: 3,
  cyborgLegion: 3,
  mindlessMasses: 2,
  appropriators: 2,
  voteSnatchers: 3,
}

export const STRAIN_MIN_DIFFICULTY: Readonly<Record<string, number>> = {
  predatorStrain: 3,
  ruptureStrain: 3,
  sporeBurstStrain: 6,
  jetBrigade: 3,
  incinerationCorps: 3,
  cyborgLegion: 6,
  mindlessMasses: 3,
  appropriators: 3,
  voteSnatchers: 5,
}
