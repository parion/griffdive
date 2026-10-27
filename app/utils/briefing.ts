import { supportRollsFor } from '~~/shared/engine/progression'
import type { CrusadeSettings, DivePhase } from '~~/shared/engine/types'
import { supportRollList } from './kit'

export type BriefingStepId = 'spin' | 'pacts' | 'dive' | 'report' | 'loot'

const PHASE_STATUS: Record<DivePhase, string> = {
  lobby: 'In the lobby',
  spin: 'At the wheel',
  decision: 'At the wheel',
  strain: 'At the wheel',
  deal: 'At the wheel',
  pacts: 'Swearing pacts',
  diving: 'On a mission',
  rewards: 'Picking rewards',
  forfeit: 'Sorting out a failed mission',
  complete: 'Run over',
}

export function briefingStatus(phase: DivePhase): string {
  return PHASE_STATUS[phase]
}

// Only a SEAF launch changes the surplus kit, so only it earns a line: who
// launched decides the pronoun.
export function startingGearNote(settings: CrusadeSettings | null | undefined, launcher: 'you' | 'the host'): string | null {
  const rolls = settings ? supportRollsFor(settings.variant, settings.mode) : null
  return rolls
    ? `Plus the SEAF Support Package ${launcher} launched with: random B-tier gear for each diver (${supportRollList(rolls).join(', ')}).`
    : null
}
