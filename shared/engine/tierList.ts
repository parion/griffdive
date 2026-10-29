import { ALL_ITEMS, ITEMS_BY_ID, TIER_RANK } from '../data/catalog'
import type { Item, Tier } from '../data/types'
import { TIER_LIST_NAME_MAX } from './config'
import type { DiveState } from './types'

// A custom tier list: the host's re-tiering of the catalog, frozen into the
// crusade at launch. Sparse — only items moved off their community default are
// stored — so a list stays small in every snapshot, and an item added to the
// catalog later simply keeps its default tier.
export interface TierList {
  name: string
  tiers: Record<string, Tier>
}

export interface TieredCatalog {
  items: readonly Item[]
  byId: ReadonlyMap<string, Item>
}

export const TIERS: readonly Tier[] = ['s', 'a', 'b', 'c']

const DEFAULT_CATALOG: TieredCatalog = { items: ALL_ITEMS, byId: ITEMS_BY_ID }

// Pools are rebuilt on every selector call; the resolved catalog is cached
// per list object so a frozen crusade list is mapped once, not per roll.
const resolved = new WeakMap<TierList, TieredCatalog>()

function isTier(value: unknown): value is Tier {
  return typeof value === 'string' && value in TIER_RANK
}

export function cleanTierListName(name: unknown): string {
  const trimmed = typeof name === 'string' ? name.replace(/\s+/g, ' ').trim() : ''
  return trimmed.slice(0, TIER_LIST_NAME_MAX) || 'Custom tiers'
}

// The only door into the engine for a list: unknown ids and non-tiers are
// dropped, and an override equal to the default is no override at all. A list
// that changes nothing is no list — the crusade plays the community default.
export function normalizeTierList(raw: unknown): TierList | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }
  const { name, tiers } = raw as Partial<TierList>
  if (!tiers || typeof tiers !== 'object') {
    return null
  }
  const clean: Record<string, Tier> = {}
  for (const [id, tier] of Object.entries(tiers)) {
    const item = ITEMS_BY_ID.get(id)
    if (item && isTier(tier) && tier !== item.tier) {
      clean[id] = tier
    }
  }
  if (Object.keys(clean).length === 0) {
    return null
  }
  return { name: cleanTierListName(name), tiers: clean }
}

export function tierListOf(state: Pick<DiveState, 'tierList'>): TierList | null {
  return state.tierList ?? null
}

export function tierOf(item: Item, list: TierList | null | undefined): Tier {
  return list?.tiers[item.id] ?? item.tier
}

export function tieredCatalog(list: TierList | null | undefined): TieredCatalog {
  if (!list) {
    return DEFAULT_CATALOG
  }
  const cached = resolved.get(list)
  if (cached) {
    return cached
  }
  const items = ALL_ITEMS.map((item) => {
    const tier = list.tiers[item.id]
    return tier && tier !== item.tier ? { ...item, tier } : item
  })
  const catalog = { items, byId: new Map(items.map(item => [item.id, item])) }
  resolved.set(list, catalog)
  return catalog
}

export function tieredItem(id: string, list: TierList | null | undefined): Item | undefined {
  return tieredCatalog(list).byId.get(id)
}

export function tierListChangeCount(list: TierList | null | undefined): number {
  return list ? Object.keys(list.tiers).length : 0
}

export function isRetiered(item: Item, list: TierList | null | undefined): boolean {
  const tier = list?.tiers[item.id]
  return tier !== undefined && tier !== ITEMS_BY_ID.get(item.id)?.tier
}

export function tierCounts(list: TierList | null | undefined): Record<Tier, number> {
  const counts: Record<Tier, number> = { s: 0, a: 0, b: 0, c: 0 }
  for (const item of tieredCatalog(list).items) {
    counts[item.tier]++
  }
  return counts
}

// Share codes carry a list between browsers with no server: plain text, safe
// in a URL fragment once percent-encoded, and keyed by item id so a code
// outlives catalog refreshes (an id the catalog no longer knows is dropped).
const SHARE_PREFIX = 'GD1'

export function encodeTierList(list: TierList): string {
  const groups = TIERS
    .map(tier => [tier, Object.keys(list.tiers).filter(id => list.tiers[id] === tier).sort()] as const)
    .filter(([, ids]) => ids.length > 0)
    .map(([tier, ids]) => `${tier}=${ids.join(',')}`)
  return `${SHARE_PREFIX}:${encodeURIComponent(list.name)}:${groups.join(';')}`
}

export function decodeTierList(raw: string): TierList | null {
  let text = raw.trim()
  if (!text.includes(`${SHARE_PREFIX}:`)) {
    try {
      text = decodeURIComponent(text)
    }
    catch {
      return null
    }
  }
  const start = text.indexOf(`${SHARE_PREFIX}:`)
  if (start < 0) {
    return null
  }
  const [, encodedName = '', body = ''] = text.slice(start).split(/\s/)[0]!.split(':')
  let name: string
  try {
    name = decodeURIComponent(encodedName)
  }
  catch {
    return null
  }
  const tiers: Record<string, string> = {}
  for (const group of body.split(';')) {
    const [tier, ids = ''] = group.split('=')
    for (const id of ids.split(',')) {
      if (id) {
        tiers[id] = tier ?? ''
      }
    }
  }
  return normalizeTierList({ name, tiers })
}

export interface TierMove {
  item: Item
  from: Tier
  to: Tier
}

// What a list changes, best destination first: the squad reads a list as
// "what got better, what got worse", not as 241 rows.
export function tierListMoves(list: TierList | null | undefined): TierMove[] {
  if (!list) {
    return []
  }
  return ALL_ITEMS
    .flatMap(item => (list.tiers[item.id] ? [{ item, from: item.tier, to: list.tiers[item.id]! }] : []))
    .sort((a, b) =>
      TIER_RANK[b.to] - TIER_RANK[a.to]
      || TIER_RANK[b.from] - TIER_RANK[a.from]
      || a.item.displayName.localeCompare(b.item.displayName))
}

export function sameTierList(a: TierList | null | undefined, b: TierList | null | undefined): boolean {
  if (!a || !b) {
    return !a && !b
  }
  return encodeTierList(a) === encodeTierList(b)
}
