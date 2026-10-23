import { CEILING_LADDER } from '~~/shared/engine/rewards'
import type { RewardTier } from '~~/shared/engine/types'

/**
 * Reward reveal pacing (ms). `lead` runs from a card's first frame to its
 * impact; `hold` is the beat after impact before the next card starts. Rarer
 * tiers wind up longer and leave more air, so the drama scales with the pull.
 * S+ follows the Liberty's Cross unfurl: the beam draws, then the card opens.
 */
export const REVEAL_BEATS: Readonly<Record<RewardTier, { lead: number, hold: number }>> = {
  'C': { lead: 260, hold: 90 },
  'B': { lead: 340, hold: 150 },
  'A': { lead: 420, hold: 280 },
  'S': { lead: 700, hold: 420 },
  'S+': { lead: 950, hold: 0 },
}

/** Quiet beat before the first card, so the Valor line reads first. */
export const REVEAL_OPENING = 320

/** `pin-land` in ValorRoll reaches the strip 540ms in (60% of 900ms). */
export const PIN_IMPACT = 540

export interface RevealCue {
  tier: RewardTier
  start: number
  impact: number
}

/**
 * Cards keep their grid order but land worst-to-best, so the best pull is
 * always the finale. Ties land in reading order.
 */
export function revealTimeline(tiers: readonly RewardTier[]): RevealCue[] {
  const order = tiers
    .map((tier, index) => ({ tier, index }))
    .sort((a, b) => CEILING_LADDER.indexOf(a.tier) - CEILING_LADDER.indexOf(b.tier) || a.index - b.index)
  const cues: RevealCue[] = Array.from({ length: tiers.length })
  let clock = REVEAL_OPENING
  for (const { tier, index } of order) {
    const beat = REVEAL_BEATS[tier]
    cues[index] = { tier, start: clock, impact: clock + beat.lead }
    clock += beat.lead + beat.hold
  }
  return cues
}

/** The Valor pin drops so it strikes the line as its card lands. */
export function pinDelay(cue: RevealCue): number {
  return Math.max(0, cue.impact - PIN_IMPACT)
}
