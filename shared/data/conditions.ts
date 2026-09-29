import type { Accountability } from './types'

// The single condition catalogue: team rules (misfortunes, drawn on the wheel)
// and personal rules (pacts, dealt to each diver) are one pool, distinguished
// only by `scope`. Nothing is gated by difficulty — every condition is always
// available — the difficulty instead scales each condition's risk/Valor value
// (see CONDITION_RISK in shared/engine/config.ts).
export type ConditionScope = 'team' | 'personal'

export interface Condition {
  id: string
  name: string
  rule: string
  // How the squad can verify this condition in Helldivers 2 — every condition
  // must be observable, or it doesn't belong in the catalogue (AGENTS.md:
  // accountability rule). loadout: pre-dive screen. field: live in the mission.
  // stats: end-of-mission stats screen.
  accountability: Accountability
  scope: ConditionScope
}

export const CONDITIONS: readonly Condition[] = [
  // Team rules — squad-binding misfortunes, drawn on the wheel.
  { id: 'noBackpacks', name: 'No Backpacks', rule: 'No backpack stratagems', accountability: 'loadout', scope: 'team' },
  { id: 'noSentries', name: 'No Sentries', rule: 'No sentry stratagems', accountability: 'loadout', scope: 'team' },
  { id: 'noBoosters', name: 'No Boosters', rule: 'No boosters equipped', accountability: 'loadout', scope: 'team' },
  { id: 'noResupplies', name: 'No Resupplies', rule: 'Never call resupply', accountability: 'field', scope: 'team' },
  { id: 'noEagles', name: 'No Eagles', rule: 'No Eagle stratagems', accountability: 'loadout', scope: 'team' },
  { id: 'fragileLiberty', name: 'Fragile Liberty', rule: 'Light armor only', accountability: 'loadout', scope: 'team' },
  { id: 'noOrbitals', name: 'No Orbitals', rule: 'No orbital stratagems', accountability: 'loadout', scope: 'team' },
  { id: 'primaryOnly', name: 'Primary Only', rule: 'Primaries only — no support weapons, no pickups or swaps (stratagems allowed)', accountability: 'field', scope: 'team' },
  { id: 'stealth', name: 'Stealth', rule: 'No raised alarms or bot detections', accountability: 'field', scope: 'team' },
  { id: 'oopsAllAirstrikes', name: 'Oops, All Airstrikes', rule: 'Eagle and orbital stratagems only', accountability: 'loadout', scope: 'team' },
  { id: 'zeroDeaths', name: 'Zero Deaths', rule: 'Any diver death = mission failure', accountability: 'field', scope: 'team' },
  { id: 'noReserves', name: 'No Reserves', rule: 'No one gets reinforced this mission', accountability: 'field', scope: 'team' },
  { id: 'noStratagems', name: 'No Stratagems', rule: 'No stratagems at all, not even resupply', accountability: 'loadout', scope: 'team' },
  { id: 'meleeOnly', name: 'Melee Only', rule: 'Melee weapons only', accountability: 'field', scope: 'team' },
  { id: 'pacifist', name: 'Pacifist', rule: 'No diver scores a kill', accountability: 'stats', scope: 'team' },

  // Personal rules — individual pacts, dealt to each diver.
  { id: 'packLight', name: 'Pack Light', rule: 'I bring no backpack', accountability: 'loadout', scope: 'personal' },
  { id: 'thirsty', name: 'Thirsty', rule: 'I call and take no resupplies', accountability: 'field', scope: 'personal' },
  { id: 'emptyPockets', name: 'Empty Pockets', rule: 'I equip no booster', accountability: 'loadout', scope: 'personal' },
  { id: 'antiTankAbstinent', name: 'Anti-Tank Abstinent', rule: 'I carry nothing anti-tank', accountability: 'loadout', scope: 'personal' },
  { id: 'deadWeight', name: 'Dead Weight', rule: 'If I die, I refuse reinforcement — I stay dead', accountability: 'field', scope: 'personal' },
  { id: 'stimAbstinent', name: 'Stim Abstinent', rule: 'I use no stims', accountability: 'stats', scope: 'personal' },
  { id: 'loadoutLoyalist', name: 'Loadout Loyalist', rule: 'I use only my equipped loadout; no pickups or swaps', accountability: 'field', scope: 'personal' },
  { id: 'primaryConcern', name: 'Primary Concern', rule: 'I bring no support weapon', accountability: 'loadout', scope: 'personal' },
  { id: 'grounded', name: 'Grounded', rule: 'I bring no offensive Eagle stratagems', accountability: 'loadout', scope: 'personal' },
  { id: 'shipSilent', name: 'Ship Silent', rule: 'I bring no offensive orbital stratagems', accountability: 'loadout', scope: 'personal' },
  { id: 'openField', name: 'Open Field', rule: 'I bring no offensive sentries, mines, or emplacements', accountability: 'loadout', scope: 'personal' },
  { id: 'untouchable', name: 'Untouchable', rule: 'I finish the mission without dying', accountability: 'field', scope: 'personal' },
]

export const MISFORTUNES: readonly Condition[] = CONDITIONS.filter(condition => condition.scope === 'team')
export const PACTS: readonly Condition[] = CONDITIONS.filter(condition => condition.scope === 'personal')

const CONDITIONS_BY_ID: ReadonlyMap<string, Condition> = new Map(
  CONDITIONS.map(condition => [condition.id, condition]),
)
const MISFORTUNES_BY_ID: ReadonlyMap<string, Condition> = new Map(
  MISFORTUNES.map(condition => [condition.id, condition]),
)
const PACTS_BY_ID: ReadonlyMap<string, Condition> = new Map(
  PACTS.map(condition => [condition.id, condition]),
)

export function conditionById(id: string): Condition | null {
  return CONDITIONS_BY_ID.get(id) ?? null
}

export function misfortuneById(id: string | null | undefined): Condition | null {
  return id ? MISFORTUNES_BY_ID.get(id) ?? null : null
}

export function pactById(id: string): Condition | null {
  return PACTS_BY_ID.get(id) ?? null
}

export function pactName(id: string): string {
  return PACTS_BY_ID.get(id)?.name ?? id
}
