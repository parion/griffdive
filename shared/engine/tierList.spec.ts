import { describe, expect, it } from 'vitest'
import { ALL_ITEMS, ALL_WARBOND_CODES, ITEMS_BY_ID } from '../data/catalog'
import { TIER_LIST_PRESETS } from '../data/tierLists'
import { TIER_SLOTS } from '../data/tierSlots'
import type { Tier } from '../data/types'
import { TIER_LIST_NAME_MAX } from './config'
import { createDiveState, reduce } from './reducer'
import { itemPrice } from './rewards'
import { createLobbyState, forkCrusade, joinDiver } from './room'
import { bargainShelfFor, diverOptions } from './selectors'
import { rollSupportKit } from './support'
import {
  defaultTierList,
  encodeTierList,
  isUnrated,
  normalizeTierList,
  parseTierList,
  sameTierList,
  tierCounts,
  tierListFromGroups,
  tierListMoves,
  tierListToJson,
  tierOf,
  tieredCatalog,
  tieredItem,
  unratedItems,
} from './tierList'
import type { TierList } from './tierList'
import type { DiveState } from './types'

const SETTINGS = { variant: 'medium' as const }

function everything(tier: Tier, name = 'All in'): TierList {
  return normalizeTierList({ name, tiers: Object.fromEntries(ALL_ITEMS.map(item => [item.id, tier])) })!
}

function rewardsState(tierList: TierList | null): DiveState {
  let state = createDiveState(SETTINGS, 'p1', 'Griffin', undefined, 7, null, tierList)
  state = reduce(state, { type: 'SPIN_WHEEL', seed: 42 })
  state = reduce(state, { type: 'ACCEPT_MISFORTUNE', accepted: false })
  if (state.phase === 'strain') {
    state = reduce(state, { type: 'ACCEPT_STRAIN', accepted: false })
  }
  state = reduce(state, { type: 'DEAL_PACTS' })
  state = reduce(state, { type: 'SET_PACTS', playerId: 'p1', pactIds: [] })
  return reduce(state, { type: 'REPORT_RESULT', outcome: 'success', stars: 5, timePct: 100 })
}

describe('normalizeTierList', () => {
  it('keeps every rating, even ones that match the default, and drops unknown ids and bad tiers', () => {
    const [first, second, third] = ALL_ITEMS
    const moved: Tier = first!.tier === 's' ? 'c' : 's'
    const list = normalizeTierList({
      name: '  Meta   check  ',
      tiers: { [first!.id]: moved, [second!.id]: second!.tier, ghostGun: 's', [third!.id]: 'd' },
    })
    expect(list).toEqual({ name: 'Meta check', tiers: { [first!.id]: moved, [second!.id]: second!.tier } })
  })

  it('treats a list that rates nothing as no list', () => {
    expect(normalizeTierList({ name: 'Empty', tiers: {} })).toBeNull()
    expect(normalizeTierList(null)).toBeNull()
    expect(normalizeTierList('GD2.AAAA.x')).toBeNull()
  })

  it('names an unnamed list and caps a long name', () => {
    const id = ALL_ITEMS[0]!.id
    expect(normalizeTierList({ name: '', tiers: { [id]: 's' } })!.name).toBe('Custom tiers')
    expect(normalizeTierList({ name: 'x'.repeat(200), tiers: { [id]: 's' } })!.name).toHaveLength(TIER_LIST_NAME_MAX)
  })
})

describe('a list stands on its own', () => {
  it('starts a new list as a full copy of the default tiers', () => {
    const list = defaultTierList('Fresh')
    expect(Object.keys(list.tiers)).toHaveLength(ALL_ITEMS.length)
    expect(unratedItems(list)).toEqual([])
    expect(tierListMoves(list)).toEqual([])
  })

  it('plays an item it never rated at the catalog tier, flagged unrated', () => {
    const [rated, missing] = ALL_ITEMS
    const list = normalizeTierList({ name: 'Partial', tiers: { [rated!.id]: 's' } })!
    expect(tierOf(missing!, list)).toBe(missing!.tier)
    expect(isUnrated(missing!, list)).toBe(true)
    expect(isUnrated(rated!, list)).toBe(false)
    expect(unratedItems(list)).toHaveLength(ALL_ITEMS.length - 1)
  })

  it('writes every featured list out in full, never as edits to the default', () => {
    for (const preset of TIER_LIST_PRESETS) {
      const list = tierListFromGroups(preset.name, preset.tiers)!
      expect(unratedItems(list)).toEqual([])
    }
  })
})

describe('tieredCatalog', () => {
  it('re-tiers the listed items and leaves the catalog untouched', () => {
    const item = ALL_ITEMS.find(entry => entry.tier === 'c')!
    const list = normalizeTierList({ name: 'Bump', tiers: { [item.id]: 's' } })!
    expect(tieredItem(item.id, list)!.tier).toBe('s')
    expect(tierOf(item, list)).toBe('s')
    expect(ITEMS_BY_ID.get(item.id)!.tier).toBe('c')
    const other = ALL_ITEMS.find(entry => entry.id !== item.id)!
    expect(tieredItem(other.id, list)).toBe(other)
  })

  it('resolves a list once and serves the default catalog without one', () => {
    const list = everything('b')
    expect(tieredCatalog(list)).toBe(tieredCatalog(list))
    expect(tieredCatalog(null).items).toBe(ALL_ITEMS)
    expect(tierCounts(list)).toEqual({ s: 0, a: 0, b: ALL_ITEMS.length, c: 0 })
  })
})

describe('the slot registry', () => {
  it('gives every catalog item one permanent slot', () => {
    expect(new Set(TIER_SLOTS).size).toBe(TIER_SLOTS.length)
    const slotted = new Set(TIER_SLOTS)
    expect(ALL_ITEMS.filter(item => !slotted.has(item.id)).map(item => item.id)).toEqual([])
  })

  // Codes already shared address items by position: the head of the registry
  // must never move. Extend this pin, never rewrite it.
  it('keeps the slots codes were first shared with', () => {
    expect(TIER_SLOTS.slice(0, 4)).toEqual(['ar23liberator', 'ar23pliberatorpenetrator', 'ar23cliberatorconcussive', 'ar23aliberatorcarbine'])
    expect(TIER_SLOTS[249]).toBe('amw20apex')
  })
})

describe('share codes', () => {
  it('fits any whole list in about 130 characters', () => {
    const underdog = TIER_LIST_PRESETS.find(preset => preset.id === 'underdog')!
    const list = tierListFromGroups('Underdog', underdog.tiers)!
    const code = encodeTierList(list)
    expect(code.startsWith('GD2.')).toBe(true)
    expect(code.length).toBeLessThan(140)
    expect(parseTierList(code)).toEqual(list)
  })

  it('round-trips a list raw or inside a link', () => {
    const list = normalizeTierList({ name: 'Squad: 100% Night.Ops', tiers: defaultTierList('x').tiers })!
    const code = encodeTierList(list)
    expect(parseTierList(code)).toEqual(list)
    expect(parseTierList(`https://griffdive.example/tiers#${code}`)).toEqual(list)
    expect(parseTierList(`  ${code}\n`)).toEqual(list)
  })

  it('keeps unrated items unrated', () => {
    const [first] = ALL_ITEMS
    const list = normalizeTierList({ name: 'One', tiers: { [first!.id]: 'a' } })!
    expect(parseTierList(encodeTierList(list))).toEqual(list)
  })

  it('reads a code from a newer catalog, skipping slots it doesn\'t know', () => {
    const list = everything('a', 'Future')
    const [head, slots, name] = encodeTierList(list).split('.')
    expect(parseTierList(`${head}.${slots}${'Y'.repeat(8)}.${name}`)).toEqual(list)
  })

  it('refuses junk', () => {
    expect(parseTierList('')).toBeNull()
    expect(parseTierList('not a code')).toBeNull()
    expect(parseTierList('%E0%A4%A')).toBeNull()
    expect(parseTierList('GD2.!!!.Bad')).toBeNull()
  })
})

describe('JSON files', () => {
  it('round-trips a list through its export', () => {
    const list = everything('c', 'Scrap heap')
    const json = tierListToJson(list)
    expect(JSON.parse(json)).toMatchObject({ format: 'griffdive-tier-list', version: 1, name: 'Scrap heap' })
    expect(parseTierList(json)).toEqual(list)
  })

  it('reads a hand-edited file: tiers grouped by letter, unknown ids dropped', () => {
    const [first, second] = ALL_ITEMS
    const json = JSON.stringify({ name: 'Hand made', tiers: { s: [first!.id, 'ghostGun'], c: [second!.id] } })
    expect(parseTierList(json)).toEqual({ name: 'Hand made', tiers: { [first!.id]: 's', [second!.id]: 'c' } })
  })

  it('also reads the stored shape, keyed by item', () => {
    const list = everything('b', 'Stored')
    expect(parseTierList(JSON.stringify(list))).toEqual(list)
  })

  it('refuses broken JSON', () => {
    expect(parseTierList('{ "tiers": ')).toBeNull()
    expect(parseTierList('{ "name": "No tiers" }')).toBeNull()
  })
})

describe('SET_TIER_LIST', () => {
  const list = everything('s', 'Gold rush')

  it('sets and clears the list in the lobby, then freezes it at launch', () => {
    const lobby = joinDiver(createLobbyState(), 'p1', 'Griffin')!
    const set = reduce(lobby, { type: 'SET_TIER_LIST', tierList: list })
    expect(set.tierList).toEqual(list)
    expect(reduce(set, { type: 'SET_TIER_LIST', tierList: null }).tierList).toBeNull()
    expect(reduce(lobby, { type: 'SET_TIER_LIST', tierList: null })).toBe(lobby)

    const launched = reduce(set, { type: 'START_DIVE', settings: SETTINGS, seed: 1 })
    expect(launched.tierList).toEqual(list)
    expect(reduce(launched, { type: 'SET_TIER_LIST', tierList: null })).toBe(launched)
  })

  it('normalizes what it stores, so a raw payload never reaches the snapshot', () => {
    const lobby = joinDiver(createLobbyState(), 'p1', 'Griffin')!
    const raw = { name: 'Raw', tiers: { ghostGun: 's', [ALL_ITEMS[0]!.id]: 'q' } } as unknown as TierList
    expect(reduce(lobby, { type: 'SET_TIER_LIST', tierList: raw })).toBe(lobby)
  })
})

describe('a crusade under a custom tier list', () => {
  it('rolls every reward option at the list\'s tiers', () => {
    const state = rewardsState(everything('c', 'Scrap heap'))
    const options = diverOptions(state, state.divers[0]!)
    expect(options.length).toBeGreaterThan(0)
    for (const option of options) {
      expect(option.item.tier).toBe('c')
    }
  })

  it('stocks and prices Brasch\'s shelf at the list\'s tiers', () => {
    const scrap = createDiveState(SETTINGS, 'p1', 'Griffin', undefined, 7, null, everything('c'))
    const gold = createDiveState(SETTINGS, 'p1', 'Griffin', undefined, 7, null, everything('s'))
    const cheap = bargainShelfFor(scrap, scrap.divers[0]!).flatMap(slot => slot.item ?? [])
    const dear = bargainShelfFor(gold, gold.divers[0]!).flatMap(slot => slot.item ?? [])
    expect(cheap.every(item => item.tier === 'c')).toBe(true)
    expect(dear.every(item => item.tier === 's')).toBe(true)
    expect(Math.max(...cheap.map(itemPrice))).toBeLessThan(Math.min(...dear.map(itemPrice)))
  })

  it('deals the SEAF Support Package from the list\'s support tier', () => {
    const list = everything('b')
    const kit = rollSupportKit({ variant: 'suicide', mode: 'seaf' }, 'p1', ALL_WARBOND_CODES, list)
    const defaultKit = rollSupportKit({ variant: 'suicide', mode: 'seaf' }, 'p1', ALL_WARBOND_CODES)
    expect(kit.length).toBe(defaultKit.length)
    expect(kit).not.toEqual(defaultKit)
  })

  it('carries the list into a forked session', () => {
    const list = everything('a')
    const state = createDiveState(SETTINGS, 'p1', 'Griffin', undefined, 7, null, list)
    expect(forkCrusade(state, 'p1')!.tierList).toEqual(list)
    expect(forkCrusade({ ...state, tierList: undefined }, 'p1')!.tierList).toBeNull()
  })

  it('leaves a crusade without a list on the default tiers', () => {
    const state = rewardsState(null)
    expect(state.tierList).toBeNull()
    for (const option of diverOptions(state, state.divers[0]!)) {
      expect(option.item).toBe(ITEMS_BY_ID.get(option.item.id))
    }
  })
})

describe('tierListMoves and sameTierList', () => {
  it('compares a list with the default tiers, best destination first', () => {
    const c = ALL_ITEMS.find(item => item.tier === 'c')!
    const s = ALL_ITEMS.find(item => item.tier === 's')!
    const list = normalizeTierList({ name: 'Swap', tiers: { ...defaultTierList('x').tiers, [c.id]: 's', [s.id]: 'c' } })!
    expect(tierListMoves(list).map(move => [move.item.id, move.from, move.to])).toEqual([[c.id, 'c', 's'], [s.id, 's', 'c']])
    expect(tierListMoves(null)).toEqual([])
  })

  it('compares lists by content, name included', () => {
    const a = everything('b', 'One')
    expect(sameTierList(a, everything('b', 'One'))).toBe(true)
    expect(sameTierList(a, everything('b', 'Two'))).toBe(false)
    expect(sameTierList(null, undefined)).toBe(true)
    expect(sameTierList(a, null)).toBe(false)
  })
})
