import { describe, expect, it } from 'vitest'
import { ALL_WARBOND_CODES } from '../data/catalog'
import { startingItemIds } from './progression'
import { createLobbyState, joinDiver, seatingBlocked } from './room'
import { createDiveState, reduce } from './reducer'

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
    let state = createDiveState({ variant: 'standard' }, 'p1', 'Griffin')
    state = joinDiver(state, 'late', 'Latecomer')!
    expect(state.personalInventories.late).toEqual(startingItemIds('standard'))
  })

  it('owes a mid-crusade joiner one catch-up pick per operation behind, capped', () => {
    // Standard starts at 3; driving the difficulty to 7 leaves 4 ops behind,
    // which is exactly the catch-up cap.
    let state = createDiveState({ variant: 'standard' }, 'p1', 'Griffin')
    state = reduce(state, { type: 'SPIN_WHEEL', seed: 11 })
    state = { ...state, difficulty: 7, missionIndex: 10, phase: 'spin', wheel: null }
    state = joinDiver(state, 'late', 'Latecomer')!
    expect(state.divers.find(diver => diver.id === 'late')?.catchUpGranted).toBe(4)
    expect(state.divers.find(diver => diver.id === 'late')?.catchUpOwed).toBe(4)
  })

  it('owes nothing to joiners at the variant start difficulty or in the lobby', () => {
    let state = createDiveState({ variant: 'standard' }, 'p1', 'Griffin')
    state = reduce(state, { type: 'SPIN_WHEEL', seed: 11 })
    state = { ...state, wheel: null, phase: 'spin' }
    state = joinDiver(state, 'ontime', 'On Time')!
    expect(state.divers.find(diver => diver.id === 'ontime')?.catchUpOwed).toBe(0)
    const lobby = joinDiver(createLobbyState(), 'p1', 'Griffin')!
    expect(lobby.divers[0]?.catchUpOwed).toBe(0)
  })

  it('restores a departed diver\u2019s parked cache when they rejoin', () => {
    let state = joinDiver(joinDiver(createLobbyState(), 'p1', 'Griffin')!, 'p2', 'Two')!
    state = reduce(state, { type: 'START_DIVE', settings: { variant: 'standard' } })
    state = reduce(state, { type: 'LEAVE_DIVE', playerId: 'p1' })
    expect(state.legacyCaches.p1).toEqual(startingItemIds('standard'))
    expect(state.hostId).toBe('p2')
    const rejoined = joinDiver(state, 'p1', 'Griffin')!
    expect(rejoined.legacyCaches.p1).toBeUndefined()
    expect(rejoined.personalInventories.p1).toEqual(startingItemIds('standard'))
    // The cache is their old inventory — no promotion owed on top.
    expect(rejoined.divers.find(diver => diver.id === 'p1')?.catchUpOwed).toBe(0)
  })

  it('refuses seating while the squad resolves rewards or forfeit', () => {
    let state = createDiveState({ variant: 'standard' }, 'p1', 'Griffin')
    state = reduce(state, { type: 'SPIN_WHEEL', seed: 11 })
    state = reduce(state, { type: 'ACCEPT_MISFORTUNE', accepted: true })
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
      settings: { variant: 'standard' },
    })
    started = reduce(started, { type: 'SPIN_WHEEL', seed: 11 })
    started = reduce(started, { type: 'ACCEPT_MISFORTUNE', accepted: true })
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
    const state = createDiveState({ variant: 'standard' }, 'p1', 'Griffin')
    expect(state.phase).toBe('spin')
    expect(state.divers).toHaveLength(1)
    expect(state.divers[0]).toMatchObject({ id: 'p1', name: 'Griffin', isHost: true })
    expect(state.personalInventories.p1).toEqual(startingItemIds('standard'))
  })

  it('still flows through the reducer from a lobby state', () => {
    const lobby = joinDiver(createLobbyState(), 'p1', 'Griffin')
    const started = reduce(lobby!, { type: 'START_DIVE', settings: { variant: 'quickplay' } })
    expect(started.difficulty).toBe(7)
  })
})
