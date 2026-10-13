import { describe, expect, it } from 'vitest'
import { ALL_WARBOND_CODES } from '../data/catalog'
import { startingItemIds } from './progression'
import { createLobbyState, forkCrusade, joinDiver, seatingBlocked } from './room'
import { createDiveState, reduce } from './reducer'
import { catchUpOptionsFor } from './selectors'
import type { DiveState } from './types'

describe('createLobbyState', () => {
  it('is an empty, unconfigured lobby', () => {
    const state = createLobbyState()
    expect(state.phase).toBe('lobby')
    expect(state.settings).toBeNull()
    expect(state.divers).toEqual([])
    expect(state.hostId).toBeNull()
    expect(state.personalInventories).toEqual({})
  })
})

describe('joinDiver', () => {
  it('makes the first joiner host and seats up to four divers', () => {
    let state = createLobbyState()
    state = joinDiver(state, 'p1', 'Griffin')!
    expect(state.hostId).toBe('p1')
    expect(state.divers[0]?.isHost).toBe(true)
    state = joinDiver(state, 'p2', 'Two')!
    state = joinDiver(state, 'p3', 'Three')!
    state = joinDiver(state, 'p4', 'Four')!
    expect(state.divers).toHaveLength(4)
    expect(state.divers.every(diver => !diver.isHost || diver.id === 'p1')).toBe(true)
    expect(joinDiver(state, 'p5', 'Five')).toBeNull()
  })

  it('is idempotent for a known playerId (reconnect)', () => {
    let state = createLobbyState()
    state = joinDiver(state, 'p1', 'Griffin')!
    expect(joinDiver(state, 'p1', 'Griffin')).toBe(state)
  })

  it('grants the full personal kit to late joiners of a started dive', () => {
    let state = createDiveState({ variant: 'medium' }, 'p1', 'Griffin')
    state = joinDiver(state, 'late', 'Latecomer')!
    expect(state.personalInventories.late).toEqual(startingItemIds('medium'))
  })

  it('owes a mid-crusade joiner one catch-up pick per operation behind, capped', () => {
    // Standard starts at 3; driving the difficulty to 7 leaves 4 ops behind,
    // which is exactly the catch-up cap.
    let state = createDiveState({ variant: 'medium' }, 'p1', 'Griffin')
    state = reduce(state, { type: 'SPIN_WHEEL', seed: 11 })
    state = { ...state, difficulty: 7, missionIndex: 10, phase: 'spin', wheel: null }
    state = joinDiver(state, 'late', 'Latecomer')!
    expect(state.divers.find(diver => diver.id === 'late')?.catchUpGranted).toBe(4)
    expect(state.divers.find(diver => diver.id === 'late')?.catchUpOwed).toBe(4)
  })

  it('owes nothing to joiners at the variant start difficulty or in the lobby', () => {
    let state = createDiveState({ variant: 'medium' }, 'p1', 'Griffin')
    state = reduce(state, { type: 'SPIN_WHEEL', seed: 11 })
    state = { ...state, wheel: null, phase: 'spin' }
    state = joinDiver(state, 'ontime', 'On Time')!
    expect(state.divers.find(diver => diver.id === 'ontime')?.catchUpOwed).toBe(0)
    const lobby = joinDiver(createLobbyState(), 'p1', 'Griffin')!
    expect(lobby.divers[0]?.catchUpOwed).toBe(0)
  })

  it('restores a departed diver\u2019s parked cache when they rejoin', () => {
    let state = joinDiver(joinDiver(createLobbyState(), 'p1', 'Griffin')!, 'p2', 'Two')!
    state = reduce(state, { type: 'START_DIVE', settings: { variant: 'medium' } })
    state = { ...state, personalInventories: { ...state.personalInventories, p1: [...state.personalInventories.p1!, 'uavrecon'] } }
    state = reduce(state, { type: 'LEAVE_DIVE', playerId: 'p1' })
    expect(state.legacyCaches.p1).toEqual({ name: 'Griffin', itemIds: ['uavrecon'] })
    expect(state.hostId).toBe('p2')
    const rejoined = joinDiver(state, 'p1', 'Griffin')!
    expect(rejoined.legacyCaches.p1).toBeUndefined()
    // Reissued the starting kit, with their winnings back on top — once each.
    expect(rejoined.personalInventories.p1).toEqual([...startingItemIds('medium'), 'uavrecon'])
    // The cache is their old inventory — no promotion owed on top.
    expect(rejoined.divers.find(diver => diver.id === 'p1')?.catchUpOwed).toBe(0)
  })

  it('refuses seating while the squad resolves rewards or forfeit', () => {
    let state = createDiveState({ variant: 'medium' }, 'p1', 'Griffin')
    state = reduce(state, { type: 'SPIN_WHEEL', seed: 11 })
    state = reduce(state, { type: 'ACCEPT_MISFORTUNE', accepted: true })
    state = reduce(state, { type: 'ACCEPT_STRAIN', accepted: false })
    state = reduce(state, { type: 'DEAL_PACTS' })
    state = reduce(state, { type: 'SET_PACTS', playerId: 'p1', pactIds: [] })
    state = reduce(state, { type: 'REPORT_RESULT', outcome: 'success', stars: 3 })
    expect(state.phase).toBe('rewards')
    expect(joinDiver(state, 'late', 'Latecomer')).toBeNull()
  })

  it('reports why seating is blocked', () => {
    expect(seatingBlocked(createLobbyState())).toBeNull()
    const full = [1, 2, 3, 4].reduce(
      (state, n) => joinDiver(state, `p${n}`, `Diver ${n}`)!,
      createLobbyState(),
    )
    expect(seatingBlocked(full)).toMatch(/full/)
    let started = reduce(joinDiver(createLobbyState(), 'p1', 'Griffin')!, {
      type: 'START_DIVE',
      settings: { variant: 'medium' },
    })
    started = reduce(started, { type: 'SPIN_WHEEL', seed: 11 })
    started = reduce(started, { type: 'ACCEPT_MISFORTUNE', accepted: true })
    started = reduce(started, { type: 'ACCEPT_STRAIN', accepted: false })
    started = reduce(started, { type: 'DEAL_PACTS' })
    started = reduce(started, { type: 'SET_PACTS', playerId: 'p1', pactIds: [] })
    const rewards = reduce(started, { type: 'REPORT_RESULT', outcome: 'success', stars: 3 })
    expect(rewards.phase).toBe('rewards')
    expect(seatingBlocked(rewards)).toMatch(/resolving/)
  })

  it('seats every diver with the full warbond catalog by default', () => {
    let state = createLobbyState()
    state = joinDiver(state, 'p1', 'Griffin')!
    state = joinDiver(state, 'p2', 'Two')!
    expect(state.divers[0]?.warbondCodes).toEqual(ALL_WARBOND_CODES)
    expect(state.divers[1]?.warbondCodes).toEqual(ALL_WARBOND_CODES)
  })
})

describe('createDiveState (composed from lobby helpers)', () => {
  it('produces the same started state as before the refactor', () => {
    const state = createDiveState({ variant: 'medium' }, 'p1', 'Griffin')
    expect(state.phase).toBe('spin')
    expect(state.divers).toHaveLength(1)
    expect(state.divers[0]).toMatchObject({ id: 'p1', name: 'Griffin', isHost: true })
    expect(state.personalInventories.p1).toEqual(startingItemIds('medium'))
  })

  it('still flows through the reducer from a lobby state', () => {
    const lobby = joinDiver(createLobbyState(), 'p1', 'Griffin')
    const started = reduce(lobby!, { type: 'START_DIVE', settings: { variant: 'suicide', mode: 'seaf' } })
    expect(started.difficulty).toBe(7)
  })
})

describe('forkCrusade (personal session saves)', () => {
  it('forks around the owner: their seat and kit stay, the missing divers park as caches', () => {
    let state = createDiveState({ variant: 'medium' }, 'p1', 'Griffin')
    state = joinDiver(state, 'p2', 'Two')!
    state = joinDiver(state, 'p3', 'Three')!
    state = reduce(state, { type: 'SPIN_WHEEL', seed: 42 })
    state = { ...state, personalInventories: { ...state.personalInventories, p2: [...state.personalInventories.p2!, 'uavrecon'] } }
    const forked = forkCrusade(state, 'p1', 'Griffin')!
    expect(forked.hostId).toBe('p1')
    expect(forked.divers).toHaveLength(1)
    expect(forked.divers[0]).toMatchObject({ id: 'p1', name: 'Griffin', isHost: true })
    expect(forked.personalInventories.p1).toEqual(startingItemIds('medium'))
    expect(forked.personalInventories.p2).toBeUndefined()
    // Only earned gear parks; a diver who earned nothing leaves no cache.
    expect(forked.legacyCaches).toEqual({ p2: { name: 'Two', itemIds: ['uavrecon'] } })
    expect(forked.difficulty).toBe(state.difficulty)
    expect(forked.wheel).toEqual(state.wheel)
    expect(forked.frontId).toBe(state.frontId)
  })

  it('lets any seat be the owner; an unknown id falls back to the saved host', () => {
    let state = createDiveState({ variant: 'medium' }, 'p1', 'Griffin')
    state = joinDiver(state, 'p2', 'Two')!
    state = reduce(state, { type: 'SPIN_WHEEL', seed: 7 })
    state = { ...state, personalInventories: { ...state.personalInventories, p1: [...state.personalInventories.p1!, 'uavrecon'] } }

    const byP2 = forkCrusade(state, 'p2')!
    expect(byP2.hostId).toBe('p2')
    expect(byP2.legacyCaches.p1).toBeDefined()

    const byStranger = forkCrusade(state, 'ghost')!
    expect(byStranger.hostId).toBe('p1')
  })

  it('renames the owner to the continuing diver', () => {
    const state = createDiveState({ variant: 'medium' }, 'p1', 'Griffin')
    const forked = forkCrusade(state, 'p1', '  New Host  ')!
    expect(forked.divers[0]!.name).toBe('New Host')
  })

  it('advances a pacts hold whose only pending diver left', () => {
    let state = createDiveState({ variant: 'medium' }, 'p1', 'Griffin')
    state = joinDiver(state, 'p2', 'Two')!
    state = reduce(state, { type: 'SPIN_WHEEL', seed: 42 })
    state = reduce(state, { type: 'ACCEPT_MISFORTUNE', accepted: false })
    state = reduce(state, { type: 'ACCEPT_STRAIN', accepted: false })
    state = reduce(state, { type: 'DEAL_PACTS' })
    state = reduce(state, { type: 'SET_PACTS', playerId: 'p1', pactIds: [] })
    expect(state.phase).toBe('pacts')
    expect(forkCrusade(state, 'p1')!.phase).toBe('diving')
    expect(forkCrusade(state, 'p2')!.phase).toBe('pacts')
  })

  it('refuses a complete crusade and malformed wheel states', () => {
    let state = createDiveState({ variant: 'medium' }, 'p1', 'Griffin')
    state = reduce(state, { type: 'SPIN_WHEEL', seed: 42 })
    expect(forkCrusade({ ...state, phase: 'complete' })).toBeNull()
    expect(forkCrusade({ ...state, wheel: null })).toBeNull()
    expect(forkCrusade({ ...state, frontId: null })).toBeNull()
    expect(forkCrusade({ ...state, divers: [] })!.phase).toBe('lobby')
  })

  it('continues an unstarted lobby as a fresh lobby', () => {
    const forked = forkCrusade({ ...createLobbyState(), difficulty: 42 })!
    expect(forked.phase).toBe('lobby')
    expect(forked.difficulty).toBe(3)
    expect(forked.divers).toEqual([])
  })

  it('clamps hostile seed values', () => {
    let state = createDiveState({ variant: 'medium' }, 'p1', 'Griffin')
    state = reduce(state, { type: 'SPIN_WHEEL', seed: 42 })
    const forked = forkCrusade({ ...state, difficulty: 99, rerollTokens: 999 }, 'p1')!
    expect(forked.difficulty).toBe(10)
    expect(forked.rerollTokens).toBe(10)
    expect(forked.missionInOperation).toBeLessThanOrEqual(3)
  })

  it('defaults a half-shaped diver from a hostile snapshot', () => {
    let state = createDiveState({ variant: 'medium' }, 'p1', 'Griffin')
    state = reduce(state, { type: 'SPIN_WHEEL', seed: 42 })
    const hostile = {
      ...state,
      divers: [{ id: 'x' }],
      personalInventories: { x: 'nope' },
    } as unknown as typeof state
    const forked = forkCrusade(hostile)!
    expect(forked.hostId).toBe('x')
    expect(forked.divers[0]).toMatchObject({ id: 'x', name: 'Diver', isHost: true, warbondCodes: [] })
    expect(forked.personalInventories.x).toEqual([])
  })

  it('resolves a stranded forfeit instead of deadlocking', () => {
    let state = createDiveState({ variant: 'medium' }, 'p1', 'Griffin')
    state = joinDiver(state, 'p2', 'Two')!
    state = {
      ...state,
      phase: 'forfeit',
      frontId: 'terminids',
      personalInventories: { p1: [], p2: ['uavrecon', 'eagleairstrike'] },
      legacyCaches: { ghost: { name: 'Ghost', itemIds: ['orbitallaser'] } },
    }
    const forked = forkCrusade(state, 'p1')!
    expect(forked.phase).toBe('spin')
    expect(forked.missionInOperation).toBe(1)
    expect(forked.wheel).toBeNull()
    // An earlier session's cache never carries into the new one, and the
    // failure's one-item loss still lands on the parked gear.
    expect(forked.legacyCaches.ghost).toBeUndefined()
    expect(forked.legacyCaches.p2?.itemIds).toEqual(['eagleairstrike'])
  })

  it('applies a forked host\'s chosen forfeit when no other diver is left to wait on', () => {
    let state = createDiveState({ variant: 'medium' }, 'p1', 'Griffin')
    state = joinDiver(state, 'p2', 'Two')!
    const [item, other] = startingItemIds('medium')
    state = {
      ...state,
      phase: 'forfeit',
      frontId: 'terminids',
      divers: state.divers.map(diver => diver.id === 'p1' ? { ...diver, forfeitedItemId: item! } : diver),
      personalInventories: { p1: [item!, other!], p2: [item!] },
    }
    const forked = forkCrusade(state, 'p1')!
    expect(forked.phase).toBe('spin')
    expect(forked.personalInventories.p1).toEqual([other])
    expect(forked.divers[0]!.forfeitedItemId).toBeNull()
  })
})

// The whole drop-in lifecycle across sessions. Single-step tests let caches
// that stacked the starting kit, and forks that re-parked every stale cache,
// pass unnoticed; these invariants are checked after every step instead.
describe('Field Promotion across sessions (lifecycle invariants)', () => {
  const starting = new Set(startingItemIds('medium'))

  function expectInvariants(state: DiveState): void {
    for (const [id, kit] of Object.entries(state.personalInventories)) {
      expect(new Set(kit).size, `${id} holds a repeated item`).toBe(kit.length)
    }
    for (const [id, { itemIds: cache }] of Object.entries(state.legacyCaches)) {
      expect(cache.length, `${id} parked an empty cache`).toBeGreaterThan(0)
      expect(new Set(cache).size, `${id} cache repeats an item`).toBe(cache.length)
      expect(cache.filter(item => starting.has(item)), `${id} cache carries starting kit`).toEqual([])
    }
  }

  function earn(state: DiveState, playerId: string, itemId: string): DiveState {
    return { ...state, personalInventories: { ...state.personalInventories, [playerId]: [...state.personalInventories[playerId]!, itemId] } }
  }

  it('keeps kits as sets and caches as earned gear through join → claim → fork → join → claim', () => {
    let state = createDiveState({ variant: 'medium' }, 'p1', 'Griffin')
    state = joinDiver(state, 'p2', 'Two')!
    state = joinDiver(state, 'p3', 'Three')!
    state = reduce(state, { type: 'SPIN_WHEEL', seed: 7 })
    state = { ...state, difficulty: 5, phase: 'spin', wheel: null }
    state = earn(earn(state, 'p1', 'orbitallaser'), 'p2', 'uavrecon')
    expectInvariants(state)

    // Session two: p3 earned nothing, so only p2's winnings park.
    let next = forkCrusade(state, 'p1', 'Griffin')!
    expectInvariants(next)
    expect(Object.keys(next.legacyCaches)).toEqual(['p2'])

    next = joinDiver(next, 'n1', 'New')!
    next = reduce(next, { type: 'CLAIM_CACHE', playerId: 'n1', cacheOwnerId: 'p2' })
    expectInvariants(next)
    expect(next.personalInventories.n1).toEqual([...startingItemIds('medium'), 'uavrecon'])

    next = joinDiver(next, 'n2', 'New Two')!
    const pick = catchUpOptionsFor(next, next.divers.find(diver => diver.id === 'n2')!)[0]!
    next = reduce(next, { type: 'CLAIM_CATCHUP_OPTION', playerId: 'n2', optionId: pick.optionId })
    expectInvariants(next)

    // Session three: only session two's squad parks, each kit once.
    const third = forkCrusade(next, 'p1', 'Griffin')!
    expectInvariants(third)
    expect(Object.keys(third.legacyCaches).sort()).toEqual(['n1', 'n2'])
    expect(third.legacyCaches.n1).toEqual({ name: 'New', itemIds: ['uavrecon'] })
    expect(third.legacyCaches.n2).toEqual({ name: 'New Two', itemIds: [pick.item.id] })
    expect(third.personalInventories.p1).toEqual([...startingItemIds('medium'), 'orbitallaser'])
  })
})
