import { describe, expect, it } from 'vitest'
import { REDEMPTION_TARGET_MAX } from './config'
import { heroPerfectTranscript } from './hero'
import { createDiveState, reduce } from './reducer'
import { diverValor, optionsLostFor, redemptionOf, redemptionTargetFor, reinforceBlockedFor, reinforceBlockersFor } from './selectors'
import type { DiveState, DiverState } from './types'

function diving(): DiveState {
  let state = createDiveState({ variant: 'medium' }, 'p1', 'Griffin')
  state = reduce(state, { type: 'SPIN_WHEEL', seed: 42 })
  state = reduce(state, { type: 'ACCEPT_MISFORTUNE', accepted: true })
  if (state.phase === 'strain') {
    state = reduce(state, { type: 'ACCEPT_STRAIN', accepted: false })
  }
  if (state.phase === 'deal') {
    state = reduce(state, { type: 'DEAL_PACTS' })
  }
  state = reduce(state, { type: 'SET_PACTS', playerId: 'p1', pactIds: [] })
  expect(state.phase).toBe('diving')
  return state
}

// Martyrdom drawn and accepted: the whole squad is held down.
function underMartyrdom(): DiveState {
  const state = diving()
  return { ...state, wheel: { ...state.wheel!, misfortuneId: 'noReserves' }, misfortuneAccepted: true, misfortuneFailed: false }
}

// Dead Weight sworn by the host, under a directive that doesn't block anyone.
function underDeadWeight(): DiveState {
  const state = diving()
  return {
    ...state,
    wheel: { ...state.wheel!, misfortuneId: 'noBoosters' },
    divers: state.divers.map(diver => ({ ...diver, pactIds: ['deadWeight'] })),
  }
}

function host(state: DiveState): DiverState {
  return state.divers[0]!
}

function clearRun(state: DiveState, seed: number): DiveState {
  const begun = reduce(state, { type: 'BEGIN_REDEMPTION', playerId: 'p1', seed })
  const target = redemptionOf(host(begun)).run!.target
  const transcript = heroPerfectTranscript(seed, { targetRound: target }, 120)
  return reduce(begun, { type: 'SUBMIT_REDEMPTION', playerId: 'p1', seed, transcript })
}

describe('reinforceBlockedFor', () => {
  it('holds a diver down under Martyrdom or their own Dead Weight', () => {
    expect(reinforceBlockersFor(underMartyrdom(), host(underMartyrdom()))).toEqual(['noReserves'])
    expect(reinforceBlockersFor(underDeadWeight(), host(underDeadWeight()))).toEqual(['deadWeight'])
  })

  it('lets nobody redeem against a rule already marked broken', () => {
    const martyrdom = { ...underMartyrdom(), misfortuneFailed: true }
    expect(reinforceBlockedFor(martyrdom, host(martyrdom))).toBe(false)
    const deadWeight = underDeadWeight()
    const failed = { ...deadWeight, divers: deadWeight.divers.map(diver => ({ ...diver, failedPactIds: ['deadWeight'] })) }
    expect(reinforceBlockedFor(failed, host(failed))).toBe(false)
  })

  it('binds only while diving', () => {
    const state = { ...underMartyrdom(), phase: 'rewards' as const }
    expect(reinforceBlockedFor(state, host(state))).toBe(false)
  })

  it('targets the difficulty, one higher per redemption earned, capped', () => {
    const state = underMartyrdom()
    expect(redemptionTargetFor(state, host(state))).toBe(state.difficulty)
    const twice = { ...host(state), redemption: { earned: 2, run: null } }
    expect(redemptionTargetFor(state, twice)).toBe(state.difficulty + 2)
    const many = { ...host(state), redemption: { earned: 99, run: null } }
    expect(redemptionTargetFor(state, many)).toBe(REDEMPTION_TARGET_MAX)
  })
})

describe('Redemption actions', () => {
  it('opens a run on the committed seed and counts retries', () => {
    const state = underMartyrdom()
    const first = reduce(state, { type: 'BEGIN_REDEMPTION', playerId: 'p1', seed: 11 })
    expect(redemptionOf(host(first)).run).toEqual({ seed: 11, target: state.difficulty, tries: 1 })
    expect(first.seedHistory.at(-1)).toBe(11)
    const again = reduce(first, { type: 'BEGIN_REDEMPTION', playerId: 'p1', seed: 12 })
    expect(redemptionOf(host(again)).run).toEqual({ seed: 12, target: state.difficulty, tries: 2 })
  })

  it('refuses a run when no rule holds the diver down', () => {
    const state = diving()
    const free = { ...state, wheel: { ...state.wheel!, misfortuneId: 'noBoosters' } }
    expect(reduce(free, { type: 'BEGIN_REDEMPTION', playerId: 'p1', seed: 1 })).toBe(free)
    const martyrdom = underMartyrdom()
    expect(reduce(martyrdom, { type: 'BEGIN_REDEMPTION', playerId: 'p1', seed: 1.5 })).toBe(martyrdom)
  })

  it('earns a redemption on a cleared run and raises the next target', () => {
    const state = underDeadWeight()
    const redeemed = clearRun(state, 2026)
    expect(redemptionOf(host(redeemed))).toEqual({ earned: 1, run: null })
    expect(redemptionTargetFor(redeemed, host(redeemed))).toBe(state.difficulty + 1)
    expect(redeemed.actionLog.at(-1)).toMatchObject({ type: 'SUBMIT_REDEMPTION', transcript: null })
  })

  it('leaves Valor, options and the rule itself untouched', () => {
    const state = underDeadWeight()
    const redeemed = clearRun(state, 7)
    expect(diverValor(redeemed, host(redeemed))).toBe(diverValor(state, host(state)))
    expect(optionsLostFor(redeemed, host(redeemed))).toBe(optionsLostFor(state, host(state)))
    expect(host(redeemed).pactIds).toEqual(['deadWeight'])
    expect(host(redeemed).failedPactIds).toEqual([])
  })

  it('refuses a submission that does not clear the committed run', () => {
    const begun = reduce(underMartyrdom(), { type: 'BEGIN_REDEMPTION', playerId: 'p1', seed: 5 })
    const target = redemptionOf(host(begun)).run!.target
    const slow = heroPerfectTranscript(5, { targetRound: target }, 3_000)
    expect(reduce(begun, { type: 'SUBMIT_REDEMPTION', playerId: 'p1', seed: 5, transcript: slow })).toBe(begun)
    const short = heroPerfectTranscript(5, { targetRound: target - 1 }, 120)
    expect(reduce(begun, { type: 'SUBMIT_REDEMPTION', playerId: 'p1', seed: 5, transcript: short })).toBe(begun)
    const good = heroPerfectTranscript(5, { targetRound: target }, 120)
    expect(reduce(begun, { type: 'SUBMIT_REDEMPTION', playerId: 'p1', seed: 6, transcript: good })).toBe(begun)
    expect(reduce(begun, { type: 'SUBMIT_REDEMPTION', playerId: 'p1', seed: 5, transcript: null })).toBe(begun)
    const unopened = underMartyrdom()
    expect(reduce(unopened, { type: 'SUBMIT_REDEMPTION', playerId: 'p1', seed: 5, transcript: good })).toBe(unopened)
  })

  it('resets with the mission', () => {
    const redeemed = clearRun(underMartyrdom(), 3)
    const reported = reduce(redeemed, { type: 'REPORT_RESULT', outcome: 'failure', stars: 0 })
    let next = reported
    for (let i = 0; i < 5 && next.phase !== 'spin'; i++) {
      for (const diver of next.divers) {
        const itemId = next.personalInventories[diver.id]?.[0]
        if (next.phase === 'forfeit' && itemId) {
          next = reduce(next, { type: 'FORFEIT_ITEM', playerId: diver.id, itemId })
        }
      }
      next = reduce(next, { type: 'ADVANCE' })
    }
    expect(host(next).redemption).toBeUndefined()
  })
})
