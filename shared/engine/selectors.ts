import { ALL_ITEMS, ALL_WARBOND_CODES } from '../data/catalog'
import { FRONTS } from '../data/fronts'
import type { Front } from '../data/fronts'
import { MISFORTUNES } from '../data/misfortunes'
import type { Misfortune } from '../data/misfortunes'
import type { Pact } from '../data/pacts'
import type { Strain } from '../data/strains'
import type { Item } from '../data/types'
import {
  MISFORTUNE_RISK,
  OPTIONS_LOST_PER_FAILED_PACT,
  PACT_RISK,
  SAMPLE_VALOR_CAP,
  STRAIN_RISK,
  TIME_VALOR_MAX,
  baseTierFor,
  bonusIntervalFor,
  maxStarsFor,
  pactOptionsFor,
} from './config'
import type { BonusStat } from './config'
import { hasLegalLoadout, pactRiskTotal, rollPactOffer } from './pacts'
import { startingItemIds } from './progression'
import { performanceValor, maxCeiling, oddsToReach, optionsForStars, rollBonus, rollCeiling, rollRewardOptions, valorOf } from './rewards'
import type { RewardOption } from './rewards'
import { deriveSeed, hashString, mulberry32 } from './rng'
import type { DiveState, DiverState, RewardTier } from './types'
import { eligibleMisfortunes, eligibleStrains, frontById, strainById } from './wheel'

// A completed run is tracked by its full draw — misfortune, front and strain —
// so the free-overrule reroll only fires on the exact same challenge. The
// strain is always part of the key once drawn ('none' when a front has no
// eligible strain).
export function comboKey(
  misfortuneId: string,
  front: string,
  strainId: string | null,
): string {
  return `${misfortuneId}:${front}:${strainId ?? 'none'}`
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

// The fronts a Major Order pins the operation's draw to. No MO (or one that
// names no known front) leaves the full roster, so the draw is unrestricted.
// With an MO the pool is exactly its fronts — the squad chose where to fight,
// so the spin randomizes within the order but never leaves it.
export function majorOrderFronts(state: DiveState): readonly Front[] {
  const ids = state.majorOrder?.fronts
  if (!ids?.length) {
    return FRONTS
  }
  const pool = FRONTS.filter(front => ids.includes(front.id))
  return pool.length > 0 ? pool : FRONTS
}

export function currentStrain(state: DiveState): Strain | null {
  return strainById(state.strainId)
}

// The strain only binds the squad once accepted; a declined draw is flavor on
// the front card, not a rule.
export function activeStrain(state: DiveState): Strain | null {
  return state.strainAccepted ? currentStrain(state) : null
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

// A misfortune binds the whole squad, so every seated diver must still be able
// to field HD2's four required stratagems under it — otherwise the squad can
// never ready up. The drawn rule is the check; pacts (picked later) are the
// pact floor's job. (AGENTS.md: Mandatory four stratagems.)
export function misfortuneStrandedDivers(state: DiveState): DiverState[] {
  const misfortune = currentMisfortune(state)
  if (!misfortune) {
    return []
  }
  return state.divers.filter(diver =>
    !hasLegalLoadout(misfortune.id, [], state.personalInventories[diver.id] ?? []))
}

// Team risk stacks the per-mission misfortune (when accepted) and the
// operation-long strain (when accepted): a strain is felt on every mission of
// its operation, so it compounds over the op's 2–3 missions.
export function teamRiskOf(state: DiveState): number {
  const misfortuneRisk = state.misfortuneAccepted
    ? MISFORTUNE_RISK[currentMisfortune(state)?.id ?? ''] ?? 0
    : 0
  const strainRisk = state.strainAccepted
    ? STRAIN_RISK[state.strainId ?? ''] ?? 0
    : 0
  return misfortuneRisk + strainRisk
}

export interface StrainDecision {
  decided: boolean
  accepted: boolean
}

// The strain call is answered on the operation's first mission, before pacts
// roll. It is tracked by its own flag rather than the phase, so it can be
// answered before or after the misfortune; later missions inherit it, and a
// failure restart reopens it (the flag resets with the operation).
export function strainDecision(state: DiveState): StrainDecision {
  if (!state.strainId || state.missionInOperation > 1) {
    return { decided: true, accepted: state.strainAccepted }
  }
  return { decided: state.strainDecided, accepted: state.strainAccepted }
}

// A failed pact is voided: it no longer stakes risk, so its share of the
// diver's Valor disappears from previews and from the rolled offer alike.
export function pactRiskOf(diver: DiverState): number {
  return pactRiskTotal(diver.pactIds.filter(id => !diver.failedPactIds.includes(id)))
}

// Chosen risk lives on the diver and the team; team performance is squad-level
// and rides the report. Together they are the diver's Valor.
export function diverValor(state: DiveState, diver: DiverState): number {
  return valorOf(teamRiskOf(state), pactRiskOf(diver), performanceValor(state.lastReport))
}

// Display ceiling: the deterministic best case the diver's Valor can preview.
// The actual offer rolls its ceiling (diverOptions).
export function diverCeiling(state: DiveState, diver: DiverState): RewardTier {
  return maxCeiling(state.difficulty, diverValor(state, diver))
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
  const base = deriveSeed(state.offerSeed, hashString(diver.id))
  // A reward reroll folds a fresh client seed into the derivation, moving both
  // streams (ceiling and options) at once.
  const seed = diver.rewardRerollSeed === null ? base : deriveSeed(base, diver.rewardRerollSeed)
  // Two rng streams derived from the offer seed: one rolls the tier ceiling,
  // one rolls the options — every client computes the same offer.
  const ceiling = rollCeiling(
    mulberry32(deriveSeed(seed, 1)),
    state.difficulty,
    diverValor(state, diver),
  )
  // The pool is the diver's own: warbonds are personal purchases, so each
  // diver rolls offers against the catalog they can actually use.
  const pool = rewardPoolFor(diver.warbondCodes ?? ALL_WARBOND_CODES)
  const owned = new Set(state.personalInventories[diver.id] ?? [])
  // Banned items never come back: a ban removes them from every future offer.
  const exclude = new Set([...owned, ...diver.bannedItemIds])
  // Every failed pact forfeits one reward option (AGENTS.md: Reward math) —
  // floored at one so the draft can always complete and never deadlock ADVANCE.
  const count = Math.max(
    1,
    optionsForStars(state.lastReport.stars, ceiling)
    - diver.failedPactIds.length * OPTIONS_LOST_PER_FAILED_PACT,
  )
  return rollRewardOptions(
    deriveSeed(seed, 2),
    ceiling,
    baseTierFor(state.difficulty),
    count,
    pool,
    exclude,
  )
}

// The Field Promotion: a mid-crusade joiner's catch-up offer. Altitude
// parity, never rarity — the ceiling is the difficulty's base tier at zero
// Valor (a zero-Valor dive always rolls its base tier), so a late joiner buys
// up to the squad's altitude without ever reaching S. Derived from the last
// spun seed like every offer — deterministic, never stored.
//
// The full grant is rolled once (against the joiner's starting kit, the
// inventory they were seated with) and the claimed items are filtered out, so
// the draft is stable: claiming a pick never re-rolls a new candidate into
// view. Rolling against the shrinking owed count instead let three picks
// expose up to six candidates (N22).
export function catchUpOptionsFor(state: DiveState, diver: DiverState): RewardOption[] {
  if (!state.settings || diver.catchUpOwed <= 0) {
    return []
  }
  const seed = deriveSeed(state.seedHistory.at(-1) ?? 0, hashString(`${diver.id}:catchup`))
  const pool = rewardPoolFor(diver.warbondCodes ?? ALL_WARBOND_CODES)
  // Bans are personal and crusade-long, so a promotion never re-offers a
  // banned item either.
  const exclude = new Set([...startingItemIds(state.settings.variant), ...diver.bannedItemIds])
  const owned = new Set(state.personalInventories[diver.id] ?? [])
  // Catch-up buys altitude, never rarity: the band is the base tier alone.
  const rolled = rollRewardOptions(
    seed,
    baseTierFor(state.difficulty),
    baseTierFor(state.difficulty),
    diver.catchUpGranted,
    pool,
    exclude,
  )
  return rolled.filter(option => !owned.has(option.item.id))
}

// Honors are a limited prize: the squad only plays for a token on a full-star
// clear, and only when the squad-size cadence is due (fewer divers, rarer
// honors). Both must hold before the ceremony can spin or award.
export function bonusEligible(state: DiveState): boolean {
  const report = state.lastReport
  if (!report || report.outcome !== 'success') {
    return false
  }
  if (report.stars < maxStarsFor(state.difficulty)) {
    return false
  }
  return state.missionIndex % bonusIntervalFor(state.divers.length) === 0
}

// Why this mission has no honors, for the UI — null when it does (or when the
// draft hasn't been reported yet).
export function bonusIneligibilityReason(state: DiveState): string | null {
  const report = state.lastReport
  if (!report || report.outcome !== 'success') {
    return null
  }
  if (report.stars < maxStarsFor(state.difficulty)) {
    return 'Squad honors need a full-star clear.'
  }
  const interval = bonusIntervalFor(state.divers.length)
  if (state.missionIndex % interval !== 0) {
    return `Squad honors are due every ${interval} mission${interval === 1 ? '' : 's'} for a squad of ${state.divers.length}.`
  }
  return null
}

// The mission's spun bonus-honors contest. Like the Wheel, the contest only
// exists once the host spins it; null before that (and after the mission
// reset).
export function bonusFor(state: DiveState): BonusStat | null {
  return state.bonusSeed === null ? null : rollBonus(state.bonusSeed)
}

// A reward reroll costs one banked token and must actually move: the reducer
// recomputes the offer under the candidate seed and refuses a same-offer seed.
export function canRerollRewards(
  state: DiveState,
  diver: DiverState,
): { allowed: boolean, reason: string | null } {
  if (state.phase !== 'rewards') {
    return { allowed: false, reason: 'Not in the reward draft' }
  }
  if (diver.pickedOptionId !== null) {
    return { allowed: false, reason: 'Reward already banked' }
  }
  if (diver.rewardTokens < 1) {
    return { allowed: false, reason: 'No reward tokens' }
  }
  return { allowed: true, reason: null }
}

// A ban action costs one banked token and targets offered non-choice options.
// It forfeits the draft's reward pick, so the diver may ban any or all of the
// offered items without leaving anything behind.
export function canBanReward(
  state: DiveState,
  diver: DiverState,
  optionId: string,
): { allowed: boolean, reason: string | null } {
  if (state.phase !== 'rewards') {
    return { allowed: false, reason: 'Not in the reward draft' }
  }
  if (diver.pickedOptionId !== null || diver.rewardBanned) {
    return { allowed: false, reason: 'Draft already resolved' }
  }
  if (diver.rewardTokens < 1) {
    return { allowed: false, reason: 'No reward tokens' }
  }
  const option = diverOptions(state, diver).find(entry => entry.optionId === optionId)
  if (!option) {
    return { allowed: false, reason: 'Not in your offer' }
  }
  if (option.choice) {
    return { allowed: false, reason: 'Liberty’s Cross cannot be banned' }
  }
  return { allowed: true, reason: null }
}

// Whether a diver can open the ban flow at all: a token, an unresolved draft,
// and at least one bannable (non-choice) offered item.
export function canBanAnyReward(
  state: DiveState,
  diver: DiverState,
): boolean {
  return diverOptions(state, diver)
    .some(option => canBanReward(state, diver, option.optionId).allowed)
}

export interface CeilingRange {
  min: RewardTier
  max: RewardTier
  odds: number
}

// Legibility preview: the base tier a zero-Valor dive gets, the best tier the
// current Valor can plausibly reach, and the odds of reaching it.
export function ceilingRange(difficulty: number, teamRisk: number, pactRisk: number, performance = 0): CeilingRange {
  const valor = valorOf(teamRisk, pactRisk, performance)
  const max = maxCeiling(difficulty, valor)
  return {
    min: baseTierFor(difficulty),
    max,
    odds: oddsToReach(difficulty, valor, max),
  }
}

export function ceilingRangeForDifficulty(difficulty: number, pactRisk = 0): CeilingRange {
  const misfortuneMax = Math.max(
    0,
    ...eligibleMisfortunes(difficulty).map(misfortune => MISFORTUNE_RISK[misfortune.id] ?? 0),
  )
  const strainMax = Math.max(
    0,
    ...eligibleStrains(difficulty).map(strain => STRAIN_RISK[strain.id] ?? 0),
  )
  return ceilingRange(difficulty, misfortuneMax + strainMax, pactRisk)
}

// The most Valor this difficulty can actually stack — the strongest eligible
// misfortune, the strongest eligible strain, the top pacts the offer can deal,
// and the capped team-performance term. The meter itself is scaled to
// VALOR_METER_MAX (11), so anything this returns above that is potential
// overflow Luck (AGENTS.md: Reward math). Presentation only; it never gates a
// roll.
export function maxValorFor(difficulty: number): number {
  const misfortuneMax = Math.max(
    0,
    ...eligibleMisfortunes(difficulty).map(misfortune => MISFORTUNE_RISK[misfortune.id] ?? 0),
  )
  const strainMax = Math.max(
    0,
    ...eligibleStrains(difficulty).map(strain => STRAIN_RISK[strain.id] ?? 0),
  )
  const pactMax = Object.values(PACT_RISK)
    .sort((a, b) => b - a)
    .slice(0, pactOptionsFor(difficulty))
    .reduce((sum, risk) => sum + risk, 0)
  return misfortuneMax + strainMax + pactMax + TIME_VALOR_MAX + SAMPLE_VALOR_CAP
}

export function canRerollWheel(
  state: DiveState,
  wheel: 'misfortune' | 'front' | 'strain',
): { allowed: boolean, free: boolean, reason: string | null } {
  if (!state.wheel || !state.frontId) {
    return { allowed: false, free: false, reason: 'Spin the wheel first' }
  }
  if (state.divers.some(diver => diver.pactsLocked)) {
    return { allowed: false, free: false, reason: 'Pacts already locked' }
  }
  // The front and its strain lock in with the operation — rerolls are
  // mission-1 business.
  if (wheel !== 'misfortune' && state.missionInOperation > 1) {
    return { allowed: false, free: false, reason: 'The front locks in for the whole operation' }
  }
  if (wheel === 'front') {
    // A reroll must be able to move: a Major Order that pins a single front
    // fixes the draw for the operation.
    if (majorOrderFronts(state).length < 2) {
      return { allowed: false, free: false, reason: 'Only one front on this Major Order' }
    }
  }
  if (wheel === 'strain') {
    if (!state.strainId) {
      return { allowed: false, free: false, reason: 'No strain drawn' }
    }
    // A reroll must be able to move: with a single eligible subfaction the
    // draw is fixed for the operation.
    if (eligibleStrains(state.difficulty, state.frontId).length < 2) {
      return { allowed: false, free: false, reason: 'Only one strain on this front' }
    }
  }
  const completed = state.completedCombos.includes(
    comboKey(state.wheel.misfortuneId, state.frontId, state.strainId),
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
    diver => diver.pickedOptionId !== null || diver.rewardBanned || diver.skipsCurrentDraft,
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
