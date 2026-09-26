import { describe, expect, it } from 'vitest'
import { normalizeMajorOrder, resolveMajorOrder } from './major-order'

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
  { planetIndex: 198, name: 'Marfark', faction: 'Automatons', percentage: 89.7 },
  { planetIndex: 217, name: 'Vandalon IV', faction: 'Automatons', percentage: 12.34 },
]

describe('normalizeMajorOrder', () => {
  it('joins target planets to factions and carries liberation', () => {
    const order = normalizeMajorOrder([assignment()], CAMPAIGN)
    expect(order?.fronts).toEqual(['automatons'])
    expect(order?.planets).toEqual([
      { index: 198, name: 'Marfark', front: 'automatons', liberation: 89.7 },
      { index: 217, name: 'Vandalon IV', front: 'automatons', liberation: 12.34 },
    ])
    expect(order?.title).toContain('Liberate')
    expect(order?.expiresAt).toBe('2026-09-26T12:12:23.6293392Z')
  })

  it('collects every front of a multi-front order', () => {
    const campaign = [
      { planetIndex: 198, name: 'Marfark', faction: 'Automatons', percentage: 10 },
      { planetIndex: 217, name: 'Pilen V', faction: 'Terminids', percentage: 20 },
    ]
    expect(normalizeMajorOrder([assignment()], campaign)?.fronts)
      .toEqual(['automatons', 'terminids'])
  })

  it('clamps liberation and defaults a missing percentage to zero', () => {
    const campaign = [
      { planetIndex: 198, name: 'Marfark', faction: 'Automatons', percentage: 250 },
      { planetIndex: 217, name: 'Vandalon IV', faction: 'Automatons' },
    ]
    const order = normalizeMajorOrder([assignment()], campaign)
    expect(order?.planets?.map(planet => planet.liberation)).toEqual([100, 0])
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
    const unknown = [{ planetIndex: 198, name: 'Marfark', faction: 'Humans', percentage: 5 }]
    expect(normalizeMajorOrder([assignment()], unknown)).toBeNull()
  })
})

describe('resolveMajorOrder (no order vs unavailable)', () => {
  it('reads an empty assignment list as a clean no-order', () => {
    expect(resolveMajorOrder([], CAMPAIGN)).toEqual({ status: 'none', order: null })
  })

  it('reads a resolvable assignment as active', () => {
    const result = resolveMajorOrder([assignment()], CAMPAIGN)
    expect(result.status).toBe('active')
    expect(result.order?.fronts).toEqual(['automatons'])
  })

  it('reads a malformed payload as unavailable', () => {
    expect(resolveMajorOrder(null, CAMPAIGN).status).toBe('unavailable')
    expect(resolveMajorOrder({}, CAMPAIGN).status).toBe('unavailable')
  })

  it('reads an assignment whose planets do not resolve as unavailable', () => {
    expect(resolveMajorOrder([assignment()], []).status).toBe('unavailable')
  })
})
