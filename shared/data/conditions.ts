import type { Accountability } from './types'
import { parseRule } from './glossary'
import type { RulePart } from './glossary'

// The single condition catalogue: team rules (misfortunes, drawn on the wheel)
// and personal rules (pacts, dealt to each diver) are one pool, distinguished
// only by `scope`. Nothing is gated by difficulty — every condition is always
// available — the difficulty instead scales each condition's risk/Valor value
// (see CONDITION_RISK in shared/engine/config.ts).
export type ConditionScope = 'team' | 'personal'

export interface Condition {
  id: string
  name: string
  // The rule as plain prose — safe anywhere a sentence goes.
  rule: string
  // The same rule split into plain and keyword spans, for rendering with the
  // glossary highlights.
  ruleParts: readonly RulePart[]
  // Glossary ids the rule leans on, in order of appearance.
  keywords: readonly string[]
  // How the squad can verify this condition in Helldivers 2 — every condition
  // must be observable, or it doesn't belong in the catalogue (AGENTS.md:
  // accountability rule). loadout: pre-dive screen. field: live in the mission.
  // stats: end-of-mission stats screen.
  accountability: Accountability
  scope: ConditionScope
}

// Authored form: `rule` carries glossary markup (see parseRule).
type ConditionSource = Omit<Condition, 'ruleParts' | 'keywords'>

const SOURCES: readonly ConditionSource[] = [
  // Team rules — squad-binding misfortunes, drawn on the wheel.
  { id: 'noBackpacks', name: 'Bare Backs', rule: 'No {backpack} stratagems', accountability: 'loadout', scope: 'team' },
  { id: 'noSentries', name: 'Stand Down', rule: 'No {sentry} stratagems (the EMS Mortar Sentry included)', accountability: 'loadout', scope: 'team' },
  { id: 'noBoosters', name: 'Clean Living', rule: 'No {booster} equipped', accountability: 'loadout', scope: 'team' },
  { id: 'noResupplies', name: 'Ration Cut', rule: 'Nobody calls a {resupply}', accountability: 'field', scope: 'team' },
  { id: 'noEagles', name: 'Hangar Fire', rule: 'No {Eagle} stratagems (the Eagle Smoke Strike included)', accountability: 'loadout', scope: 'team' },
  { id: 'fragileLiberty', name: 'Fragile Liberty', rule: 'Everyone wears {light armor}', accountability: 'loadout', scope: 'team' },
  { id: 'noOrbitals', name: 'Orbital Blackout', rule: 'No {orbital} stratagems (EMS and Smoke Strikes included)', accountability: 'loadout', scope: 'team' },
  { id: 'primaryOnly', name: 'Standard Issue', rule: 'No {support weapons|supportWeapon}, no {pickups} or swaps (secondaries and every other stratagem stay legal)', accountability: 'field', scope: 'team' },
  { id: 'oopsAllAirstrikes', name: 'Oops, All Airstrikes', rule: 'Equip {Eagle} and {orbital} stratagems only ({yellow} calls like Resupply stay open)', accountability: 'loadout', scope: 'team' },
  { id: 'zeroDeaths', name: 'Spotless Record', rule: 'Any diver death {fails the directive|failed} (the mission plays on)', accountability: 'field', scope: 'team' },
  { id: 'noReserves', name: 'Martyrdom', rule: 'No one is {reinforced|reinforce}, so a fallen diver stays down (every other stratagem stays legal)', accountability: 'field', scope: 'team' },
  { id: 'noStratagems', name: 'Deserted', rule: 'Stratagems only in the mission\'s first minute ({Reinforce} and {SEAF resources|seaf} excepted)', accountability: 'field', scope: 'team' },
  { id: 'meleeOnly', name: 'Fix Bayonets', rule: 'Kill with {melee} only (no guns, grenades or {offensive} stratagems)', accountability: 'field', scope: 'team' },
  { id: 'pacifist', name: 'Peacekeepers', rule: 'No diver {scores a kill|kill} (stratagem kills count to the caller)', accountability: 'stats', scope: 'team' },
  { id: 'heavyBurden', name: 'Heavy Burden', rule: 'Everyone wears {heavy armor}', accountability: 'loadout', scope: 'team' },
  { id: 'stimShortage', name: 'Stim Shortage', rule: 'Nobody uses a {stim}', accountability: 'stats', scope: 'team' },

  // Personal rules — individual pacts, dealt to each diver.
  { id: 'packLight', name: 'Pack Light', rule: 'I bring no {backpack} stratagem', accountability: 'loadout', scope: 'personal' },
  { id: 'thirsty', name: 'Thirsty', rule: 'I call no {resupply} and take none from others', accountability: 'field', scope: 'personal' },
  { id: 'emptyPockets', name: 'Empty Pockets', rule: 'I equip no {booster}', accountability: 'loadout', scope: 'personal' },
  { id: 'antiTankAbstinent', name: 'Anti-Tank Abstinent', rule: 'I carry nothing {anti-tank|antiTank} (no stratagem, weapon or grenade)', accountability: 'loadout', scope: 'personal' },
  { id: 'deadWeight', name: 'Dead Weight', rule: 'If I die I can\'t be {reinforced|reinforce} on my own (I return only when another diver needs reinforcing)', accountability: 'field', scope: 'personal' },
  { id: 'stimAbstinent', name: 'Stim Abstinent', rule: 'I use no {stims|stim}', accountability: 'stats', scope: 'personal' },
  { id: 'loadoutLoyalist', name: 'Loadout Loyalist', rule: 'I use only my equipped loadout (no {pickups} or swaps)', accountability: 'field', scope: 'personal' },
  { id: 'primaryConcern', name: 'Primary Concern', rule: 'I bring no {support weapon} (secondaries and every other stratagem stay legal)', accountability: 'loadout', scope: 'personal' },
  { id: 'grounded', name: 'Grounded', rule: 'I bring no {offensive} {Eagle} stratagems (the {reserve} Eagle Smoke Strike is exempt)', accountability: 'loadout', scope: 'personal' },
  { id: 'shipSilent', name: 'Ship Silent', rule: 'I bring no {offensive} {orbital} stratagems (the {reserve} EMS and Smoke Strikes are exempt)', accountability: 'loadout', scope: 'personal' },
  { id: 'openField', name: 'Open Field', rule: 'I bring no {offensive} {sentries|sentry}, mines or emplacements (the {reserve} EMS Mortar Sentry and shield relays are exempt)', accountability: 'loadout', scope: 'personal' },
  { id: 'untouchable', name: 'Untouchable', rule: 'I do not die (a death {fails this pact|failed} and the mission plays on)', accountability: 'field', scope: 'personal' },
  { id: 'featherweight', name: 'Featherweight', rule: 'I wear {light armor} only', accountability: 'loadout', scope: 'personal' },
  { id: 'ironbound', name: 'Ironbound', rule: 'I wear {heavy armor} only', accountability: 'loadout', scope: 'personal' },
  { id: 'radioSilence', name: 'Radio Silence', rule: 'I call no {stratagem}: red, blue, green or {yellow} alike ({Reinforce} excepted)', accountability: 'field', scope: 'personal' },
  { id: 'coldSteel', name: 'Cold Steel', rule: 'Every kill I score is a {melee} kill', accountability: 'stats', scope: 'personal' },
  { id: 'cleanHands', name: 'Clean Hands', rule: 'I deal no {friendly fire} damage', accountability: 'stats', scope: 'personal' },
]

export const CONDITIONS: readonly Condition[] = SOURCES.map((source) => {
  const parsed = parseRule(source.rule)
  return { ...source, rule: parsed.text, ruleParts: parsed.parts, keywords: parsed.keywords }
})

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
