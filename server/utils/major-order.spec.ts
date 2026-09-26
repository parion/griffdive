import { describe, expect, it } from 'vitest'
import { normalizeMajorOrder } from './major-order'

function assignment(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    title: 'MAJOR ORDER',
    briefing: 'Liberate the designated planets to secure territory.',
    expiration: '2026-09-26T12:12:23.6293392Z',
    tasks: [
      { type: 11, values: [1, 1, 198], valueTypes: [3, 11, 12] },
      { type: 11, values: [1, 1, 217], valueTypes: [3, 11, 12] },
    ],
    ...overrides,
  }
}

const CAMPAIGN = [
  { planetIndex: 198, name: 'Marfark', faction: 'Automatons' },
  { planetIndex: 217, name: 'Vandalon IV', faction: 'Automatons' },
]

describe('normalizeMajorOrder', () => {
  it('joins target planets to factions and dedupes fronts', () => {
    const order = normalizeMajorOrder([assignment()], CAMPAIGN)
    expect(order?.fronts).toEqual(['automatons'])
    expect(order?.planetNames).toEqual(['Marfark', 'Vandalon IV'])
    expect(order?.title).toContain('Liberate')
    expect(order?.expiresAt).toBe('2026-09-26T12:12:23.6293392Z')
  })

  it('collects every front of a multi-front order', () => {
    const campaign = [
      { planetIndex: 198, name: 'Marfark', faction: 'Automatons' },
      { planetIndex: 217, name: 'Pilen V', faction: 'Terminids' },
    ]
    expect(normalizeMajorOrder([assignment()], campaign)?.fronts)
      .toEqual(['automatons', 'terminids'])
  })

  it('falls back to liberation tasks when valueTypes are absent', () => {
    const tasks = [{ type: 11, values: [1, 1, 198] }]
    expect(normalizeMajorOrder([assignment({ tasks })], CAMPAIGN)?.fronts)
      .toEqual(['automatons'])
  })

  it('returns null when no target planet resolves to a front', () => {
    expect(normalizeMajorOrder([assignment()], [])).toBeNull()
    expect(normalizeMajorOrder([], CAMPAIGN)).toBeNull()
    expect(normalizeMajorOrder(null, CAMPAIGN)).toBeNull()
  })

  it('ignores unknown factions', () => {
    const unknown = [{ planetIndex: 198, name: 'Marfark', faction: 'Humans' }]
    expect(normalizeMajorOrder([assignment()], unknown)).toBeNull()
  })
})
