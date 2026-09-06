import { FRONTS } from '../data/fronts'
import { MISFORTUNES } from '../data/misfortunes'
import type { FrontId } from '../data/fronts'
import type { Misfortune } from '../data/misfortunes'
import { MISFORTUNE_MIN_DIFFICULTY, MIN_DIFFICULTY } from './config'
import { deriveSeed, mulberry32, pickRandom } from './rng'

export function eligibleMisfortunes(difficulty: number): Misfortune[] {
  return MISFORTUNES.filter(
    misfortune => (MISFORTUNE_MIN_DIFFICULTY[misfortune.id] ?? MIN_DIFFICULTY) <= difficulty,
  )
}

// Misfortune and front draw from independent seeded streams, so a per-mission
// misfortune redraw never disturbs the operation's front. Same seed always
// yields the same draw on every client (AGENTS.md: spins are seeds).
export function deriveMisfortune(seed: number, difficulty: number): Misfortune {
  const rng = mulberry32(deriveSeed(seed, 1))
  return pickRandom(rng, eligibleMisfortunes(difficulty))
}

export function deriveFront(seed: number): FrontId {
  const rng = mulberry32(deriveSeed(seed, 2))
  return pickRandom(rng, FRONTS).id
}

export function frontById(id: FrontId | string): (typeof FRONTS)[number] | null {
  return FRONTS.find(front => front.id === id) ?? null
}
