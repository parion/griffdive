import { describe, expect, it } from 'vitest'
import { buildRecap, operationsCleared, recapFilename } from './recap'
import { createDiveState } from '~~/shared/engine/reducer'
import type { DiveState } from '~~/shared/engine/types'

function baseState(): DiveState {
  return createDiveState({ variant: 'medium' }, 'p1', 'Griffin', undefined, 1)
}

function withDivers(state: DiveState): DiveState {
  const [host] = state.divers
  if (!host) {
    throw new Error('expected a host diver')
  }
  return {
    ...state,
    divers: [
      { ...host, id: 'p1', name: 'Griffin', isHost: true, rewardTokens: 2 },
      { ...host, id: 'p2', name: 'Nova', isHost: false, rewardTokens: 1 },
    ],
    personalInventories: { p1: ['a', 'b', 'c'], p2: ['d'] },
  }
}

describe('run recap', () => {
  it('reads the climb, missions, combos and gear from state', () => {
    const state = withDivers({
      ...baseState(),
      phase: 'complete' as const,
      difficulty: 6,
      missionIndex: 9,
      missionInOperation: 2,
      completedCombos: ['one', 'two'],
    })
    const recap = buildRecap(state, 'GRIFFIN · MEDIUM')

    expect(recap.outcome).toBe('abandoned')
    expect(recap.startDifficulty).toBe(3)
    expect(recap.endDifficulty).toBe(6)
    expect(recap.missionsFlown).toBe(9)
    expect(recap.operationsCleared).toBe(3)
    expect(recap.combos).toBe(2)
    expect(recap.gearOwned).toBe(4)
    expect(recap.honorsHeld).toBe(3)
    expect(recap.squad.map(member => member.name)).toEqual(['GRIFFIN', 'NOVA'])
    expect(recap.crusadeLabel).toBe('GRIFFIN · MEDIUM')
  })

  it('counts the winning operation when the crusade is achieved', () => {
    const state = {
      ...baseState(),
      phase: 'complete' as const,
      difficulty: 10,
      missionIndex: 20,
      missionInOperation: 3,
      achieved: true,
    }
    expect(operationsCleared(state)).toBe(8)
    expect(buildRecap(state).title).toEqual(['Griffdive', 'Achieved'])
  })

  it('counts the operation in hand when the run ends on a cleared mission', () => {
    const state = {
      ...baseState(),
      phase: 'complete' as const,
      difficulty: 4,
      missionInOperation: 2,
      lastReport: { outcome: 'success' as const, stars: 3 },
    }
    expect(operationsCleared(state)).toBe(2)
    expect(buildRecap(state).title).toEqual(['File', 'Closed'])
  })

  it('does not count a failed or unfinished operation', () => {
    const failed = {
      ...baseState(),
      phase: 'complete' as const,
      difficulty: 4,
      missionInOperation: 2,
      lastReport: { outcome: 'failure' as const, stars: 0 },
    }
    expect(operationsCleared(failed)).toBe(1)
  })

  it('writes a filesystem-safe PNG name', () => {
    expect(recapFilename('Griffin · Medium')).toBe('griffdive-recap-Griffin-Medium.png')
    expect(recapFilename('  ***  ')).toBe('griffdive-recap-crusade.png')
  })
})
