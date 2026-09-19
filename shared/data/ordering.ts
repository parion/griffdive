import { TIER_RANK } from './catalog'
import type { Item, StratagemCategory } from './types'

// Stratagem display buckets, in the order divers scan them: offensive
// stratagems (Eagle/Orbital), then support, then emplacements and turrets.
// Non-stratagems share a single bucket so only tier orders them.
const STRATAGEM_BUCKET: Readonly<Record<StratagemCategory, number>> = {
  Eagle: 0,
  Orbital: 0,
  Supply: 1,
  Defense: 2,
}

function bucketOf(item: Item): number {
  return item.type === 'stratagem'
    ? (STRATAGEM_BUCKET[item.category as StratagemCategory] ?? 3)
    : -1
}

// Kit presentation order: stratagems group by role, everything else falls
// through to tier. Within a bucket the best tier leads, and display name
// breaks ties so the order is stable across catalog refreshes.
export function compareKitItems(a: Item, b: Item): number {
  const bucket = bucketOf(a) - bucketOf(b)
  if (bucket !== 0) {
    return bucket
  }
  const tier = TIER_RANK[b.tier] - TIER_RANK[a.tier]
  if (tier !== 0) {
    return tier
  }
  return a.displayName.localeCompare(b.displayName)
}

export function sortKitItems(items: readonly Item[]): Item[] {
  return [...items].sort(compareKitItems)
}
