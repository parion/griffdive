import type { Item, ItemCategory, Warbond } from './types'

// Filenames in the catalog's `imageURL` are bare basenames; this map resolves
// them to their directory under `public/images/`. Armor-set art shares
// basenames with helmet art, so resolution must go by category, not lookup.
const IMAGE_DIR: Record<ItemCategory, string> = {
  primary: 'equipment',
  secondary: 'equipment',
  throwable: 'equipment',
  booster: 'equipment',
  armor: 'armor',
  armorPassive: 'armorpassives',
  Supply: 'svgs',
  Eagle: 'svgs',
  Orbital: 'svgs',
  Defense: 'svgs',
}

export function itemImageUrl(item: Item): string | undefined {
  return item.imageURL ? `/images/${IMAGE_DIR[item.category]}/${item.imageURL}` : undefined
}

export function warbondImageUrl(warbond: Warbond): string | undefined {
  return warbond.imageURL ? `/images/warbonds/${warbond.imageURL}` : undefined
}
