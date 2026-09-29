import { MISFORTUNES, misfortuneById } from './conditions'
import type { Condition } from './conditions'

// Misfortunes are the team-scoped slice of the unified condition catalogue; the
// data lives in conditions.ts. Kept as a named view so call sites read by scope.
export type Misfortune = Condition

export { MISFORTUNES, misfortuneById }
