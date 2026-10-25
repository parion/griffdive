import { describe, expect, it } from 'vitest'
import { MAX_RECENT_ROOMS, RECENT_ROOM_MAX_AGE_MS, pruneRoomIndex } from './useRecentRooms'

const NOW = Date.parse('2026-10-25T12:00:00.000Z')

function ago(ms: number): string {
  return new Date(NOW - ms).toISOString()
}

describe('recent rooms index', () => {
  it('keeps the newest rooms and drops the rest past the cap', () => {
    const index = Object.fromEntries(
      Array.from({ length: MAX_RECENT_ROOMS + 5 }, (_, i) => [`ROOM${i}`, ago(i * 60_000)]),
    )
    const pruned = pruneRoomIndex(index, NOW)
    expect(Object.keys(pruned)).toHaveLength(MAX_RECENT_ROOMS)
    // ROOM0 is the newest; the five oldest fall off.
    expect(pruned.ROOM0).toBe(ago(0))
    expect(pruned[`ROOM${MAX_RECENT_ROOMS - 1}`]).toBeDefined()
    expect(pruned[`ROOM${MAX_RECENT_ROOMS}`]).toBeUndefined()
  })

  it('forgets rooms older than the crusade TTL', () => {
    const pruned = pruneRoomIndex({
      FRESH: ago(RECENT_ROOM_MAX_AGE_MS - 60_000),
      STALE: ago(RECENT_ROOM_MAX_AGE_MS + 60_000),
    }, NOW)
    expect(Object.keys(pruned)).toEqual(['FRESH'])
  })

  it('drops entries whose timestamp cannot be read', () => {
    expect(pruneRoomIndex({ GOOD: ago(1000), BAD: 'not a date' }, NOW)).toEqual({ GOOD: ago(1000) })
  })

  it('returns newest first', () => {
    const pruned = pruneRoomIndex({ OLD: ago(2 * 60_000), NEW: ago(60_000) }, NOW)
    expect(Object.keys(pruned)).toEqual(['NEW', 'OLD'])
  })
})
