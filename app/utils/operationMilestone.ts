import { MAJOR_ORDER_REROLL_BONUS, MAX_DIFFICULTY, REROLL_TOKENS_PER_OPERATION, missionsPerOperation } from '~~/shared/engine/config'
import { catchUpOpsBehind, difficultyName } from '~~/shared/engine/progression'
import { frontById } from '~~/shared/engine/wheel'
import type { DiveState } from '~~/shared/engine/types'

export interface MilestoneRow {
  label: string
  value: string
}

export interface OperationMilestone {
  clearedDifficulty: number
  clearedName: string
  nextDifficulty: number
  nextName: string
  nextOp: number
  front: string
  carries: MilestoneRow[]
  accessibleLabel: string
}

// Presentation-only: the boundary between one operation and the next. It reads
// the same state the `OperationCleared` beat already shows and never gates
// `ADVANCE`. The new front is not drawn yet, so the copy says how it arrives.
export function operationMilestone(state: DiveState): OperationMilestone | null {
  if (state.phase !== 'rewards' || state.difficulty >= MAX_DIFFICULTY) {
    return null
  }
  if (state.missionInOperation < missionsPerOperation(state.difficulty)) {
    return null
  }

  const nextDifficulty = state.difficulty + 1
  const plan = state.settings?.front
  const currentFront = state.frontId ? frontById(state.frontId) : null
  const orderFronts = (state.majorOrder?.fronts ?? [])
    .map(id => frontById(id)?.displayName)
    .filter((name): name is string => Boolean(name))
  let front: string
  if (plan === 'locked') {
    front = currentFront
      ? `Pinned to ${currentFront.displayName} — the same front rolls again.`
      : 'Your locked front rolls again with the next spin.'
  }
  else if (plan === 'majorOrder' && state.majorOrder) {
    const pool = orderFronts.length ? ` from ${orderFronts.join(' / ')}` : ''
    front = `Major Order pin — a fresh front${pool} rolls with the next spin.`
  }
  else {
    front = 'A fresh front rolls with the next spin.'
  }

  const tokens = REROLL_TOKENS_PER_OPERATION + (state.majorOrder?.live ? MAJOR_ORDER_REROLL_BONUS : 0)
  const nextOp = catchUpOpsBehind(nextDifficulty, state.settings?.variant ?? 'medium') + 1
  const carries: MilestoneRow[] = [
    { label: 'Rerolls', value: `Refresh to ${tokens} for the new operation.` },
    { label: 'Brasch', value: 'Bought kinds reset — every slot can stock again.' },
    { label: 'Kit & purse', value: 'Every diver keeps their gear, credits and honors tokens.' },
  ]

  const milestone: OperationMilestone = {
    clearedDifficulty: state.difficulty,
    clearedName: difficultyName(state.difficulty),
    nextDifficulty,
    nextName: difficultyName(nextDifficulty),
    nextOp,
    front,
    carries,
    accessibleLabel: '',
  }
  milestone.accessibleLabel = [
    `Operation ${milestone.nextOp - 1} cleared at ${milestone.clearedName} ${milestone.clearedDifficulty}.`,
    `Next drop: ${milestone.nextName} ${milestone.nextDifficulty}.`,
    milestone.front,
    ...carries.map(row => `${row.label}: ${row.value}`),
  ].join(' ')
  return milestone
}
