import { FRONTS } from '../data/fronts'
import { MISFORTUNES } from '../data/misfortunes'
import type { FrontId } from '../data/fronts'
import type { Misfortune } from '../data/misfortunes'
import { MISFORTUNE_MIN_DIFFICULTY, MIN_DIFFICULTY } from './config'
import { mulberry32, pickRandom } from './rng'
import type { WheelResult } from './types'

export function eligibleMisfortunes(difficulty: number): Misfortune[] {
  return MISFORTUNES.filter(
    misfortune => (MISFORTUNE_MIN_DIFFICULTY[misfortune.id] ?? MIN_DIFFICULTY) <= difficulty,
  )
}

// Draw order is fixed: misfortune first, then front. Same seed + difficulty
// always yields the same wheel on every client (AGENTS.md: spins are seeds).
export function deriveSpin(seed: number, difficulty: number): WheelResult {
  const rng = mulberry32(seed)
  const pool = eligibleMisfortunes(difficulty)
  const misfortune = pickRandom(rng, pool)
  const front = pickRandom(rng, FRONTS)
  return { seed, misfortuneId: misfortune.id, front: front.id }
}

export function misfortuneById(id: string): Misfortune | null {
  return MISFORTUNES.find(misfortune => misfortune.id === id) ?? null
}

export function frontById(id: FrontId | string): (typeof FRONTS)[number] | null {
  return FRONTS.find(front => front.id === id) ?? null
}
