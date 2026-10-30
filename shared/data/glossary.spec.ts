import { describe, expect, it } from 'vitest'
import { CONDITIONS } from './conditions'
import { GLOSSARY, glossaryEntry, parseRule } from './glossary'

describe('parseRule', () => {
  it('strips markup into plain prose and records keyword spans', () => {
    const parsed = parseRule('I bring no {support weapon} — and {fails this pact|failed}')
    expect(parsed.text).toBe('I bring no support weapon — and fails this pact')
    expect(parsed.keywords).toEqual(['supportWeapon', 'failed'])
    expect(parsed.parts.filter(part => part.keyword).map(part => part.text)).toEqual(['support weapon', 'fails this pact'])
  })

  it('resolves a keyword by id or term, ignoring case, and lists it once', () => {
    expect(parseRule('{Eagle} then {eagle} then {Support weapon}').keywords).toEqual(['eagle', 'supportWeapon'])
  })

  it('refuses a keyword the glossary does not define', () => {
    expect(() => parseRule('No {flux capacitor}')).toThrow(/flux capacitor/)
  })

  it('flags parenthetical text as an aside, keywords inside it included', () => {
    const parsed = parseRule('I call no {stratagem} (except {Reinforce}) today')
    expect(parsed.text).toBe('I call no stratagem (except Reinforce) today')
    expect(parsed.parts).toEqual([
      { text: 'I call no ' },
      { text: 'stratagem', keyword: 'stratagem' },
      { text: ' ' },
      { text: '(except ', aside: true },
      { text: 'Reinforce', keyword: 'reinforce', aside: true },
      { text: ')', aside: true },
      { text: ' today' },
    ])
  })

  it('passes a rule with no markup through untouched', () => {
    expect(parseRule('Plain rule')).toEqual({ text: 'Plain rule', parts: [{ text: 'Plain rule' }], keywords: [] })
  })
})

describe('glossary', () => {
  it('has unique ids and terms', () => {
    expect(new Set(GLOSSARY.map(entry => entry.id.toLowerCase())).size).toBe(GLOSSARY.length)
    expect(new Set(GLOSSARY.map(entry => entry.term.toLowerCase())).size).toBe(GLOSSARY.length)
  })

  it('defines every keyword some condition actually uses', () => {
    const used = new Set(CONDITIONS.flatMap(condition => condition.keywords))
    const unused = GLOSSARY.filter(entry => !used.has(entry.id)).map(entry => entry.id)
    expect(unused).toEqual([])
  })

  it('resolves every condition keyword to an entry', () => {
    for (const condition of CONDITIONS) {
      for (const id of condition.keywords) {
        expect(glossaryEntry(id)).not.toBeNull()
      }
      expect(condition.ruleParts.map(part => part.text).join('')).toBe(condition.rule)
    }
  })
})

describe('rule wording contracts', () => {
  const rule = (id: string) => CONDITIONS.find(condition => condition.id === id)?.rule ?? ''

  it('says a broken Zero Deaths fails the directive, not the mission', () => {
    expect(rule('zeroDeaths')).toMatch(/fails the directive/)
    expect(rule('zeroDeaths')).toMatch(/mission plays on/)
  })

  it('spells out that Deserted gives one minute and exempts Reinforce and SEAF resources', () => {
    expect(rule('noStratagems')).toMatch(/first minute/)
    expect(rule('noStratagems')).toMatch(/Reinforce/)
    expect(rule('noStratagems')).toMatch(/SEAF resources/)
    expect(rule('noReserves')).toMatch(/reinforced/)
  })

  it('spells out that Radio Silence covers every color but Reinforce', () => {
    expect(rule('radioSilence')).toMatch(/red, blue, green or yellow/)
    expect(rule('radioSilence')).toMatch(/Reinforce excepted/)
  })

  it('keeps extra detail in a parenthetical aside, never an em dash', () => {
    for (const condition of CONDITIONS) {
      expect(condition.rule).not.toContain('—')
    }
  })

  it('keeps the support-weapon rules scoped to support weapons', () => {
    expect(rule('primaryConcern')).toMatch(/secondaries and every other stratagem stay legal/)
    expect(rule('primaryOnly')).toMatch(/secondaries and every other stratagem stay legal/)
  })
})
