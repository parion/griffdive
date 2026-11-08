import { describe, expect, it } from 'vitest'
import { lastPlayedLabel } from './lastPlayed'

const DAY = 24 * 60 * 60 * 1000
const NOW = Date.UTC(2026, 10, 8, 12)

describe('last played label', () => {
  it('reads calendar-day gaps, not hours', () => {
    expect(lastPlayedLabel(NOW - 2 * 60 * 60 * 1000, NOW)).toBe('Last played today')
    expect(lastPlayedLabel(NOW - DAY, NOW)).toBe('Last played 1 day ago')
    expect(lastPlayedLabel(NOW - 3 * DAY, NOW)).toBe('Last played 3 days ago')
  })

  it('accepts ISO timestamps and never reads the future as negative days', () => {
    expect(lastPlayedLabel(new Date(NOW - 2 * DAY).toISOString(), NOW)).toBe('Last played 2 days ago')
    expect(lastPlayedLabel(NOW + DAY, NOW)).toBe('Last played today')
  })

  it('stays quiet when there is no usable timestamp', () => {
    expect(lastPlayedLabel(null, NOW)).toBe('')
    expect(lastPlayedLabel(undefined, NOW)).toBe('')
    expect(lastPlayedLabel('not a date', NOW)).toBe('')
  })
})
