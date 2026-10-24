import { describe, expect, it } from 'vitest'
import { PIN_IMPACT, REVEAL_OPENING, pinDelay, revealTimeline } from './rewardReveal'

describe('reward reveal timeline', () => {
  it('lands cards in the order given, whatever their tier', () => {
    const cues = revealTimeline(['S', 'C', 'A', 'B'])
    expect(cues.map(cue => cue.tier)).toEqual(['S', 'C', 'A', 'B'])
    for (let i = 1; i < cues.length; i++) {
      expect(cues[i]!.start).toBeGreaterThan(cues[i - 1]!.impact)
    }
  })

  it('opens after the quiet beat', () => {
    const cues = revealTimeline(['B', 'B', 'B'])
    expect(cues[0]!.start).toBe(REVEAL_OPENING)
    expect(cues[0]!.impact).toBeLessThan(cues[1]!.impact)
    expect(cues[1]!.impact).toBeLessThan(cues[2]!.impact)
  })

  it('gives rarer tiers a longer wind-up', () => {
    const [c, s] = revealTimeline(['C', 'S'])
    expect(s!.impact - s!.start).toBeGreaterThan(c!.impact - c!.start)
  })

  it('drops each pin so it strikes as its card lands', () => {
    for (const cue of revealTimeline(['C', 'A', 'S+'])) {
      expect(pinDelay(cue) + PIN_IMPACT).toBe(cue.impact)
    }
  })
})
