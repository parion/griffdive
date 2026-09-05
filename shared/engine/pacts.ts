import { PACT_RISK } from './config'

// A pact that would be redundant or impossible under the active misfortune is
// unselectable (AGENTS.md: Personal layer — pacts).
export const BLOCKED_UNDER_MISFORTUNE: Readonly<Record<string, readonly string[]>> = {
  noBackpacks: ['packLight'],
  noResupplies: ['thirsty'],
  noStratagems: ['thirsty', 'barebones'],
  secondaryOnly: ['sidearmPurist'],
  meleeOnly: ['sidearmPurist'],
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

export function pactRiskTotal(pactIds: readonly string[]): number {
  return pactIds.reduce((sum, id) => sum + (PACT_RISK[id] ?? 0), 0)
}
