import { ALL_ITEMS, ALL_WARBOND_CODES } from '../data/catalog'
import type { Front } from '../data/fronts'
import { MISFORTUNES } from '../data/misfortunes'
import type { Misfortune } from '../data/misfortunes'
import { PACTS } from '../data/pacts'
import type { Pact } from '../data/pacts'
import type { Item } from '../data/types'
import { MISFORTUNE_RISK, baseTierFor } from './config'
import { isPactSelectable, pactRiskTotal } from './pacts'
import { luckOf, maxCeiling, oddsToReach, optionsForStars, rollCeiling, rollRewardOptions } from './rewards'
import type { RewardOption } from './rewards'
import { deriveSeed, hashString, mulberry32 } from './rng'
import type { DiveState, DiverState, RewardTier } from './types'
import { eligibleMisfortunes } from './wheel'

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
  const id = state.frontId
  if (!id) {
    return null
  }
  return { id, displayName: frontDisplayName(id) }
}

export interface MisfortuneDecision {
  decided: boolean
  accepted: boolean
}

// `misfortuneAccepted: false` alone can't tell "not yet decided" from
// "explicitly declined" — the decision stamp lives in the action log: the
// first decision recorded after the current draw (spin or reroll) is the
// squad's choice.
export function misfortuneDecision(state: DiveState): MisfortuneDecision {
  for (let i = state.actionLog.length - 1; i >= 0; i--) {
    const action = state.actionLog[i]
    if (!action) {
      break
    }
    if (action.type === 'ACCEPT_MISFORTUNE') {
      return { decided: true, accepted: action.accepted }
    }
    // A spin (new mission) or a misfortune reroll reopens the decision; a
    // front reroll doesn't touch the misfortune on the table.
    if (action.type === 'SPIN_WHEEL' || (action.type === 'REROLL_WHEEL' && action.wheel === 'misfortune')) {
      break
    }
  }
  return { decided: state.misfortuneAccepted, accepted: state.misfortuneAccepted }
}

function frontDisplayName(id: string): Front['displayName'] {
  switch (id) {
    case 'terminids':
      return 'Terminids'
    case 'automatons':
      return 'Automatons'
    default:
      return 'Illuminate'
  }
}

export function teamRiskOf(state: DiveState): number {
  if (!state.misfortuneAccepted) {
    return 0
  }
  const misfortune = currentMisfortune(state)
  return misfortune ? (MISFORTUNE_RISK[misfortune.id] ?? 0) : 0
}

export function pactRiskOf(diver: DiverState): number {
  return pactRiskTotal(diver.pactIds)
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
  const count = optionsForStars(state.lastReport.stars, ceiling)
  return rollRewardOptions(deriveSeed(seed, 2), ceiling, count, pool, owned)
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
  return state.divers.every(diver => diver.pickedOptionId !== null)
}

export function pactChoices(
  misfortuneId: string | null,
): { pact: Pact, selectable: boolean, blockedReason: string | null }[] {
  const misfortuneName = misfortuneId
    ? (MISFORTUNES.find(misfortune => misfortune.id === misfortuneId)?.name ?? null)
    : null
  return PACTS.map((pact) => {
    const selectable = isPactSelectable(pact.id, misfortuneId)
    return {
      pact,
      selectable,
      blockedReason: selectable || !misfortuneName ? null : `Redundant under ${misfortuneName}`,
    }
  })
}

export { isPactSelectable, pactRiskTotal }
