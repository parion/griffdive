import type { Accountability } from '~~/shared/data/types'

// Where the squad can verify a wheel rule in Helldivers 2 — shared by the
// wheel cards and the pact cards so both layers read the same way.
export const ACCOUNTABILITY_LABELS: Record<Accountability, string> = {
  loadout: 'seen in the loadout screen',
  field: 'watched live in the field',
  stats: 'checked on the end-of-mission stats',
}
