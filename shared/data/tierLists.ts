import { ALL_ITEMS } from './catalog'
import type { Tier } from './types'

// Featured tier lists shipped with the app: playable offline, versioned with
// the catalog, credited like any other community contribution. Submit a list
// by pull request (a share code is enough) and add its author to CREDITS.
export interface TierListPreset {
  id: string
  name: string
  blurb: string
  credit: string
  tiers: Readonly<Record<string, Tier>>
}

const FLIPPED: Readonly<Record<Tier, Tier>> = { s: 'c', a: 'b', b: 'a', c: 's' }

export const TIER_LIST_PRESETS: readonly TierListPreset[] = [
  {
    id: 'underdog',
    name: 'Underdog',
    blurb: 'The community list turned upside down: the meta is common, the forgotten gear is the jackpot.',
    credit: 'Griffdive',
    tiers: Object.fromEntries(ALL_ITEMS.map(item => [item.id, FLIPPED[item.tier]])),
  },
]
