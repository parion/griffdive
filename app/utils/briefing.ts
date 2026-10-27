import { supportRollsFor } from '~~/shared/engine/progression'
import type { CrusadeSettings, DivePhase } from '~~/shared/engine/types'
import { supportRollList } from './kit'

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

// Who launched decides the pronoun; the settings decide whether a SEAF pack
// rides on top of the surplus.
export function startingGearNote(settings: CrusadeSettings | null | undefined, launcher: 'you' | 'the host'): string {
  const rolls = settings ? supportRollsFor(settings.variant, settings.mode) : null
  const base = settings?.mode === 'seaf' && rolls
    ? `Plus the SEAF Support Package ${launcher} launched with: a random B-tier pack for each diver (${supportRollList(rolls).join(', ')}).`
    : settings
      ? 'Surplus gear only. This run has no SEAF Support Package.'
      : 'The launch can add the SEAF Support Package on top.'
  return `${base} Every reward you earn adds to it.`
}
