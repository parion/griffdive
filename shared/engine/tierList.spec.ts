import { describe, expect, it } from 'vitest'
import { ALL_ITEMS, ALL_WARBOND_CODES, ITEMS_BY_ID } from '../data/catalog'
import type { Tier } from '../data/types'
import { TIER_LIST_NAME_MAX } from './config'
import { createDiveState, reduce } from './reducer'
import { itemPrice } from './rewards'
import { createLobbyState, forkCrusade, joinDiver } from './room'
import { bargainShelfFor, diverOptions } from './selectors'
import { rollSupportKit } from './support'
import {
  decodeTierList,
  encodeTierList,
  normalizeTierList,
  sameTierList,
  tierCounts,
  tierOf,
  tieredCatalog,
  tieredItem,
  tierListMoves,
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
  it('keeps real overrides and drops unknown ids, bad tiers and no-op moves', () => {
    const [first, second] = ALL_ITEMS
    const moved: Tier = first!.tier === 's' ? 'c' : 's'
    const list = normalizeTierList({
      name: '  Meta   check  ',
      tiers: { [first!.id]: moved, [second!.id]: second!.tier, ghostGun: 's', [ALL_ITEMS[2]!.id]: 'd' },
    })
    expect(list).toEqual({ name: 'Meta check', tiers: { [first!.id]: moved } })
  })

  it('treats a list that moves nothing as no list', () => {
    expect(normalizeTierList({ name: 'Default', tiers: {} })).toBeNull()
    expect(normalizeTierList({ name: 'Default', tiers: { [ALL_ITEMS[0]!.id]: ALL_ITEMS[0]!.tier } })).toBeNull()
    expect(normalizeTierList(null)).toBeNull()
    expect(normalizeTierList('GD1:x:s=a')).toBeNull()
  })

  it('names an unnamed list and caps a long name', () => {
    const id = ALL_ITEMS.find(item => item.tier !== 's')!.id
    expect(normalizeTierList({ name: '', tiers: { [id]: 's' } })!.name).toBe('Custom tiers')
    expect(normalizeTierList({ name: 'x'.repeat(200), tiers: { [id]: 's' } })!.name).toHaveLength(TIER_LIST_NAME_MAX)
  })
})

describe('tieredCatalog', () => {
  it('re-tiers only the listed items and leaves the catalog untouched', () => {
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

describe('share codes', () => {
  it('round-trips a list, raw or percent-encoded inside a link', () => {
    const items = ALL_ITEMS.filter(item => item.tier !== 'a').slice(0, 12)
    const list = normalizeTierList({ name: 'Squad: Night Ops', tiers: Object.fromEntries(items.map(item => [item.id, 'a'])) })!
    const code = encodeTierList(list)
    expect(code.startsWith('GD1:')).toBe(true)
    expect(decodeTierList(code)).toEqual(list)
    expect(decodeTierList(`https://griffdive.example/tiers#${encodeURIComponent(code)}`)).toEqual(list)
    expect(decodeTierList(`  ${code}\n`)).toEqual(list)
  })

  it('refuses junk and drops ids the catalog no longer knows', () => {
    expect(decodeTierList('')).toBeNull()
    expect(decodeTierList('not a code')).toBeNull()
    expect(decodeTierList('%E0%A4%A')).toBeNull()
    const item = ALL_ITEMS.find(entry => entry.tier !== 's')!
    expect(decodeTierList(`GD1:Old:s=retiredGun,${item.id}`)).toEqual({ name: 'Old', tiers: { [item.id]: 's' } })
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

  it('leaves a crusade without a list on the community defaults', () => {
    const state = rewardsState(null)
    expect(state.tierList).toBeNull()
    for (const option of diverOptions(state, state.divers[0]!)) {
      expect(option.item).toBe(ITEMS_BY_ID.get(option.item.id))
    }
  })
})

describe('tierListMoves and sameTierList', () => {
  it('lists each move once, best destination first', () => {
    const c = ALL_ITEMS.find(item => item.tier === 'c')!
    const s = ALL_ITEMS.find(item => item.tier === 's')!
    const list = normalizeTierList({ name: 'Swap', tiers: { [c.id]: 's', [s.id]: 'c' } })!
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
