import { describe, expect, it } from 'vitest'
import { STARTING_KITS } from './progression'
import { createDiveState, reduce } from './reducer'
import { BLOCKED_UNDER_MISFORTUNE } from './pacts'
import { allDiversPicked, canRerollWheel, comboKey, diverOptions } from './selectors'
import type { DiveState, DiverState, EngineAction } from './types'

const SETTINGS = { variant: 'standard' as const, ownedWarbondCodes: ['warbond3', 'warbond4'] }

function freshState(): DiveState {
  return createDiveState(SETTINGS, 'p1', 'Griffin')
}

function spunState(seed = 42): DiveState {
  return reduce(freshState(), { type: 'SPIN_WHEEL', seed })
}

function divingState(seed = 42, pactIds: string[] = []): DiveState {
  return reduce(spunState(seed), { type: 'SET_PACTS', playerId: 'p1', pactIds })
}

function requireDiver(state: DiveState): DiverState {
  const diver = state.divers[0]
  if (!diver) {
    throw new Error('expected the host diver to exist')
  }
  return diver
}

function requireId(value: string | undefined): string {
  if (value === undefined) {
    throw new Error('expected an item id')
  }
  return value
}

const skeletonActions: EngineAction[] = [
  { type: 'START_DIVE', settings: SETTINGS },
  { type: 'SPIN_WHEEL', seed: 1 },
  { type: 'ACCEPT_MISFORTUNE', accepted: true },
  { type: 'REROLL_WHEEL', wheel: 'misfortune', seed: 2 },
  { type: 'SET_PACTS', playerId: 'p1', pactIds: ['thirsty'] },
  { type: 'REPORT_RESULT', outcome: 'success', stars: 5 },
  { type: 'REPORT_RESULT', outcome: 'failure', stars: 2, timePct: 0.5 },
  { type: 'FORFEIT_ITEM', itemRef: { ownerId: 'shared', itemId: 'onetrueflag' } },
  { type: 'PICK_REWARD', playerId: 'p1', optionId: 'x' },
  { type: 'ADVANCE' },
  { type: 'END_DIVE' },
  { type: 'SET_NAME', playerId: 'p1', name: 'Griffin' },
  { type: 'TRANSFER_HOST', playerId: 'p2' },
  { type: 'TOGGLE_OPEN', open: true },
]

describe('reduce (purity + no-op safety)', () => {
  it('never mutates state, even when actions are invalid', () => {
    const frozen = Object.freeze({ ...freshState() })
    for (const action of skeletonActions) {
      expect(() => reduce(frozen, action)).not.toThrow()
    }
  })

  it('treats actions in the wrong phase as no-ops', () => {
    const base = freshState()
    expect(reduce(base, { type: 'ACCEPT_MISFORTUNE', accepted: true })).toBe(base)
    expect(reduce(base, { type: 'REPORT_RESULT', outcome: 'success', stars: 5 })).toBe(base)
    expect(reduce(base, { type: 'PICK_REWARD', playerId: 'p1', optionId: 'x' })).toBe(base)
    expect(reduce(base, { type: 'FORFEIT_ITEM', itemRef: { ownerId: 'shared', itemId: 'onetrueflag' } })).toBe(base)
    expect(reduce(base, { type: 'ADVANCE' })).toBe(base)
    const diving = divingState(42)
    expect(reduce(diving, { type: 'SPIN_WHEEL', seed: 1 })).toBe(diving)
    expect(reduce(diving, { type: 'ACCEPT_MISFORTUNE', accepted: false })).toBe(diving)
    expect(reduce(diving, { type: 'REROLL_WHEEL', wheel: 'front', seed: 2 })).toBe(diving)
  })
})

describe('START_DIVE', () => {
  it('applies the variant kit and enters the spin phase', () => {
    const state = freshState()
    expect(state.phase).toBe('spin')
    expect(state.difficulty).toBe(3)
    expect(state.sharedStratagemIds).toEqual(STARTING_KITS.standard.stratagems)
    expect(state.personalInventories.p1).toContain('r2124constitution')
    expect(state.rerollTokens).toBe(1)
  })

  it('is idempotent once settings exist', () => {
    const state = freshState()
    const spun = reduce(state, { type: 'SPIN_WHEEL', seed: 5 })
    const restarted = reduce(spun, { type: 'START_DIVE', settings: SETTINGS })
    expect(restarted).toBe(spun)
  })
})

describe('SPIN_WHEEL / REROLL_WHEEL', () => {
  it('derives the wheel and stores the seed', () => {
    const state = spunState(42)
    expect(state.phase).toBe('pacts')
    expect(state.wheel?.seed).toBe(42)
    expect(state.seedHistory).toEqual([42])
  })

  it('spends a token on a non-completed reroll', () => {
    const state = spunState(42)
    const rerolled = reduce(state, { type: 'REROLL_WHEEL', wheel: 'misfortune', seed: 43 })
    expect(rerolled.rerollTokens).toBe(0)
    expect(rerolled.seedHistory).toEqual([42, 43])
  })

  it('rejects a reroll with no tokens and no completed combo', () => {
    const state = reduce(spunState(42), { type: 'REROLL_WHEEL', wheel: 'front', seed: 43 })
    const blocked = reduce(state, { type: 'REROLL_WHEEL', wheel: 'front', seed: 44 })
    expect(blocked).toBe(state)
    expect(canRerollWheel(blocked).allowed).toBe(false)
  })

  it('rerolls free when the combo was already completed', () => {
    const state = spunState(42)
    const marked: DiveState = {
      ...state,
      completedCombos: [comboKey(state.wheel!.misfortuneId, state.wheel!.front)],
    }
    const rerolled = reduce(marked, { type: 'REROLL_WHEEL', wheel: 'misfortune', seed: 43 })
    expect(rerolled.rerollTokens).toBe(1)
    expect(canRerollWheel(marked).free).toBe(true)
  })

  it('rejects rerolls after pacts are locked', () => {
    const state = divingState(42)
    const blocked = reduce(state, { type: 'REROLL_WHEEL', wheel: 'front', seed: 44 })
    expect(blocked).toBe(state)
  })
})

describe('ACCEPT_MISFORTUNE (optional team risk)', () => {
  it('accepts and declines the drawn misfortune before pacts lock', () => {
    const state = spunState(42)
    const accepted = reduce(state, { type: 'ACCEPT_MISFORTUNE', accepted: true })
    expect(accepted.misfortuneAccepted).toBe(true)
    const declined = reduce(accepted, { type: 'ACCEPT_MISFORTUNE', accepted: false })
    expect(declined.misfortuneAccepted).toBe(false)
  })

  it('freezes the decision once any pact is locked', () => {
    const locked = reduce(spunState(42), { type: 'SET_PACTS', playerId: 'p1', pactIds: [] })
    expect(reduce(locked, { type: 'ACCEPT_MISFORTUNE', accepted: true })).toBe(locked)
  })

  it('resets the decision on a reroll', () => {
    const accepted = reduce(spunState(42), { type: 'ACCEPT_MISFORTUNE', accepted: true })
    const rerolled = reduce(accepted, { type: 'REROLL_WHEEL', wheel: 'misfortune', seed: 43 })
    expect(rerolled.misfortuneAccepted).toBe(false)
    expect(rerolled.wheel?.seed).toBe(43)
  })
})

describe('SET_PACTS', () => {
  it('locks pacts and moves to diving (solo)', () => {
    const state = reduce(spunState(42), { type: 'SET_PACTS', playerId: 'p1', pactIds: ['stimAbstinent'] })
    expect(state.phase).toBe('diving')
    expect(state.divers[0]?.pactsLocked).toBe(true)
  })

  it('rejects pacts blocked by the accepted misfortune', () => {
    const accepted = reduce(spunState(42), { type: 'ACCEPT_MISFORTUNE', accepted: true })
    const misfortuneId = accepted.wheel!.misfortuneId
    const blocked = (BLOCKED_UNDER_MISFORTUNE[misfortuneId] ?? [])[0]
    if (!blocked) {
      return
    }
    expect(reduce(accepted, { type: 'SET_PACTS', playerId: 'p1', pactIds: [blocked] })).toBe(accepted)
  })

  it('rejects more than MAX_PACTS and unknown pacts', () => {
    const state = spunState(42)
    const tooMany = reduce(state, {
      type: 'SET_PACTS',
      playerId: 'p1',
      pactIds: ['stimAbstinent', 'deadWeight', 'loadoutLoyalist', 'antiTankAbstinent'],
    })
    expect(tooMany).toBe(state)
    expect(reduce(state, { type: 'SET_PACTS', playerId: 'p1', pactIds: ['ghostPact'] })).toBe(state)
  })
})

describe('REPORT_RESULT (success) → rewards → ADVANCE', () => {
  it('clamps stars to what the difficulty offers', () => {
    const state = divingState(42)
    const maxed = reduce(state, { type: 'REPORT_RESULT', outcome: 'success', stars: 5 })
    expect(maxed.lastReport?.stars).toBe(3)
    const floored = reduce(state, { type: 'REPORT_RESULT', outcome: 'success', stars: 0 })
    expect(floored.lastReport?.stars).toBe(1)
    const failed = reduce(state, { type: 'REPORT_RESULT', outcome: 'failure', stars: 5 })
    expect(failed.lastReport?.stars).toBe(0)
  })

  it('generates an offer, records the combo, and advances', () => {
    let state = divingState(42, ['stimAbstinent'])
    state = reduce(state, { type: 'REPORT_RESULT', outcome: 'success', stars: 5 })
    expect(state.phase).toBe('rewards')
    expect(state.lastReport?.stars).toBe(3)
    expect(state.offerSeed).not.toBeNull()
    expect(state.completedCombos).toContain(comboKey(state.wheel!.misfortuneId, state.wheel!.front))

    const options = diverOptions(state, requireDiver(state))
    expect(options.length).toBeGreaterThan(0)
    expect(options.length).toBeLessThanOrEqual(3)

    const picked = options[0]
    if (!picked) {
      throw new Error('expected at least one reward option')
    }
    state = reduce(state, { type: 'PICK_REWARD', playerId: 'p1', optionId: picked.optionId })
    expect(allDiversPicked(state)).toBe(true)
    if (picked.item.type === 'stratagem') {
      expect(state.sharedStratagemIds).toContain(picked.item.id)
    }
    else {
      expect(state.personalInventories.p1).toContain(picked.item.id)
    }

    state = reduce(state, { type: 'ADVANCE' })
    expect(state.missionIndex).toBe(1)
    expect(state.missionInOperation).toBe(2)
    // The wheel persists for the whole operation — mission 2 re-chooses pacts
    // under the same misfortune.
    expect(state.phase).toBe('pacts')
    expect(state.wheel?.seed).toBe(42)
    expect(state.divers[0]?.pactIds).toEqual([])
  })

  it('re-spins only when the operation completes', () => {
    let state = divingState(1)
    state = reduce(state, { type: 'REPORT_RESULT', outcome: 'success', stars: 3 })
    let options = diverOptions(state, requireDiver(state))
    state = reduce(state, { type: 'PICK_REWARD', playerId: 'p1', optionId: options[0]!.optionId })
    state = reduce(state, { type: 'ADVANCE' })
    state = reduce(state, { type: 'SET_PACTS', playerId: 'p1', pactIds: [] })
    state = reduce(state, { type: 'REPORT_RESULT', outcome: 'success', stars: 3 })
    options = diverOptions(state, requireDiver(state))
    state = reduce(state, { type: 'PICK_REWARD', playerId: 'p1', optionId: options[0]!.optionId })
    state = reduce(state, { type: 'ADVANCE' })
    expect(state.difficulty).toBe(4)
    expect(state.missionInOperation).toBe(1)
    expect(state.phase).toBe('spin')
    expect(state.wheel).toBeNull()
    expect(state.rerollTokens).toBe(1)
  })

  it('bumps the difficulty after a full operation and completes at 10', () => {
    const base = freshState()
    expect(reduce(base, { type: 'ADVANCE' })).toBe(base)

    let state = divingState(1)
    state = reduce(state, { type: 'REPORT_RESULT', outcome: 'failure', stars: 0 })
    state = reduce(state, {
      type: 'FORFEIT_ITEM',
      itemRef: { ownerId: 'shared', itemId: requireId(state.sharedStratagemIds[0]) },
    })
    // Medium runs 2-mission operations and the wheel carries over the retry,
    // so the squad returns straight to the pact phase.
    for (let i = 0; i < 2; i++) {
      state = reduce(state, { type: 'SET_PACTS', playerId: 'p1', pactIds: [] })
      state = reduce(state, { type: 'REPORT_RESULT', outcome: 'success', stars: 5 })
      const options = diverOptions(state, requireDiver(state))
      const optionId = options[0]?.optionId
      if (!optionId) {
        throw new Error('expected at least one reward option')
      }
      state = reduce(state, { type: 'PICK_REWARD', playerId: 'p1', optionId })
      state = reduce(state, { type: 'ADVANCE' })
    }
    expect(state.difficulty).toBe(4)
    expect(state.missionInOperation).toBe(1)
    expect(state.rerollTokens).toBe(1)
  })
})

describe('REPORT_RESULT (failure) → forfeit', () => {
  it('forfeits one item and restarts the operation with the wheel intact', () => {
    let state = divingState(42)
    state = reduce(state, { type: 'REPORT_RESULT', outcome: 'failure', stars: 2 })
    expect(state.phase).toBe('forfeit')

    const sharedId = requireId(state.sharedStratagemIds[0])
    state = reduce(state, { type: 'FORFEIT_ITEM', itemRef: { ownerId: 'shared', itemId: sharedId } })
    expect(state.sharedStratagemIds).not.toContain(sharedId)
    expect(state.phase).toBe('pacts')
    expect(state.wheel?.seed).toBe(42)
    expect(state.missionInOperation).toBe(1)
    expect(state.rerollTokens).toBe(1)
  })

  it('forfeits from a personal inventory', () => {
    let state = divingState(42)
    state = reduce(state, { type: 'REPORT_RESULT', outcome: 'failure', stars: 1 })
    const personal = requireId(state.personalInventories.p1?.[0])
    state = reduce(state, { type: 'FORFEIT_ITEM', itemRef: { ownerId: 'p1', itemId: personal } })
    expect(state.personalInventories.p1).not.toContain(personal)
    expect(state.phase).toBe('pacts')
  })

  it('skips forfeit when there is nothing to lose', () => {
    let state = divingState(42)
    state = reduce(state, { type: 'REPORT_RESULT', outcome: 'failure', stars: 1 })
    state = reduce(state, { type: 'FORFEIT_ITEM', itemRef: { ownerId: 'shared', itemId: requireId(state.sharedStratagemIds[0]) } })
    const stripped: DiveState = {
      ...state,
      sharedStratagemIds: [],
      personalInventories: { p1: [] },
    }
    const reported = reduce(stripped, { type: 'REPORT_RESULT', outcome: 'failure', stars: 1 })
    expect(reported.phase).toBe('pacts')
    expect(reported.wheel?.seed).toBe(42)
  })

  it('rejects forfeiting an item the squad does not own', () => {
    let state = divingState(42)
    state = reduce(state, { type: 'REPORT_RESULT', outcome: 'failure', stars: 1 })
    expect(reduce(state, { type: 'FORFEIT_ITEM', itemRef: { ownerId: 'shared', itemId: 'ghostgun' } })).toBe(state)
  })
})

describe('identity actions', () => {
  it('SET_NAME updates the diver', () => {
    const state = reduce(freshState(), { type: 'SET_NAME', playerId: 'p1', name: '  Diver One  ' })
    expect(state.divers[0]?.name).toBe('Diver One')
    const blank = freshState()
    expect(reduce(blank, { type: 'SET_NAME', playerId: 'p1', name: '   ' })).toBe(blank)
  })

  it('TRANSFER_HOST moves host flags', () => {
    const withTwo: DiveState = {
      ...freshState(),
      divers: [
        { id: 'p1', name: 'A', isHost: true, pactsLocked: false, pactIds: [], pickedOptionId: null },
        { id: 'p2', name: 'B', isHost: false, pactsLocked: false, pactIds: [], pickedOptionId: null },
      ],
    }
    const moved = reduce(withTwo, { type: 'TRANSFER_HOST', playerId: 'p2' })
    expect(moved.hostId).toBe('p2')
    expect(moved.divers.map(diver => diver.isHost)).toEqual([false, true])
  })

  it('END_DIVE completes the crusade', () => {
    const state = reduce(freshState(), { type: 'END_DIVE' })
    expect(state.phase).toBe('complete')
    expect(reduce(state, { type: 'END_DIVE' })).toBe(state)
  })

  it('TOGGLE_OPEN flags the room for the lobby', () => {
    expect(reduce(freshState(), { type: 'TOGGLE_OPEN', open: true }).openToLobby).toBe(true)
  })
})
