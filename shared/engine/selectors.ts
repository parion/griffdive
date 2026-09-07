import { ALL_ITEMS, ALL_WARBOND_CODES } from '../data/catalog'
import type { Front } from '../data/fronts'
import { MISFORTUNES } from '../data/misfortunes'
import type { Misfortune } from '../data/misfortunes'
import type { Pact } from '../data/pacts'
import type { Item } from '../data/types'
import { MISFORTUNE_RISK, OPTIONS_LOST_PER_FAILED_PACT, baseTierFor } from './config'
import { pactRiskTotal, rollPactOffer } from './pacts'
import { luckOf, maxCeiling, oddsToReach, optionsForStars, rollCeiling, rollRewardOptions } from './rewards'
import type { RewardOption } from './rewards'
import { deriveSeed, hashString, mulberry32 } from './rng'
import type { DiveState, DiverState, RewardTier } from './types'
import { eligibleMisfortunes, frontById } from './wheel'

export function comboKey(misfortuneId: string, front: string): string {
  return `${misfortuneId}:${front}`
}

export function currentMisfortune(state: DiveState): Misfortune | null {
  return MISFORTUNES.find(misfortune => misfortune.id === state.wheel?.misfortuneId) ?? null
}

// The misfortune only binds the squad once accepted; a declined draw is
// flavor on the wheel, not a rule.
export function activeMisfortune(state: DiveState): Misfortune | null {
  return state.misfortuneAccepted ? currentMisfortune(state) : null
}

export function currentFront(state: DiveState): Front | null {
  return state.frontId ? frontById(state.frontId) : null
}

export interface MisfortuneDecision {
  decided: boolean
  accepted: boolean
}

// The phase carries the decision: 'decision' is the open vote, everything
// after it is decided (accepted or declined). A misfortune reroll reopens it
// by returning the phase to 'decision'.
export function misfortuneDecision(state: DiveState): MisfortuneDecision {
  if (!state.wheel || state.phase === 'decision') {
    return { decided: false, accepted: false }
  }
  return { decided: true, accepted: state.misfortuneAccepted }
}

export function teamRiskOf(state: DiveState): number {
  if (!state.misfortuneAccepted) {
    return 0
  }
  const misfortune = currentMisfortune(state)
  return misfortune ? (MISFORTUNE_RISK[misfortune.id] ?? 0) : 0
}

// A failed pact is voided: it no longer stakes risk, so its share of the
// diver's luck disappears from previews and from the rolled offer alike.
export function pactRiskOf(diver: DiverState): number {
  return pactRiskTotal(diver.pactIds.filter(id => !diver.failedPactIds.includes(id)))
}

export function diverLuck(state: DiveState, diver: DiverState): number {
  return luckOf(teamRiskOf(state), pactRiskOf(diver))
}

// Display ceiling: the deterministic best case the diver's luck can preview.
// The actual offer rolls its ceiling (diverOptions).
export function diverCeiling(state: DiveState, diver: DiverState): RewardTier {
  return maxCeiling(state.difficulty, diverLuck(state, diver))
}

export function rewardPoolFor(codes: readonly string[]): Item[] {
  const owned = new Set(codes)
  return ALL_ITEMS.filter(
    item =>
      (item.warbondCode === 'none' || owned.has(item.warbondCode))
      // Armor rewards are passives: any armor piece whose passive is owned is
      // freely wearable, so pieces never appear as reward options.
      && item.category !== 'armor',
  )
}

export function diverOptions(state: DiveState, diver: DiverState): RewardOption[] {
  if (state.offerSeed === null || !state.lastReport || state.lastReport.outcome !== 'success') {
    return []
  }
  // Seated mid-mission: the squad dove without them, so the draft isn't theirs.
  if (diver.skipsCurrentDraft) {
    return []
  }
  const seed = deriveSeed(state.offerSeed, hashString(diver.id))
  // Two rng streams derived from the offer seed: one rolls the tier ceiling,
  // one rolls the options — every client computes the same offer.
  const ceiling = rollCeiling(
    mulberry32(deriveSeed(seed, 1)),
    state.difficulty,
    diverLuck(state, diver),
  )
  // The pool is the diver's own: warbonds are personal purchases, so each
  // diver rolls offers against the catalog they can actually use.
  const pool = rewardPoolFor(diver.warbondCodes ?? ALL_WARBOND_CODES)
  const owned = new Set(state.personalInventories[diver.id] ?? [])
  // Every failed pact forfeits one reward option (AGENTS.md: Reward math) —
  // floored at one so the draft can always complete and never deadlock ADVANCE.
  const count = Math.max(
    1,
    optionsForStars(state.lastReport.stars, ceiling)
    - diver.failedPactIds.length * OPTIONS_LOST_PER_FAILED_PACT,
  )
  return rollRewardOptions(deriveSeed(seed, 2), ceiling, count, pool, owned)
}

// The Field Promotion: a mid-crusade joiner's catch-up offer. Altitude
// parity, never rarity — the ceiling is the difficulty's base tier at zero
// luck (a zero-luck dive always rolls its base tier), so a late joiner buys
// up to the squad's altitude without ever reaching S. Derived from the last
// spun seed like every offer — deterministic, never stored.
export function catchUpOptionsFor(state: DiveState, diver: DiverState): RewardOption[] {
  if (!state.settings || diver.catchUpOwed <= 0) {
    return []
  }
  const seed = deriveSeed(state.seedHistory.at(-1) ?? 0, hashString(`${diver.id}:catchup`))
  const pool = rewardPoolFor(diver.warbondCodes ?? ALL_WARBOND_CODES)
  const owned = new Set(state.personalInventories[diver.id] ?? [])
  return rollRewardOptions(seed, baseTierFor(state.difficulty), diver.catchUpOwed, pool, owned)
}

export interface CeilingRange {
  min: RewardTier
  max: RewardTier
  odds: number
}

// Legibility preview: the base tier a zero-luck dive gets, the best tier the
// current luck can plausibly reach, and the odds of reaching it.
export function ceilingRange(difficulty: number, teamRisk: number, pactRisk: number): CeilingRange {
  const luck = luckOf(teamRisk, pactRisk)
  const max = maxCeiling(difficulty, luck)
  return {
    min: baseTierFor(difficulty),
    max,
    odds: oddsToReach(difficulty, luck, max),
  }
}

export function ceilingRangeForDifficulty(difficulty: number, pactRisk = 0): CeilingRange {
  const pool = eligibleMisfortunes(difficulty)
  const maxRisk = Math.max(0, ...pool.map(misfortune => MISFORTUNE_RISK[misfortune.id] ?? 0))
  return ceilingRange(difficulty, maxRisk, pactRisk)
}

export function canRerollWheel(
  state: DiveState,
  wheel: 'misfortune' | 'front',
): { allowed: boolean, free: boolean, reason: string | null } {
  if (!state.wheel || !state.frontId) {
    return { allowed: false, free: false, reason: 'Spin the wheel first' }
  }
  if (state.divers.some(diver => diver.pactsLocked)) {
    return { allowed: false, free: false, reason: 'Pacts already locked' }
  }
  // The front locks in with its operation — rerolls are mission-1 business.
  if (wheel === 'front' && state.missionIndex > 0) {
    return { allowed: false, free: false, reason: 'The front locks in for the whole operation' }
  }
  const completed = state.completedCombos.includes(
    comboKey(state.wheel.misfortuneId, state.frontId),
  )
  if (completed) {
    return { allowed: true, free: true, reason: null }
  }
  if (state.rerollTokens > 0) {
    return { allowed: true, free: false, reason: null }
  }
  return { allowed: false, free: false, reason: 'No reroll tokens left' }
}

export function allDiversPicked(state: DiveState): boolean {
  return state.divers.every(
    diver => diver.pickedOptionId !== null || diver.skipsCurrentDraft,
  )
}

// Legacy caches a mid-crusade joiner can claim instead of their promotion.
export function availableCaches(state: DiveState): { ownerId: string, itemIds: string[] }[] {
  return Object.entries(state.legacyCaches).map(([ownerId, itemIds]) => ({
    ownerId,
    itemIds,
  }))
}

// The per-diver pact offer: rolled deterministically from the wheel seed once
// the squad has decided the misfortune (accepted pools are filtered, declined
// draws offer from the full catalog). Derived, never stored — same seed, same
// offer on every client.
export function pactOfferFor(state: DiveState, diverId: string): Pact[] {
  const decision = misfortuneDecision(state)
  if (!state.wheel || !decision.decided) {
    return []
  }
  const active = decision.accepted ? currentMisfortune(state) : null
  return rollPactOffer(
    deriveSeed(state.wheel.seed, hashString(diverId)),
    active?.id ?? null,
    state.difficulty,
  )
}
