import { describe, expect, it } from 'vitest'
import { createDiveState } from '~~/shared/engine/reducer'
import type { DiveState } from '~~/shared/engine/types'
import { operationMilestone } from './operationMilestone'

function baseState(): DiveState {
  return createDiveState({ variant: 'medium', front: 'rolled' }, 'p1', 'Griffin', undefined, 1)
}

function boundary(patch: Partial<DiveState> = {}): DiveState {
  return {
    ...baseState(),
    phase: 'rewards',
    difficulty: 4,
    missionInOperation: 2,
    lastReport: { outcome: 'success', stars: 3 },
    ...patch,
  }
}

describe('operation milestone', () => {
  it('reads the cleared rung and the next drop at the boundary', () => {
    const milestone = operationMilestone(boundary())
    expect(milestone).not.toBeNull()
    expect(milestone!.clearedDifficulty).toBe(4)
    expect(milestone!.clearedName).toBe('Challenging')
    expect(milestone!.nextDifficulty).toBe(5)
    expect(milestone!.nextName).toBe('Hard')
    expect(milestone!.nextOp).toBe(3)
    expect(milestone!.front).toContain('fresh front')
  })

  it('stays out of the way mid-operation and at the summit', () => {
    expect(operationMilestone(boundary({ missionInOperation: 1 }))).toBeNull()
    expect(operationMilestone(boundary({ difficulty: 10, missionInOperation: 3 }))).toBeNull()
    expect(operationMilestone(boundary({ phase: 'spin' }))).toBeNull()
  })

  it('names a pinned front and previews the reroll refresh', () => {
    const pinned = boundary({ settings: { variant: 'medium', front: 'locked' }, frontId: 'terminids' })
    const milestone = operationMilestone(pinned)
    expect(milestone!.front).toContain('Terminids')
    expect(milestone!.carries[0]!.value).toContain('1')
  })

  it('banks the live Major Order bonus in the reroll refresh', () => {
    const ordered = boundary({
      settings: { variant: 'medium', front: 'majorOrder' },
      majorOrder: { fronts: ['terminids'], live: true },
    })
    const milestone = operationMilestone(ordered)
    expect(milestone!.front).toContain('Major Order')
    expect(milestone!.carries[0]!.value).toContain('2')
  })
})
