import { ITEMS_BY_ID } from '~~/shared/data/catalog'
import type { Item } from '~~/shared/data/types'
import { RESERVE_STRATAGEMS } from '~~/shared/engine/config'
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

const RESERVE: ReadonlySet<string> = new Set(RESERVE_STRATAGEMS)

// What a diver actually carries: the reserve stratagems every diver shares are
// left out, so the rail's Kit shows only what sets this kit apart.
export function ownedKitItems(state: DiveState, diverId: string | null): Item[] {
  return (diverId ? state.personalInventories[diverId] ?? [] : [])
    .filter(id => !RESERVE.has(id))
    .map(id => ITEMS_BY_ID.get(id))
    .filter((item): item is Item => item !== undefined)
}
