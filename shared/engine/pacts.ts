import { PACTS } from '../data/pacts'
import type { Pact } from '../data/pacts'
import { PACT_RISK, pactOptionsFor } from './config'
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
  oopsAllOrbitals: ['packLight', 'thirsty', 'antiTankAbstinent', 'primaryConcern', 'grounded', 'shipSilent', 'openField', 'barebones'],
  noStratagems: ['packLight', 'thirsty', 'antiTankAbstinent', 'primaryConcern', 'grounded', 'shipSilent', 'openField', 'barebones'],
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

export function pactRiskTotal(pactIds: readonly string[]): number {
  return pactIds.reduce((sum, id) => sum + (PACT_RISK[id] ?? 0), 0)
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
    const index = pickIndex(rng, remaining.length)
    offered.push(remaining.splice(index, 1)[0]!)
  }
  return offered
}
