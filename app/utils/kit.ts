import { ITEMS_BY_ID } from '~~/shared/data/catalog'
import type { Item, ItemCategory } from '~~/shared/data/types'
import type { SupportRolls } from '~~/shared/engine/config'
import { startingItemIds } from '~~/shared/engine/progression'
import type { DiveState } from '~~/shared/engine/types'

export type KitSectionId = 'primary' | 'secondary' | 'throwables' | 'armor' | 'boosters' | 'eagle' | 'orbital' | 'supply' | 'defense'

// gear: transparent weapon renders, shown in a lit well. icon: the square
// in-game icons (stratagems, armor passives, boosters) that carry their own frame.
export type KitArt = 'gear' | 'icon'

export interface KitSectionDef {
  id: KitSectionId
  label: string
  nav: string
  accent: string
  art: KitArt
}

export const KIT_SECTIONS: readonly KitSectionDef[] = [
  { id: 'primary', label: 'Primary', nav: 'Primary', accent: 'var(--cat-primary)', art: 'gear' },
  { id: 'secondary', label: 'Secondary', nav: 'Secondary', accent: 'var(--cat-gear)', art: 'gear' },
  { id: 'throwables', label: 'Throwables', nav: 'Throwables', accent: 'var(--cat-gear)', art: 'gear' },
  { id: 'armor', label: 'Armor passives', nav: 'Armor', accent: 'var(--cat-armor)', art: 'icon' },
  { id: 'boosters', label: 'Boosters', nav: 'Boosters', accent: 'var(--cat-booster)', art: 'icon' },
  { id: 'eagle', label: 'Eagle stratagems', nav: 'Eagle', accent: 'var(--cat-eagle)', art: 'icon' },
  { id: 'orbital', label: 'Orbital stratagems', nav: 'Orbital', accent: 'var(--red)', art: 'icon' },
  { id: 'supply', label: 'Supply stratagems', nav: 'Supply', accent: 'var(--cat-supply)', art: 'icon' },
  { id: 'defense', label: 'Defense stratagems', nav: 'Defense', accent: 'var(--cat-defense)', art: 'icon' },
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
// outside the variant's starting kit and the support pack they were dealt.
export function earnedKitItems(state: DiveState, diverId: string | null): Item[] {
  const items = ownedKitItems(state, diverId)
  if (!state.settings) {
    return items
  }
  const support = state.divers.find(diver => diver.id === diverId)?.supportKit ?? []
  const starting = new Set([...startingItemIds(state.settings.variant), ...support])
  return items.filter(item => !starting.has(item.id))
}

// How an issued kit reads at a glance: stratagems, weapons, armor, boosters.
const KIT_GROUPS: readonly { label: string, categories: readonly ItemCategory[] }[] = [
  { label: 'Stratagems', categories: ['Supply', 'Eagle', 'Orbital', 'Defense'] },
  { label: 'Weapons', categories: ['primary', 'secondary', 'throwable'] },
  { label: 'Armor', categories: ['armorPassive'] },
  { label: 'Boosters', categories: ['booster'] },
]

export interface KitGroup {
  label: string
  items: Item[]
}

export function kitGroups(itemIds: readonly string[]): KitGroup[] {
  const items = itemIds
    .map(id => ITEMS_BY_ID.get(id))
    .filter((item): item is Item => !!item)
  return KIT_GROUPS
    .map(group => ({ label: group.label, items: items.filter(item => group.categories.includes(item.category)) }))
    .filter(group => group.items.length > 0)
}

const SUPPORT_ROLL_LABELS: Readonly<Record<keyof SupportRolls, readonly [string, string]>> = {
  primary: ['primary', 'primaries'],
  secondary: ['secondary', 'secondaries'],
  throwable: ['throwable', 'throwables'],
  stratagem: ['stratagem', 'stratagems'],
  armorPassive: ['armor passive', 'armor passives'],
  booster: ['booster', 'boosters'],
}

// The SEAF package as a recipe — "2 primaries, 1 secondary, …" — for the screens
// that describe it before a diver's own pack exists.
export function supportRollList(rolls: SupportRolls): string[] {
  return (Object.keys(SUPPORT_ROLL_LABELS) as (keyof SupportRolls)[])
    .filter(kind => rolls[kind] > 0)
    .map(kind => `${rolls[kind]} ${SUPPORT_ROLL_LABELS[kind][rolls[kind] === 1 ? 0 : 1]}`)
}
