import { ITEMS_BY_ID, WARBONDS } from '../data/catalog'
import { specialistById } from '../data/specialists'
import type { Specialist, SpecialistDoctrine } from '../data/specialists'
import type { Item } from '../data/types'
import {
  MERITS_PER_CLEAN_OPERATION,
  MERITS_PER_COMMENDATION,
  OPTIONS_LOST_PER_BROKEN_ORDERS,
  SPECIALIST_COMMISSIONED_RANK,
  SPECIALIST_OPTION_TAX,
  SPECIALIST_RANK_MERITS,
  SPECIALIST_SERGEANT_RANK,
  missionsPerOperation,
} from './config'
import { PACT_BANS_STRATAGEM, stratagemBanReason } from './pacts'
import { rollBonus } from './rewards'
import type { BargainSlotKind, Commission, DiveState, DiverState } from './types'

export function specialistOf(diver: DiverState): Specialist | null {
  return specialistById(diver.commission?.specialistId) ?? null
}

export function specialistRankOf(merits: number): number {
  return SPECIALIST_RANK_MERITS.filter(threshold => merits >= threshold).length
}

export function commissionRankOf(diver: DiverState): number {
  return specialistRankOf(diver.commission?.merits ?? 0)
}

// Merits still needed for the next rank, or null at the top.
export function meritsToNextRank(merits: number): number | null {
  const next = SPECIALIST_RANK_MERITS[specialistRankOf(merits)]
  return next === undefined ? null : next - merits
}

export function newCommission(specialistId: string, merits = 0): Commission {
  return { specialistId, issuedKit: [], merits, ordersBroken: false, cleanOperation: true }
}

// Hands the specialist's kit over. Launch, enlisting and taking up a mantle
// all issue it; the lobby never does.
export function issueCommission(commission: Commission): Commission {
  return { ...commission, issuedKit: [...(specialistById(commission.specialistId)?.kit ?? [])] }
}

// The kit the diver reports in: what was issued, or — in the lobby, before
// anything is — what the commission will issue.
export function issuedKitOf(diver: DiverState): Item[] {
  const commission = diver.commission
  if (!commission) {
    return []
  }
  const ids = commission.issuedKit.length > 0
    ? commission.issuedKit
    : specialistById(commission.specialistId)?.kit ?? []
  return ids.map(id => ITEMS_BY_ID.get(id)).filter((item): item is Item => item !== undefined)
}

// Gear the diver was handed rather than won — the SEAF pack and the issued
// kit — which a legacy cache never parks.
export function handedKitOf(diver: DiverState): string[] {
  return [...(diver.supportKit ?? []), ...(diver.commission?.issuedKit ?? [])]
}

// Equipment kinds the commission issues are never rewarded (Penitent Crusade
// parity): a Medic issued a Stim Pistol drafts no secondaries. Stratagems are
// one wide kind, so an issued stratagem bars only itself.
export function issuedCategories(diver: DiverState): Set<string> {
  return new Set(issuedKitOf(diver).filter(item => item.type === 'equipment').map(item => item.category))
}

export function issuedBargainKinds(diver: DiverState): Set<BargainSlotKind> {
  const categories = issuedCategories(diver)
  return new Set((['primary', 'secondary', 'throwable', 'armorPassive'] as const)
    .filter(kind => categories.has(kind)))
}

const DOCTRINE_ALLOWS: Readonly<Record<SpecialistDoctrine, (item: Item) => boolean>> = {
  eagle: item => item.category === 'Eagle',
  orbital: item => item.category === 'Orbital',
  defense: item => item.category === 'Defense',
  demolition: item => item.antitank === true || item.tags.includes('explosive'),
}

// Whether an item may enter the diver's reward, catch-up or Brasch pools. A
// Freelancer's pools are untouched; a commission drops its issued kinds and,
// until Sergeant, any stratagem outside its doctrine.
export function commissionAllows(diver: DiverState, item: Item): boolean {
  const specialist = specialistOf(diver)
  if (!specialist) {
    return true
  }
  if (item.type === 'equipment' && issuedCategories(diver).has(item.category)) {
    return false
  }
  if (item.type === 'stratagem' && specialist.doctrine && commissionRankOf(diver) < SPECIALIST_SERGEANT_RANK) {
    return DOCTRINE_ALLOWS[specialist.doctrine](item)
  }
  return true
}

export function doctrineLifted(diver: DiverState): boolean {
  return commissionRankOf(diver) >= SPECIALIST_SERGEANT_RANK
}

export function isCommissioned(diver: DiverState): boolean {
  return diver.commission != null && commissionRankOf(diver) >= SPECIALIST_COMMISSIONED_RANK
}

// The service tax: what a commission costs every draft until the diver is
// Commissioned.
export function serviceTaxOf(diver: DiverState): number {
  return diver.commission && !isCommissioned(diver) ? SPECIALIST_OPTION_TAX : 0
}

// Reward options the commission costs this draft: the service tax, and one
// more when the diver broke standing orders.
export function commissionOptionsLost(diver: DiverState): number {
  return serviceTaxOf(diver) + (diver.commission?.ordersBroken ? OPTIONS_LOST_PER_BROKEN_ORDERS : 0)
}

// The warbonds a specialist's kit needs that the diver has not declared.
export function missingWarbondsFor(specialist: Specialist, warbondCodes: readonly string[]): string[] {
  const owned = new Set(warbondCodes)
  const missing = new Set<string>()
  for (const id of specialist.kit) {
    const code = ITEMS_BY_ID.get(id)?.warbondCode
    if (code && code !== 'none' && !owned.has(code)) {
      missing.add(code)
    }
  }
  return [...missing]
}

export function specialistHolder(state: DiveState, specialistId: string, exceptId?: string): DiverState | undefined {
  return state.divers.find(diver => diver.id !== exceptId && diver.commission?.specialistId === specialistId)
}

// Why a diver cannot take this commission, or null when they can. One
// commission per squad, and only with the warbonds its kit comes from.
export function specialistUnavailableReason(
  state: DiveState,
  diver: Pick<DiverState, 'id' | 'warbondCodes'>,
  specialistId: string,
): string | null {
  const specialist = specialistById(specialistId)
  if (!specialist) {
    return 'Unknown specialist'
  }
  const holder = specialistHolder(state, specialistId, diver.id)
  if (holder) {
    return `Taken by ${holder.name}`
  }
  return specialistWarbondReason(specialist, diver.warbondCodes)
}

export function specialistWarbondReason(specialist: Specialist, warbondCodes: readonly string[]): string | null {
  const missing = missingWarbondsFor(specialist, warbondCodes)
  if (missing.length === 0) {
    return null
  }
  const names = missing.map(code => WARBONDS.find(warbond => warbond.code === code)?.displayName ?? code)
  return `Needs ${names.join(', ')}`
}

// Whether the diver may choose (or change) a commission right now: anyone in
// the lobby, and a diver seated mid-crusade before their first mission ends —
// as long as they have not taken one yet and have not locked pacts.
export function canEnlist(state: DiveState, diver: DiverState): boolean {
  if (state.phase === 'lobby') {
    return true
  }
  return diver.enlistOpen === true
    && !diver.commission
    && !diver.pactsLocked
    && (['spin', 'decision', 'strain', 'deal', 'pacts'] as const).some(phase => phase === state.phase)
}

export interface StandingOrder {
  item: Item
  // The accepted directive that suspends this piece of the orders, if any:
  // the squad's rule wins and the diver owes nothing for leaving it behind.
  suspendedBy: string | null
}

export function standingOrdersFor(misfortuneId: string | null, diver: DiverState): StandingOrder[] {
  return issuedKitOf(diver).map((item) => {
    const banned = item.type === 'stratagem'
      ? stratagemBanReason(misfortuneId, [], item) !== null
      : item.category === 'booster' && misfortuneId === 'noBoosters'
    return { item, suspendedBy: banned ? misfortuneId : null }
  })
}

// The issued item a pact would forbid, or null. A diver can't swear a pact
// that contradicts their own standing orders.
export function ordersConflictFor(pactId: string, diver: DiverState): Item | null {
  for (const item of issuedKitOf(diver)) {
    if (item.type === 'stratagem' && PACT_BANS_STRATAGEM[pactId]?.(item)) {
      return item
    }
    if (pactId === 'antiTankAbstinent' && item.antitank === true) {
      return item
    }
    if (pactId === 'emptyPockets' && item.category === 'booster') {
      return item
    }
  }
  return null
}

// Merits the diver banks when the squad advances from this mission: a clean
// operation when this mission completes it, and a commendation when they won
// Squad Honors on their calling.
export function meritsEarnedBy(state: DiveState, diver: DiverState): { cleanOperation: number, commendation: number } {
  const commission = diver.commission
  const specialist = specialistOf(diver)
  if (!commission || !specialist || state.phase !== 'rewards') {
    return { cleanOperation: 0, commendation: 0 }
  }
  const operationEnds = state.missionInOperation >= missionsPerOperation(state.difficulty)
  const clean = operationEnds && commission.cleanOperation && !commission.ordersBroken
  const honored = state.bonusSeed !== null
    && state.bonusWinnerIds.includes(diver.id)
    && rollBonus(state.bonusSeed).id === specialist.calling
  return {
    cleanOperation: clean ? MERITS_PER_CLEAN_OPERATION : 0,
    commendation: honored ? MERITS_PER_COMMENDATION : 0,
  }
}

export interface Promotion {
  diverId: string
  specialistId: string
  from: number
  to: number
}

// Who climbs a rank when the squad advances: the squad-climbs page announces
// it, ADVANCE banks it.
export function promotionsDue(state: DiveState): Promotion[] {
  const promotions: Promotion[] = []
  for (const diver of state.divers) {
    if (!diver.commission) {
      continue
    }
    const earned = meritsEarnedBy(state, diver)
    const from = specialistRankOf(diver.commission.merits)
    const to = specialistRankOf(diver.commission.merits + earned.cleanOperation + earned.commendation)
    if (to > from) {
      promotions.push({ diverId: diver.id, specialistId: diver.commission.specialistId, from, to })
    }
  }
  return promotions
}

// The commission carried into the next mission: merits banked, the mission's
// broken mark cleared, and a fresh operation starting clean.
export function advanceCommission(state: DiveState, diver: DiverState, newOperation: boolean): Commission | null | undefined {
  const commission = diver.commission
  if (!commission) {
    return commission
  }
  const earned = meritsEarnedBy(state, diver)
  return {
    ...commission,
    merits: commission.merits + earned.cleanOperation + earned.commendation,
    ordersBroken: false,
    cleanOperation: newOperation ? true : commission.cleanOperation,
  }
}

export function fillDispatch(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match)
}
