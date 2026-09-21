import type { Item, Tier } from '../data/types'
import {
  BONUS_STATS,
  MAX_OPTIONS,
  OVERFLOW_S_LUCK,
  OVERFLOW_S_PLUS_LUCK,
  SAMPLE_VALOR_CAP,
  SAMPLE_VALOR_WEIGHTS,
  S_PLUS_BONUS_OPTIONS,
  S_PLUS_OVERFLOW_CAP,
  S_PLUS_UPGRADE_CAP,
  S_PLUS_UPGRADE_DIVISOR,
  S_OVERFLOW_CAP,
  S_UPGRADE_DIVISOR,
  STARS_TO_OPTIONS,
  TIER_ROLL_WEIGHT_BASE,
  TIME_VALOR_MAX,
  UPGRADE_CAP,
  UPGRADE_PREVIEW_FLOOR,
  VALOR_METER_MAX,
  bandPosition,
  baseTierFor,
  sPlusValorFloorFor,
  sValorFloorFor,
  upgradeOdds,
} from './config'
import type { BonusStat } from './config'
import { deriveSeed, mulberry32, pickIndex, pickWeighted } from './rng'
import type { Rng } from './rng'
import type { MissionReport, RewardTier } from './types'

const TIER_INDEX: Readonly<Record<Tier, number>> = { c: 0, b: 1, a: 2, s: 3 }
const CEILING_LADDER: readonly RewardTier[] = ['C', 'B', 'A', 'S', 'S+']

// One step of the ceiling ladder. The top rungs (S, S+) don't use the shared
// step curve: each has a Valor floor (easing in the low bands) and its own
// ramp, so altitude can't hand out the top tier for a trickle of risk. Valor
// past the meter top is banked as Luck and adds flat odds to both rungs. The
// roll, the preview and the priced climb all share this so the UI never
// overstates the jackpot.
function stepOdds(difficulty: number, valor: number, step: number, targetIndex: number): number {
  const bandPos = bandPosition(difficulty)
  const altitude = 1 + bandPos
  const metered = Math.min(valor, VALOR_METER_MAX)
  const overflow = Math.max(0, valor - VALOR_METER_MAX)
  if (targetIndex === CEILING_LADDER.length - 1) {
    const ramp = Math.max(0, metered - sPlusValorFloorFor(difficulty) + 1)
    const base = Math.min(S_PLUS_UPGRADE_CAP, (ramp * altitude) / S_PLUS_UPGRADE_DIVISOR)
    return Math.min(S_PLUS_OVERFLOW_CAP, base + overflow * OVERFLOW_S_PLUS_LUCK)
  }
  if (targetIndex === CEILING_LADDER.length - 2) {
    const ramp = Math.max(0, metered - sValorFloorFor(difficulty) + 1)
    const base = Math.min(UPGRADE_CAP, (ramp * altitude) / S_UPGRADE_DIVISOR)
    return Math.min(S_OVERFLOW_CAP, base + overflow * OVERFLOW_S_LUCK)
  }
  return upgradeOdds(metered, bandPos, step)
}

// No catalog item carries the S+ tier, so a ceiling that breaks the scale
// banks as Liberty's Cross instead: one option to claim any item the diver's
// own catalog allows. The sentinel id can never collide with a catalog id
// (catalog ids are camelCase) and is never stored — offers are derived.
export const DIVERS_CHOICE_OPTION_ID = 's-plus:divers-choice'

// Display stand-in for the choice slot; the UI renders its own special card
// for it and PICK_REWARD swaps in the actually chosen item.
export const DIVERS_CHOICE_ITEM: Item = {
  id: DIVERS_CHOICE_OPTION_ID,
  displayName: 'Liberty’s Cross',
  type: 'equipment',
  category: 'booster',
  tags: [],
  warbondCode: 'none',
  tier: 's',
}

// Chosen risk (accepted team misfortune + personal pacts) plus the small
// team-performance term is the diver's Valor — it buys odds, not tiers.
export function valorOf(teamRisk: number, pactRisk: number, performance = 0): number {
  return teamRisk + pactRisk + performance
}

// Team performance from the mission just reported: a fast clear is worth up to
// TIME_VALOR_MAX, samples up to SAMPLE_VALOR_CAP. Squad-level, so every diver
// carries it; zero on the first mission and on any failed mission.
export function performanceValor(report: MissionReport | null): number {
  if (!report) {
    return 0
  }
  const time = report.timePct === undefined
    ? 0
    : Math.min(1, Math.max(0, report.timePct / 100)) * TIME_VALOR_MAX
  const samples = report.samples
  const sample = samples
    ? Math.min(
        SAMPLE_VALOR_CAP,
        Math.max(0, samples.common) * SAMPLE_VALOR_WEIGHTS.common
        + Math.max(0, samples.rare) * SAMPLE_VALOR_WEIGHTS.rare
        + Math.max(0, samples.super) * SAMPLE_VALOR_WEIGHTS.super,
      )
    : 0
  return time + sample
}

// The offer's tier ceiling is rolled: start at the difficulty's base tier,
// each step to the next tier succeeds with odds scaled by Valor and the band
// position, and the chain stops on the first miss. A zero-Valor dive always
// rolls its base tier; S/S+ need stacked Valor and even then are never sure.
export function rollCeiling(rng: Rng, difficulty: number, valor: number): RewardTier {
  let index = CEILING_LADDER.indexOf(baseTierFor(difficulty))
  for (let step = 1; index + 1 < CEILING_LADDER.length; step++) {
    if (rng() < stepOdds(difficulty, valor, step, index + 1)) {
      index++
    }
    else {
      break
    }
  }
  return CEILING_LADDER[index]!
}

// Deterministic best case for previews: the highest tier whose per-step odds
// clear the legibility floor.
export function maxCeiling(difficulty: number, valor: number): RewardTier {
  let index = CEILING_LADDER.indexOf(baseTierFor(difficulty))
  for (let step = 1; index + 1 < CEILING_LADDER.length; step++) {
    if (stepOdds(difficulty, valor, step, index + 1) < UPGRADE_PREVIEW_FLOOR) {
      break
    }
    index++
  }
  return CEILING_LADDER[index]!
}

export function oddsToReach(difficulty: number, valor: number, tier: RewardTier): number {
  const target = CEILING_LADDER.indexOf(tier)
  const floor = CEILING_LADDER.indexOf(baseTierFor(difficulty))
  let odds = 1
  for (let step = 1; floor + step <= target; step++) {
    odds *= stepOdds(difficulty, valor, step, floor + step)
  }
  return odds
}

// Bonus honors: after every reward draft the squad spins one end-of-mission
// stat contest. Like the wheel and the pact offer, it is a deterministic
// derivation of a seed — stream salt 4 (wheel uses 1/2, pacts 3) — so every
// client animates to the same result. The host resolves the winner by reading
// HD2's stats screen; the app never captures the stats.
export function rollBonus(seed: number): BonusStat {
  const rng = mulberry32(deriveSeed(seed, 4))
  return BONUS_STATS[pickIndex(rng, BONUS_STATS.length)]!
}

export function optionsForStars(stars: number, ceiling: RewardTier): number {
  const clamped = Math.min(Math.max(Math.round(stars), 0), STARS_TO_OPTIONS.length - 1)
  const count = Math.min(STARS_TO_OPTIONS[clamped] ?? 1, MAX_OPTIONS)
  if (ceiling === 'S+') {
    return Math.min(count + S_PLUS_BONUS_OPTIONS, MAX_OPTIONS + S_PLUS_BONUS_OPTIONS)
  }
  return count
}

// Reward options live in the band the difficulty guarantees (its base tier) and
// the ceiling the diver's Valor rolled. The base is a hard floor — a Super
// Helldive never offers C-tier gear — and within the band a higher tier is
// exponentially likelier, so the ceiling the diver bought is actually what the
// draft leans into. S+ has no items of its own, so it prices as S.
export function tierWeight(tier: Tier, floor: RewardTier, ceiling: RewardTier): number {
  const floorIndex = tierIndex(floor)
  const ceilingIndex = tierIndex(ceiling)
  const index = TIER_INDEX[tier]
  if (index > ceilingIndex || index < floorIndex) {
    return 0
  }
  return TIER_ROLL_WEIGHT_BASE ** (index - floorIndex)
}

function tierIndex(tier: RewardTier): number {
  return tier === 'S+' ? TIER_INDEX.s : TIER_INDEX[tier.toLowerCase() as Tier]
}

export interface RewardOption {
  optionId: string
  item: Item
  // Liberty's Cross: the diver names the item when picking (PICK_REWARD's
  // choiceItemId); the placeholder item is display-only.
  choice?: boolean
}

export function rollRewardOptions(
  seed: number,
  ceiling: RewardTier,
  floor: RewardTier,
  count: number,
  pool: readonly Item[],
  excludeIds: ReadonlySet<string>,
): RewardOption[] {
  const rng = mulberry32(seed)
  const picked: RewardOption[] = []
  const taken = new Set<string>()

  // S+ breaks the scale: its bonus slot is Liberty's Cross (AGENTS.md: Reward
  // math) — any item from the diver's own catalog, picked at draft time.
  if (ceiling === 'S+') {
    picked.push({ optionId: DIVERS_CHOICE_OPTION_ID, item: DIVERS_CHOICE_ITEM, choice: true })
  }

  const itemCeiling = tierIndex(ceiling)
  const floorIndex = tierIndex(floor)
  const band = pool.filter(
    item => !excludeIds.has(item.id) && tierWeight(item.tier, floor, ceiling) > 0,
  )
  // Exhausted the band's pool (deep crusade): degrade the tier filter rather
  // than offer nothing — an empty offer deadlocks the dive. The fallback rolls
  // uniformly, since the survivors may sit outside the band.
  const degraded = band.length === 0
  const candidates = degraded ? pool.filter(item => !excludeIds.has(item.id)) : band

  // The draft leads with one option at the rolled ceiling — the class the diver
  // earned — then fills the rest a band down, so a high ceiling lands as one top
  // pick plus support instead of flooding the offer with top-tier gear. A thin
  // pool falls back to the highest tier it still has, so the slot never drops.
  let fillCeiling = itemCeiling
  if (!degraded && itemCeiling > floorIndex && picked.length < count && candidates.length > 0) {
    const topIndex = Math.max(...candidates.map(candidate => TIER_INDEX[candidate.tier]))
    const top = candidates.filter(candidate => TIER_INDEX[candidate.tier] === topIndex)
    const item = top[Math.floor(rng() * top.length)]!
    picked.push({ optionId: item.id, item })
    taken.add(item.id)
    fillCeiling = Math.max(floorIndex, topIndex - 1)
  }

  while (picked.length < count && taken.size < candidates.length) {
    const remaining = candidates.filter(item => !taken.has(item.id))
    const inBand = remaining.filter(item => degraded || TIER_INDEX[item.tier] <= fillCeiling)
    const roll = inBand.length > 0 ? inBand : remaining
    const item = pickWeighted(
      rng,
      roll.map(candidate => ({
        value: candidate,
        weight: degraded
          ? 1
          : TIER_ROLL_WEIGHT_BASE ** (TIER_INDEX[candidate.tier] - floorIndex),
      })),
    )
    picked.push({ optionId: item.id, item })
    taken.add(item.id)
  }
  return picked
}
