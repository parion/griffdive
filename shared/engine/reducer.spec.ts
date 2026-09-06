import { describe, expect, it } from 'vitest'
import { ALL_ITEMS, ITEMS_BY_ID } from '../data/catalog'
import { PACTS } from '../data/pacts'
import { startingItemIds } from './progression'
import { DIVERS_CHOICE_OPTION_ID } from './rewards'
import { createDiveState, reduce } from './reducer'
import { createLobbyState, joinDiver } from './room'
import { BLOCKED_UNDER_MISFORTUNE } from './pacts'
import { allDiversPicked, canRerollWheel, comboKey, diverOptions, pactOfferFor, rewardPoolFor } from './selectors'
import type { DiveState, DiverState, EngineAction } from './types'

const SETTINGS = { variant: 'standard' as const }

function freshState(): DiveState {
  return createDiveState(SETTINGS, 'p1', 'Griffin')
}

function spunState(seed = 42): DiveState {
  return reduce(freshState(), { type: 'SPIN_WHEEL', seed })
}

function decidedState(seed = 42, accepted = true): DiveState {
  return reduce(spunState(seed), { type: 'ACCEPT_MISFORTUNE', accepted })
}

function offerPacts(state: DiveState, diverId = 'p1'): string[] {
  return pactOfferFor(state, diverId).map(pact => pact.id)
}

function outsideOffer(state: DiveState, diverId = 'p1'): string {
  const offered = new Set(offerPacts(state, diverId))
  const outside = PACTS.map(pact => pact.id).find(id => !offered.has(id))
  if (!outside) {
    throw new Error('expected a pact outside the rolled offer')
  }
  return outside
}

function divingState(seed = 42, pactIds: string[] = []): DiveState {
  const decided = decidedState(seed)
  // Only pacts the wheel offered can lock — intersect the requested pick.
  const offered = new Set(offerPacts(decided))
  return reduce(decided, {
    type: 'SET_PACTS',
    playerId: 'p1',
    pactIds: pactIds.filter(id => offered.has(id)),
  })
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
  { type: 'SET_WARBONDS', playerId: 'p1', warbondCodes: ['warbond3'] },
  { type: 'REPORT_RESULT', outcome: 'success', stars: 5 },
  { type: 'REPORT_RESULT', outcome: 'failure', stars: 2, timePct: 0.5 },
  { type: 'FORFEIT_ITEM', itemRef: { ownerId: 'p1', itemId: 'onetrueflag' } },
  { type: 'PICK_REWARD', playerId: 'p1', optionId: 'x' },
  { type: 'ADVANCE' },
  { type: 'END_DIVE' },
  { type: 'KICK_DIVER', playerId: 'p2' },
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
    expect(reduce(base, { type: 'FORFEIT_ITEM', itemRef: { ownerId: 'p1', itemId: 'onetrueflag' } })).toBe(base)
    expect(reduce(base, { type: 'ADVANCE' })).toBe(base)
    // No pact locks before the wheel decision.
    const spun = spunState(42)
    expect(reduce(spun, { type: 'SET_PACTS', playerId: 'p1', pactIds: [] })).toBe(spun)
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
    // Every diver owns the full starting kit — stratagems included.
    expect(state.personalInventories.p1).toEqual(startingItemIds('standard'))
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
    // The draw opens the decision window, not the pact window.
    expect(state.phase).toBe('decision')
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
    expect(canRerollWheel(blocked, 'front').allowed).toBe(false)
  })

  it('rerolls free when the combo was already completed', () => {
    const state = spunState(42)
    const marked: DiveState = {
      ...state,
      completedCombos: [comboKey(state.wheel!.misfortuneId, state.frontId!)],
    }
    const rerolled = reduce(marked, { type: 'REROLL_WHEEL', wheel: 'misfortune', seed: 43 })
    expect(rerolled.rerollTokens).toBe(1)
    expect(canRerollWheel(marked, 'misfortune').free).toBe(true)
  })

  it('rejects rerolls after pacts are locked', () => {
    const state = divingState(42)
    const blocked = reduce(state, { type: 'REROLL_WHEEL', wheel: 'front', seed: 44 })
    expect(blocked).toBe(state)
  })

  it('locks the front after the operation starts; the misfortune stays rerollable', () => {
    let state = divingState(42, ['stimAbstinent'])
    state = reduce(state, { type: 'REPORT_RESULT', outcome: 'success', stars: 3 })
    const options = diverOptions(state, requireDiver(state))
    state = reduce(state, { type: 'PICK_REWARD', playerId: 'p1', optionId: options[0]!.optionId })
    state = reduce(state, { type: 'ADVANCE' })
    expect(state.missionIndex).toBe(1)
    // Mission 2 begins at the spin — only after the fresh draw is decided does
    // the pact window open, and in it the front reroll is refused.
    state = reduce(state, { type: 'SPIN_WHEEL', seed: 60 })
    expect(state.phase).toBe('decision')

    const blocked = reduce(state, { type: 'REROLL_WHEEL', wheel: 'front', seed: 43 })
    expect(blocked).toBe(state)
    expect(canRerollWheel(state, 'front')).toMatchObject({
      allowed: false,
      reason: 'The front locks in for the whole operation',
    })
    expect(canRerollWheel(state, 'misfortune').allowed).toBe(true)
  })
})

describe('ACCEPT_MISFORTUNE (optional team risk)', () => {
  it('moves the squad from decision to pacts, and accepts or declines', () => {
    const state = spunState(42)
    expect(state.phase).toBe('decision')
    const accepted = reduce(state, { type: 'ACCEPT_MISFORTUNE', accepted: true })
    expect(accepted.misfortuneAccepted).toBe(true)
    expect(accepted.phase).toBe('pacts')
    const declined = reduce(accepted, { type: 'ACCEPT_MISFORTUNE', accepted: false })
    expect(declined.misfortuneAccepted).toBe(false)
    expect(declined.phase).toBe('pacts')
  })

  it('freezes the decision once any pact is locked', () => {
    const locked = divingState(42)
    expect(reduce(locked, { type: 'ACCEPT_MISFORTUNE', accepted: !locked.misfortuneAccepted })).toBe(locked)
  })

  it('resets the decision on a reroll', () => {
    const accepted = decidedState(42)
    const rerolled = reduce(accepted, { type: 'REROLL_WHEEL', wheel: 'misfortune', seed: 43 })
    expect(rerolled.misfortuneAccepted).toBe(false)
    expect(rerolled.phase).toBe('decision')
    expect(rerolled.wheel?.seed).toBe(43)
  })
})

describe('SET_PACTS', () => {
  it('locks pacts from the rolled offer and moves to diving (solo)', () => {
    const decided = decidedState(42)
    const pactIds = offerPacts(decided).slice(0, 2)
    expect(pactIds.length).toBeGreaterThan(0)
    const state = reduce(decided, { type: 'SET_PACTS', playerId: 'p1', pactIds })
    expect(state.phase).toBe('diving')
    expect(state.divers[0]?.pactsLocked).toBe(true)
    expect(state.divers[0]?.pactIds).toEqual(pactIds)
  })

  it('rejects pacts outside the diver\'s rolled offer', () => {
    const decided = decidedState(42)
    expect(reduce(decided, { type: 'SET_PACTS', playerId: 'p1', pactIds: [outsideOffer(decided)] })).toBe(decided)
  })

  it('is a no-op before the wheel decision', () => {
    const spun = spunState(42)
    expect(reduce(spun, { type: 'SET_PACTS', playerId: 'p1', pactIds: [] })).toBe(spun)
  })

  it('rejects pacts blocked by the accepted misfortune', () => {
    const accepted = decidedState(42)
    const misfortuneId = accepted.wheel!.misfortuneId
    const blocked = (BLOCKED_UNDER_MISFORTUNE[misfortuneId] ?? [])[0]
    if (!blocked) {
      return
    }
    expect(reduce(accepted, { type: 'SET_PACTS', playerId: 'p1', pactIds: [blocked] })).toBe(accepted)
  })

  it('rejects more pacts than the offer holds, and unknown ids', () => {
    const decided = decidedState(42)
    const tooMany = reduce(decided, {
      type: 'SET_PACTS',
      playerId: 'p1',
      pactIds: PACTS.map(pact => pact.id),
    })
    expect(tooMany).toBe(decided)
    expect(reduce(decided, { type: 'SET_PACTS', playerId: 'p1', pactIds: ['ghostPact'] })).toBe(decided)
  })
})

describe('SET_WARBONDS (personal ownership)', () => {
  it('defaults every diver to the full warbond catalog', () => {
    const state = freshState()
    expect(state.divers[0]?.warbondCodes.length).toBeGreaterThan(0)
  })

  it('sets a diver\'s codes and filters unknown ones', () => {
    const state = reduce(freshState(), {
      type: 'SET_WARBONDS',
      playerId: 'p1',
      warbondCodes: ['warbond3', 'ghostBond', 'warbond3'],
    })
    expect(state.divers[0]?.warbondCodes).toEqual(['warbond3'])
  })

  it('works in the lobby phase and in any mission phase', () => {
    const lobby = createLobbyState()
    const seated = reduce(joinDiver(lobby, 'p1', 'Griffin')!, {
      type: 'SET_WARBONDS',
      playerId: 'p1',
      warbondCodes: ['warbond3'],
    })
    expect(seated.divers[0]?.warbondCodes).toEqual(['warbond3'])
    const diving = divingState(42)
    const changed = reduce(diving, { type: 'SET_WARBONDS', playerId: 'p1', warbondCodes: [] })
    expect(changed.divers[0]?.warbondCodes).toEqual([])
  })

  it('ignores unknown divers', () => {
    const state = freshState()
    expect(reduce(state, { type: 'SET_WARBONDS', playerId: 'ghost', warbondCodes: [] })).toBe(state)
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
    expect(state.completedCombos).toContain(comboKey(state.wheel!.misfortuneId, state.frontId!))

    const options = diverOptions(state, requireDiver(state))
    expect(options.length).toBeGreaterThan(0)
    expect(options.length).toBeLessThanOrEqual(3)

    const picked = options[0]
    if (!picked) {
      throw new Error('expected at least one reward option')
    }
    state = reduce(state, { type: 'PICK_REWARD', playerId: 'p1', optionId: picked.optionId })
    expect(allDiversPicked(state)).toBe(true)
    // Stratagems are personal too — every reward lands in the picker's kit.
    expect(state.personalInventories.p1).toContain(picked.item.id)

    state = reduce(state, { type: 'ADVANCE' })
    expect(state.missionIndex).toBe(1)
    expect(state.missionInOperation).toBe(2)
    // The front persists for the whole operation, but mission 2 begins at the
    // spin: a fresh misfortune awaits the squad's decision.
    expect(state.phase).toBe('spin')
    expect(state.wheel).toBeNull()
    expect(state.frontId).not.toBeNull()
    expect(state.divers[0]?.pactIds).toEqual([])
  })

  it('re-spins only when the operation completes', () => {
    let state = divingState(1)
    state = reduce(state, { type: 'REPORT_RESULT', outcome: 'success', stars: 3 })
    let options = diverOptions(state, requireDiver(state))
    state = reduce(state, { type: 'PICK_REWARD', playerId: 'p1', optionId: options[0]!.optionId })
    state = reduce(state, { type: 'ADVANCE' })
    state = reduce(state, { type: 'SPIN_WHEEL', seed: 99 })
    state = reduce(state, { type: 'ACCEPT_MISFORTUNE', accepted: true })
    state = reduce(state, { type: 'SET_PACTS', playerId: 'p1', pactIds: [] })
    state = reduce(state, { type: 'REPORT_RESULT', outcome: 'success', stars: 3 })
    options = diverOptions(state, requireDiver(state))
    state = reduce(state, { type: 'PICK_REWARD', playerId: 'p1', optionId: options[0]!.optionId })
    state = reduce(state, { type: 'ADVANCE' })
    expect(state.difficulty).toBe(4)
    expect(state.missionInOperation).toBe(1)
    expect(state.phase).toBe('spin')
    expect(state.wheel).toBeNull()
    expect(state.frontId).toBeNull()
    expect(state.rerollTokens).toBe(1)
  })

  it('bumps the difficulty after a full operation and completes at 10', () => {
    const base = freshState()
    expect(reduce(base, { type: 'ADVANCE' })).toBe(base)

    let state = divingState(1)
    state = reduce(state, { type: 'REPORT_RESULT', outcome: 'failure', stars: 0 })
    state = reduce(state, {
      type: 'FORFEIT_ITEM',
      itemRef: { ownerId: 'p1', itemId: requireId(state.personalInventories.p1?.[0]) },
    })
    // Medium runs 2-mission operations; the front carries over the retry and
    // every mission — retries included — draws a fresh misfortune, so the
    // squad returns to the spin phase.
    for (let i = 0; i < 2; i++) {
      state = reduce(state, { type: 'SPIN_WHEEL', seed: 50 + i })
      state = reduce(state, { type: 'ACCEPT_MISFORTUNE', accepted: true })
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
  it('forfeits one item and restarts the operation at the spin', () => {
    let state = divingState(42)
    const frontBefore = state.frontId
    state = reduce(state, { type: 'REPORT_RESULT', outcome: 'failure', stars: 2 })
    expect(state.phase).toBe('forfeit')

    const personalId = requireId(state.personalInventories.p1?.[0])
    state = reduce(state, { type: 'FORFEIT_ITEM', itemRef: { ownerId: 'p1', itemId: personalId } })
    expect(state.personalInventories.p1).not.toContain(personalId)
    expect(state.phase).toBe('spin')
    expect(state.wheel).toBeNull()
    expect(state.frontId).toBe(frontBefore)
    expect(state.missionInOperation).toBe(1)
    expect(state.rerollTokens).toBe(1)
  })

  it('forfeits from a personal inventory', () => {
    let state = divingState(42)
    state = reduce(state, { type: 'REPORT_RESULT', outcome: 'failure', stars: 1 })
    const personal = requireId(state.personalInventories.p1?.[0])
    state = reduce(state, { type: 'FORFEIT_ITEM', itemRef: { ownerId: 'p1', itemId: personal } })
    expect(state.personalInventories.p1).not.toContain(personal)
    expect(state.phase).toBe('spin')
  })

  it('skips forfeit when there is nothing to lose', () => {
    let state = divingState(42)
    state = reduce(state, { type: 'REPORT_RESULT', outcome: 'failure', stars: 1 })
    state = reduce(state, { type: 'FORFEIT_ITEM', itemRef: { ownerId: 'p1', itemId: requireId(state.personalInventories.p1?.[0]) } })
    const stripped: DiveState = {
      ...state,
      personalInventories: { p1: [] },
    }
    const reported = reduce(stripped, { type: 'REPORT_RESULT', outcome: 'failure', stars: 1 })
    expect(reported.phase).toBe('spin')
    expect(reported.wheel).toBeNull()
    expect(reported.frontId).not.toBeNull()
  })

  it('rejects forfeiting an item the squad does not own', () => {
    let state = divingState(42)
    state = reduce(state, { type: 'REPORT_RESULT', outcome: 'failure', stars: 1 })
    expect(reduce(state, { type: 'FORFEIT_ITEM', itemRef: { ownerId: 'p1', itemId: 'ghostgun' } })).toBe(state)
    expect(reduce(state, { type: 'FORFEIT_ITEM', itemRef: { ownerId: 'ghost', itemId: 'onetrueflag' } })).toBe(state)
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
        { id: 'p1', name: 'A', isHost: true, pactsLocked: false, pactIds: [], pickedOptionId: null, warbondCodes: [] },
        { id: 'p2', name: 'B', isHost: false, pactsLocked: false, pactIds: [], pickedOptionId: null, warbondCodes: [] },
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

describe('KICK_DIVER', () => {
  function twoDiverState(): DiveState {
    return {
      ...freshState(),
      divers: [
        { id: 'p1', name: 'A', isHost: true, pactsLocked: false, pactIds: [], pickedOptionId: null, warbondCodes: [] },
        { id: 'p2', name: 'B', isHost: false, pactsLocked: false, pactIds: [], pickedOptionId: null, warbondCodes: [] },
      ],
      personalInventories: {
        p1: startingItemIds(SETTINGS.variant),
        p2: startingItemIds(SETTINGS.variant),
      },
    }
  }

  it('removes the diver and their personal inventory', () => {
    const state = reduce(twoDiverState(), { type: 'KICK_DIVER', playerId: 'p2' })
    expect(state.divers.map(diver => diver.id)).toEqual(['p1'])
    expect(state.personalInventories.p2).toBeUndefined()
    expect(state.personalInventories.p1?.length).toBeGreaterThan(0)
  })

  it('cannot kick the host or a diver who is not seated', () => {
    const base = twoDiverState()
    expect(reduce(base, { type: 'KICK_DIVER', playerId: 'p1' })).toBe(base)
    expect(reduce(base, { type: 'KICK_DIVER', playerId: 'ghost' })).toBe(base)
  })

  it('kicks from the lobby before the crusade starts', () => {
    const lobby = joinDiver(joinDiver(createLobbyState(), 'p1', 'A')!, 'p2', 'B')
    if (!lobby) {
      throw new Error('expected both divers seated')
    }
    const kicked = reduce(lobby, { type: 'KICK_DIVER', playerId: 'p2' })
    expect(kicked.divers).toHaveLength(1)
    const started = reduce(kicked, { type: 'START_DIVE', settings: SETTINGS })
    expect(started.phase).toBe('spin')
    expect(Object.keys(started.personalInventories)).toEqual(['p1'])
  })

  it('a kicked diver no longer blocks the pact window', () => {
    const spun = reduce(twoDiverState(), { type: 'SPIN_WHEEL', seed: 42 })
    const decided = reduce(spun, { type: 'ACCEPT_MISFORTUNE', accepted: true })
    const halfLocked = reduce(decided, { type: 'SET_PACTS', playerId: 'p1', pactIds: [] })
    expect(halfLocked.phase).toBe('pacts')
    const kicked = reduce(halfLocked, { type: 'KICK_DIVER', playerId: 'p2' })
    expect(kicked.phase).toBe('diving')

    const stillDeciding = reduce(spun, { type: 'KICK_DIVER', playerId: 'p2' })
    expect(stillDeciding.phase).toBe('decision')
  })

  it('a kicked diver no longer blocks the reward draft', () => {
    let state = reduce(twoDiverState(), { type: 'SPIN_WHEEL', seed: 42 })
    state = reduce(state, { type: 'ACCEPT_MISFORTUNE', accepted: true })
    state = reduce(state, { type: 'SET_PACTS', playerId: 'p1', pactIds: [] })
    state = reduce(state, { type: 'SET_PACTS', playerId: 'p2', pactIds: [] })
    state = reduce(state, { type: 'REPORT_RESULT', outcome: 'success', stars: 3 })
    expect(state.phase).toBe('rewards')
    const options = diverOptions(state, requireDiver(state))
    state = reduce(state, { type: 'PICK_REWARD', playerId: 'p1', optionId: requireId(options[0]?.optionId) })
    expect(reduce(state, { type: 'ADVANCE' })).toBe(state)
    state = reduce(state, { type: 'KICK_DIVER', playerId: 'p2' })
    state = reduce(state, { type: 'ADVANCE' })
    expect(state.phase).toBe('spin')
  })
})

describe('PICK_REWARD — Diver\'s Choice (S+)', () => {
  // The S+ ceiling is a rare roll, so the fixture searches offer seeds through
  // the real selector until one produces the choice slot — deterministic, no
  // runtime randomness, and the phase/offerSeed shape matches a real report.
  function choiceState(): DiveState {
    const base = divingState(42, PACTS.map(pact => pact.id))
    const diver = requireDiver(base)
    for (let offerSeed = 0; offerSeed < 4000; offerSeed++) {
      const candidate: DiveState = {
        ...base,
        phase: 'rewards',
        offerSeed,
        lastReport: { outcome: 'success', stars: 3 },
      }
      if (diverOptions(candidate, diver).some(option => option.choice)) {
        return candidate
      }
    }
    throw new Error('no offer seed produced a Diver\'s Choice offer')
  }

  function claimableId(state: DiveState): string {
    const diver = requireDiver(state)
    const owned = new Set(state.personalInventories[diver.id] ?? [])
    const item = rewardPoolFor(diver.warbondCodes).find(entry => !owned.has(entry.id))
    if (!item) {
      throw new Error('expected a claimable item')
    }
    return item.id
  }

  it('banks the item the diver names', () => {
    const state = choiceState()
    const itemId = claimableId(state)
    const picked = reduce(state, {
      type: 'PICK_REWARD',
      playerId: 'p1',
      optionId: DIVERS_CHOICE_OPTION_ID,
      choiceItemId: itemId,
    })
    expect(picked.divers[0]?.pickedOptionId).toBe(itemId)
    expect(picked.personalInventories.p1).toContain(itemId)
    expect(allDiversPicked(picked)).toBe(true)
    // A catalog item was banked — the sentinel never enters the inventory.
    expect(ITEMS_BY_ID.has(itemId)).toBe(true)
  })

  it('refuses a choice pick that names no item', () => {
    const state = choiceState()
    expect(reduce(state, { type: 'PICK_REWARD', playerId: 'p1', optionId: DIVERS_CHOICE_OPTION_ID })).toBe(state)
    expect(reduce(state, { type: 'PICK_REWARD', playerId: 'p1', optionId: DIVERS_CHOICE_OPTION_ID, choiceItemId: 'ghostgun' })).toBe(state)
  })

  it('refuses items outside the diver\'s own warbonds', () => {
    const state = reduce(choiceState(), { type: 'SET_WARBONDS', playerId: 'p1', warbondCodes: [] })
    const foreign = ALL_ITEMS.find(item => item.warbondCode !== 'none' && item.category !== 'armor')
    if (!foreign) {
      throw new Error('expected a warbond-gated item')
    }
    expect(reduce(state, {
      type: 'PICK_REWARD',
      playerId: 'p1',
      optionId: DIVERS_CHOICE_OPTION_ID,
      choiceItemId: foreign.id,
    })).toBe(state)
  })

  it('refuses armor pieces — rewards are the passives', () => {
    const state = choiceState()
    const piece = ALL_ITEMS.find(item => item.category === 'armor')
    if (!piece) {
      throw new Error('expected an armor piece')
    }
    expect(reduce(state, {
      type: 'PICK_REWARD',
      playerId: 'p1',
      optionId: DIVERS_CHOICE_OPTION_ID,
      choiceItemId: piece.id,
    })).toBe(state)
  })

  it('refuses items the diver already owns', () => {
    const state = choiceState()
    const owned = requireId(state.personalInventories.p1?.[0])
    expect(reduce(state, {
      type: 'PICK_REWARD',
      playerId: 'p1',
      optionId: DIVERS_CHOICE_OPTION_ID,
      choiceItemId: owned,
    })).toBe(state)
  })
})
