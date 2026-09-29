import { PACTS, pactById, pactName } from './conditions'
import type { Condition } from './conditions'

// Pacts are the personal-scoped slice of the unified condition catalogue; the
// data lives in conditions.ts. Kept as a named view so call sites read by scope.
export type Pact = Condition

export { PACTS, pactById, pactName }
