import { describe, expect, it } from 'vitest'
import { ALL_ITEMS, ITEMS_BY_ID } from '../data/catalog'
import { PACTS } from '../data/pacts'
import { BONUS_STATS, MISFORTUNE_RISK, REWARD_TOKEN_CAP, STRAIN_RISK, baseTierFor } from './config'
import { startingItemIds } from './progression'
import { DIVERS_CHOICE_OPTION_ID, maxCeiling } from './rewards'
import { createDiveState, reduce } from './reducer'
import { createLobbyState, joinDiver } from './room'
import { BLOCKED_UNDER_MISFORTUNE } from './pacts'
import { allDiversPicked, bonusEligible, bonusFor, canRerollWheel, catchUpOptionsFor, comboKey, diverCeiling, diverValor, diverOptions, pactOfferFor, pactRiskOf, rewardPoolFor, teamRiskOf } from './selectors'
import { deriveFront, deriveStrain } from './wheel'
import type { DiveState, DiverState, EngineAction } from './types'

const SETTINGS = { variant: 'standard' as const }

function freshState(): DiveState {
  return createDiveState(SETTINGS, 'p1', 'Griffin')
}

function spunState(seed = 42): DiveState {
  return reduce(freshState(), { type: 'SPIN_WHEEL', seed })
}

// The strain decision follows the misfortune on the operation's first mission.
// These tests are about the misfortune/pact economy, so the helper declines
// the strain and leaves team risk to the misfortune alone.
function decidedState(seed = 42, accepted = true): DiveState {
  const decided = reduce(spunState(seed), { type: 'ACCEPT_MISFORTUNE', accepted })
  return decided.phase === 'strain'
    ? reduce(decided, { type: 'ACCEPT_STRAIN', accepted: false })
    : decided
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

function twoDiverState(): DiveState {
  return {
    ...freshState(),
    divers: [
      { id: 'p1', name: 'A', isHost: true, pactsLocked: false, pactIds: [], failedPactIds: [], pickedOptionId: null, warbondCodes: [], catchUpGranted: 0, catchUpOwed: 0, skipsCurrentDraft: false, rewardTokens: 0, bannedItemIds: [], rewardRerollSeed: null, rewardBanned: false },
      { id: 'p2', name: 'B', isHost: false, pactsLocked: false, pactIds: [], failedPactIds: [], pickedOptionId: null, warbondCodes: [], catchUpGranted: 0, catchUpOwed: 0, skipsCurrentDraft: false, rewardTokens: 0, bannedItemIds: [], rewardRerollSeed: null, rewardBanned: false },
    ],
    personalInventories: {
      p1: startingItemIds(SETTINGS.variant),
      p2: startingItemIds(SETTINGS.variant),
    },
  }
}

const skeletonActions: EngineAction[] = [
  { type: 'START_DIVE', settings: SETTINGS },
  { type: 'SPIN_WHEEL', seed: 1 },
  { type: 'ACCEPT_MISFORTUNE', accepted: true },
  { type: 'REROLL_WHEEL', wheel: 'misfortune', seed: 2 },
  { type: 'SET_PACTS', playerId: 'p1', pactIds: ['thirsty'] },
  { type: 'FAIL_PACT', playerId: 'p1', pactId: 'thirsty' },
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
    const rerolled = reduce(state, { type: 'REROLL_WHEEL', wheel: 'misfortune', seed: 44 })
    expect(rerolled.rerollTokens).toBe(0)
    expect(rerolled.seedHistory).toEqual([42, 44])
  })

  it('refuses a reroll that would return the replaced result', () => {
    const state = spunState(42)
    // Same seed, same derivation — the token is not spent on a no-op.
    const sameRoll = reduce(state, { type: 'REROLL_WHEEL', wheel: 'misfortune', seed: 42 })
    expect(sameRoll).toBe(state)
    expect(sameRoll.rerollTokens).toBe(1)
    const sameFront = reduce(state, { type: 'REROLL_WHEEL', wheel: 'front', seed: 42 })
    expect(sameFront).toBe(state)
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
      completedCombos: [comboKey(state.wheel!.misfortuneId, state.frontId!, state.strainId)],
    }
    const rerolled = reduce(marked, { type: 'REROLL_WHEEL', wheel: 'misfortune', seed: 44 })
    expect(rerolled.rerollTokens).toBe(1)
    expect(rerolled.wheel?.seed).toBe(44)
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

  it('reopens the front reroll at the start of a new operation', () => {
    // ADVANCE keeps missionIndex climbing while resetting missionInOperation to
    // 1; the opening mission draws a fresh front, so the gate must be
    // per-operation, not global.
    const state: DiveState = { ...spunState(42), missionIndex: 12, missionInOperation: 1 }
    expect(canRerollWheel(state, 'front').allowed).toBe(true)
    const rerolled = reduce(state, { type: 'REROLL_WHEEL', wheel: 'front', seed: 43 })
    expect(rerolled.seedHistory).toEqual([42, 43])
  })
})

describe('ACCEPT_MISFORTUNE (optional team risk)', () => {
  it('moves the squad from decision to the strain call, then to pacts', () => {
    const state = spunState(42)
    expect(state.phase).toBe('decision')
    // The operation's first mission hands over to the strain decision, which
    // carries the operation-long commitment.
    const accepted = reduce(state, { type: 'ACCEPT_MISFORTUNE', accepted: true })
    expect(accepted.misfortuneAccepted).toBe(true)
    expect(accepted.phase).toBe('strain')
    expect(accepted.strainId).not.toBeNull()
    const declined = reduce(accepted, { type: 'ACCEPT_STRAIN', accepted: false })
    expect(declined.strainAccepted).toBe(false)
    expect(declined.phase).toBe('pacts')
    // The misfortune can still be flipped in the strain window.
    const flipped = reduce(accepted, { type: 'ACCEPT_MISFORTUNE', accepted: false })
    expect(flipped.misfortuneAccepted).toBe(false)
    expect(flipped.phase).toBe('strain')
  })

  it('skips the strain call when no subfaction was drawn', () => {
    const state: DiveState = { ...spunState(42), strainId: null }
    const decided = reduce(state, { type: 'ACCEPT_MISFORTUNE', accepted: true })
    expect(decided.phase).toBe('pacts')
  })

  it('freezes the decision once any pact is locked', () => {
    const locked = divingState(42)
    expect(reduce(locked, { type: 'ACCEPT_MISFORTUNE', accepted: !locked.misfortuneAccepted })).toBe(locked)
  })

  it('resets the decision on a reroll', () => {
    const accepted = decidedState(42)
    const rerolled = reduce(accepted, { type: 'REROLL_WHEEL', wheel: 'misfortune', seed: 44 })
    expect(rerolled.misfortuneAccepted).toBe(false)
    expect(rerolled.phase).toBe('decision')
    expect(rerolled.wheel?.seed).toBe(44)
  })

  it('refuses a misfortune that would strand a diver below four stratagems', () => {
    // The standard kit fields three airstrikes; Oops, All Airstrikes needs
    // four, so accepting is impossible — declining and rerolling stay open.
    const state: DiveState = {
      ...freshState(),
      difficulty: 6,
      wheel: { seed: 1, misfortuneId: 'oopsAllAirstrikes' },
      phase: 'decision',
    }
    expect(reduce(state, { type: 'ACCEPT_MISFORTUNE', accepted: true })).toBe(state)
    const declined = reduce(state, { type: 'ACCEPT_MISFORTUNE', accepted: false })
    expect(declined.misfortuneAccepted).toBe(false)
    expect(declined.phase).toBe('pacts')
  })

  it('accepts a misfortune the squad can field', () => {
    // Quickplay's extra red stratagems clear the four-airstrike floor.
    const state: DiveState = {
      ...createDiveState({ variant: 'quickplay' }, 'p1', 'Griffin'),
      difficulty: 6,
      wheel: { seed: 1, misfortuneId: 'oopsAllAirstrikes' },
      phase: 'decision',
    }
    const accepted = reduce(state, { type: 'ACCEPT_MISFORTUNE', accepted: true })
    expect(accepted.misfortuneAccepted).toBe(true)
    expect(accepted.phase).toBe('pacts')
  })
})

describe('ACCEPT_STRAIN (optional operation-long team risk)', () => {
  function strainDrawn(seed = 42): DiveState {
    const state = spunState(seed)
    if (!state.strainId) {
      throw new Error('expected a strain draw')
    }
    return state
  }

  function strainDecided(seed = 42, accepted = true): DiveState {
    return reduce(
      reduce(strainDrawn(seed), { type: 'ACCEPT_MISFORTUNE', accepted: true }),
      { type: 'ACCEPT_STRAIN', accepted },
    )
  }

  it('adds its team risk to every mission of the operation', () => {
    const decided = strainDecided(42, true)
    expect(decided.phase).toBe('pacts')
    const strainRisk = STRAIN_RISK[decided.strainId!] ?? 0
    const misfortuneRisk = MISFORTUNE_RISK[decided.wheel!.misfortuneId] ?? 0
    expect(strainRisk).toBeGreaterThan(0)
    expect(teamRiskOf(decided)).toBe(misfortuneRisk + strainRisk)

    let state = reduce(decided, { type: 'SET_PACTS', playerId: 'p1', pactIds: [] })
    state = reduce(state, { type: 'REPORT_RESULT', outcome: 'success', stars: 3 })
    state = reduce(state, {
      type: 'PICK_REWARD',
      playerId: 'p1',
      optionId: requireId(diverOptions(state, requireDiver(state))[0]?.optionId),
    })
    state = reduce(state, { type: 'ADVANCE' })
    expect(state.missionInOperation).toBe(2)

    // Mission 2 inherits the accepted strain: same draw, same risk.
    state = reduce(state, { type: 'SPIN_WHEEL', seed: 60 })
    const missionTwo = reduce(state, { type: 'ACCEPT_MISFORTUNE', accepted: false })
    expect(missionTwo.strainId).toBe(decided.strainId)
    expect(missionTwo.strainAccepted).toBe(true)
    expect(teamRiskOf(missionTwo)).toBe(strainRisk)
    // Later missions never reopen the strain call.
    expect(reduce(missionTwo, { type: 'ACCEPT_STRAIN', accepted: false })).toBe(missionTwo)
  })

  it('declines for free: only the misfortune keeps staking risk', () => {
    const declined = strainDecided(42, false)
    expect(declined.phase).toBe('pacts')
    expect(declined.strainAccepted).toBe(false)
    expect(teamRiskOf(declined)).toBe(MISFORTUNE_RISK[declined.wheel!.misfortuneId] ?? 0)
  })

  it('reopens on a failure restart with the same draw', () => {
    let state = reduce(strainDecided(42, true), { type: 'SET_PACTS', playerId: 'p1', pactIds: [] })
    const strainId = state.strainId
    state = reduce(state, { type: 'REPORT_RESULT', outcome: 'failure', stars: 1 })
    state = reduce(state, {
      type: 'FORFEIT_ITEM',
      itemRef: { ownerId: 'p1', itemId: requireId(state.personalInventories.p1?.[0]) },
    })
    expect(state.phase).toBe('spin')
    expect(state.strainAccepted).toBe(false)
    state = reduce(state, { type: 'SPIN_WHEEL', seed: 60 })
    expect(state.strainId).toBe(strainId)
    const redecided = reduce(
      reduce(state, { type: 'ACCEPT_MISFORTUNE', accepted: false }),
      { type: 'ACCEPT_STRAIN', accepted: true },
    )
    expect(redecided.strainAccepted).toBe(true)
  })

  it('clears the strain when the operation completes', () => {
    let state = reduce(strainDecided(42, true), { type: 'SET_PACTS', playerId: 'p1', pactIds: [] })
    // Medium runs two-mission operations.
    for (let mission = 0; mission < 2; mission++) {
      state = reduce(state, { type: 'REPORT_RESULT', outcome: 'success', stars: 3 })
      state = reduce(state, {
        type: 'PICK_REWARD',
        playerId: 'p1',
        optionId: requireId(diverOptions(state, requireDiver(state))[0]?.optionId),
      })
      state = reduce(state, { type: 'ADVANCE' })
      if (mission === 0) {
        expect(state.strainId).not.toBeNull()
        expect(state.strainAccepted).toBe(true)
        state = reduce(state, { type: 'SPIN_WHEEL', seed: 60 })
        state = reduce(state, { type: 'ACCEPT_MISFORTUNE', accepted: false })
        state = reduce(state, { type: 'SET_PACTS', playerId: 'p1', pactIds: [] })
      }
    }
    expect(state.difficulty).toBe(4)
    expect(state.frontId).toBeNull()
    expect(state.strainId).toBeNull()
    expect(state.strainAccepted).toBe(false)
  })

  it('rerolls the strain for a token and reopens the call', () => {
    const state = strainDrawn(42)
    let seed = 0
    while (deriveStrain(seed, state.difficulty, state.frontId!)?.id === state.strainId) {
      seed++
    }
    const rerolled = reduce(state, { type: 'REROLL_WHEEL', wheel: 'strain', seed })
    expect(rerolled.strainId).not.toBe(state.strainId)
    expect(rerolled.strainId).toBe(deriveStrain(seed, state.difficulty, state.frontId!)?.id)
    expect(rerolled.strainAccepted).toBe(false)
    expect(rerolled.rerollTokens).toBe(0)
    expect(rerolled.phase).toBe('decision')
  })

  it('refuses a strain reroll that would return the same subfaction', () => {
    const state = strainDrawn(42)
    expect(reduce(state, { type: 'REROLL_WHEEL', wheel: 'strain', seed: 42 })).toBe(state)
    expect(state.rerollTokens).toBe(1)
  })

  it('redraws the strain when the front rerolls', () => {
    const state = strainDrawn(42)
    let seed = 0
    while (deriveFront(seed) === state.frontId) {
      seed++
    }
    const rerolled = reduce(state, { type: 'REROLL_WHEEL', wheel: 'front', seed })
    expect(rerolled.frontId).not.toBe(state.frontId)
    expect(rerolled.strainAccepted).toBe(false)
    expect(rerolled.strainId)
      .toBe(deriveStrain(seed, state.difficulty, rerolled.frontId!)?.id ?? null)
  })

  it('refuses the call once pacts are locked', () => {
    const locked = divingState(42)
    expect(reduce(locked, { type: 'ACCEPT_STRAIN', accepted: true })).toBe(locked)
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

describe('FAIL_PACT (broken pacts in the field)', () => {
  function divingWithHeldPact(seed = 42): { state: DiveState, pactId: string } {
    const decided = decidedState(seed)
    const pactId = offerPacts(decided)[0]!
    return { state: reduce(decided, { type: 'SET_PACTS', playerId: 'p1', pactIds: [pactId] }), pactId }
  }

  it('marks a held pact failed during the diving phase', () => {
    const { state, pactId } = divingWithHeldPact()
    expect(state.phase).toBe('diving')
    const failed = reduce(state, { type: 'FAIL_PACT', playerId: 'p1', pactId })
    expect(failed.divers[0]?.failedPactIds).toEqual([pactId])
    // The mark does not move the mission along or unlock anything.
    expect(failed.phase).toBe('diving')
    expect(failed.divers[0]?.pactsLocked).toBe(true)
  })

  it('is a no-op outside diving, for unheld pacts, ghosts, and double marks', () => {
    const decided = decidedState(42)
    const held = offerPacts(decided)[0]!
    expect(reduce(decided, { type: 'FAIL_PACT', playerId: 'p1', pactId: held })).toBe(decided)
    const { state, pactId } = divingWithHeldPact()
    expect(reduce(state, { type: 'FAIL_PACT', playerId: 'p1', pactId: outsideOffer(state) })).toBe(state)
    expect(reduce(state, { type: 'FAIL_PACT', playerId: 'ghost', pactId: pactId })).toBe(state)
    const once = reduce(state, { type: 'FAIL_PACT', playerId: 'p1', pactId: pactId })
    expect(reduce(once, { type: 'FAIL_PACT', playerId: 'p1', pactId: pactId })).toBe(once)
  })

  it('voids the failed pact\'s risk in Valor and ceiling', () => {
    const { state, pactId } = divingWithHeldPact()
    const diver = requireDiver(state)
    expect(pactRiskOf(diver)).toBeGreaterThan(0)
    const failed = reduce(state, { type: 'FAIL_PACT', playerId: 'p1', pactId })
    const failedDiver = requireDiver(failed)
    expect(pactRiskOf(failedDiver)).toBe(0)
    expect(diverValor(failed, failedDiver)).toBe(teamRiskOf(failed))
    expect(diverCeiling(failed, failedDiver)).toBe(maxCeiling(failed.difficulty, teamRiskOf(failed)))
  })

  it('forfeits one reward option per failed pact, never below one', () => {
    const decided = decidedState(42)
    const pactIds = offerPacts(decided)
    expect(pactIds.length).toBeGreaterThan(0)
    // Same mission, same report: the only difference is the broken pacts.
    const clean = reduce(decided, { type: 'SET_PACTS', playerId: 'p1', pactIds: [] })
    const cleanReported = reduce(clean, { type: 'REPORT_RESULT', outcome: 'success', stars: 3 })
    const cleanCount = diverOptions(cleanReported, requireDiver(cleanReported)).length
    const broken = pactIds.reduce(
      (state, pactId) => reduce(state, { type: 'FAIL_PACT', playerId: 'p1', pactId }),
      reduce(decided, { type: 'SET_PACTS', playerId: 'p1', pactIds }),
    )
    const brokenReported = reduce(broken, { type: 'REPORT_RESULT', outcome: 'success', stars: 3 })
    const brokenOptions = diverOptions(brokenReported, requireDiver(brokenReported))
    expect(brokenOptions.length).toBe(Math.max(1, cleanCount - pactIds.length))
    // The draft still completes: a thinner offer never deadlocks ADVANCE.
    const picked = brokenOptions[0]!
    const done = reduce(brokenReported, { type: 'PICK_REWARD', playerId: 'p1', optionId: picked.optionId })
    expect(allDiversPicked(done)).toBe(true)
    expect(reduce(done, { type: 'ADVANCE' }).phase).toBe('spin')
  })

  it('clears failed pacts with the rest of the mission state on advance', () => {
    const { state, pactId } = divingWithHeldPact()
    let next = reduce(state, { type: 'FAIL_PACT', playerId: 'p1', pactId })
    next = reduce(next, { type: 'REPORT_RESULT', outcome: 'success', stars: 3 })
    const option = diverOptions(next, requireDiver(next))[0]
    if (!option) {
      throw new Error('expected at least one reward option')
    }
    next = reduce(next, { type: 'PICK_REWARD', playerId: 'p1', optionId: option.optionId })
    next = reduce(next, { type: 'ADVANCE' })
    expect(next.divers[0]?.failedPactIds).toEqual([])
    expect(next.divers[0]?.pactIds).toEqual([])
  })

  it('leaves a zero-Valor failure at the difficulty\'s base tier', () => {
    const { state, pactId } = divingWithHeldPact()
    const failed = reduce(state, { type: 'FAIL_PACT', playerId: 'p1', pactId })
    // Declined wheel: team risk is zero too, so only the base tier remains.
    const declined = { ...failed, misfortuneAccepted: false }
    expect(diverCeiling(declined, requireDiver(declined))).toBe(baseTierFor(declined.difficulty))
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
    expect(state.completedCombos).toContain(
      comboKey(state.wheel!.misfortuneId, state.frontId!, state.strainId),
    )

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
      state = reduce(state, { type: 'ACCEPT_STRAIN', accepted: false })
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
        { id: 'p1', name: 'A', isHost: true, pactsLocked: false, pactIds: [], failedPactIds: [], pickedOptionId: null, warbondCodes: [], catchUpGranted: 0, catchUpOwed: 0, skipsCurrentDraft: false, rewardTokens: 0, bannedItemIds: [], rewardRerollSeed: null, rewardBanned: false },
        { id: 'p2', name: 'B', isHost: false, pactsLocked: false, pactIds: [], failedPactIds: [], pickedOptionId: null, warbondCodes: [], catchUpGranted: 0, catchUpOwed: 0, skipsCurrentDraft: false, rewardTokens: 0, bannedItemIds: [], rewardRerollSeed: null, rewardBanned: false },
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
})

describe('KICK_DIVER', () => {
  it('removes the diver, parks their inventory as a legacy cache', () => {
    const state = reduce(twoDiverState(), { type: 'KICK_DIVER', playerId: 'p2' })
    expect(state.divers.map(diver => diver.id)).toEqual(['p1'])
    expect(state.personalInventories.p2).toBeUndefined()
    expect(state.legacyCaches.p2).toEqual(startingItemIds(SETTINGS.variant))
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
    const decided = reduce(
      reduce(spun, { type: 'ACCEPT_MISFORTUNE', accepted: true }),
      { type: 'ACCEPT_STRAIN', accepted: false },
    )
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
    state = reduce(state, { type: 'ACCEPT_STRAIN', accepted: false })
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

describe('LEAVE_DIVE', () => {
  it('parks the leaver\u2019s inventory as a legacy cache and frees the squad', () => {
    const state = reduce(twoDiverState(), { type: 'LEAVE_DIVE', playerId: 'p2' })
    expect(state.divers.map(diver => diver.id)).toEqual(['p1'])
    expect(state.legacyCaches.p2).toEqual(startingItemIds(SETTINGS.variant))
    expect(state.personalInventories.p2).toBeUndefined()
  })

  it('transfers host to the earliest joiner when the host leaves', () => {
    const state = reduce(twoDiverState(), { type: 'LEAVE_DIVE', playerId: 'p1' })
    expect(state.divers.map(diver => diver.id)).toEqual(['p2'])
    expect(state.hostId).toBe('p2')
    expect(state.divers[0]?.isHost).toBe(true)
    expect(state.legacyCaches.p1).toEqual(startingItemIds(SETTINGS.variant))
  })

  it('resets to a fresh lobby when the last diver leaves', () => {
    const state = reduce(twoDiverState(), { type: 'LEAVE_DIVE', playerId: 'p1' })
    const emptied = reduce(state, { type: 'LEAVE_DIVE', playerId: 'p2' })
    expect(emptied.phase).toBe('lobby')
    expect(emptied.settings).toBeNull()
    expect(emptied.divers).toEqual([])
    expect(emptied.legacyCaches).toEqual({})
  })

  it('parks no empty cache from a lobby departure', () => {
    const lobby = joinDiver(joinDiver(createLobbyState(), 'p1', 'A')!, 'p2', 'B')
    if (!lobby) {
      throw new Error('expected both divers seated')
    }
    const left = reduce(lobby, { type: 'LEAVE_DIVE', playerId: 'p2' })
    expect(left.divers.map(diver => diver.id)).toEqual(['p1'])
    expect(left.legacyCaches).toEqual({})
  })

  it('a departing unknown diver is a no-op', () => {
    const base = twoDiverState()
    expect(reduce(base, { type: 'LEAVE_DIVE', playerId: 'ghost' })).toBe(base)
  })
})

describe('Field Promotion (mid-crusade catch-up)', () => {
  // Fixture shortcut: drive the crusade to difficulty 7 (standard starts at
  // 3 → four operations behind), then seat a late joiner at the spin.
  function catchUpState(difficulty = 7): DiveState {
    let state = createDiveState(SETTINGS, 'p1', 'Griffin')
    state = reduce(state, { type: 'SPIN_WHEEL', seed: 42 })
    state = { ...state, difficulty, missionIndex: 9, phase: 'spin', wheel: null }
    return joinDiver(state, 'late', 'Latecomer')!
  }

  function lateDiver(state: DiveState): DiverState {
    const diver = state.divers.find(candidate => candidate.id === 'late')
    if (!diver) {
      throw new Error('expected the late joiner to be seated')
    }
    return diver
  }

  it('banks one base-tier option per pick until the promotion is spent', () => {
    const state = catchUpState()
    expect(lateDiver(state).catchUpOwed).toBe(4)
    let updated = state
    // The grant rolls once and claimed options drop out of the draft, so the
    // whole promotion never exposes more candidates than it granted (N22).
    const seen = new Set<string>()
    for (let pick = 0; pick < 4; pick++) {
      const options = catchUpOptionsFor(updated, lateDiver(updated))
      for (const option of options) {
        seen.add(option.optionId)
      }
      const option = options[0]
      if (!option) {
        throw new Error('expected a catch-up option')
      }
      updated = reduce(updated, {
        type: 'CLAIM_CATCHUP_OPTION',
        playerId: 'late',
        optionId: option.optionId,
      })
    }
    expect(seen.size).toBe(lateDiver(state).catchUpGranted)
    expect(lateDiver(updated).catchUpOwed).toBe(0)
    expect(catchUpOptionsFor(updated, lateDiver(updated))).toEqual([])
    expect(updated.personalInventories.late!.length).toBeGreaterThan(startingItemIds(SETTINGS.variant).length)
  })

  it('rejects options outside the rolled offer and picks when not owed', () => {
    const state = catchUpState()
    const offered = new Set(catchUpOptionsFor(state, lateDiver(state)).map(option => option.optionId))
    const outside = ALL_ITEMS.map(item => item.id).find(id => !offered.has(id))
    if (!outside) {
      throw new Error('expected an item outside the offer')
    }
    expect(reduce(state, { type: 'CLAIM_CATCHUP_OPTION', playerId: 'late', optionId: outside })).toBe(state)
    expect(reduce(state, { type: 'CLAIM_CATCHUP_OPTION', playerId: 'p1', optionId: requireId(offered.values().next().value) })).toBe(state)
  })

  it('never rolls above the base tier, whatever the seed', () => {
    // Difficulty 5: base tier C — every option must carry the c tier.
    for (let seed = 0; seed < 200; seed++) {
      const state = { ...catchUpState(5), seedHistory: [seed] }
      const options = catchUpOptionsFor(state, lateDiver(state))
      expect(options.length).toBeGreaterThan(0)
      for (const option of options) {
        expect(option.choice).toBeUndefined()
        expect(option.item.tier).toBe('c')
      }
    }
  })

  it('claims a legacy cache wholesale instead of the promotion', () => {
    let state = catchUpState()
    state = { ...state, legacyCaches: { ...state.legacyCaches, departed: ['uavrecon'] } }
    const claimed = reduce(state, { type: 'CLAIM_CACHE', playerId: 'late', cacheOwnerId: 'departed' })
    expect(claimed.legacyCaches).toEqual({})
    expect(lateDiver(claimed).catchUpOwed).toBe(0)
    expect(claimed.personalInventories.late).toContain('uavrecon')
  })

  it('refuses a cache after promotion options were already rolled', () => {
    let state = catchUpState()
    state = { ...state, legacyCaches: { ...state.legacyCaches, departed: ['uavrecon'] } }
    const option = catchUpOptionsFor(state, lateDiver(state))[0]
    if (!option) {
      throw new Error('expected a catch-up option')
    }
    state = reduce(state, { type: 'CLAIM_CATCHUP_OPTION', playerId: 'late', optionId: option.optionId })
    expect(reduce(state, { type: 'CLAIM_CACHE', playerId: 'late', cacheOwnerId: 'departed' })).toBe(state)
    expect(state.legacyCaches.departed).toEqual(['uavrecon'])
  })

  it('a joiner seated mid-mission skips the current draft instead of blocking it', () => {
    let state = twoDiverState()
    state = reduce(state, { type: 'SPIN_WHEEL', seed: 42 })
    state = reduce(state, { type: 'ACCEPT_MISFORTUNE', accepted: true })
    state = reduce(state, { type: 'ACCEPT_STRAIN', accepted: false })
    state = reduce(state, { type: 'SET_PACTS', playerId: 'p1', pactIds: [] })
    state = reduce(state, { type: 'SET_PACTS', playerId: 'p2', pactIds: [] })
    // 'late' arrives while the squad is diving — the mission is not theirs.
    state = { ...state, phase: 'diving' }
    state = joinDiver(state, 'late', 'Latecomer')!
    const late = state.divers.find(diver => diver.id === 'late')
    if (!late) {
      throw new Error('expected the late joiner to be seated')
    }
    expect(late.skipsCurrentDraft).toBe(true)
    state = reduce(state, { type: 'REPORT_RESULT', outcome: 'success', stars: 3 })
    expect(diverOptions(state, late)).toEqual([])
    // Only the divers who dove need to pick; the skip never blocks ADVANCE.
    for (const diver of [state.divers[0], state.divers[1]]) {
      const option = diverOptions(state, diver!)[0]
      if (!option) {
        throw new Error('expected a reward option')
      }
      state = reduce(state, { type: 'PICK_REWARD', playerId: diver!.id, optionId: option.optionId })
    }
    expect(allDiversPicked(state)).toBe(true)
    const advanced = reduce(state, { type: 'ADVANCE' })
    expect(advanced.phase).toBe('spin')
    // The next mission is theirs: the skip clears with the mission reset.
    expect(advanced.divers.find(diver => diver.id === 'late')?.skipsCurrentDraft).toBe(false)
  })
})

describe('PICK_REWARD — Diver\'s Choice (S+)', () => {
  // The S+ ceiling is a rare roll, so the fixture searches offer seeds through
  // the real selector until one produces the choice slot — deterministic, no
  // runtime randomness, and the phase/offerSeed shape matches a real report.
  function choiceState(): DiveState {
    // S+ is gated behind real Valor (S_PLUS_VALOR_FLOOR), so the fixture fields
    // a heavy misfortune and two 3-risk pacts: Valor 5 + 3 + 3 = 11.
    const base = divingState(42, PACTS.map(pact => pact.id))
    const heavy: DiveState = {
      ...base,
      wheel: { seed: 42, misfortuneId: 'noStratagems' },
      misfortuneAccepted: true,
      divers: base.divers.map(entry =>
        entry.id === base.divers[0]?.id
          ? { ...entry, pactIds: ['stimAbstinent', 'untouchable'], failedPactIds: [] }
          : entry),
    }
    const diver = requireDiver(heavy)
    for (let offerSeed = 0; offerSeed < 4000; offerSeed++) {
      const candidate: DiveState = {
        ...heavy,
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

describe('reward tokens + bonus honors', () => {
  function rewardsState(seed = 42, pactIds: string[] = []): DiveState {
    return reduce(divingState(seed, pactIds), {
      type: 'REPORT_RESULT',
      outcome: 'success',
      stars: 5,
    })
  }

  function withTokens(state: DiveState, playerId: string, tokens: number): DiveState {
    return {
      ...state,
      divers: state.divers.map(diver =>
        diver.id === playerId ? { ...diver, rewardTokens: tokens } : diver,
      ),
    }
  }

  function pickFirst(state: DiveState): DiveState {
    const option = diverOptions(state, requireDiver(state))[0]
    if (!option) {
      throw new Error('expected a reward option')
    }
    return reduce(state, { type: 'PICK_REWARD', playerId: 'p1', optionId: option.optionId })
  }

  function spun(state: DiveState, seed = 7): DiveState {
    return reduce(state, { type: 'SPIN_BONUS', seed })
  }

  it('reveals no contest until the host spins it, after the draft completes', () => {
    const state = rewardsState()
    // Nothing is drawn before the spin.
    expect(bonusFor(state)).toBeNull()
    // The spin waits for the draft to complete.
    expect(reduce(state, { type: 'SPIN_BONUS', seed: 7 })).toBe(state)
    const spunState = spun(pickFirst(state), 7)
    const contest = bonusFor(spunState)
    expect(contest).not.toBeNull()
    expect(BONUS_STATS).toContainEqual(contest)
    expect(bonusFor(spunState)).toEqual(contest)
    // One spin per mission.
    expect(reduce(spunState, { type: 'SPIN_BONUS', seed: 8 })).toBe(spunState)
  })

  it('withholds honors unless a full-star clear lands on the cadence', () => {
    // Solo cadence is every third mission: mission 1 (index 0) is due.
    const due = rewardsState()
    expect(bonusEligible(due)).toBe(true)
    // A non-perfect clear earns no honors.
    const imperfect: DiveState = {
      ...due,
      lastReport: { outcome: 'success', stars: 1 },
    }
    expect(bonusEligible(imperfect)).toBe(false)
    expect(reduce(imperfect, { type: 'SPIN_BONUS', seed: 7 })).toBe(imperfect)
    // Off-cadence: solo index 1 is not due, index 3 is again.
    expect(bonusEligible({ ...due, missionIndex: 1 })).toBe(false)
    expect(reduce({ ...due, missionIndex: 1 }, { type: 'SPIN_BONUS', seed: 7 }))
      .toEqual({ ...due, missionIndex: 1 })
    expect(bonusEligible({ ...due, missionIndex: 3 })).toBe(true)
  })

  // Two divers who both dove and picked — the host still has a choice to make.
  function twoDiverRewards(): DiveState {
    let state = twoDiverState()
    state = reduce(state, { type: 'SPIN_WHEEL', seed: 42 })
    state = reduce(state, { type: 'ACCEPT_MISFORTUNE', accepted: true })
    state = reduce(state, { type: 'ACCEPT_STRAIN', accepted: false })
    state = reduce(state, { type: 'SET_PACTS', playerId: 'p1', pactIds: [] })
    state = reduce(state, { type: 'SET_PACTS', playerId: 'p2', pactIds: [] })
    state = reduce(state, { type: 'REPORT_RESULT', outcome: 'success', stars: 5 })
    for (const id of ['p1', 'p2']) {
      const diver = state.divers.find(entry => entry.id === id)
      const option = diver ? diverOptions(state, diver)[0] : undefined
      if (!option) {
        throw new Error('expected a reward option')
      }
      state = reduce(state, { type: 'PICK_REWARD', playerId: id, optionId: option.optionId })
    }
    return state
  }

  it('auto-resolves the honors when only one diver can win', () => {
    // Solo: the only diver is always the winner, so the spin banks the token
    // and no award action is needed.
    const state = spun(pickFirst(rewardsState()), 7)
    expect(state.bonusWinnerId).toBe('p1')
    expect(state.divers[0]?.rewardTokens).toBe(1)
    expect(reduce(state, { type: 'AWARD_BONUS', playerId: 'p1' })).toBe(state)
  })

  it('leaves selection to the host when more than one diver can win', () => {
    let state = twoDiverRewards()
    state = reduce(state, { type: 'SPIN_BONUS', seed: 7 })
    expect(state.bonusWinnerId).toBeNull()
    expect(state.divers.every(diver => diver.rewardTokens === 0)).toBe(true)
    expect(reduce(state, { type: 'AWARD_BONUS', playerId: 'ghost' })).toBe(state)
    const awarded = reduce(state, { type: 'AWARD_BONUS', playerId: 'p2' })
    expect(awarded.bonusWinnerId).toBe('p2')
    expect(awarded.divers.find(diver => diver.id === 'p2')?.rewardTokens).toBe(1)
    expect(awarded.divers.find(diver => diver.id === 'p1')?.rewardTokens).toBe(0)
    // One award per mission.
    expect(reduce(awarded, { type: 'AWARD_BONUS', playerId: 'p1' })).toBe(awarded)
  })

  it('refuses to award on a mission that no longer qualifies', () => {
    let state = twoDiverRewards()
    state = reduce(state, { type: 'SPIN_BONUS', seed: 7 })
    const lapsed: DiveState = {
      ...state,
      lastReport: { outcome: 'success', stars: 1 },
    }
    expect(reduce(lapsed, { type: 'AWARD_BONUS', playerId: 'p2' })).toBe(lapsed)
  })

  it('caps banked tokens', () => {
    let state = withTokens(rewardsState(), 'p1', REWARD_TOKEN_CAP)
    state = spun(pickFirst(state))
    state = reduce(state, { type: 'AWARD_BONUS', playerId: 'p1' })
    expect(state.divers[0]?.rewardTokens).toBe(REWARD_TOKEN_CAP)
  })

  it('spends a token to reroll the offer, and refuses a same-offer seed', () => {
    const state = withTokens(rewardsState(), 'p1', 1)
    const diver = requireDiver(state)
    const offerKey = (entry: DiverState): string =>
      diverOptions(state, entry).map(option => option.optionId).join('|')
    const current = offerKey(diver)
    let moved = -1
    for (let seed = 0; seed < 200; seed++) {
      if (offerKey({ ...diver, rewardRerollSeed: seed }) !== current) {
        moved = seed
        break
      }
    }
    if (moved < 0) {
      throw new Error('expected a seed that moves the offer')
    }
    const rerolled = reduce(state, { type: 'REROLL_REWARDS', playerId: 'p1', seed: moved })
    expect(rerolled.divers[0]?.rewardTokens).toBe(0)
    expect(rerolled.divers[0]?.rewardRerollSeed).toBe(moved)
    // A spent-out diver cannot reroll again.
    expect(reduce(rerolled, { type: 'REROLL_REWARDS', playerId: 'p1', seed: moved + 1 })).toBe(rerolled)
  })

  it('refuses a reroll that would re-derive the same offer', () => {
    // The diver already rerolled under seed 7; spending a token on seed 7 again
    // re-derives exactly the offer in hand and must be refused.
    const base = withTokens(rewardsState(), 'p1', 1)
    const state: DiveState = {
      ...base,
      divers: base.divers.map(diver =>
        diver.id === 'p1' ? { ...diver, rewardRerollSeed: 7 } : diver,
      ),
    }
    const diver = requireDiver(state)
    const current = diverOptions(state, diver).map(option => option.optionId).join('|')
    const same = diverOptions(state, { ...diver, rewardRerollSeed: 7 })
      .map(option => option.optionId)
      .join('|')
    expect(same).toBe(current)
    expect(reduce(state, { type: 'REROLL_REWARDS', playerId: 'p1', seed: 7 })).toBe(state)
    // The token is not spent on a refused reroll.
    expect(state.divers[0]?.rewardTokens).toBe(1)
  })

  it('spends a token to ban any/all offered items and forfeits the reward pick', () => {
    const state = withTokens(rewardsState(), 'p1', 1)
    const options = diverOptions(state, requireDiver(state))
    expect(options.length).toBeGreaterThan(1)
    const targets = options.map(option => option.optionId)
    const banned = reduce(state, { type: 'BAN_REWARDS', playerId: 'p1', optionIds: targets })
    expect(banned.divers[0]?.rewardTokens).toBe(0)
    expect(banned.divers[0]?.rewardBanned).toBe(true)
    for (const option of options) {
      expect(banned.divers[0]?.bannedItemIds).toContain(option.item.id)
      expect(diverOptions(banned, banned.divers[0]!).some(entry => entry.optionId === option.optionId)).toBe(false)
    }
    // The pick is forfeited: the draft resolves with nothing banked.
    expect(banned.divers[0]?.pickedOptionId).toBeNull()
    expect(allDiversPicked(banned)).toBe(true)
    // Bans persist across the mission reset; the ban flag clears.
    const advanced = reduce(banned, { type: 'ADVANCE' })
    expect(advanced.divers[0]?.bannedItemIds).toContain(options[0]!.item.id)
    expect(advanced.divers[0]?.rewardBanned).toBe(false)
  })

  it('refuses a ban with no token, an empty selection, or a resolved draft', () => {
    const noTokens = rewardsState()
    const first = diverOptions(noTokens, requireDiver(noTokens))[0]!
    expect(reduce(noTokens, {
      type: 'BAN_REWARDS',
      playerId: 'p1',
      optionIds: [first.optionId],
    })).toBe(noTokens)

    const withToken = withTokens(rewardsState(), 'p1', 1)
    expect(reduce(withToken, { type: 'BAN_REWARDS', playerId: 'p1', optionIds: [] })).toBe(withToken)
    // Already picked → resolved.
    const picked = pickFirst(withToken)
    expect(reduce(picked, {
      type: 'BAN_REWARDS',
      playerId: 'p1',
      optionIds: [first.optionId],
    })).toBe(picked)
  })

  it('never bans Liberty’s Cross', () => {
    // S+ is Valor-gated, so the fixture fields a heavy misfortune and two
    // 3-risk pacts (Valor 5 + 3 + 3 = 11) before searching for the choice slot.
    const base = divingState(42, PACTS.map(pact => pact.id))
    const heavy: DiveState = {
      ...base,
      wheel: { seed: 42, misfortuneId: 'noStratagems' },
      misfortuneAccepted: true,
      divers: base.divers.map(entry =>
        entry.id === base.divers[0]?.id
          ? { ...entry, pactIds: ['stimAbstinent', 'untouchable'], failedPactIds: [] }
          : entry),
    }
    const diver = requireDiver(heavy)
    let state: DiveState | null = null
    for (let offerSeed = 0; offerSeed < 4000 && !state; offerSeed++) {
      const candidate: DiveState = {
        ...heavy,
        phase: 'rewards',
        offerSeed,
        lastReport: { outcome: 'success', stars: 3 },
      }
      if (diverOptions(candidate, diver).some(option => option.choice)) {
        state = withTokens(candidate, 'p1', 1)
      }
    }
    if (!state) {
      throw new Error('no offer seed produced a choice offer')
    }
    const before = state.divers[0]!.rewardTokens
    expect(reduce(state, {
      type: 'BAN_REWARDS',
      playerId: 'p1',
      optionIds: [DIVERS_CHOICE_OPTION_ID],
    })).toBe(state)
    expect(state.divers[0]?.rewardTokens).toBe(before)
  })

  it('resets the bonus ceremony and the ban flag on advance', () => {
    let state = spun(pickFirst(rewardsState()))
    state = reduce(state, { type: 'AWARD_BONUS', playerId: 'p1' })
    const advanced = reduce(state, { type: 'ADVANCE' })
    expect(advanced.bonusSeed).toBeNull()
    expect(advanced.bonusWinnerId).toBeNull()
    expect(advanced.divers[0]?.rewardBanned).toBe(false)
  })
})

describe('unknown actions', () => {
  it('are no-ops, never corrupting state', () => {
    const state = freshState()
    const bogus = { type: 'NOT_AN_ACTION' } as unknown as EngineAction
    expect(reduce(state, bogus)).toBe(state)
  })
})
