import { describe, expect, it } from 'vitest'
import { ALL_ITEMS, ITEMS_BY_ID } from '../data/catalog'
import { PACTS, pactById } from '../data/pacts'
import { RESERVE_STRATAGEMS, STRATAGEM_SLOTS_REQUIRED, conditionRiskAt, pactOptionsFor } from './config'
import { startingItemIds } from './progression'
import {
  BLOCKED_UNDER_MISFORTUNE,
  PACT_EXCLUSIVE_GROUPS,
  PACT_SUBSUMES,
  applyPactToggle,
  hasLegalLoadout,
  stratagemBanReason,
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
      expect(conditionRiskAt(pact.id, 3)).toBeGreaterThan(0)
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
  it('lets only behavioral pacts subsume, never a loadout-checked one', () => {
    for (const [covering, covered] of Object.entries(PACT_SUBSUMES)) {
      expect(pactById(covering)?.accountability).not.toBe('loadout')
      for (const id of covered) {
        expect(pactById(id)).not.toBeNull()
      }
    }
  })

  it('reports a pact as covered only by the pact that implies it', () => {
    expect(pactSubsumedBy('thirsty', ['radioSilence'])).toBe('radioSilence')
    expect(pactSubsumedBy('coldSteel', ['objector'])).toBe('objector')
    expect(pactSubsumedBy('radioSilence', ['thirsty'])).toBeNull()
    expect(pactSubsumedBy('objector', ['coldSteel'])).toBeNull()
    expect(pactSubsumedBy('packLight', ['radioSilence'])).toBeNull()
  })

  it('swaps a covered pick for its coverer and refuses the reverse', () => {
    const offer = ['thirsty', 'radioSilence']
    expect(applyPactToggle(offer, ['thirsty'], 'radioSilence')).toEqual(['radioSilence'])
    expect(applyPactToggle(offer, ['radioSilence'], 'thirsty')).toEqual(['radioSilence'])
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
          const offered = rollPactOffer(seed, null, difficulty, 4).map(pact => pact.id)
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

describe('armor weight', () => {
  it('never offers or lets a diver pick both armor weights', () => {
    expect(pactConflictsWith('ironbound', ['featherweight'])).toBe('featherweight')
    expect(pactConflictsWith('featherweight', ['ironbound'])).toBe('ironbound')
  })

  it('treats the armor pacts as redundant or impossible under a squad armor rule', () => {
    for (const misfortune of ['fragileLiberty', 'heavyBurden']) {
      expect(isPactSelectable('featherweight', misfortune)).toBe(false)
      expect(isPactSelectable('ironbound', misfortune)).toBe(false)
    }
  })
})

describe('defense bans', () => {
  const byName = (name: string) => {
    const item = ALL_ITEMS.find(entry => entry.displayName === name)
    if (!item) {
      throw new Error(`expected catalog item ${name}`)
    }
    return item
  }

  it('leaves the Shield Generator Relay legal under Open Field, but bans lethal defenses', () => {
    expect(stratagemBanReason(null, ['openField'], byName('Shield Generator Relay'))).toBeNull()
    expect(stratagemBanReason(null, ['openField'], byName('Gas Mines'))).toEqual({ source: 'pact', id: 'openField' })
    expect(stratagemBanReason(null, ['openField'], byName('Tesla Tower'))).toEqual({ source: 'pact', id: 'openField' })
  })
})

describe('reserve and loadout legality', () => {
  const baseKit = startingItemIds('medium')

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
    // weapons, leaving only the two non-orbital reserve strats — under four.
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

  it('flags a misfortune the base kit cannot field (Oops, All Airstrikes)', () => {
    // The standard kit fields three airstrikes (Eagle Smoke + two orbitals);
    // the rule needs four. A kit holding one more red stratagem clears it.
    expect(hasLegalLoadout('oopsAllAirstrikes', [], baseKit)).toBe(false)
    expect(hasLegalLoadout('oopsAllAirstrikes', [], [...baseKit, 'orbitalprecisionstrike'])).toBe(true)
  })

  it('limits Oops, All Airstrikes to stratagems — weapons, armor and boosters stay legal', () => {
    const equipment = ALL_ITEMS.filter(item => item.type === 'equipment')
    expect(equipment.length).toBeGreaterThan(0)
    for (const item of equipment) {
      expect(stratagemBanReason('oopsAllAirstrikes', [], item)).toBeNull()
    }
  })

  it('keeps Deserted behavioral (four slots still equip)', () => {
    expect(hasLegalLoadout('noStratagems', [], baseKit)).toBe(true)
  })

  it('leaves the loadout pacts open under Deserted, since stratagems still drop in the first minute', () => {
    for (const pactId of ['packLight', 'primaryConcern', 'grounded', 'radioSilence']) {
      expect(isPactSelectable(pactId, 'noStratagems')).toBe(true)
    }
    expect(isPactSelectable('thirsty', 'noStratagems')).toBe(false)
  })

  it('flags a genuine anti-tank weapon but not the Eruptor, an explosive primary', () => {
    const eat = ITEMS_BY_ID.get('eat17expendableantitank')!
    const eruptor = ITEMS_BY_ID.get('r36eruptor')!
    expect(eruptor.antitank).toBe(false)
    expect(stratagemBanReason(null, ['antiTankAbstinent'], eat))
      .toEqual({ source: 'pact', id: 'antiTankAbstinent' })
    expect(stratagemBanReason(null, ['antiTankAbstinent'], eruptor)).toBeNull()
  })
})

describe('pactRiskTotal', () => {
  it('sums known pacts and ignores unknown ids', () => {
    expect(pactRiskTotal([], 3)).toBe(0)
    expect(pactRiskTotal(['packLight'], 3)).toBe(1)
    expect(pactRiskTotal(['stimAbstinent', 'deadWeight'], 3)).toBe(5)
    expect(pactRiskTotal(['untouchable', 'packLight'], 3)).toBe(4)
    expect(pactRiskTotal(['ghostPact'], 3)).toBe(0)
  })

  it('scales the sum with the difficulty', () => {
    expect(pactRiskTotal(['thirsty'], 10)).toBeGreaterThan(pactRiskTotal(['thirsty'], 3))
    expect(pactRiskTotal(['stimAbstinent'], 10)).toBeGreaterThan(pactRiskTotal(['stimAbstinent'], 3))
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
    for (const pact of rollPactOffer(42, null, 3, 4)) {
      expect(isPactSelectable(pact.id, null)).toBe(true)
    }
    expect(rollPactOffer(42, null, 3, 4)).toHaveLength(2)
    expect(rollPactOffer(42, null, 10, 4)).toHaveLength(3)
  })

  it('is deterministic for a given seed and never repeats a pact', () => {
    expect(rollPactOffer(42, null, 10, 4)).toEqual(rollPactOffer(42, null, 10, 4))
    const ids = rollPactOffer(42, null, 10, 4).map(pact => pact.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('never offers a pact the accepted misfortune blocks', () => {
    for (const [misfortuneId, blocked] of Object.entries(BLOCKED_UNDER_MISFORTUNE)) {
      for (let seed = 0; seed < 200; seed++) {
        for (const pact of rollPactOffer(seed, misfortuneId, 10, 4)) {
          expect(blocked).not.toContain(pact.id)
        }
      }
    }
  })

  it('still draws from the whole catalog when the draw is declined', () => {
    const seen = new Set<string>()
    for (let seed = 0; seed < 300; seed++) {
      for (const pact of rollPactOffer(seed, null, 7, 4)) {
        seen.add(pact.id)
      }
    }
    expect(seen.size).toBeGreaterThan(PACTS.length / 2)
  })

  it('never empties the pool, even under the harshest misfortune', () => {
    for (const misfortuneId of Object.keys(BLOCKED_UNDER_MISFORTUNE)) {
      expect(rollPactOffer(7, misfortuneId, 10, 4).length).toBeGreaterThanOrEqual(2)
    }
  })
})
