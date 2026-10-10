import { ITEMS_BY_ID } from '~~/shared/data/catalog'
import type { Item } from '~~/shared/data/types'
import type { DiveState } from '~~/shared/engine/types'

export type KitSectionId = 'primary' | 'secondary' | 'throwables' | 'armor' | 'boosters' | 'stratagems'

export interface KitSectionDef {
  id: KitSectionId
  label: string
  accent: string
}

export const KIT_SECTIONS: readonly KitSectionDef[] = [
  { id: 'primary', label: 'Primary', accent: 'var(--cat-primary)' },
  { id: 'secondary', label: 'Secondary', accent: 'var(--cat-gear)' },
  { id: 'throwables', label: 'Throwables', accent: 'var(--cat-gear)' },
  { id: 'armor', label: 'Armor passives', accent: 'var(--cat-armor)' },
  { id: 'boosters', label: 'Boosters', accent: 'var(--cat-booster)' },
  { id: 'stratagems', label: 'Stratagems', accent: 'var(--teal)' },
]

export function kitSectionOf(item: Item): KitSectionId {
  if (item.type === 'stratagem') {
    return 'stratagems'
  }
  switch (item.category) {
    case 'secondary':
      return 'secondary'
    case 'throwable':
      return 'throwables'
    case 'armor':
    case 'armorPassive':
      return 'armor'
    case 'booster':
      return 'boosters'
    default:
      return 'primary'
  }
}

// Everything the diver owns, reserve stratagems included: at the start they
// are most of the stratagem loadout, so hiding them reads as a missing kit.
export function ownedKitItems(state: DiveState, diverId: string | null): Item[] {
  return (diverId ? state.personalInventories[diverId] ?? [] : [])
    .map(id => ITEMS_BY_ID.get(id))
    .filter((item): item is Item => item !== undefined)
}
