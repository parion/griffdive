import { ALL_ITEMS, ALL_WARBOND_CODES } from '../data/catalog'
import { FRONTS } from '../data/fronts'
import type { Front } from '../data/fronts'
import { MISFORTUNES } from '../data/misfortunes'
import type { Misfortune } from '../data/misfortunes'
import { PACTS, pactById } from '../data/pacts'
import type { Pact } from '../data/pacts'
import type { Strain } from '../data/strains'
import type { Item } from '../data/types'
import {
  MAJOR_ORDER_RISK,
  OPTIONS_LOST_PER_FAILED_DIRECTIVE,
  OPTIONS_LOST_PER_FAILED_PACT,
  SAMPLE_SHOP_STREAM,
  SQUAD_SIZE_MAX,
  STRAIN_RISK,
  baseTierFor,
  bonusIntervalFor,
  conditionRiskAt,
  directiveValorAt,
  maxStarsFor,
  pactOptionsFor,
  penanceValorAt,
  seafSupportValorAt,
} from './config'
import type { BonusStat } from './config'
import {
  MISFORTUNE_BANS_STRATAGEM,
  PACT_BANS_STRATAGEM,
  hasLegalLoadout,
  isPactSelectable,
  pactRiskTotal,
  rollPactOffer,
  stratagemBanReason,
} from './pacts'
import type { StratagemBanSource } from './pacts'
import { startingItemIds } from './progression'
import { itemPrice, maxCeiling, oddsToReach, optionsForDiver, rollBonus, rollCeiling, rollRewardOptions, rollShopStock, valorOf } from './rewards'
import type { RewardOption } from './rewards'
import { deriveSeed, hashString, mulberry32 } from './rng'
import type { CrusadeMode, DiveState, DiverState, RewardTier } from './types'
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

// The team term stacks the per-mission misfortune (when accepted), the
// operation-long strain (when accepted), the live Major Order commitment and
// the run-long mode (SEAF Support Package or Super Penance): the latter three
// are felt on every mission of the operation/run, so they compound over its
// 2–3 missions. A live MO replaces the strain, so its fixed risk is what keeps
// the operation's Valor potential intact. The SEAF/Penance mode is a flat
// team Valor stake, not a rule — see config.
export interface TeamRiskBreakdown {
  misfortuneRisk: number
  strainRisk: number
  majorOrderRisk: number
  mode: CrusadeMode | null
  modeValor: number
  total: number
}

// The run-long mode's flat per-mission Valor: SEAF Support Package (assisted)
// or Super Penance (hellish). Zero on the medium start, which has no mode.
export function modeValorOf(state: DiveState): number {
  const mode = state.settings?.mode
  if (mode === 'seaf') {
    return seafSupportValorAt(state.difficulty)
  }
  if (mode === 'penance') {
    return penanceValorAt(state.difficulty)
  }
  return 0
}

// The legible split of the team term for the pacts summary bar — same inputs,
// same acceptance flags, so the screen and the floor can never disagree.
export function teamRiskBreakdown(state: DiveState): TeamRiskBreakdown {
  const misfortuneRisk = state.misfortuneAccepted && !state.misfortuneFailed
    ? directiveValorAt(currentMisfortune(state)?.id ?? '', state.difficulty, state.divers.length)
    : 0
  const strainRisk = state.strainAccepted
    ? STRAIN_RISK[state.strainId ?? ''] ?? 0
    : 0
  const majorOrderRisk = state.majorOrder?.live ? MAJOR_ORDER_RISK : 0
  const modeValor = modeValorOf(state)
  return {
    misfortuneRisk,
    strainRisk,
    majorOrderRisk,
    mode: state.settings?.mode ?? null,
    modeValor,
    total: misfortuneRisk + strainRisk + majorOrderRisk + modeValor,
  }
}

export function teamRiskOf(state: DiveState): number {
  return teamRiskBreakdown(state).total
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
// diver's Valor disappears from previews and from the rolled offer alike. Each
// surviving pact's risk is scaled by the operation's difficulty.
export function pactRiskOf(diver: DiverState, difficulty: number): number {
  return pactRiskTotal(diver.pactIds.filter(id => !diver.failedPactIds.includes(id)), difficulty)
}

// Chosen risk lives on the diver and the team; it is the diver's Valor. Samples
// are a separate currency and never feed it.
export function diverValor(state: DiveState, diver: DiverState): number {
  return valorOf(teamRiskOf(state), pactRiskOf(diver, state.difficulty))
}

// The per-diver seed the offer derives from: the mission's offer seed folded
// with the diver id and with any reward-reroll seed they spent. The draft and
// the Requisition stock share it, so a reroll moves both.
function diverOfferSeed(state: DiveState, diver: DiverState): number {
  const base = deriveSeed(state.offerSeed ?? 0, hashString(diver.id))
  return diver.rewardRerollSeed === null ? base : deriveSeed(base, diver.rewardRerollSeed)
}

// The ceiling the diver's Valor actually rolls for this mission's draft (salt 1
// stream). The stock shares it, so a shelf never reaches a class the diver's
// risk didn't buy.
export function diverRolledCeiling(state: DiveState, diver: DiverState): RewardTier {
  return rollCeiling(
    mulberry32(deriveSeed(diverOfferSeed(state, diver), 1)),
    state.difficulty,
    diverValor(state, diver),
  )
}

// Display ceiling: the deterministic best case the diver's Valor can preview.
// The actual offer rolls its ceiling (diverOptions).
export function diverCeiling(state: DiveState, diver: DiverState): RewardTier {
  return maxCeiling(state.difficulty, diverValor(state, diver))
}

// The Armory's "active rules" readout: the accepted misfortune plus the
// diver's sworn pacts, with the ban predicate each contributes. Display only —
// `stratagemBanReason` below is the single source of truth for what is legal.
export interface ArmoryRule {
  id: string
  name: string
  source: 'misfortune' | 'pact'
  /** Whether this rule removes equip choices at all (behavioural rules don't). */
  equipBearing: boolean
  /** The rule rides the pact screen's unsworn selection, not the loadout. */
  preview: boolean
}

// The pact screen hands the Kit its pending selection while the diver is still
// choosing, so the loadout previews what the sworn hand would ban. Preview ids
// already sworn are deduped — a pact never appears twice.
export function armoryRules(
  state: DiveState,
  diver: DiverState,
  previewPactIds: readonly string[] = [],
): ArmoryRule[] {
  const rules: ArmoryRule[] = []
  const misfortune = activeMisfortune(state)
  if (misfortune) {
    rules.push({
      id: misfortune.id,
      name: misfortune.name,
      source: 'misfortune',
      equipBearing: misfortune.id === 'oopsAllAirstrikes'
        || Boolean(MISFORTUNE_BANS_STRATAGEM[misfortune.id]),
      preview: false,
    })
  }
  for (const id of diver.pactIds) {
    const pact = pactById(id)
    if (!pact) {
      continue
    }
    rules.push({
      id,
      name: pact.name,
      source: 'pact',
      equipBearing: Boolean(PACT_BANS_STRATAGEM[id]),
      preview: false,
    })
  }
  for (const id of previewPactIds) {
    if (diver.pactIds.includes(id)) {
      continue
    }
    const pact = pactById(id)
    if (!pact) {
      continue
    }
    rules.push({
      id,
      name: pact.name,
      source: 'pact',
      equipBearing: Boolean(PACT_BANS_STRATAGEM[id]),
      preview: true,
    })
  }
  return rules
}

export interface ArmoryBan extends StratagemBanSource {
  /** The ban rides the pending pact selection, not the sworn loadout. */
  preview: boolean
}

// Why the Armory greys a stratagem tile: the accepted misfortune, one of the
// diver's sworn pacts, or a pact still being weighed on the pact screen. Null
// when the item is legal.
export function itemBannedInArmory(
  state: DiveState,
  diver: DiverState,
  item: Item,
  previewPactIds: readonly string[] = [],
): ArmoryBan | null {
  const sworn = stratagemBanReason(activeMisfortune(state)?.id ?? null, diver.pactIds, item)
  if (sworn) {
    return { ...sworn, preview: false }
  }
  const pending = stratagemBanReason(
    null,
    previewPactIds.filter(id => !diver.pactIds.includes(id)),
    item,
  )
  return pending ? { ...pending, preview: true } : null
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
  const seed = diverOfferSeed(state, diver)
  // Two rng streams derived from the offer seed: one rolls the tier ceiling,
  // one rolls the options — every client computes the same offer.
  const ceiling = diverRolledCeiling(state, diver)
  // The pool is the diver's own: warbonds are personal purchases, so each
  // diver rolls offers against the catalog they can actually use.
  const pool = rewardPoolFor(diver.warbondCodes ?? ALL_WARBOND_CODES)
  const owned = new Set(state.personalInventories[diver.id] ?? [])
  // Banned items never come back: a ban removes them from every future offer.
  const exclude = new Set([...owned, ...diver.bannedItemIds])
  // Every failed pact and the broken team directive each forfeit one reward
  // option (AGENTS.md: Reward math) — floored at one so the draft can always
  // complete and never deadlock ADVANCE.
  const lostOptions = diver.failedPactIds.length * OPTIONS_LOST_PER_FAILED_PACT
    + (state.misfortuneFailed ? OPTIONS_LOST_PER_FAILED_DIRECTIVE : 0)
  const count = optionsForDiver(state.lastReport.stars, ceiling, lostOptions)
  return rollRewardOptions(
    deriveSeed(seed, 2),
    ceiling,
    baseTierFor(state.difficulty),
    count,
    pool,
    exclude,
  )
}

// The per-diver rotating Requisition shelf, shown once their draft resolves:
// one item per star the difficulty can award, tiers from the difficulty's base
// tier up to the ceiling their Valor rolled (the class the draft bought), the
// same personal pool as the draft (own warbonds, armor passives only) minus
// owned, banned and the items the draft already showed.
export function shopStockFor(state: DiveState, diver: DiverState): RewardOption[] {
  if (state.offerSeed === null || !state.lastReport || state.lastReport.outcome !== 'success') {
    return []
  }
  if (diver.skipsCurrentDraft) {
    return []
  }
  const seed = diverOfferSeed(state, diver)
  const pool = rewardPoolFor(diver.warbondCodes ?? ALL_WARBOND_CODES)
  const owned = new Set(state.personalInventories[diver.id] ?? [])
  const exclude = new Set([...owned, ...diver.bannedItemIds])
  for (const option of diverOptions(state, diver)) {
    exclude.add(option.item.id)
  }
  return rollShopStock(
    deriveSeed(seed, SAMPLE_SHOP_STREAM),
    diverRolledCeiling(state, diver),
    baseTierFor(state.difficulty),
    maxStarsFor(state.difficulty),
    pool,
    exclude,
  )
}

// Whether a diver can buy an item from their Requisition shelf: the reward
// window is open, their own draft is resolved (picked or banned), the item is
// on their shelf, and they can afford it. Owned and banned items never reach
// the shelf, so those cases need no separate reason.
export function canBuyItem(
  state: DiveState,
  diver: DiverState,
  itemId: string,
): { allowed: boolean, reason: string | null } {
  if (state.phase !== 'rewards') {
    return { allowed: false, reason: 'Not in the reward window' }
  }
  if (diver.pickedOptionId === null && !diver.rewardBanned) {
    return { allowed: false, reason: 'Bank your reward first' }
  }
  const option = shopStockFor(state, diver).find(entry => entry.optionId === itemId)
  if (!option) {
    return { allowed: false, reason: 'Not in your requisition stock' }
  }
  if (diver.bannedItemIds.includes(itemId)) {
    return { allowed: false, reason: 'Banned for this crusade' }
  }
  if (itemPrice(option.item) > diver.sampleBank) {
    return { allowed: false, reason: 'Not enough samples' }
  }
  return { allowed: true, reason: null }
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
  const exclude = new Set([...startingItemIds(state.settings.variant, state.settings.mode), ...diver.bannedItemIds])
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
export function ceilingRange(difficulty: number, teamRisk: number, pactRisk: number): CeilingRange {
  const valor = valorOf(teamRisk, pactRisk)
  const max = maxCeiling(difficulty, valor)
  return {
    min: baseTierFor(difficulty),
    max,
    odds: oddsToReach(difficulty, valor, max),
  }
}

export function ceilingRangeForDifficulty(difficulty: number, pactRisk = 0, squadSize = SQUAD_SIZE_MAX): CeilingRange {
  const misfortuneMax = Math.max(
    0,
    ...eligibleMisfortunes().map(misfortune => directiveValorAt(misfortune.id, difficulty, squadSize)),
  )
  const strainMax = Math.max(
    0,
    ...eligibleStrains(difficulty).map(strain => STRAIN_RISK[strain.id] ?? 0),
  )
  return ceilingRange(difficulty, misfortuneMax + strainMax, pactRisk)
}

// The most Valor this difficulty can actually stack — the strongest eligible
// misfortune (weighted by squad size), the strongest eligible strain and the
// top pacts the offer can deal. The meter itself is scaled to VALOR_METER_MAX
// (11), so anything this returns above that is potential overflow Luck
// (AGENTS.md: Reward math). Presentation only; it never gates a roll.
export function maxValorFor(difficulty: number, squadSize = SQUAD_SIZE_MAX): number {
  const misfortuneMax = Math.max(
    0,
    ...eligibleMisfortunes().map(misfortune => directiveValorAt(misfortune.id, difficulty, squadSize)),
  )
  const strainMax = Math.max(
    0,
    ...eligibleStrains(difficulty).map(strain => STRAIN_RISK[strain.id] ?? 0),
  )
  const pactMax = PACTS
    .map(pact => conditionRiskAt(pact.id, difficulty))
    .sort((a, b) => b - a)
    .slice(0, pactOptionsFor(difficulty))
    .reduce((sum, risk) => sum + risk, 0)
  return misfortuneMax + strainMax + pactMax
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

// A team directive can be marked failed once, by the host, while the mission
// runs — and only when one is actually in force.
export function canFailMisfortune(state: DiveState): boolean {
  return state.phase === 'diving' && state.misfortuneAccepted && !state.misfortuneFailed
}

export function allDiversPicked(state: DiveState): boolean {
  return state.divers.every(
    diver => diver.pickedOptionId !== null || diver.rewardBanned || diver.skipsCurrentDraft,
  )
}

// The divers whose own move still gates the squad: an unlocked pact hand, or an
// open reward draft. Host-only beats gate on the host instead, so they report
// nobody here.
export function awaitingDiverIds(state: DiveState): string[] {
  if (state.phase === 'pacts') {
    return state.divers.filter(diver => !diver.pactsLocked).map(diver => diver.id)
  }
  if (state.phase === 'rewards') {
    return state.divers
      .filter(diver => diver.pickedOptionId === null && !diver.rewardBanned && !diver.skipsCurrentDraft)
      .map(diver => diver.id)
  }
  return []
}

// Whoever the squad is waiting on right now: the divers with an open pact hand
// or reward draft, otherwise the host for host-run beats. Nobody while the
// squad is in game or the crusade is over.
export function actingDiverIds(state: DiveState): string[] {
  if (state.phase === 'diving' || state.phase === 'complete') {
    return []
  }
  const awaiting = awaitingDiverIds(state)
  if (awaiting.length > 0) {
    return awaiting
  }
  return state.hostId ? [state.hostId] : []
}

// Legacy caches a mid-crusade joiner can claim instead of their promotion.
export function availableCaches(state: DiveState): { ownerId: string, itemIds: string[] }[] {
  return Object.entries(state.legacyCaches).map(([ownerId, itemIds]) => ({
    ownerId,
    itemIds,
  }))
}

// The pacts the accepted misfortune filtered out of the offer this mission —
// flavor for the pacts screen's filter note. Wraps `isPactSelectable`, the same
// predicate the offer roll uses, so the note can never contradict the hand.
export function filteredPactsFor(state: DiveState): Pact[] {
  const decision = misfortuneDecision(state)
  if (!state.wheel || !decision.decided || !decision.accepted) {
    return []
  }
  const misfortuneId = currentMisfortune(state)?.id ?? null
  return PACTS.filter(pact => !isPactSelectable(pact.id, misfortuneId))
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
    state.divers.length,
  )
}
