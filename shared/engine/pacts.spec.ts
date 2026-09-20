import { describe, expect, it } from 'vitest'
import { PACTS, pactById } from '../data/pacts'
import { PACT_RISK, RESERVE_STRATAGEMS, STRATAGEM_SLOTS_REQUIRED, pactOptionsFor } from './config'
import { startingItemIds } from './progression'
import {
  BLOCKED_UNDER_MISFORTUNE,
  PACT_EXCLUSIVE_GROUPS,
  PACT_SUBSUMES,
  applyPactToggle,
  hasLegalLoadout,
  isPactSelectable,
  legalStratagemCount,
  pactConflictsWith,
  pactRiskTotal,
  pactSubsumedBy,
  rollPactOffer,
} from './pacts'

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

describe('pact subsumption', () => {
  it('has no subsuming pacts after Barebones was removed', () => {
    expect(Object.keys(PACT_SUBSUMES)).toHaveLength(0)
  })

  it('never reports a pact as covered by another', () => {
    for (const pact of PACTS) {
      expect(pactSubsumedBy(pact.id, PACTS.map(entry => entry.id))).toBeNull()
    }
  })

  it('keeps a toggle a pure membership change', () => {
    const offer = ['packLight', 'primaryConcern']
    expect(applyPactToggle(offer, [], 'packLight')).toEqual(['packLight'])
    expect(applyPactToggle(offer, ['packLight'], 'packLight')).toEqual([])
    expect(applyPactToggle(['packLight'], [], 'primaryConcern')).toEqual([])
  })
})

describe('pact exclusivity', () => {
  it('never offers two pacts from one exclusive group', () => {
    for (const group of PACT_EXCLUSIVE_GROUPS) {
      for (let seed = 0; seed < 500; seed++) {
        for (const difficulty of [3, 7, 10]) {
          const offered = rollPactOffer(seed, null, difficulty).map(pact => pact.id)
          expect(offered.filter(id => group.includes(id)).length).toBeLessThanOrEqual(1)
        }
      }
    }
  })

  it('refuses a same-group pick instead of stacking same-axis risk', () => {
    const offer = ['grounded', 'shipSilent']
    expect(pactConflictsWith('shipSilent', ['grounded'])).toBe('grounded')
    expect(pactConflictsWith('grounded', ['shipSilent'])).toBe('shipSilent')
    expect(pactConflictsWith('grounded', ['openField'])).toBe('openField')
    expect(pactConflictsWith('packLight', ['grounded'])).toBeNull()
    expect(applyPactToggle(offer, ['grounded'], 'shipSilent')).toEqual(['grounded'])
    expect(applyPactToggle(offer, [], 'shipSilent')).toEqual(['shipSilent'])
  })
})

describe('reserve and loadout legality', () => {
  const baseKit = startingItemIds('standard')

  it('keeps a full pact offer legal with only the baseline kit', () => {
    expect(hasLegalLoadout(null, PACTS.map(pact => pact.id), baseKit)).toBe(true)
    for (const pact of PACTS) {
      expect(hasLegalLoadout(null, [pact.id], baseKit)).toBe(true)
    }
  })

  it('treats reserve utility as always legal, so a forfeit cannot strand a diver', () => {
    expect(hasLegalLoadout(null, PACTS.map(pact => pact.id), [])).toBe(true)
    expect(legalStratagemCount(null, [], [])).toBeGreaterThanOrEqual(RESERVE_STRATAGEMS.length)
  })

  it('exempts reserve utility from the offensive-category pacts', () => {
    expect(hasLegalLoadout(null, ['grounded'], baseKit)).toBe(true)
    expect(hasLegalLoadout(null, ['shipSilent'], baseKit)).toBe(true)
    expect(hasLegalLoadout(null, ['openField'], baseKit)).toBe(true)
  })

  it('refuses a pick the accepted misfortune makes impossible', () => {
    // No Orbitals removes two reserve orbitals; Primary Concern removes support
    // weapons, leaving only the three non-orbital reserve strats — under four.
    expect(hasLegalLoadout('noOrbitals', [], baseKit)).toBe(true)
    expect(hasLegalLoadout('noOrbitals', ['primaryConcern'], baseKit)).toBe(false)
  })

  it('never lets a pact alone drop below the four-slot floor', () => {
    for (const pact of PACTS) {
      expect(legalStratagemCount(null, [pact.id], baseKit)).toBeGreaterThanOrEqual(
        STRATAGEM_SLOTS_REQUIRED,
      )
    }
  })

  it('flags a misfortune the base kit cannot field (Oops, All Orbitals)', () => {
    // The standard kit fields two orbitals; the rule needs four. A kit with
    // enough orbitals (Quickplay's extras) clears it.
    expect(hasLegalLoadout('oopsAllOrbitals', [], baseKit)).toBe(false)
    expect(hasLegalLoadout('oopsAllOrbitals', [], startingItemIds('quickplay'))).toBe(true)
  })

  it('keeps No Stratagems behavioral — four slots still equip', () => {
    expect(hasLegalLoadout('noStratagems', [], baseKit)).toBe(true)
  })
})

describe('pactRiskTotal', () => {
  it('sums known pacts and ignores unknown ids', () => {
    expect(pactRiskTotal([])).toBe(0)
    expect(pactRiskTotal(['packLight'])).toBe(1)
    expect(pactRiskTotal(['stimAbstinent', 'deadWeight'])).toBe(5)
    expect(pactRiskTotal(['untouchable', 'packLight'])).toBe(4)
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
