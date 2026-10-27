import type { Accountability } from '~~/shared/data/types'

// Where the squad can verify a wheel rule in Helldivers 2 — shared by the
// wheel cards and the pact cards so both layers read the same way.
export const ACCOUNTABILITY_LABELS: Record<Accountability, string> = {
  loadout: 'visible on the loadout screen',
  field: 'squad checks during the mission',
  stats: 'visible on the end-of-mission stats',
}
