import { describe, expect, it } from 'vitest'
import {
  CITIZEN_CLASSES,
  GRIFFDIVER_BRIEF,
  GRIFFDIVER_CACHE_LINE,
  GRIFFDIVER_COMPLETE_LINE,
  GRIFFDIVER_FORFEIT_LINE,
  GRIFFDIVER_GATE_LEDE,
  GRIFFDIVER_PROMOTION_LINE,
  GRIFFDIVER_TAGLINE,
} from './lore'

describe('Griffdiver lore', () => {
  it('frames the player as a Class E Griffdiver', () => {
    expect(GRIFFDIVER_GATE_LEDE).toContain('Griffdiver')
    expect(GRIFFDIVER_GATE_LEDE).toContain('Class E')
    expect(GRIFFDIVER_TAGLINE).toContain('Class A')
    expect(GRIFFDIVER_TAGLINE).toContain('Class E')
  })

  it('keeps the pre-match brief to three orientation lines', () => {
    expect(GRIFFDIVER_BRIEF).toHaveLength(3)
    for (const line of GRIFFDIVER_BRIEF) {
      expect(line.trim().length).toBeGreaterThan(0)
    }
  })

  it('lists every citizen grade once, in order', () => {
    expect(CITIZEN_CLASSES.map(entry => entry.grade)).toEqual(['A', 'B', 'C', 'D', 'E'])
    for (const entry of CITIZEN_CLASSES) {
      expect(entry.label.trim().length).toBeGreaterThan(0)
      expect(entry.blurb.trim().length).toBeGreaterThan(0)
    }
  })

  it('ships a non-empty line for every ceremony surface', () => {
    for (const line of [
      GRIFFDIVER_FORFEIT_LINE,
      GRIFFDIVER_PROMOTION_LINE,
      GRIFFDIVER_CACHE_LINE,
      GRIFFDIVER_COMPLETE_LINE,
    ]) {
      expect(line.trim().length).toBeGreaterThan(0)
    }
  })
})
