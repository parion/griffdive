import { ITEMS_BY_ID } from '~~/shared/data/catalog'
import type { Item } from '~~/shared/data/types'
import { startingItemIds } from '~~/shared/engine/progression'
import type { DiveState } from '~~/shared/engine/types'

export type KitSectionId = 'primary' | 'secondary' | 'throwables' | 'armor' | 'boosters' | 'eagle' | 'orbital' | 'supply' | 'defense'

export interface KitSectionDef {
  id: KitSectionId
  label: string
  nav: string
  accent: string
}

export const KIT_SECTIONS: readonly KitSectionDef[] = [
  { id: 'primary', label: 'Primary', nav: 'Primary', accent: 'var(--cat-primary)' },
  { id: 'secondary', label: 'Secondary', nav: 'Secondary', accent: 'var(--cat-gear)' },
  { id: 'throwables', label: 'Throwables', nav: 'Throwables', accent: 'var(--cat-gear)' },
  { id: 'armor', label: 'Armor passives', nav: 'Armor', accent: 'var(--cat-armor)' },
  { id: 'boosters', label: 'Boosters', nav: 'Boosters', accent: 'var(--cat-booster)' },
  { id: 'eagle', label: 'Eagle stratagems', nav: 'Eagle', accent: 'var(--teal)' },
  { id: 'orbital', label: 'Orbital stratagems', nav: 'Orbital', accent: 'var(--teal)' },
  { id: 'supply', label: 'Supply stratagems', nav: 'Supply', accent: 'var(--teal)' },
  { id: 'defense', label: 'Defense stratagems', nav: 'Defense', accent: 'var(--teal)' },
]

export function kitSectionOf(item: Item): KitSectionId {
  if (item.type === 'stratagem') {
    switch (item.category) {
      case 'Eagle':
        return 'eagle'
      case 'Orbital':
        return 'orbital'
      case 'Defense':
        return 'defense'
      default:
        return 'supply'
    }
  }
  switch (item.category) {
    case 'secondary':
      return 'secondary'
    case 'throwable':
      return 'throwables'
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

// Items the diver gained after launch (rewards, purchases, caches): everything
// outside the variant's starting kit.
export function earnedKitItems(state: DiveState, diverId: string | null): Item[] {
  const items = ownedKitItems(state, diverId)
  if (!state.settings) {
    return items
  }
  const starting = new Set(startingItemIds(state.settings.variant, state.settings.mode))
  return items.filter(item => !starting.has(item.id))
}
