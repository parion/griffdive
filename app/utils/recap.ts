import { missionsPerOperation } from '~~/shared/engine/config'
import { STARTING_KITS, difficultyName } from '~~/shared/engine/progression'
import type { DiveState } from '~~/shared/engine/types'
import { upperName } from './upperName'

export interface RecapSquadMember {
  name: string
  isHost: boolean
  items: number
  tokens: number
}

export interface Recap {
  outcome: 'achieved' | 'abandoned'
  kicker: string
  title: [string, string]
  crusadeLabel: string
  startDifficulty: number
  endDifficulty: number
  startName: string
  endName: string
  missionsFlown: number
  operationsCleared: number
  combos: number
  gearOwned: number
  honorsHeld: number
  squad: RecapSquadMember[]
  accessibleLabel: string
}

// Operations the squad finished: every difficulty step it left behind, plus the
// operation in hand when the run ended on a cleared mission. This reads only
// what the state already carries — a failed mission or a mid-operation quit is
// not a clear, and the achievement's winning operation is counted.
export function operationsCleared(state: DiveState): number {
  const start = STARTING_KITS[state.settings?.variant ?? 'medium'].startDifficulty
  const finished = Math.max(0, state.difficulty - start)
  const currentCleared = state.achieved
    || (state.missionInOperation >= missionsPerOperation(state.difficulty)
      && state.lastReport?.outcome === 'success')
  return finished + (currentCleared ? 1 : 0)
}

export function buildRecap(state: DiveState, crusadeLabel = ''): Recap {
  const variant = state.settings?.variant ?? 'medium'
  const startDifficulty = STARTING_KITS[variant].startDifficulty
  const squad = state.divers.map(diver => ({
    name: upperName(diver.name),
    isHost: diver.id === state.hostId,
    items: (state.personalInventories[diver.id] ?? []).length,
    tokens: diver.rewardTokens,
  }))
  const gearOwned = Object.values(state.personalInventories)
    .reduce((total, items) => total + items.length, 0)
  const operations = operationsCleared(state)
  const honorsHeld = state.divers.reduce((total, diver) => total + diver.rewardTokens, 0)
  const achieved = state.achieved
  const labels = achieved
    ? { kicker: 'Crusade complete', title: ['Griffdive', 'Achieved'] as [string, string] }
    : { kicker: 'Ministry notice · file closed', title: ['File', 'Closed'] as [string, string] }

  const recap: Recap = {
    outcome: achieved ? 'achieved' : 'abandoned',
    kicker: labels.kicker,
    title: labels.title,
    crusadeLabel,
    startDifficulty,
    endDifficulty: state.difficulty,
    startName: difficultyName(startDifficulty),
    endName: difficultyName(state.difficulty),
    missionsFlown: state.missionIndex,
    operationsCleared: operations,
    combos: state.completedCombos.length,
    gearOwned,
    honorsHeld,
    squad,
    accessibleLabel: '',
  }
  recap.accessibleLabel = [
    `${labels.title.join(' ')} recap.`,
    `Climbed from ${recap.startName} ${recap.startDifficulty} to ${recap.endName} ${recap.endDifficulty}.`,
    `${recap.missionsFlown} missions flown, ${recap.operationsCleared} operations cleared,`,
    `${recap.combos} combos, ${recap.gearOwned} items owned, ${recap.honorsHeld} honors in hand.`,
    `Squad: ${squad.map(member => member.name).join(', ')}.`,
  ].join(' ')
  return recap
}

export function recapFilename(label: string): string {
  const safe = label.trim().replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '')
  return `griffdive-recap-${safe || 'crusade'}.png`
}
