import { ITEMS_BY_ID } from '../data/catalog'
import type { CrusadeSettings, DiveState, DiverState, EngineAction } from './types'
import { ACTION_LOG_CAP, MAX_DIFFICULTY, MAX_NAME_LENGTH, MAX_PACTS, REROLL_TOKENS_PER_OPERATION, maxStarsFor, missionsPerOperation } from './config'
import { isPactSelectable } from './pacts'
import { STARTING_KITS, personalKitIds } from './progression'
import { createLobbyState, joinDiver } from './room'
import { deriveSeed } from './rng'
import { comboKey, diverOptions } from './selectors'
import { deriveSpin } from './wheel'

export function createDiveState(settings: CrusadeSettings, hostId: string, hostName: string): DiveState {
  const lobby = joinDiver(createLobbyState(), hostId, hostName) ?? createLobbyState()
  return reduce(lobby, { type: 'START_DIVE', settings })
}

function commit(state: DiveState, patch: Partial<DiveState>, action: EngineAction): DiveState {
  return {
    ...state,
    ...patch,
    actionLog: [...state.actionLog.slice(-(ACTION_LOG_CAP - 1)), action],
  }
}

function applyStart(state: DiveState, settings: CrusadeSettings): Partial<DiveState> {
  const kit = STARTING_KITS[settings.variant]
  const personal = personalKitIds(settings.variant)
  const personalInventories: Record<string, string[]> = {}
  for (const diver of state.divers) {
    personalInventories[diver.id] = [...personal]
  }
  return {
    settings,
    difficulty: kit.startDifficulty,
    phase: 'spin',
    rerollTokens: REROLL_TOKENS_PER_OPERATION,
    sharedStratagemIds: [...kit.stratagems],
    personalInventories,
  }
}

function resetDivers(state: DiveState): DiverState[] {
  return state.divers.map(diver => ({
    ...diver,
    pactsLocked: false,
    pactIds: [],
    pickedOptionId: null,
  }))
}

function resetForNextMission(state: DiveState): Partial<DiveState> {
  return {
    offerSeed: null,
    lastReport: null,
    divers: resetDivers(state),
  }
}

export function resetOperation(state: DiveState): Partial<DiveState> {
  return {
    ...resetForNextMission(state),
    missionInOperation: 1,
    rerollTokens: REROLL_TOKENS_PER_OPERATION,
  }
}

export function reduce(state: DiveState, action: EngineAction): DiveState {
  switch (action.type) {
    case 'START_DIVE': {
      if (state.settings) {
        return state
      }
      return commit(state, applyStart(state, action.settings), action)
    }

    case 'SPIN_WHEEL': {
      if (state.phase !== 'spin' || !state.settings) {
        return state
      }
      return commit(state, {
        wheel: deriveSpin(action.seed, state.difficulty),
        // The misfortune is a draw, not a verdict — the squad decides.
        misfortuneAccepted: false,
        phase: 'pacts',
        seedHistory: [...state.seedHistory, action.seed],
      }, action)
    }

    case 'ACCEPT_MISFORTUNE': {
      if (state.phase !== 'pacts' || !state.wheel) {
        return state
      }
      // Team risk is shared, so the decision is frozen once anyone locks pacts
      // (accepting late could invalidate an already-locked pact).
      if (state.divers.some(diver => diver.pactsLocked)) {
        return state
      }
      return commit(state, { misfortuneAccepted: action.accepted }, action)
    }

    case 'REROLL_WHEEL': {
      if (state.phase !== 'pacts' || !state.wheel) {
        return state
      }
      if (state.divers.some(diver => diver.pactsLocked)) {
        return state
      }
      const completed = state.completedCombos.includes(
        comboKey(state.wheel.misfortuneId, state.wheel.front),
      )
      if (!completed && state.rerollTokens < 1) {
        return state
      }
      return commit(state, {
        wheel: deriveSpin(action.seed, state.difficulty),
        misfortuneAccepted: false,
        rerollTokens: completed ? state.rerollTokens : state.rerollTokens - 1,
        seedHistory: [...state.seedHistory, action.seed],
      }, action)
    }

    case 'SET_PACTS': {
      if (state.phase !== 'pacts') {
        return state
      }
      const diver = state.divers.find(candidate => candidate.id === action.playerId)
      if (!diver || diver.pactsLocked) {
        return state
      }
      if (action.pactIds.length > MAX_PACTS) {
        return state
      }
      const misfortuneId = state.wheel?.misfortuneId ?? null
      if (!action.pactIds.every(id => isPactSelectable(id, misfortuneId))) {
        return state
      }
      const divers = state.divers.map(candidate =>
        candidate.id === diver.id
          ? { ...candidate, pactIds: [...action.pactIds], pactsLocked: true }
          : candidate,
      )
      return commit(state, {
        divers,
        phase: divers.every(entry => entry.pactsLocked) ? 'diving' : 'pacts',
      }, action)
    }

    case 'REPORT_RESULT': {
      if (state.phase !== 'diving' || !state.wheel) {
        return state
      }
      // wiki.gg Mission Result: a completed mission never awards zero stars,
      // and higher stars unlock only at higher difficulties. Failed missions
      // award none.
      const stars = action.outcome === 'success'
        ? Math.min(Math.max(Math.round(action.stars), 1), maxStarsFor(state.difficulty))
        : 0
      const report = { outcome: action.outcome, stars, timePct: action.timePct }
      if (action.outcome === 'success') {
        return commit(state, {
          phase: 'rewards',
          lastReport: report,
          offerSeed: deriveSeed(state.wheel.seed, state.missionIndex),
          completedCombos: [
            ...state.completedCombos,
            comboKey(state.wheel.misfortuneId, state.wheel.front),
          ],
        }, action)
      }
      const holdingsEmpty = state.sharedStratagemIds.length === 0
        && state.divers.every(diver => (state.personalInventories[diver.id] ?? []).length === 0)
      if (holdingsEmpty) {
        return commit(state, { ...resetOperation(state), phase: 'pacts' }, action)
      }
      return commit(state, { phase: 'forfeit', lastReport: report }, action)
    }

    case 'FORFEIT_ITEM': {
      if (state.phase !== 'forfeit') {
        return state
      }
      const { itemRef } = action
      if (itemRef.ownerId === 'shared') {
        if (!state.sharedStratagemIds.includes(itemRef.itemId)) {
          return state
        }
        return commit(state, {
          sharedStratagemIds: state.sharedStratagemIds.filter(id => id !== itemRef.itemId),
          ...resetOperation(state),
          phase: 'pacts',
        }, action)
      }
      const inventory = state.personalInventories[itemRef.ownerId]
      if (!inventory?.includes(itemRef.itemId)) {
        return state
      }
      return commit(state, {
        personalInventories: {
          ...state.personalInventories,
          [itemRef.ownerId]: inventory.filter(id => id !== itemRef.itemId),
        },
        ...resetOperation(state),
        phase: 'pacts',
      }, action)
    }

    case 'PICK_REWARD': {
      if (state.phase !== 'rewards' || state.offerSeed === null) {
        return state
      }
      const diver = state.divers.find(candidate => candidate.id === action.playerId)
      if (!diver || diver.pickedOptionId) {
        return state
      }
      if (!diverOptions(state, diver).some(option => option.optionId === action.optionId)) {
        return state
      }
      const item = ITEMS_BY_ID.get(action.optionId)
      if (!item) {
        return state
      }
      const divers = state.divers.map(candidate =>
        candidate.id === diver.id ? { ...candidate, pickedOptionId: action.optionId } : candidate,
      )
      const sharedStratagemIds = item.type === 'stratagem' && !state.sharedStratagemIds.includes(item.id)
        ? [...state.sharedStratagemIds, item.id]
        : state.sharedStratagemIds
      const personalInventories = item.type === 'equipment'
        ? {
            ...state.personalInventories,
            [diver.id]: [...(state.personalInventories[diver.id] ?? []), item.id],
          }
        : state.personalInventories
      return commit(state, { divers, sharedStratagemIds, personalInventories }, action)
    }

    case 'ADVANCE': {
      if (state.phase !== 'rewards' || !state.divers.every(diver => diver.pickedOptionId)) {
        return state
      }
      const missionIndex = state.missionIndex + 1
      const missionInOperation = state.missionInOperation + 1
      if (missionInOperation > missionsPerOperation(state.difficulty)) {
        const nextDifficulty = state.difficulty + 1
        if (nextDifficulty > MAX_DIFFICULTY) {
          return commit(state, {
            missionIndex,
            difficulty: MAX_DIFFICULTY,
            phase: 'complete',
            achieved: true,
            ...resetForNextMission(state),
            wheel: null,
          }, action)
        }
        // Operation completed: the wheel re-spins for the next operation.
        return commit(state, {
          missionIndex,
          difficulty: nextDifficulty,
          missionInOperation: 1,
          rerollTokens: REROLL_TOKENS_PER_OPERATION,
          ...resetForNextMission(state),
          wheel: null,
          misfortuneAccepted: false,
          phase: 'spin',
        }, action)
      }
      // Same operation: the misfortune × front persists — divers re-choose
      // pacts only.
      return commit(state, {
        missionIndex,
        missionInOperation,
        ...resetForNextMission(state),
        phase: 'pacts',
      }, action)
    }

    case 'END_DIVE': {
      if (state.phase === 'complete') {
        return state
      }
      return commit(state, { phase: 'complete' }, action)
    }

    case 'SET_NAME': {
      const name = action.name.trim().slice(0, MAX_NAME_LENGTH)
      if (!name || !state.divers.some(diver => diver.id === action.playerId)) {
        return state
      }
      return commit(state, {
        divers: state.divers.map(diver =>
          diver.id === action.playerId ? { ...diver, name } : diver,
        ),
      }, action)
    }

    case 'TRANSFER_HOST': {
      if (!state.divers.some(diver => diver.id === action.playerId)) {
        return state
      }
      return commit(state, {
        hostId: action.playerId,
        divers: state.divers.map(diver => ({ ...diver, isHost: diver.id === action.playerId })),
      }, action)
    }

    case 'TOGGLE_OPEN': {
      return commit(state, { openToLobby: action.open }, action)
    }
  }
}
