import { describe, expect, it } from 'vitest'
import { normalizeMajorOrder, resolveMajorOrder, unresolvedTasks } from './major-order'

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
    expect(result.order?.live).toBe(true)
  })

  it('reads a malformed payload as unavailable', () => {
    expect(resolveMajorOrder(null, CAMPAIGN).status).toBe('unavailable')
    expect(resolveMajorOrder({}, CAMPAIGN).status).toBe('unavailable')
  })

  it('reads an assignment whose planets do not resolve as no-front', () => {
    expect(resolveMajorOrder([assignment()], []))
      .toEqual({ status: 'no-front', order: null })
  })

  it('reads a front-less order (gather, operations) as no-front', () => {
    const tasks = [
      { type: 2, values: [0, 0, 100000], valueTypes: [1, 2, 3] },
      { type: 9, values: [0, 0, 50000], valueTypes: [1, 2, 3] },
    ]
    expect(resolveMajorOrder([assignment({ tasks })], CAMPAIGN).status).toBe('no-front')
  })
})

describe('kill orders carry their front in the faction slot', () => {
  // Live payload, 2026-09-30: Chargers (Terminids) + Shredder Tanks (Automatons).
  const killTasks = [
    { type: 3, values: [2, 0, 25000000, 2651633799, 0, 0, 0, 0, 0, 0], valueTypes: [1, 2, 3, 4, 6, 5, 8, 9, 11, 12] },
    { type: 3, values: [3, 0, 5000000, 2664856027, 0, 0, 0, 0, 0, 0], valueTypes: [1, 2, 3, 4, 6, 5, 8, 9, 11, 12] },
  ]
  const kill = (tasks: unknown[]) => assignment({
    briefing: 'Kill the requisite enemies.',
    tasks,
  })

  it('resolves a cross-faction kill order without an enemy table', () => {
    const order = normalizeMajorOrder([kill(killTasks)], [])
    expect(order?.fronts).toEqual(['terminids', 'automatons'])
    expect(order?.planets).toEqual([])
    expect(order?.live).toBe(true)
  })

  it('reads slots by label, not position', () => {
    const shuffled = [{ type: 3, values: [0, 5, 4], valueTypes: [3, 2, 1] }]
    expect(normalizeMajorOrder([kill(shuffled)], [])?.fronts).toEqual(['illuminate'])
  })

  it('ignores faction 0 (anything) and Humans', () => {
    const tasks = [
      { type: 3, values: [0, 0, 100], valueTypes: [1, 2, 3] },
      { type: 3, values: [1, 0, 100], valueTypes: [1, 2, 3] },
    ]
    expect(normalizeMajorOrder([kill(tasks)], [])).toBeNull()
  })

  it('still resolves a mixed order from the tasks it can read', () => {
    const tasks = [
      { type: 2, values: [0, 0, 100], valueTypes: [1, 2, 3] },
      ...killTasks.slice(0, 1),
    ]
    expect(normalizeMajorOrder([kill(tasks)], [])?.fronts).toEqual(['terminids'])
  })

  it('reads a resolvable kill order as active', () => {
    expect(resolveMajorOrder([kill(killTasks)], []).status).toBe('active')
  })
})

describe('unresolvedTasks', () => {
  const gather = { type: 2, values: [0, 0, 100], valueTypes: [1, 2, 3] }
  const kill = { type: 3, values: [2, 0, 100, 1], valueTypes: [1, 2, 3, 4] }

  it('lists only the tasks that name no front', () => {
    expect(unresolvedTasks([assignment({ tasks: [gather, kill] })], CAMPAIGN)).toEqual([gather])
  })

  it('flags a planet task whose planet is not in the campaign', () => {
    expect(unresolvedTasks([assignment()], [])).toHaveLength(2)
  })

  it('is empty for a fully resolved order and for malformed input', () => {
    expect(unresolvedTasks([assignment()], CAMPAIGN)).toEqual([])
    expect(unresolvedTasks(null, CAMPAIGN)).toEqual([])
    expect(unresolvedTasks([], CAMPAIGN)).toEqual([])
  })
})

// The live Liberty Day order (2026-10-23): one task per faction, but only the
// two fronts whose planets are reachable are actually playable. Zea Rugosia is
// gated behind Haldus, so the Illuminate front must wait.
const EDGE_TASKS = [
  { type: 11, values: [1, 1, 261], valueTypes: [3, 11, 12] },
  { type: 11, values: [1, 1, 75], valueTypes: [3, 11, 12] },
  { type: 11, values: [1, 1, 7], valueTypes: [3, 11, 12] },
]

const EDGE_ASSIGNMENT = assignment({ tasks: EDGE_TASKS })

const EDGE_CAMPAIGN = [
  { planetIndex: 261, name: 'Fury', faction: 'Automatons', percentage: 99.8, defense: false },
  { planetIndex: 75, name: 'Esker', faction: 'Terminids', percentage: 2.2, defense: false },
  { planetIndex: 7, name: 'Zea Rugosia', faction: 'Illuminates', percentage: 0, defense: false },
]

const EDGE_WAR = [
  { index: 261, currentOwner: 'Automaton', waypoints: [154, 158, 242], disabled: false },
  { index: 75, currentOwner: 'Terminids', waypoints: [122, 123, 124], disabled: false },
  { index: 7, currentOwner: 'Illuminate', waypoints: [178], disabled: false },
  { index: 154, currentOwner: 'Humans', waypoints: [107, 155], disabled: false },
  { index: 124, currentOwner: 'Humans', waypoints: [269], disabled: false },
  { index: 178, currentOwner: 'Illuminate', waypoints: [135], disabled: false },
]

describe('active fronts (multi-faction planet order)', () => {
  it('pins only the fronts the war can actually be fought on', () => {
    const order = normalizeMajorOrder([EDGE_ASSIGNMENT], EDGE_CAMPAIGN, EDGE_WAR)
    expect(order?.fronts).toEqual(['automatons', 'terminids'])
    expect(order?.planets).toEqual([
      { index: 261, name: 'Fury', front: 'automatons', liberation: 99.8, available: true },
      { index: 75, name: 'Esker', front: 'terminids', liberation: 2.2, available: true },
      { index: 7, name: 'Zea Rugosia', front: 'illuminate', liberation: 0, available: false },
    ])
  })

  it('drops a liberated front and adds a gated front when its warp link opens', () => {
    const campaign = EDGE_CAMPAIGN.map(planet =>
      planet.planetIndex === 261 ? { ...planet, percentage: 100 } : planet)
    expect(normalizeMajorOrder([EDGE_ASSIGNMENT], campaign, EDGE_WAR)?.fronts)
      .toEqual(['terminids'])

    const war = EDGE_WAR.map(planet =>
      planet.index === 178 ? { ...planet, currentOwner: 'Humans' } : planet)
    expect(normalizeMajorOrder([EDGE_ASSIGNMENT], campaign, war)?.fronts)
      .toEqual(['terminids', 'illuminate'])
  })

  it('keeps a front while any of its planets is still active', () => {
    const tasks = [
      { type: 11, values: [1, 1, 198], valueTypes: [3, 11, 12] },
      { type: 11, values: [1, 1, 217], valueTypes: [3, 11, 12] },
    ]
    const campaign = [
      { planetIndex: 198, name: 'Marfark', faction: 'Automatons', percentage: 100, defense: false },
      { planetIndex: 217, name: 'Vandalon IV', faction: 'Automatons', percentage: 12, defense: false },
    ]
    const war = [
      { index: 198, currentOwner: 'Automaton', waypoints: [154], disabled: false },
      { index: 217, currentOwner: 'Automaton', waypoints: [154], disabled: false },
      { index: 154, currentOwner: 'Humans', waypoints: [], disabled: false },
    ]
    expect(normalizeMajorOrder([assignment({ tasks })], campaign, war)?.fronts)
      .toEqual(['automatons'])
  })

  it('falls back to every incomplete target when the planet roster is unavailable', () => {
    const order = normalizeMajorOrder([EDGE_ASSIGNMENT], EDGE_CAMPAIGN)
    expect(order?.fronts).toEqual(['automatons', 'terminids', 'illuminate'])
    expect(order?.planets?.every(planet => planet.available === undefined)).toBe(true)
  })

  it('treats a defense as playable even without a friendly warp link', () => {
    const tasks = [{ type: 11, values: [1, 1, 261], valueTypes: [3, 11, 12] }]
    const campaign = [
      { planetIndex: 261, name: 'Fury', faction: 'Automatons', percentage: 100, defense: true },
    ]
    const war = [{ index: 261, currentOwner: 'Automaton', waypoints: [158], disabled: false }]
    const order = normalizeMajorOrder([assignment({ tasks })], campaign, war)
    expect(order?.fronts).toEqual(['automatons'])
    expect(order?.planets?.[0]?.available).toBe(true)
  })

  it('excludes a disabled target', () => {
    const war = EDGE_WAR.map(planet =>
      planet.index === 75 ? { ...planet, disabled: true } : planet)
    expect(normalizeMajorOrder([EDGE_ASSIGNMENT], EDGE_CAMPAIGN, war)?.fronts)
      .toEqual(['automatons'])
  })

  it('keeps faction-only kill order fronts regardless of planet availability', () => {
    const tasks = [
      { type: 3, values: [2, 0, 100], valueTypes: [1, 2, 3] },
      { type: 3, values: [3, 0, 100], valueTypes: [1, 2, 3] },
    ]
    expect(normalizeMajorOrder([assignment({ tasks })], EDGE_CAMPAIGN, EDGE_WAR)?.fronts)
      .toEqual(['terminids', 'automatons'])
  })

  it('does not flag a planet task the war roster knows about', () => {
    const tasks = [{ type: 11, values: [1, 1, 261], valueTypes: [3, 11, 12] }]
    expect(unresolvedTasks([assignment({ tasks })], [], EDGE_WAR)).toEqual([])
  })
})
