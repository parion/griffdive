import { PACTS } from '../data/pacts'
import type { Pact } from '../data/pacts'
import { stratagems } from '../data/stratagems'
import type { Item } from '../data/types'
import { PACT_RISK, RESERVE_STRATAGEMS, STRATAGEM_SLOTS_REQUIRED, pactOptionsFor } from './config'
import { deriveSeed, mulberry32, pickIndex } from './rng'

// A pact that would be redundant or impossible under the accepted misfortune
// never enters the offer pool (AGENTS.md: Personal layer — pacts).
export const BLOCKED_UNDER_MISFORTUNE: Readonly<Record<string, readonly string[]>> = {
  noBackpacks: ['packLight'],
  noBoosters: ['emptyPockets'],
  noResupplies: ['thirsty'],
  noEagles: ['grounded'],
  noOrbitals: ['shipSilent'],
  primaryOnly: ['primaryConcern', 'loadoutLoyalist'],
  oopsAllAirstrikes: ['packLight', 'thirsty', 'primaryConcern', 'openField'],
  noStratagems: ['packLight', 'thirsty', 'antiTankAbstinent', 'primaryConcern', 'grounded', 'shipSilent', 'openField'],
  zeroDeaths: ['deadWeight', 'untouchable'],
  noReserves: ['deadWeight'],
  meleeOnly: ['antiTankAbstinent', 'primaryConcern'],
}

export function isPactSelectable(pactId: string, misfortuneId: string | null): boolean {
  if (!(pactId in PACT_RISK)) {
    return false
  }
  if (!misfortuneId) {
    return true
  }
  return !(BLOCKED_UNDER_MISFORTUNE[misfortuneId] ?? []).includes(pactId)
}

// A pact strictly implied by another pick is not a second restriction: picking
// both would bank risk for a limitation already held. The map is currently
// empty — Barebones (the only pact that subsumed others) was removed because
// HD2 requires four equipped stratagems to ready up. The machinery stays in
// place for future subsumption rules.
export const PACT_SUBSUMES: Readonly<Record<string, readonly string[]>> = {}

// Restrictions that tax the same strength are never offered or picked together:
// two stratagem-category bans would bank risk for a loadout that was already
// constrained, and stacking them can strand a diver below HD2's four required
// stratagem slots. (AGENTS.md: Personal layer — pacts.)
export const PACT_EXCLUSIVE_GROUPS: readonly (readonly string[])[] = [
  ['grounded', 'shipSilent', 'openField'],
]

// The picked pact that rules out `pactId`, if any — a same-group peer.
export function pactConflictsWith(pactId: string, pickedIds: readonly string[]): string | null {
  const group = PACT_EXCLUSIVE_GROUPS.find(entries => entries.includes(pactId))
  if (!group) {
    return null
  }
  for (const picked of pickedIds) {
    if (picked !== pactId && group.includes(picked)) {
      return picked
    }
  }
  return null
}

// The picked pact that already covers `pactId`, if any — the reason a pick is
// redundant.
export function pactSubsumedBy(pactId: string, pickedIds: readonly string[]): string | null {
  for (const picked of pickedIds) {
    if (picked !== pactId && (PACT_SUBSUMES[picked] ?? []).includes(pactId)) {
      return picked
    }
  }
  return null
}

// Toggle a pact against the subsumption rules. Adding a pact that another pick
// already covers is refused; adding one that covers existing picks replaces
// them, so the selection never stacks redundant restrictions.
export function applyPactToggle(
  offerIds: readonly string[],
  pickedIds: readonly string[],
  pactId: string,
): string[] {
  const picked = new Set(pickedIds)
  if (picked.has(pactId)) {
    picked.delete(pactId)
    return [...picked]
  }
  if (!offerIds.includes(pactId) || pactSubsumedBy(pactId, pickedIds) || pactConflictsWith(pactId, pickedIds)) {
    return [...picked]
  }
  for (const subsumed of PACT_SUBSUMES[pactId] ?? []) {
    picked.delete(subsumed)
  }
  picked.add(pactId)
  return [...picked]
}

export function pactRiskTotal(pactIds: readonly string[]): number {
  return pactIds.reduce((sum, id) => sum + (PACT_RISK[id] ?? 0), 0)
}

const RESERVE_STRATAGEM_SET = new Set<string>(RESERVE_STRATAGEMS)

function isReserveStratagem(item: Item): boolean {
  return RESERVE_STRATAGEM_SET.has(item.id)
}

function isBackpackStratagem(item: Item): boolean {
  return item.tags.includes('Backpacks')
}

// The game's "red" stratagems: Eagle and Orbital strikes. A misfortune that
// restricts the loadout to them (Oops, All Airstrikes) still leaves enough
// choices to ready up.
function isAirstrikeStratagem(item: Item): boolean {
  return item.category === 'Eagle' || item.category === 'Orbital'
}

function isSupportWeaponStratagem(item: Item): boolean {
  return item.category === 'Supply' && item.tags.includes('Weapons')
}

// Pacts that remove a stratagem from the loadout. Reserve utility is exempt:
// the reworded category pacts ban offensive firepower only.
const PACT_BANS_STRATAGEM: Readonly<Record<string, (item: Item) => boolean>> = {
  packLight: isBackpackStratagem,
  primaryConcern: isSupportWeaponStratagem,
  antiTankAbstinent: item => item.antitank === true,
  grounded: item => item.category === 'Eagle',
  shipSilent: item => item.category === 'Orbital',
  openField: item => item.category === 'Defense',
}

// Misfortunes bind the whole squad, so their bans are absolute — reserve
// utility is not exempt. Only rules that restrict what can be *equipped* count
// here; purely behavioral misfortunes (No Stratagems: four slots still equip,
// they just cannot be called) do not remove loadout choices.
const MISFORTUNE_BANS_STRATAGEM: Readonly<Record<string, (item: Item) => boolean>> = {
  noBackpacks: isBackpackStratagem,
  noSentries: item => item.tags.includes('Sentry'),
  noEagles: item => item.category === 'Eagle',
  noOrbitals: item => item.category === 'Orbital',
  primaryOnly: isSupportWeaponStratagem,
}

// How many stratagems a diver can still field once the accepted misfortune and
// their picked pacts are applied. Reserve utility is always owned, so a
// reward-poor diver is never stranded by a forfeit.
export function legalStratagemCount(
  misfortuneId: string | null,
  pactIds: readonly string[],
  ownedIds: readonly string[],
): number {
  const owned = new Set(ownedIds)
  const misfortuneBans = misfortuneId ? MISFORTUNE_BANS_STRATAGEM[misfortuneId] : undefined
  const airstrikesOnly = misfortuneId === 'oopsAllAirstrikes'
  let count = 0
  for (const item of stratagems) {
    if (!owned.has(item.id) && !isReserveStratagem(item)) {
      continue
    }
    if (airstrikesOnly && !isAirstrikeStratagem(item)) {
      continue
    }
    if (misfortuneBans?.(item)) {
      continue
    }
    if (!isReserveStratagem(item) && pactIds.some(id => PACT_BANS_STRATAGEM[id]?.(item))) {
      continue
    }
    count++
  }
  return count
}

// HD2 requires four equipped stratagems; a pact pick that drops the diver below
// the minimum is refused (AGENTS.md: Personal layer — pacts).
export function hasLegalLoadout(
  misfortuneId: string | null,
  pactIds: readonly string[],
  ownedIds: readonly string[],
): boolean {
  return legalStratagemCount(misfortuneId, pactIds, ownedIds) >= STRATAGEM_SLOTS_REQUIRED
}

// The offer is a deterministic derivation of the wheel seed ("spins are
// seeds"): once the wheel decision is in, every client rolls the same 2–3
// pacts for a diver. Stream salt 3 — the wheel uses 1 (misfortune) and 2
// (front) on the same seed.
export function rollPactOffer(seed: number, misfortuneId: string | null, difficulty: number): Pact[] {
  const pool = PACTS.filter(pact => isPactSelectable(pact.id, misfortuneId))
  const rng = mulberry32(deriveSeed(seed, 3))
  const remaining = [...pool]
  const count = Math.min(pactOptionsFor(difficulty), remaining.length)
  const offered: Pact[] = []
  for (let i = 0; i < count && remaining.length > 0; i++) {
    // Never offer two pacts that rule each other out, however the draw lands.
    const offeredIds = offered.map(pact => pact.id)
    const candidates = remaining
      .map((pact, index) => ({ pact, index }))
      .filter(({ pact }) => pactConflictsWith(pact.id, offeredIds) === null)
    if (candidates.length === 0) {
      break
    }
    const chosen = candidates[pickIndex(rng, candidates.length)]!
    offered.push(chosen.pact)
    remaining.splice(chosen.index, 1)
  }
  return offered
}
