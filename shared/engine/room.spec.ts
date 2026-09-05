import { describe, expect, it } from 'vitest'
import { STARTING_KITS } from './progression'
import { createLobbyState, joinDiver } from './room'
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

  it('grants the personal kit to late joiners of a started dive', () => {
    let state = createDiveState(
      { variant: 'standard', ownedWarbondCodes: [] },
      'p1',
      'Griffin',
    )
    state = joinDiver(state, 'late', 'Latecomer')!
    expect(state.personalInventories.late).toEqual([
      ...STARTING_KITS.standard.primaries,
      ...STARTING_KITS.standard.secondaries,
      ...STARTING_KITS.standard.throwables,
      ...STARTING_KITS.standard.armorPassives,
      ...STARTING_KITS.standard.boosters,
    ])
  })
})

describe('createDiveState (composed from lobby helpers)', () => {
  it('produces the same started state as before the refactor', () => {
    const state = createDiveState({ variant: 'standard', ownedWarbondCodes: ['warbond3'] }, 'p1', 'Griffin')
    expect(state.phase).toBe('spin')
    expect(state.divers).toHaveLength(1)
    expect(state.divers[0]).toMatchObject({ id: 'p1', name: 'Griffin', isHost: true })
    expect(state.sharedStratagemIds).toEqual(STARTING_KITS.standard.stratagems)
    expect(state.personalInventories.p1?.length).toBeGreaterThan(0)
  })

  it('still flows through the reducer from a lobby state', () => {
    const lobby = joinDiver(createLobbyState(), 'p1', 'Griffin')
    const started = reduce(lobby!, { type: 'START_DIVE', settings: { variant: 'quickplay', ownedWarbondCodes: [] } })
    expect(started.difficulty).toBe(7)
  })
})
