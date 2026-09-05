import { describe, expect, it } from 'vitest'
import { BLOCKED_UNDER_MISFORTUNE, isPactSelectable, pactRiskTotal } from './pacts'

describe('isPactSelectable', () => {
  it('allows everything without an active misfortune', () => {
    for (const pactId of Object.keys({ packLight: 1, thirsty: 1, barebones: 1, sidearmPurist: 1 })) {
      expect(isPactSelectable(pactId, null)).toBe(true)
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
    expect(pactRiskTotal(['barebones', 'sidearmPurist', 'packLight'])).toBe(7)
    expect(pactRiskTotal(['ghostPact'])).toBe(0)
  })
})
