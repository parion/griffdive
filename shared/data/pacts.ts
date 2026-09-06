import type { Accountability } from './types'

export interface Pact {
  id: string
  name: string
  rule: string
  // How the squad can actually verify this pact in Helldivers 2 — every pact
  // must be observable somewhere, or it doesn't belong in the catalog:
  // loadout: visible on the pre-dive loadout screen.
  // field: visible live in the mission (beacons, carried gear, deaths).
  // stats: appears on the end-of-mission stats screen.
  accountability: Accountability
}

export const PACTS: readonly Pact[] = [
  { id: 'packLight', name: 'Pack Light', rule: 'I bring no backpack', accountability: 'loadout' },
  { id: 'thirsty', name: 'Thirsty', rule: 'I call and take no resupplies', accountability: 'field' },
  { id: 'emptyPockets', name: 'Empty Pockets', rule: 'I equip no booster', accountability: 'loadout' },
  { id: 'antiTankAbstinent', name: 'Anti-Tank Abstinent', rule: 'I carry nothing anti-tank', accountability: 'loadout' },
  { id: 'deadWeight', name: 'Dead Weight', rule: 'If I die, I refuse reinforcement — I stay dead', accountability: 'field' },
  { id: 'stimAbstinent', name: 'Stim Abstinent', rule: 'I use no stims', accountability: 'stats' },
  { id: 'loadoutLoyalist', name: 'Loadout Loyalist', rule: 'I use only my equipped loadout; no pickups or swaps', accountability: 'field' },
  { id: 'primaryConcern', name: 'Primary Concern', rule: 'I bring no support weapon', accountability: 'loadout' },
  { id: 'grounded', name: 'Grounded', rule: 'I bring no Eagle stratagems', accountability: 'loadout' },
  { id: 'shipSilent', name: 'Ship Silent', rule: 'I bring no orbital stratagems', accountability: 'loadout' },
  { id: 'openField', name: 'Open Field', rule: 'I bring no sentries, mines, or emplacements', accountability: 'loadout' },
  { id: 'barebones', name: 'Barebones', rule: 'I fill no stratagem slots', accountability: 'loadout' },
  { id: 'untouchable', name: 'Untouchable', rule: 'I finish the mission without dying', accountability: 'field' },
]

const PACTS_BY_ID: ReadonlyMap<string, Pact> = new Map(PACTS.map(pact => [pact.id, pact]))

export function pactById(id: string): Pact | null {
  return PACTS_BY_ID.get(id) ?? null
}

export function pactName(id: string): string {
  return PACTS_BY_ID.get(id)?.name ?? id
}
