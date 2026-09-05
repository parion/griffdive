import type { Item, Tier } from '../data/types'
import {
  MAX_OPTIONS,
  S_PLUS_BONUS_OPTIONS,
  STARS_TO_OPTIONS,
  TIER_ROLL_WEIGHT_BASE,
  UPGRADE_PREVIEW_FLOOR,
  bandPosition,
  baseTierFor,
  upgradeOdds,
} from './config'
import { mulberry32, pickWeighted } from './rng'
import type { Rng } from './rng'
import type { RewardTier } from './types'

const TIER_INDEX: Readonly<Record<Tier, number>> = { c: 0, b: 1, a: 2, s: 3 }
const CEILING_LADDER: readonly RewardTier[] = ['C', 'B', 'A', 'S', 'S+']

// Chosen risk (accepted team misfortune + personal pacts) buys odds, not tiers.
export function luckOf(teamRisk: number, pactRisk: number): number {
  return teamRisk + pactRisk
}

// The offer's tier ceiling is rolled: start at the difficulty's base tier,
// each step to the next tier succeeds with odds scaled by luck and the band
// position, and the chain stops on the first miss. A zero-luck dive always
// rolls its base tier; S/S+ need stacked luck and even then are never sure.
export function rollCeiling(rng: Rng, difficulty: number, luck: number): RewardTier {
  const pos = bandPosition(difficulty)
  let index = CEILING_LADDER.indexOf(baseTierFor(difficulty))
  for (let step = 1; index + 1 < CEILING_LADDER.length; step++) {
    if (rng() < upgradeOdds(luck, pos, step)) {
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
export function maxCeiling(difficulty: number, luck: number): RewardTier {
  const pos = bandPosition(difficulty)
  let index = CEILING_LADDER.indexOf(baseTierFor(difficulty))
  for (let step = 1; index + 1 < CEILING_LADDER.length; step++) {
    if (upgradeOdds(luck, pos, step) < UPGRADE_PREVIEW_FLOOR) {
      break
    }
    index++
  }
  return CEILING_LADDER[index]!
}

export function oddsToReach(difficulty: number, luck: number, tier: RewardTier): number {
  const pos = bandPosition(difficulty)
  const target = CEILING_LADDER.indexOf(tier)
  const floor = CEILING_LADDER.indexOf(baseTierFor(difficulty))
  let odds = 1
  for (let step = 1; floor + step <= target; step++) {
    odds *= upgradeOdds(luck, pos, step)
  }
  return odds
}

export function optionsForStars(stars: number, ceiling: RewardTier): number {
  const clamped = Math.min(Math.max(Math.round(stars), 0), STARS_TO_OPTIONS.length - 1)
  const count = Math.min(STARS_TO_OPTIONS[clamped] ?? 1, MAX_OPTIONS)
  if (ceiling === 'S+') {
    return Math.min(count + S_PLUS_BONUS_OPTIONS, MAX_OPTIONS + S_PLUS_BONUS_OPTIONS)
  }
  return count
}

export function tierWeight(tier: Tier, ceiling: RewardTier): number {
  const ceilingIndex = ceiling === 'S+' ? TIER_INDEX.s : TIER_INDEX[ceiling.toLowerCase() as Tier]
  if (TIER_INDEX[tier] > ceilingIndex) {
    return 0
  }
  return TIER_ROLL_WEIGHT_BASE ** (ceilingIndex - TIER_INDEX[tier])
}

export interface RewardOption {
  optionId: string
  item: Item
}

export function rollRewardOptions(
  seed: number,
  ceiling: RewardTier,
  count: number,
  pool: readonly Item[],
  excludeIds: ReadonlySet<string>,
): RewardOption[] {
  const rng = mulberry32(seed)
  let candidates = pool.filter(
    item => !excludeIds.has(item.id) && tierWeight(item.tier, ceiling) > 0,
  )
  if (candidates.length === 0) {
    // Exhausted the ceiling-tier pool (deep crusade): degrade the tier filter
    // rather than offer nothing — an empty offer deadlocks the dive.
    candidates = pool.filter(item => !excludeIds.has(item.id))
  }
  const picked: RewardOption[] = []
  const taken = new Set<string>()

  // S+ guarantees at least one top-tier option (AGENTS.md: Reward math).
  if (ceiling === 'S+') {
    const top = candidates.filter(item => item.tier === 's')
    const item = top.length > 0 ? top[Math.floor(rng() * top.length)] : undefined
    if (item) {
      picked.push({ optionId: item.id, item })
      taken.add(item.id)
    }
  }

  while (picked.length < count && taken.size < candidates.length) {
    const remaining = candidates.filter(item => !taken.has(item.id))
    const item = pickWeighted(
      rng,
      remaining.map(candidate => ({ value: candidate, weight: tierWeight(candidate.tier, ceiling) })),
    )
    picked.push({ optionId: item.id, item })
    taken.add(item.id)
  }
  return picked
}
