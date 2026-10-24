import type { RewardTier } from '~~/shared/engine/types'

/**
 * Reward reveal pacing (ms). `lead` runs from a card's first frame to its
 * impact; `hold` is the beat after impact before the next card starts. Rarer
 * tiers wind up longer and leave more air, so the drama scales with the pull.
 * S+ is `LibertyCrossBand`'s unfurl: its suspense beat, the beam, then the
 * band opens around 900ms in.
 */
export const REVEAL_BEATS: Readonly<Record<RewardTier, { lead: number, hold: number }>> = {
  'C': { lead: 260, hold: 90 },
  'B': { lead: 340, hold: 150 },
  'A': { lead: 420, hold: 280 },
  'S': { lead: 700, hold: 420 },
  'S+': { lead: 1280, hold: 0 },
}

/** Quiet beat before the first card, so the Valor line reads first. */
export const REVEAL_OPENING = 320

/** `pin-land` in ValorRoll reaches the strip 540ms in (60% of 900ms). */
export const PIN_IMPACT = 540

/** Air after the last card lands, so its shockwave clears before company joins. */
export const REVEAL_SETTLE = 600

export interface RevealCue {
  tier: RewardTier
  start: number
  impact: number
}

/** Cards land one after another in the order given (reading order on screen). */
export function revealTimeline(tiers: readonly RewardTier[]): RevealCue[] {
  let clock = REVEAL_OPENING
  return tiers.map((tier) => {
    const beat = REVEAL_BEATS[tier]
    const cue = { tier, start: clock, impact: clock + beat.lead }
    clock += beat.lead + beat.hold
    return cue
  })
}

/** The Valor pin drops so it strikes the line as its card lands. */
export function pinDelay(cue: RevealCue): number {
  return Math.max(0, cue.impact - PIN_IMPACT)
}

/**
 * Ms from a draft's first frame until its last reveal has landed and settled.
 * A trailing S+ counts: Liberty's Cross's band unfurls past its own beat.
 */
export function revealDuration(tiers: readonly RewardTier[]): number {
  const cues = revealTimeline(tiers)
  const last = cues[cues.length - 1]
  return last ? last.impact + REVEAL_SETTLE : 0
}
