import { missionsPerOperation } from '~~/shared/engine/config'
import { STARTING_KITS, difficultyName, earnedKit } from '~~/shared/engine/progression'
import { handedKitOf } from '~~/shared/engine/specialists'
import type { DiveState } from '~~/shared/engine/types'
import { upperName } from './upperName'

export interface RecapSquadMember {
  id: string
  name: string
  isHost: boolean
  gearEarned: number
  tokens: number
  credits: number
}

export interface Recap {
  outcome: 'achieved' | 'abandoned'
  kicker: string
  // The Bridge's creed, answered: `Freedom / is / earned.` becomes a
  // three-line stack whose small middle word sits between tier rules.
  creed: [string, string, string]
  crusadeLabel: string
  startDifficulty: number
  endDifficulty: number
  startName: string
  endName: string
  missionsFlown: number
  operationsCleared: number
  combos: number
  gearEarned: number
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
  // Earned gear, not the action log: the log is capped, so a long crusade's
  // early picks have scrolled out of it by the summit.
  const squad = state.divers.map(diver => ({
    id: diver.id,
    name: upperName(diver.name),
    isHost: diver.id === state.hostId,
    gearEarned: earnedKit(state.personalInventories[diver.id] ?? [], variant, handedKitOf(diver)).length,
    tokens: diver.rewardTokens,
    credits: diver.credits,
  }))
  const gearEarned = squad.reduce((total, member) => total + member.gearEarned, 0)
  const operations = operationsCleared(state)
  const honorsHeld = state.divers.reduce((total, diver) => total + diver.rewardTokens, 0)
  const achieved = state.achieved
  const labels = achieved
    ? { kicker: 'Griffdive achieved', creed: ['Freedom', 'was', 'earned.'] as [string, string, string] }
    : { kicker: 'Crusade ended', creed: ['Service', 'is', 'recorded.'] as [string, string, string] }

  const recap: Recap = {
    outcome: achieved ? 'achieved' : 'abandoned',
    kicker: labels.kicker,
    creed: labels.creed,
    crusadeLabel,
    startDifficulty,
    endDifficulty: state.difficulty,
    startName: difficultyName(startDifficulty),
    endName: difficultyName(state.difficulty),
    missionsFlown: state.missionIndex,
    operationsCleared: operations,
    combos: state.completedCombos.length,
    gearEarned,
    honorsHeld,
    squad,
    accessibleLabel: '',
  }
  recap.accessibleLabel = [
    `${labels.kicker}. ${labels.creed.join(' ')}`,
    `Climbed from ${recap.startName} ${recap.startDifficulty} to ${recap.endName} ${recap.endDifficulty}.`,
    `${recap.missionsFlown} missions flown, ${recap.operationsCleared} operations cleared,`,
    `${recap.combos} combos, ${recap.gearEarned} items earned, ${recap.honorsHeld} honors in hand.`,
    `Squad: ${squad.map(member => member.name).join(', ')}.`,
  ].join(' ')
  return recap
}

export function recapFilename(label: string): string {
  const safe = label.trim().replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '')
  return `griffdive-recap-${safe || 'crusade'}.png`
}
