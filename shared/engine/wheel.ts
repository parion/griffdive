import { FRONTS } from '../data/fronts'
import { MISFORTUNES } from '../data/misfortunes'
import { STRAINS } from '../data/strains'
import type { Front, FrontId } from '../data/fronts'
import type { Misfortune } from '../data/misfortunes'
import type { Strain } from '../data/strains'
import { MIN_DIFFICULTY, STRAIN_MIN_DIFFICULTY } from './config'
import { hasLegalLoadout, isPactSelectable } from './pacts'
import { deriveSeed, mulberry32, pickRandom } from './rng'

// Every team condition is on the wheel at every difficulty — difficulty scales
// each condition's risk instead (CONDITION_RISK). The one gate is the squad's
// kit: a directive that would leave any diver below HD2's four required
// stratagems (Oops, All Airstrikes for a diver short on red stratagems) is off
// the wheel, so a draw is never a dead end. Pass every present diver's
// inventory; omit it for the whole catalogue (display scales, marketing).
// `penance` are the pacts the squad owes back: a directive that blocks one of
// them would void the debt unserved, so it stays off the wheel too.
export function eligibleMisfortunes(
  inventories: readonly (readonly string[])[] = [],
  penance: readonly string[] = [],
): Misfortune[] {
  return MISFORTUNES.filter(misfortune =>
    inventories.every(owned => hasLegalLoadout(misfortune.id, [], owned))
    && !penance.some(pactId => !isPactSelectable(pactId, misfortune.id)))
}

// Strains belong to a front: the pool is that front's subfactions eligible at
// the operation's difficulty. Omit the front to ask for the whole difficulty's
// pool (the Valor meter's display scale).
export function eligibleStrains(difficulty: number, frontId?: FrontId): Strain[] {
  return STRAINS.filter(
    strain =>
      (frontId === undefined || strain.frontId === frontId)
      && (STRAIN_MIN_DIFFICULTY[strain.id] ?? MIN_DIFFICULTY) <= difficulty,
  )
}

// Misfortune, front and strain draw from independent seeded streams, so a
// per-mission misfortune redraw never disturbs the operation's front+strain.
// Same seed always yields the same draw on every client (AGENTS.md: spins are
// seeds). A front with no eligible strain draws none — the operation runs
// against standard forces.
export function deriveMisfortune(
  seed: number,
  inventories: readonly (readonly string[])[] = [],
  penance: readonly string[] = [],
): Misfortune {
  const rng = mulberry32(deriveSeed(seed, 1))
  return pickRandom(rng, eligibleMisfortunes(inventories, penance))
}

// The front pool is the whole roster by default; a Major Order narrows it to
// the fronts the squad committed to, so the draw still randomizes (no seed
// favors one MO front) but never leaves the order. An empty pool falls back to
// the full roster — an MO that names no front pins nothing.
export function deriveFront(seed: number, eligible: readonly Front[] = FRONTS): FrontId {
  const pool = eligible.length > 0 ? eligible : FRONTS
  const rng = mulberry32(deriveSeed(seed, 2))
  return pickRandom(rng, pool).id
}

export function deriveStrain(seed: number, difficulty: number, frontId: FrontId): Strain | null {
  const pool = eligibleStrains(difficulty, frontId)
  if (pool.length === 0) {
    return null
  }
  const rng = mulberry32(deriveSeed(seed, 3))
  return pickRandom(rng, pool)
}

export function frontById(id: FrontId | string): (typeof FRONTS)[number] | null {
  return FRONTS.find(front => front.id === id) ?? null
}

export function strainById(id: string | null | undefined): Strain | null {
  if (!id) {
    return null
  }
  return STRAINS.find(strain => strain.id === id) ?? null
}
