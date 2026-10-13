import type { ItemCategory } from '~~/shared/data/types'

const CATEGORY_LABELS: Record<ItemCategory, string> = {
  primary: 'Primary',
  secondary: 'Secondary',
  throwable: 'Throwable',
  booster: 'Booster',
  armorPassive: 'Armor Passive',
  Supply: 'Supply',
  Eagle: 'Eagle',
  Orbital: 'Orbital',
  Defense: 'Defense',
}

export function categoryLabel(category: ItemCategory): string {
  return CATEGORY_LABELS[category]
}
