import { armor, armorPassives, boosters, primaries, secondaries, throwables } from './equipment'
import { stratagems } from './stratagems'
import type { Item, Warbond } from './types'
import { warbonds } from './warbonds'

export const CATALOG_VERSION = 1

export const ALL_ITEMS: readonly Item[] = [
  ...primaries,
  ...secondaries,
  ...throwables,
  ...boosters,
  ...armor,
  ...armorPassives,
  ...stratagems,
]

export const WARBONDS: readonly Warbond[] = warbonds

export const ALL_WARBOND_CODES: readonly string[] = WARBONDS.map(warbond => warbond.code)

export const ITEMS_BY_ID: ReadonlyMap<string, Item> = new Map(
  ALL_ITEMS.map(item => [item.id, item]),
)
