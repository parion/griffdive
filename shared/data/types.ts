export type Tier = 'c' | 'b' | 'a' | 's'

// How a wheel rule can be verified in Helldivers 2: the pre-dive loadout
// screen, live in the mission, or the end-of-mission stats screen.
export type Accountability = 'loadout' | 'field' | 'stats'

export type EquipmentCategory
  = | 'primary'
    | 'secondary'
    | 'throwable'
    | 'booster'
    | 'armor'
    | 'armorPassive'

export type StratagemCategory = 'Supply' | 'Eagle' | 'Orbital' | 'Defense'

export type ItemCategory = EquipmentCategory | StratagemCategory

export type ItemType = 'equipment' | 'stratagem'

export interface Item {
  id: string
  displayName: string
  type: ItemType
  category: ItemCategory
  tags: string[]
  warbondCode: string
  tier: Tier
  antitank?: boolean
  index?: number
  imageURL?: string
  armorRating?: number
  speed?: number
  stamina?: number
  passive?: string
}

export interface Warbond {
  code: string
  displayName: string
  internalName?: string
  imageURL?: string
  tier?: Tier
}
