import { ALL_ITEMS, ITEMS_BY_ID, TIER_RANK } from '../data/catalog'
import { TIER_SLOTS } from '../data/tierSlots'
import type { Item, Tier } from '../data/types'
import { TIER_LIST_NAME_MAX } from './config'
import type { DiveState } from './types'

// A tier list: a whole re-tiering of the catalog, standing on its own — every
// item it rates is stored, whatever the default tiers say. The host's list is
// frozen into the crusade at launch. An item the list never rated (one added
// to the catalog after it was made) plays at its catalog tier until rated.
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
// dropped. A list that rates nothing is no list — the crusade plays the
// default tiers.
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
    if (ITEMS_BY_ID.has(id) && isTier(tier)) {
      clean[id] = tier
    }
  }
  if (Object.keys(clean).length === 0) {
    return null
  }
  return { name: cleanTierListName(name), tiers: clean }
}

// The default tiers written out as a list of their own: where a new list
// starts. A copy, not a parent — editing it never refers back.
export function defaultTierList(name: string): TierList {
  return { name: cleanTierListName(name), tiers: Object.fromEntries(ALL_ITEMS.map(item => [item.id, item.tier])) }
}

export function tierListFromGroups(name: string, groups: Readonly<Partial<Record<Tier, readonly string[]>>>): TierList | null {
  const tiers: Record<string, string> = {}
  for (const tier of TIERS) {
    for (const id of groups[tier] ?? []) {
      tiers[id] = tier
    }
  }
  return normalizeTierList({ name, tiers })
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

export function isUnrated(item: Item, list: TierList | null | undefined): boolean {
  return !!list && list.tiers[item.id] === undefined
}

export function unratedItems(list: TierList | null | undefined): Item[] {
  return list ? ALL_ITEMS.filter(item => list.tiers[item.id] === undefined) : []
}

export function tierCounts(list: TierList | null | undefined): Record<Tier, number> {
  const counts: Record<Tier, number> = { s: 0, a: 0, b: 0, c: 0 }
  for (const item of tieredCatalog(list).items) {
    counts[item.tier]++
  }
  return counts
}

// Share codes carry a whole list in a link with no server. Each item is
// addressed by its permanent slot (shared/data/tierSlots.ts) and takes one of
// five values (unrated, C, B, A, S); two slots share one base64url letter, so
// any list — however different from the default — is about 125 letters plus
// its name: `GD2.<slots>.<name>`. A slot this build doesn't know (a code from
// a newer catalog) is skipped; a slot past the code's end is unrated.
const SHARE_PREFIX = 'GD2.'
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
const SLOT_VALUES: readonly (Tier | null)[] = [null, 'c', 'b', 'a', 's']
const SLOT_VALUE = new Map(SLOT_VALUES.map((tier, value) => [tier, value]))

export function encodeTierList(list: TierList): string {
  const values = TIER_SLOTS.map(id => SLOT_VALUE.get(list.tiers[id] ?? null) ?? 0)
  let slots = ''
  for (let i = 0; i < values.length; i += 2) {
    slots += ALPHABET[values[i]! * SLOT_VALUES.length + (values[i + 1] ?? 0)]
  }
  return `${SHARE_PREFIX}${slots}.${encodeURIComponent(list.name)}`
}

function decodeShareCode(text: string): TierList | null {
  const start = text.indexOf(SHARE_PREFIX)
  if (start < 0) {
    return null
  }
  const code = text.slice(start + SHARE_PREFIX.length).split(/\s/)[0]!
  const dot = code.indexOf('.')
  const slots = dot < 0 ? code : code.slice(0, dot)
  const encodedName = dot < 0 ? '' : code.slice(dot + 1)
  let name: string
  try {
    name = decodeURIComponent(encodedName)
  }
  catch {
    name = encodedName
  }
  const tiers: Record<string, Tier> = {}
  for (let i = 0; i < slots.length; i++) {
    const pair = ALPHABET.indexOf(slots[i]!)
    if (pair < 0 || pair >= SLOT_VALUES.length ** 2) {
      return null
    }
    const values = [Math.floor(pair / SLOT_VALUES.length), pair % SLOT_VALUES.length]
    values.forEach((value, offset) => {
      const id = TIER_SLOTS[i * 2 + offset]
      const tier = SLOT_VALUES[value]
      if (id && tier) {
        tiers[id] = tier
      }
    })
  }
  return normalizeTierList({ name, tiers })
}

// The file format: readable and hand-editable — move an id from one tier's
// array to another. Ids are listed in catalog order within each tier.
const JSON_FORMAT = 'griffdive-tier-list'

export function tierListToJson(list: TierList): string {
  const groups = Object.fromEntries(TIERS.map(tier => [
    tier,
    ALL_ITEMS.filter(item => list.tiers[item.id] === tier).map(item => item.id),
  ]))
  return `${JSON.stringify({ format: JSON_FORMAT, version: 1, name: list.name, tiers: groups }, null, 2)}\n`
}

function decodeJson(text: string): TierList | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  }
  catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object') {
    return null
  }
  const { name, tiers } = parsed as { name?: unknown, tiers?: unknown }
  if (!tiers || typeof tiers !== 'object') {
    return null
  }
  const entries = Object.entries(tiers)
  // Grouped by tier (the export) or keyed by item id (the stored shape).
  if (entries.every(([key, value]) => isTier(key) && Array.isArray(value))) {
    const groups = Object.fromEntries(entries.map(([tier, ids]) =>
      [tier, (ids as unknown[]).filter((id): id is string => typeof id === 'string')]))
    return tierListFromGroups(typeof name === 'string' ? name : '', groups)
  }
  return normalizeTierList({ name, tiers })
}

// Import takes whatever a diver pastes: a share link, a bare code, or the
// JSON export.
export function parseTierList(raw: string): TierList | null {
  const text = raw.trim()
  if (text.startsWith('{')) {
    return decodeJson(text)
  }
  if (text.includes(SHARE_PREFIX)) {
    return decodeShareCode(text)
  }
  try {
    const decoded = decodeURIComponent(text)
    return decoded.includes(SHARE_PREFIX) ? decodeShareCode(decoded) : null
  }
  catch {
    return null
  }
}

export interface TierMove {
  item: Item
  from: Tier
  to: Tier
}

// Where a list parts ways with the default tiers, best destination first: a
// comparison for divers who know the default by heart, not the list itself.
export function tierListMoves(list: TierList | null | undefined): TierMove[] {
  if (!list) {
    return []
  }
  return ALL_ITEMS
    .flatMap((item) => {
      const to = list.tiers[item.id]
      return to && to !== item.tier ? [{ item, from: item.tier, to }] : []
    })
    .sort((a, b) =>
      TIER_RANK[b.to] - TIER_RANK[a.to]
      || TIER_RANK[b.from] - TIER_RANK[a.from]
      || a.item.displayName.localeCompare(b.item.displayName))
}

function canonical(list: TierList): string {
  return `${list.name}\n${Object.keys(list.tiers).sort().map(id => `${id}=${list.tiers[id]}`).join(',')}`
}

export function sameTierList(a: TierList | null | undefined, b: TierList | null | undefined): boolean {
  if (!a || !b) {
    return !a && !b
  }
  return canonical(a) === canonical(b)
}
