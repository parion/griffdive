import { ALL_ITEMS, ALL_WARBOND_CODES, ITEMS_BY_ID, TIER_RANK } from '../data/catalog'
import { FRONTS } from '../data/fronts'
import type { Front } from '../data/fronts'
import { MISFORTUNES } from '../data/misfortunes'
import type { Misfortune } from '../data/misfortunes'
import { PACTS, pactById } from '../data/pacts'
import type { Pact } from '../data/pacts'
import type { Strain } from '../data/strains'
import type { Item, Tier } from '../data/types'
import {
  ARMOR_PACK_ODDS,
  ARMOR_PACK_SIZE,
  BARGAIN_SLOTS,
  BARGAIN_STREAM,
  FRONT_ROLL_RISK,
  missionsPerOperation,
  MAJOR_ORDER_RISK,
  OPTIONS_LOST_PER_FAILED_DIRECTIVE,
  FORFEIT_STREAM,
  OPTIONS_LOST_PER_FAILED_PACT,
  SQUAD_SIZE_MAX,
  STRAIN_RISK,
  bargainStratagemSlotsFor,
  armorPackBandFor,
  armorPackPrice,
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
import { STARTING_KITS, catchUpOpsBehind, startingItemIds } from './progression'
import { itemPrice, maxCeiling, oddsToReach, optionsForDiver, bargainKindOf, rollBargainShelf, rollBonus, rollCeiling, rollRewardOffer, rollRewardOptions, topTierOf, valorOf } from './rewards'
import type { BargainSlot, RewardOption } from './rewards'
import { deriveSeed, hashString, mulberry32 } from './rng'
import type { ArmorPackDeal, BargainDeal, BargainSlotKind, CrusadeMode, CrusadeSettings, DiveState, DivePhase, DiverState, FrontPlan, MajorOrderPlanet, MissionOutcome, RewardTier } from './types'
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

// The MO planet(s) the drawn front points at. The wheel rolls a faction, but
// the order is fought on planets; the card lists them all, and the front pin
// names the one(s) on the rolled front. A manual pick or a planet-less kill
// order has no planet metadata, so this stays empty.
export function majorOrderPlanetsForFront(state: DiveState): MajorOrderPlanet[] {
  if (!state.frontId || !state.majorOrder?.planets?.length) {
    return []
  }
  return state.majorOrder.planets.filter(planet => planet.front === state.frontId)
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

// The squad actually playing: divers who stepped away keep their seat but are
// never waited on and never counted (AGENTS.md: Mid-crusade joining).
export function activeDivers(state: DiveState): DiverState[] {
  return state.divers.filter(diver => !diver.away)
}

// Squad size for every size-scaled rule (directive weight, honors cadence,
// squad-only pacts). Never below one, so a room whose divers have all stepped
// away still reads as the solo squad that will come back to it.
export function squadSize(state: DiveState): number {
  return Math.max(1, activeDivers(state).length)
}

// Pact lock-in completes once every present diver has locked. A room where
// everyone stepped away never advances on its own.
export function pactsSettled(divers: readonly DiverState[]): boolean {
  const present = divers.filter(diver => !diver.away)
  return present.length > 0 && present.every(diver => diver.pactsLocked)
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
  return activeDivers(state).filter(diver =>
    !hasLegalLoadout(misfortune.id, [], state.personalInventories[diver.id] ?? []))
}

// The team term stacks the per-mission misfortune (when accepted), the
// operation-long strain (when accepted), the setup's front plan (a live Major
// Order or a rolled front) and the run-long mode (SEAF Support Package or Super
// Penance): the latter three are felt on every mission of the operation/run, so
// they compound over its 2–3 missions. A live MO replaces the strain, so its
// fixed risk is what keeps the operation's Valor potential intact. The
// SEAF/Penance mode is a flat team Valor stake, not a rule — see config.
export interface TeamRiskBreakdown {
  misfortuneRisk: number
  strainRisk: number
  majorOrderRisk: number
  frontRollRisk: number
  mode: CrusadeMode | null
  modeValor: number
  total: number
}

// The run-long mode's flat per-mission Valor: SEAF Support Package (assisted)
// or Super Penance (hellish). Zero on the medium start, which has no mode.
export function modeValorAt(mode: CrusadeMode | undefined, difficulty: number): number {
  if (mode === 'seaf') {
    return seafSupportValorAt(difficulty)
  }
  if (mode === 'penance') {
    return penanceValorAt(difficulty)
  }
  return 0
}

export function modeValorOf(state: DiveState): number {
  return modeValorAt(state.settings?.mode, state.difficulty)
}

// The fixed team risk a front plan carries on every mission: a live Major
// Order or a rolled front. A locked front is a preference and carries none.
export function frontPlanRisk(plan: FrontPlan | undefined): number {
  if (plan === 'majorOrder') {
    return MAJOR_ORDER_RISK
  }
  return plan === 'rolled' ? FRONT_ROLL_RISK : 0
}

// What a crusade's setup commits the squad to on every mission before any
// directive, strain or pact: the front plan plus the mode, at the start
// difficulty. The setup screen previews it on the Valor roll; once the run
// starts teamRiskBreakdown carries the same terms.
export function setupRiskOf(settings: CrusadeSettings): number {
  const start = STARTING_KITS[settings.variant].startDifficulty
  return frontPlanRisk(settings.front) + modeValorAt(settings.mode, start)
}

// The legible split of the team term for the pacts summary bar — same inputs,
// same acceptance flags, so the screen and the floor can never disagree.
export function teamRiskBreakdown(state: DiveState): TeamRiskBreakdown {
  const misfortuneRisk = state.misfortuneAccepted && !state.misfortuneFailed
    ? directiveValorAt(currentMisfortune(state)?.id ?? '', state.difficulty, squadSize(state))
    : 0
  const strainRisk = state.strainAccepted
    ? STRAIN_RISK[state.strainId ?? ''] ?? 0
    : 0
  const majorOrderRisk = state.majorOrder?.live ? MAJOR_ORDER_RISK : 0
  const frontRollRisk = state.settings?.front === 'rolled' ? FRONT_ROLL_RISK : 0
  const modeValor = modeValorOf(state)
  return {
    misfortuneRisk,
    strainRisk,
    majorOrderRisk,
    frontRollRisk,
    mode: state.settings?.mode ?? null,
    modeValor,
    total: misfortuneRisk + strainRisk + majorOrderRisk + frontRollRisk + modeValor,
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
// with the diver id and with any reward-reroll seed they spent.
function diverOfferSeed(state: DiveState, diver: DiverState): number {
  // A failed mission rolls its offer seed at the report like a clear does; a
  // forfeit-phase state from before that fell back to the mission's derivation.
  const offerSeed = state.offerSeed
    ?? (state.wheel ? deriveSeed(state.wheel.seed, state.missionIndex) : 0)
  const base = deriveSeed(offerSeed, hashString(diver.id))
  return diver.rewardRerollSeed === null ? base : deriveSeed(base, diver.rewardRerollSeed)
}

// The ceiling the diver's Valor actually rolls for this mission's draft (salt 1
// stream). The forfeit offer shares it, so risk raises the stakes as it raises
// the reward.
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

export function catalogPoolFor(codes: readonly string[]): Item[] {
  const owned = new Set(codes)
  return ALL_ITEMS.filter(
    item =>
      item.warbondCode === 'none' || owned.has(item.warbondCode),
  )
}

// The reward-eligible pool: armor passives are Brasch exclusives now, so they
// never enter a draft, a Liberty's Cross claim, or a Field Promotion. They
// still roll in the SEAF Support Package (which uses the full catalog pool).
export function rewardPoolFor(codes: readonly string[]): Item[] {
  return catalogPoolFor(codes).filter(item => item.category !== 'armorPassive')
}

export function armorPassivePoolFor(codes: readonly string[]): Item[] {
  return catalogPoolFor(codes).filter(item => item.category === 'armorPassive')
}

export function diverOptions(state: DiveState, diver: DiverState): RewardOption[] {
  if (state.offerSeed === null || !state.lastReport || state.lastReport.outcome !== 'success') {
    return []
  }
  const seed = diverOfferSeed(state, diver)
  // The pool is the diver's own: warbonds are personal purchases, so each
  // diver rolls offers against the catalog they can actually use.
  const pool = rewardPoolFor(diver.warbondCodes ?? ALL_WARBOND_CODES)
  // Banned items never come back: a ban removes them from every future offer.
  // The deal's snapshot wins over live holdings so the offer never shifts.
  const exclude = new Set(diver.draftExcludedIds
    ?? [...(state.personalInventories[diver.id] ?? []), ...diver.bannedItemIds])
  // Every failed pact and the broken team directive each forfeit one reward
  // option (AGENTS.md: Reward math) — floored at one so the draft can always
  // complete and never deadlock ADVANCE.
  const lostOptions = diver.failedPactIds.length * OPTIONS_LOST_PER_FAILED_PACT
    + (state.misfortuneFailed ? OPTIONS_LOST_PER_FAILED_DIRECTIVE : 0)
  const count = optionsForDiver(state.lastReport.stars, lostOptions)
  // Every option rolls its own d100 on the same Valor line. The tier is the
  // rolled result, not a ceiling the option was then drawn under.
  return rollRewardOffer(
    deriveSeed(seed, 2),
    state.difficulty,
    diverValor(state, diver),
    count,
    pool,
    exclude,
  )
}

// What a diver has at stake in a failure: their kit beyond the variant's bare
// surplus (drafted rewards, Brasch's Bargains buys, a Field Promotion, a claimed
// cache) plus the SEAF Support Package. The surplus every diver starts with was
// never won, so it is never taken; the support pack is an assist the squad
// opted into, so it is, even before a first reward is banked.
export function earnedItemsOf(state: DiveState, diver: DiverState): Item[] {
  const starting = new Set(state.settings
    ? startingItemIds(state.settings.variant)
    : [])
  return (state.personalInventories[diver.id] ?? [])
    .filter(id => !starting.has(id))
    .map(id => ITEMS_BY_ID.get(id))
    .filter((item): item is Item => item !== undefined)
}

// The forfeit offer: after a failed mission each diver surrenders one item they
// earned, chosen from a seeded handful — one per star the difficulty can award
// — so a spare scrap can't be picked on purpose. The offer rolls like a reward
// draft: capped at the diver's rolled Valor ceiling (risk raises the tier at
// stake, as it raises the tier on offer) and led by the best item that ceiling
// reaches. Armor passives and stratagems are all fair game. A pool with nothing
// under the ceiling falls back to everything earned, so a diver holding any
// at-stake gear always owes something; one holding only the surplus owes nothing.
// S+ has no items, so it stakes as S.
export function forfeitOptionsFor(state: DiveState, diver: DiverState): Item[] {
  if (state.lastReport?.outcome !== 'failure') {
    return []
  }
  const kit = earnedItemsOf(state, diver)
  if (kit.length === 0) {
    return []
  }
  const ceiling = diverRolledCeiling(state, diver)
  return rollRewardOptions(
    deriveSeed(diverOfferSeed(state, diver), FORFEIT_STREAM),
    ceiling === 'S+' ? 'S' : ceiling,
    'C',
    maxStarsFor(state.difficulty),
    kit,
    new Set(),
  ).map(option => option.item)
}

// Whether a diver still has to surrender an item: they dove the mission, hold
// something to lose, and haven't chosen yet.
export function owesForfeit(state: DiveState, diver: DiverState): boolean {
  return !diver.forfeitedItemId && forfeitOptionsFor(state, diver).length > 0
}

// The forfeit resolves once every present diver who owes an item has chosen
// (a diver who stepped away is not waited on and keeps their kit). A room where
// everyone stepped away never advances on its own.
export function forfeitSettled(state: DiveState): boolean {
  const present = activeDivers(state)
  return present.length > 0 && present.every(diver => !owesForfeit(state, diver))
}

// One diver's draft as the squad sees it: the frozen offer, the ceiling it
// rolled, and how it resolved. A pick through Liberty's Cross banks an item
// that was never among the options, so the Cross is the slot that banked it.
export interface DraftSummary {
  options: RewardOption[]
  ceiling: RewardTier | null
  status: 'choosing' | 'banked' | 'banned'
  bankedOptionId: string | null
  bankedItemId: string | null
  bannedOptionIds: string[]
}

export function draftSummaryFor(state: DiveState, diver: DiverState): DraftSummary {
  const options = diverOptions(state, diver)
  const bankedItemId = diver.pickedOptionId
  const bankedOptionId = bankedItemId === null
    ? null
    : options.find(option => option.optionId === bankedItemId)?.optionId
      ?? options.find(option => option.choice)?.optionId
      ?? null
  const banned = new Set(diver.rewardBanned ? diver.bannedItemIds : [])
  let status: DraftSummary['status'] = 'choosing'
  if (diver.rewardBanned) {
    status = 'banned'
  }
  else if (bankedItemId !== null) {
    status = 'banked'
  }
  return {
    options,
    ceiling: topTierOf(options),
    status,
    bankedOptionId,
    bankedItemId,
    bannedOptionIds: options
      .filter(option => !option.choice && banned.has(option.item.id))
      .map(option => option.optionId),
  }
}

// A diver's Brasch's Bargains deal for the mission about to start: the
// holdings and bans the shelf skips, and what the operation has already
// spent (a bought kind on the shelf, the Armor Packs opened). A new operation
// clears both; a failure restart keeps them.
export function dealBargain(
  state: DiveState,
  diver: DiverState,
  previous: BargainDeal | null,
  newOperation: boolean,
): BargainDeal {
  return {
    excludedIds: [...(state.personalInventories[diver.id] ?? []), ...diver.bannedItemIds],
    boughtItemId: null,
    boughtKinds: newOperation ? [] : previous?.boughtKinds ?? [],
    packs: newOperation ? [] : previous?.packs ?? [],
  }
}

// The slot kinds Brasch can stock at a difficulty: the four fixed equipment
// slots, plus one stratagem per star the difficulty awards past the third.
export function bargainSlotKinds(difficulty: number): BargainSlotKind[] {
  return [
    ...BARGAIN_SLOTS,
    ...Array.from({ length: bargainStratagemSlotsFor(difficulty) }, () => 'stratagem' as const),
  ]
}

// A shelf slot as the diver sees it: still for sale, the one they bought this
// mission, shut for the rest of the mission by that buy, or held back until
// the next operation because its kind was bought earlier in this one.
export type BargainSlotStatus = 'open' | 'bought' | 'locked' | 'heldBack'

export interface BargainShelfSlot extends BargainSlot {
  status: BargainSlotStatus
}

// The diver's Brasch's Bargains shelf for the mission: one random item per
// slot from the difficulty's base tier up to one tier above, drawn from their
// own pool (declared warbonds) minus what they held or banned at the deal.
// Derived from the mission's bargain seed folded with the diver id —
// deterministic, never stored. The shelf keeps its layout all mission: a buy
// marks its slot bought and locks the rest, and a kind bought earlier this
// operation stays on the shelf as an empty held-back slot.
export function bargainShelfFor(state: DiveState, diver: DiverState): BargainShelfSlot[] {
  const deal = diver.bargain
  if (state.bargainSeed === null || !deal) {
    return []
  }
  const boughtItemId = deal.boughtItemId
  const boughtNow = boughtItemId ? ITEMS_BY_ID.get(boughtItemId) : undefined
  const nowKind = boughtNow ? bargainKindOf(boughtNow) : null
  const heldBack = new Set(deal.boughtKinds.filter(kind => kind !== nowKind))
  const kinds = bargainSlotKinds(state.difficulty)
  const rolled = rollBargainShelf(
    deriveSeed(deriveSeed(state.bargainSeed, BARGAIN_STREAM), hashString(diver.id)),
    state.difficulty,
    kinds.filter(kind => !heldBack.has(kind)),
    catalogPoolFor(diver.warbondCodes ?? ALL_WARBOND_CODES),
    new Set(deal.excludedIds),
  )
  const counts = new Map<BargainSlotKind, number>()
  let next = 0
  return kinds.map((kind) => {
    const nth = (counts.get(kind) ?? 0) + 1
    counts.set(kind, nth)
    if (heldBack.has(kind)) {
      return { slotId: nth === 1 ? kind : `${kind}-${nth}`, kind, item: null, status: 'heldBack' as const }
    }
    const slot = rolled[next++]!
    let status: BargainSlotStatus = 'open'
    if (boughtItemId) {
      status = slot.item?.id === boughtItemId ? 'bought' : 'locked'
    }
    return { ...slot, status }
  })
}

// Brasch's Bargains is open between missions once the squad has completed an
// operation (credits bank from the first mission, so the first purchase is a
// real saving). It closes while the squad is in the field, while a failure's
// forfeit is being settled (a buy would reshuffle the forfeit offers, which
// derive from the live kit) and once the crusade is over.
const BARGAIN_CLOSED_REASON: Partial<Record<DivePhase, string>> = {
  lobby: 'Opens when the crusade launches',
  diving: 'Closed during the mission',
  forfeit: 'Closed while the squad settles its losses',
  complete: 'The crusade is over',
}

// The squad has finished at least one operation: the climb has moved past the
// variant's start, or the current mission is the clearing one (its rewards
// screen is the operation's last call at the shop).
function operationCompleted(state: DiveState): boolean {
  if (!state.settings) {
    return false
  }
  return catchUpOpsBehind(state.difficulty, state.settings.variant) > 0
    || (state.phase === 'rewards' && state.missionInOperation >= missionsPerOperation(state.difficulty))
}

export function bargainsClosedReason(state: DiveState): string | null {
  const byPhase = BARGAIN_CLOSED_REASON[state.phase]
  if (byPhase) {
    return byPhase
  }
  if (state.settings && !operationCompleted(state)) {
    return 'Opens after your first operation'
  }
  return null
}

// Whether a diver can buy an item from their Brasch's Bargains shelf: the shop
// is open, they haven't bought this mission, the item is on their shelf and
// not gained since the deal, and they can afford it.
export function canBuyItem(
  state: DiveState,
  diver: DiverState,
  itemId: string,
): { allowed: boolean, reason: string | null } {
  const closed = bargainsClosedReason(state)
  if (closed) {
    return { allowed: false, reason: closed }
  }
  if (diver.bargain?.boughtItemId) {
    return { allowed: false, reason: 'Already bought this mission' }
  }
  const slot = bargainShelfFor(state, diver).find(entry => entry.status === 'open' && entry.item?.id === itemId)
  if (!slot?.item) {
    return { allowed: false, reason: 'Not on your shelf' }
  }
  if ((state.personalInventories[diver.id] ?? []).includes(itemId)) {
    return { allowed: false, reason: 'Already in your kit' }
  }
  if (diver.bannedItemIds.includes(itemId)) {
    return { allowed: false, reason: 'Banned for this crusade' }
  }
  if (itemPrice(slot.item) > diver.credits) {
    return { allowed: false, reason: 'Not enough credits' }
  }
  return { allowed: true, reason: null }
}

// The Armor Pack side table: a sealed pack of up to three armor passives from
// the diver's unowned pool. The offer is display data — the engine re-derives
// the actual pull from the mission seed when the diver buys. The price is the
// next pack's: it climbs with every pack already opened this operation.
export interface ArmorPackOffer {
  price: number
  // How many packs the diver has opened this operation.
  packsOpened: number
  // How many passives the pack would deal right now (3 unless the pool is thin).
  size: number
  // How many unowned passives remain in the diver's warbonds.
  available: number
  // Whole-percent chance of the pack's one S roll; 0 when no S passive is left.
  sChance: number
  // The weakest tier the guaranteed hit card can land in.
  hitFloor: Tier
}

export function armorPackOfferFor(state: DiveState, diver: DiverState): ArmorPackOffer {
  const odds = ARMOR_PACK_ODDS[armorPackBandFor(state.difficulty)]
  const pool = armorPackPoolFor(state, diver)
  const packsOpened = diver.bargain?.packs.length ?? 0
  const bandFloor = odds.hit.reduce(
    (lowest, entry) => (TIER_RANK[entry.tier] < TIER_RANK[lowest] ? entry.tier : lowest),
    odds.hit[0]!.tier,
  )
  const ordinary = pool.filter(item => item.tier !== 's')
  const hasS = pool.some(item => item.tier === 's')
  const hasFloor = ordinary.some(item => TIER_RANK[item.tier] >= TIER_RANK[bandFloor])
  // If the band floor is exhausted, the hit card can only drop; advertise what
  // is actually left (or S, when the pool has nothing ordinary at all).
  const hitFloor = ordinary.length === 0
    ? (hasS ? 's' : bandFloor)
    : hasFloor
      ? bandFloor
      : ordinary.reduce<Tier>(
          (best, item) => (TIER_RANK[item.tier] > TIER_RANK[best] ? item.tier : best),
          'c',
        )
  return {
    price: armorPackPrice(state.difficulty, packsOpened),
    packsOpened,
    size: Math.min(ARMOR_PACK_SIZE, pool.length),
    available: pool.length,
    // A thin pool that cannot fill three cards without S guarantees one; a
    // normal pool only sees S through the pack's single roll.
    sChance: hasS ? (ordinary.length < ARMOR_PACK_SIZE ? 1 : odds.sChance) : 0,
    hitFloor,
  }
}

// The passives a pack may still deal: the diver's warbonds, minus what they
// already hold and anything banned for the crusade. Duplicates are impossible,
// so a thin pool deals a smaller pack instead of repeating a card.
export function armorPackPoolFor(state: DiveState, diver: DiverState): Item[] {
  const excluded = new Set([
    ...(state.personalInventories[diver.id] ?? []),
    ...diver.bannedItemIds,
  ])
  return armorPassivePoolFor(diver.warbondCodes ?? ALL_WARBOND_CODES)
    .filter(item => !excluded.has(item.id))
}

// Every pack this operation already dealt, oldest first.
export function armorPacksFor(diver: DiverState): ArmorPackDeal[] {
  return diver.bargain?.packs ?? []
}

// The newest pack this operation dealt, or null.
export function armorPackFor(diver: DiverState): ArmorPackDeal | null {
  return diver.bargain?.packs.at(-1) ?? null
}

// The newest pack's items, for the reveal and the shelf's pull summary.
export function armorPackItemsFor(diver: DiverState): Item[] {
  return (armorPackFor(diver)?.itemIds ?? [])
    .map(id => ITEMS_BY_ID.get(id))
    .filter((item): item is Item => item !== undefined)
}

// Whether a diver can open another Armor Pack this operation: the shop is open,
// they have unowned passives left, and they can afford the next pack's price.
// The shelf's one-item limit does not apply — the pack is side stock.
export function canBuyArmorPack(
  state: DiveState,
  diver: DiverState,
): { allowed: boolean, reason: string | null } {
  const closed = bargainsClosedReason(state)
  if (closed) {
    return { allowed: false, reason: closed }
  }
  if (!diver.bargain) {
    return { allowed: false, reason: 'Brasch has not dealt your shelf' }
  }
  if (armorPackPoolFor(state, diver).length === 0) {
    return { allowed: false, reason: 'You own every armor passive in your warbonds' }
  }
  const price = armorPackPrice(state.difficulty, diver.bargain.packs.length)
  if (price > diver.credits) {
    return { allowed: false, reason: 'Not enough credits' }
  }
  return { allowed: true, reason: null }
}

// The Bargains entry's lamp: dark while nothing on the shelf is buyable, lit
// once something is, and pulsing only for a fresh operation's restock — the
// first mission after an operation was completed, before the diver buys from
// it.
export type BargainLamp = 'off' | 'ready' | 'restocked'

export function bargainLamp(state: DiveState, diver: DiverState): BargainLamp {
  const buyable = bargainShelfFor(state, diver)
    .some(slot => slot.item && canBuyItem(state, diver, slot.item.id).allowed)
    || canBuyArmorPack(state, diver).allowed
  if (!buyable || !state.settings) {
    return 'off'
  }
  const restocked = state.missionInOperation === 1
    && catchUpOpsBehind(state.difficulty, state.settings.variant) > 0
    && (diver.bargain?.boughtKinds.length ?? 0) === 0
  return restocked ? 'restocked' : 'ready'
}

// The Field Promotion: a mid-crusade joiner's catch-up offer. Altitude
// parity, never rarity — the ceiling is the difficulty's base tier at zero
// Valor (a zero-Valor dive always rolls its base tier), so a late joiner buys
// up to the squad's altitude without ever reaching S. Deterministic, never
// stored.
//
// The seed is the diver's own id — server-minted, random and fixed for the
// seat — so the offer is frozen to the diver: the squad spinning or rerolling
// the wheel never reshuffles it under them. Each pick re-rolls the offer: the
// seed folds in how many picks are already claimed, and items already held are
// excluded so the offer stays full-size.
export function catchUpOptionsFor(state: DiveState, diver: DiverState): RewardOption[] {
  if (!state.settings || diver.catchUpOwed <= 0) {
    return []
  }
  const claimed = diver.catchUpGranted - diver.catchUpOwed
  const seed = deriveSeed(hashString(`${diver.id}:catchup`), claimed)
  const pool = rewardPoolFor(diver.warbondCodes ?? ALL_WARBOND_CODES)
  // Bans are personal and crusade-long, so a promotion never re-offers a
  // banned item either.
  const exclude = new Set([
    ...startingItemIds(state.settings.variant),
    ...diver.bannedItemIds,
    ...(state.personalInventories[diver.id] ?? []),
  ])
  // Catch-up buys altitude, never rarity: the band is the base tier alone.
  return rollRewardOptions(
    seed,
    baseTierFor(state.difficulty),
    baseTierFor(state.difficulty),
    diver.catchUpGranted,
    pool,
    exclude,
  )
}

// Honors are a limited prize: the squad only plays for a token on a full-star
// clear, and only when the squad-size cadence is due (fewer divers, rarer
// honors). The report form spins before REPORT_RESULT lands, so it passes the
// stars it has filled in; the filed report uses the same predicate.
export function bonusEligibleFor(
  outcome: MissionOutcome,
  stars: number,
  difficulty: number,
  missionIndex: number,
  squadSizeValue: number,
): boolean {
  if (outcome !== 'success' || stars < maxStarsFor(difficulty)) {
    return false
  }
  return missionIndex % bonusIntervalFor(squadSizeValue) === 0
}

export function bonusEligible(state: DiveState): boolean {
  const report = state.lastReport
  if (!report) {
    return false
  }
  return bonusEligibleFor(
    report.outcome,
    report.stars,
    state.difficulty,
    state.missionIndex,
    squadSize(state),
  )
}

// A spun contest nobody has been named for yet. The squad cannot move on until
// the host names a winner: ADVANCE refuses while this holds, and the Next
// controls read it to explain why they are locked.
export function honorsPending(state: DiveState): boolean {
  return state.phase === 'rewards'
    && state.bonusSeed !== null
    && state.bonusWinnerIds.length === 0
}

// Missions until the cadence next puts honors on the table: 0 when the current
// mission is due. The report card names it when the spin is unavailable.
export function missionsUntilHonors(missionIndex: number, squadSizeValue: number): number {
  const interval = bonusIntervalFor(squadSizeValue)
  return (interval - (missionIndex % interval)) % interval
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
  const interval = bonusIntervalFor(squadSize(state))
  if (state.missionIndex % interval !== 0) {
    return `Squad honors are due every ${interval} mission${interval === 1 ? '' : 's'} for a squad of ${squadSize(state)}.`
  }
  return null
}

// The mission's spun bonus-honors contest. Like the Wheel, the contest only
// exists once the host spins it; null before that (and after the mission
// reset).
export function bonusFor(state: DiveState): BonusStat | null {
  return state.bonusSeed === null ? null : rollBonus(state.bonusSeed)
}

// The divers the host honored for the current mission's contest. Honors can be
// shared: a tie on HD2's stats screen names every tied diver.
export function bonusWinners(state: DiveState): DiverState[] {
  return state.divers.filter(diver => state.bonusWinnerIds.includes(diver.id))
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
  return activeDivers(state).every(
    diver => diver.pickedOptionId !== null || diver.rewardBanned,
  )
}

// The divers whose own move still gates the squad: an unlocked pact hand, or an
// open reward draft. Host-only beats gate on the host instead, so they report
// nobody here.
export function awaitingDiverIds(state: DiveState): string[] {
  if (state.phase === 'pacts') {
    return activeDivers(state).filter(diver => !diver.pactsLocked).map(diver => diver.id)
  }
  if (state.phase === 'rewards') {
    return activeDivers(state)
      .filter(diver => diver.pickedOptionId === null && !diver.rewardBanned)
      .map(diver => diver.id)
  }
  if (state.phase === 'forfeit') {
    return activeDivers(state).filter(diver => owesForfeit(state, diver)).map(diver => diver.id)
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
// Fallen divers' kits a joiner may claim instead of their Field Promotion.
// Caches only open once the squad has completed an operation — before that a
// joiner is at the start altitude and owes no promotion to trade.
export function availableCaches(state: DiveState): { ownerId: string, name: string, itemIds: string[] }[] {
  if (!state.settings || catchUpOpsBehind(state.difficulty, state.settings.variant) < 1) {
    return []
  }
  return Object.entries(state.legacyCaches)
    .filter(([, cache]) => cache.itemIds.length > 0)
    .map(([ownerId, cache]) => ({ ownerId, name: cache.name, itemIds: cache.itemIds }))
}

// Whether the diver still has a Field Promotion to settle: picks owed and
// something to spend them on (an exhausted pool must never hold a joiner).
export function promotionPending(state: DiveState, diver: DiverState): boolean {
  if (state.phase === 'complete' || diver.catchUpOwed <= 0) {
    return false
  }
  const cacheOpen = diver.catchUpOwed === diver.catchUpGranted && availableCaches(state).length > 0
  return cacheOpen || catchUpOptionsFor(state, diver).length > 0
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
    squadSize(state),
  )
}
