import { describe, expect, it } from 'vitest'
import { PACTS, pactById } from '../data/pacts'
import { PACT_RISK, pactOptionsFor } from './config'
import { BLOCKED_UNDER_MISFORTUNE, isPactSelectable, pactRiskTotal, rollPactOffer } from './pacts'

describe('catalog integrity', () => {
  it('every pact has a positive risk and a unique name', () => {
    for (const pact of PACTS) {
      expect(PACT_RISK[pact.id]).toBeGreaterThan(0)
      expect(pactById(pact.id)).toBe(pact)
    }
    expect(new Set(PACTS.map(pact => pact.name)).size).toBe(PACTS.length)
  })
})

describe('isPactSelectable', () => {
  it('allows everything without an active misfortune', () => {
    for (const pact of PACTS) {
      expect(isPactSelectable(pact.id, null)).toBe(true)
    }
  })

  it('rejects unknown pacts', () => {
    expect(isPactSelectable('notAPact', null)).toBe(false)
  })

  it('blocks pacts declared redundant per misfortune', () => {
    for (const [misfortuneId, blocked] of Object.entries(BLOCKED_UNDER_MISFORTUNE)) {
      for (const pactId of blocked) {
        expect(isPactSelectable(pactId, misfortuneId)).toBe(false)
        expect(isPactSelectable(pactId, 'noSentries')).toBe(true)
      }
    }
  })
})

describe('pactRiskTotal', () => {
  it('sums known pacts and ignores unknown ids', () => {
    expect(pactRiskTotal([])).toBe(0)
    expect(pactRiskTotal(['packLight'])).toBe(1)
    expect(pactRiskTotal(['stimAbstinent', 'deadWeight'])).toBe(4)
    expect(pactRiskTotal(['barebones', 'untouchable', 'packLight'])).toBe(7)
    expect(pactRiskTotal(['ghostPact'])).toBe(0)
  })
})

describe('pactOptionsFor', () => {
  it('offers two pacts on lower difficulties, three from 7 up', () => {
    expect(pactOptionsFor(3)).toBe(2)
    expect(pactOptionsFor(6)).toBe(2)
    expect(pactOptionsFor(7)).toBe(3)
    expect(pactOptionsFor(10)).toBe(3)
  })
})

describe('rollPactOffer', () => {
  it('rolls exactly the difficulty\'s option count from selectable pacts', () => {
    for (const pact of rollPactOffer(42, null, 3)) {
      expect(isPactSelectable(pact.id, null)).toBe(true)
    }
    expect(rollPactOffer(42, null, 3)).toHaveLength(2)
    expect(rollPactOffer(42, null, 10)).toHaveLength(3)
  })

  it('is deterministic for a given seed and never repeats a pact', () => {
    expect(rollPactOffer(42, null, 10)).toEqual(rollPactOffer(42, null, 10))
    const ids = rollPactOffer(42, null, 10).map(pact => pact.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('never offers a pact the accepted misfortune blocks', () => {
    for (const [misfortuneId, blocked] of Object.entries(BLOCKED_UNDER_MISFORTUNE)) {
      for (let seed = 0; seed < 200; seed++) {
        for (const pact of rollPactOffer(seed, misfortuneId, 10)) {
          expect(blocked).not.toContain(pact.id)
        }
      }
    }
  })

  it('still draws from the whole catalog when the draw is declined', () => {
    const seen = new Set<string>()
    for (let seed = 0; seed < 300; seed++) {
      for (const pact of rollPactOffer(seed, null, 7)) {
        seen.add(pact.id)
      }
    }
    expect(seen.size).toBeGreaterThan(PACTS.length / 2)
  })

  it('never empties the pool, even under the harshest misfortune', () => {
    for (const misfortuneId of Object.keys(BLOCKED_UNDER_MISFORTUNE)) {
      expect(rollPactOffer(7, misfortuneId, 10).length).toBeGreaterThanOrEqual(2)
    }
  })
})
