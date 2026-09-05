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

// Difficulty emblems live outside the item catalog; keyed by the game's 1–10
// ladder, clamped so an out-of-range difficulty still resolves to an emblem.
const DIFFICULTY_ICON_FILES: Readonly<Record<number, string>> = {
  1: 'Trivial_Difficulty_Icon.svg',
  2: 'Easy_Difficulty_Icon.svg',
  3: 'Medium_Difficulty_Icon.svg',
  4: 'Challenging_Difficulty_Icon.svg',
  5: 'Hard_Difficulty_Icon.svg',
  6: 'Extreme_Difficulty_Icon.svg',
  7: 'Suicide_Difficulty_Icon.svg',
  8: 'Impossible_Difficulty_Icon.svg',
  9: 'Helldive_Difficulty_Icon.svg',
  10: 'Super_Helldive_Difficulty_Icon.svg',
}

export function difficultyImageUrl(difficulty: number): string {
  const clamped = Math.min(Math.max(difficulty, 1), 10)
  return `/images/difficulty/${DIFFICULTY_ICON_FILES[clamped]}`
}
