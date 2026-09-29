// Deterministic engine states for the design conformance harness.
//
// The conformance check (e2e/design-conformance.spec.ts) drives the app into
// each design page's state by seeding a local save — far more robust than
// clicking through the whole flow, and it lets a screen be checked in
// isolation. These builders use the same pure reducer the app and server use,
// so a fixture can never drift from the engine.

import { createDiveState, reduce } from '../shared/engine/reducer'
import { createLobbyState, joinDiver } from '../shared/engine/room'
import { createSaveDoc } from '../shared/engine/saves'
import { MISFORTUNE_RISK, STRAIN_RISK } from '../shared/engine/config'
import { diverOptions, pactOfferFor } from '../shared/engine/selectors'
import type { DiveState } from '../shared/engine/types'
import type { SaveDoc } from '../shared/types/save'

const SETTINGS = { variant: 'standard' as const }
const HOST = 'host'
const NAME = 'Griffon'

// A fixed seed per fixture so every run derives the same wheel/offer.
const SEED = 0x5eed1234

function fresh(): DiveState {
  return createDiveState(SETTINGS, HOST, NAME)
}

function spun(): DiveState {
  return reduce(fresh(), { type: 'SPIN_WHEEL', seed: SEED })
}

// Resolve the wheel decision (misfortune + strain) and deal the hand. The
// accept is best-effort: an unfieldable draw is declined so the fixture always
// reaches the next phase.
function wheelResolved(acceptMisfortune: boolean, acceptStrain: boolean): DiveState {
  let state = spun()
  state = reduce(state, { type: 'ACCEPT_MISFORTUNE', accepted: acceptMisfortune })
  if (state.phase === 'decision') {
    state = reduce(state, { type: 'ACCEPT_MISFORTUNE', accepted: false })
  }
  if (state.phase === 'strain') {
    state = reduce(state, { type: 'ACCEPT_STRAIN', accepted: acceptStrain })
  }
  if (state.phase === 'deal') {
    state = reduce(state, { type: 'DEAL_PACTS' })
  }
  return state
}

// Lock a couple of offered pacts (skipping any the accepted misfortune blocks).
function pactLocked(state: DiveState): DiveState {
  const offered = pactOfferFor(state, HOST).map(pact => pact.id)
  const chosen = offered.slice(0, Math.min(2, offered.length))
  return reduce(state, { type: 'SET_PACTS', playerId: HOST, pactIds: chosen })
}

// The full scripted climb to difficulty 10 so the achieved screen has a real
// record behind it. Mirrors shared/engine/golden.spec.ts.
function achieved(): DiveState {
  let state = createDiveState(SETTINGS, HOST, NAME)
  for (let mission = 0; mission < 80 && state.phase !== 'complete'; mission++) {
    state = reduce(state, { type: 'SPIN_WHEEL', seed: (mission * 2654435761) >>> 0 })
    const wantsRisk = (MISFORTUNE_RISK[state.wheel!.misfortuneId] ?? 0) >= 3
    state = reduce(state, { type: 'ACCEPT_MISFORTUNE', accepted: wantsRisk })
    if (state.phase === 'decision') {
      state = reduce(state, { type: 'ACCEPT_MISFORTUNE', accepted: false })
    }
    if (state.phase === 'strain') {
      const risk = state.strainId ? (STRAIN_RISK[state.strainId] ?? 0) : 0
      state = reduce(state, { type: 'ACCEPT_STRAIN', accepted: risk >= 3 || mission % 2 === 0 })
    }
    if (state.phase === 'deal') {
      state = reduce(state, { type: 'DEAL_PACTS' })
    }
    state = reduce(state, { type: 'SET_PACTS', playerId: HOST, pactIds: [] })
    const failure = mission % 5 === 3
    state = reduce(state, {
      type: 'REPORT_RESULT',
      outcome: failure ? 'failure' : 'success',
      stars: 3,
    })
    if (failure) {
      if (state.phase === 'forfeit') {
        const itemId = (state.personalInventories[HOST] ?? [])[0]
        if (itemId) {
          state = reduce(state, { type: 'FORFEIT_ITEM', itemRef: { ownerId: HOST, itemId } })
        }
      }
    }
    else {
      const diver = state.divers[0]!
      const first = diverOptions(state, diver)[0]
      if (first) {
        state = reduce(state, { type: 'PICK_REWARD', playerId: HOST, optionId: first.optionId })
      }
      state = reduce(state, { type: 'ADVANCE' })
    }
  }
  return state
}

let cache: Record<string, DiveState> | null = null

// Build (and memoize) every fixture state. `achieved` is the expensive one.
export function buildStates(): Record<string, DiveState> {
  if (cache) {
    return cache
  }
  const lobby = joinDiver(createLobbyState(), HOST, NAME)!
  const diving = pactLocked(wheelResolved(true, true))
  const rewards = reduce(diving, { type: 'REPORT_RESULT', outcome: 'success', stars: 3 })
  const forfeit = reduce(diving, { type: 'REPORT_RESULT', outcome: 'failure', stars: 0 })
  cache = {
    lobby,
    spin: fresh(),
    decision: spun(),
    pacts: wheelResolved(true, true),
    diving,
    rewards,
    forfeit,
    complete: achieved(),
  }
  return cache
}

export function saveDocFor(key: string): SaveDoc {
  const state = buildStates()[key]
  if (!state) {
    throw new Error(`unknown design state fixture: ${key}`)
  }
  return createSaveDoc(state, `design-${key}`, '2026-01-01T00:00:00.000Z')
}
