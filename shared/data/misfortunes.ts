import type { Accountability } from './types'

export interface Misfortune {
  id: string
  name: string
  rule: string
  // Where the squad can verify this misfortune in Helldivers 2 — same three
  // channels as pacts (AGENTS.md: accountability rule). A misfortune whose
  // breach nobody can observe doesn't belong on the wheel.
  accountability: Accountability
}

export const MISFORTUNES: readonly Misfortune[] = [
  { id: 'noBackpacks', name: 'No Backpacks', rule: 'No backpack stratagems', accountability: 'loadout' },
  { id: 'noSentries', name: 'No Sentries', rule: 'No sentry stratagems', accountability: 'loadout' },
  { id: 'noBoosters', name: 'No Boosters', rule: 'No boosters equipped', accountability: 'loadout' },
  { id: 'noResupplies', name: 'No Resupplies', rule: 'Never call resupply', accountability: 'field' },
  { id: 'noEagles', name: 'No Eagles', rule: 'No Eagle stratagems', accountability: 'loadout' },
  { id: 'fragileLiberty', name: 'Fragile Liberty', rule: 'Light armor only', accountability: 'loadout' },
  { id: 'noOrbitals', name: 'No Orbitals', rule: 'No orbital stratagems', accountability: 'loadout' },
  { id: 'primaryOnly', name: 'Primary Only', rule: 'Primaries only — no support weapons, no pickups or swaps (stratagems allowed)', accountability: 'field' },
  { id: 'stealth', name: 'Stealth', rule: 'No raised alarms or bot detections', accountability: 'field' },
  { id: 'oopsAllOrbitals', name: 'Oops, All Orbitals', rule: 'Orbital stratagems only', accountability: 'loadout' },
  { id: 'zeroDeaths', name: 'Zero Deaths', rule: 'Any diver death = mission failure', accountability: 'field' },
  { id: 'noReserves', name: 'No Reserves', rule: 'No one gets reinforced this mission', accountability: 'field' },
  { id: 'noStratagems', name: 'No Stratagems', rule: 'No stratagems at all, not even resupply', accountability: 'loadout' },
  { id: 'meleeOnly', name: 'Melee Only', rule: 'Melee weapons only', accountability: 'field' },
  { id: 'pacifist', name: 'Pacifist', rule: 'No diver scores a kill', accountability: 'stats' },
]

const MISFORTUNES_BY_ID: ReadonlyMap<string, Misfortune> = new Map(
  MISFORTUNES.map(misfortune => [misfortune.id, misfortune]),
)

export function misfortuneById(id: string): Misfortune | null {
  return MISFORTUNES_BY_ID.get(id) ?? null
}
