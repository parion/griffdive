import { describe, expect, it } from 'vitest'
import { stratagems } from './stratagems'
import type { Item, Tier } from './types'
import { compareKitItems, sortKitItems } from './ordering'

function fake(id: string, type: Item['type'], category: Item['category'], tier: Tier, displayName = id): Item {
  return { id, displayName, type, category, tier, tags: [], warbondCode: 'none' }
}

describe('sortKitItems', () => {
  it('orders stratagems Eagle/Orbital, then support, then emplacements/turrets', () => {
    const items = [
      fake('sentry', 'stratagem', 'Defense', 's'),
      fake('support', 'stratagem', 'Supply', 's'),
      fake('orbital', 'stratagem', 'Orbital', 'c'),
      fake('eagle', 'stratagem', 'Eagle', 'c'),
    ]
    expect(sortKitItems(items).map(item => item.id)).toEqual([
      'eagle',
      'orbital',
      'support',
      'sentry',
    ])
  })

  it('orders within a bucket by tier, best first', () => {
    const items = [
      fake('low', 'stratagem', 'Eagle', 'c'),
      fake('high', 'stratagem', 'Eagle', 's'),
      fake('mid', 'stratagem', 'Eagle', 'a'),
    ]
    expect(sortKitItems(items).map(item => item.id)).toEqual(['high', 'mid', 'low'])
  })

  it('orders non-stratagems purely by tier', () => {
    const items = [
      fake('throwable-c', 'equipment', 'throwable', 'c'),
      fake('primary-s', 'equipment', 'primary', 's'),
      fake('secondary-b', 'equipment', 'secondary', 'b'),
    ]
    expect(sortKitItems(items).map(item => item.id)).toEqual([
      'primary-s',
      'secondary-b',
      'throwable-c',
    ])
  })

  it('breaks tier ties by display name so the order is stable', () => {
    const items = [
      fake('b', 'stratagem', 'Orbital', 'b', 'Zulu'),
      fake('a', 'stratagem', 'Orbital', 'b', 'Alpha'),
    ]
    expect(sortKitItems(items).map(item => item.id)).toEqual(['a', 'b'])
  })

  it('does not mutate the input', () => {
    const items = [
      fake('sentry', 'stratagem', 'Defense', 's'),
      fake('eagle', 'stratagem', 'Eagle', 'c'),
    ]
    const snapshot = [...items]
    sortKitItems(items)
    expect(items).toEqual(snapshot)
  })

  it('is a total order over the real catalog (never returns 0 for distinct items)', () => {
    const sorted = sortKitItems(stratagems)
    for (let i = 1; i < sorted.length; i++) {
      expect(compareKitItems(sorted[i - 1]!, sorted[i]!)).toBeLessThan(0)
    }
  })
})
