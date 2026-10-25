import { describe, expect, it } from 'vitest'
import { channelFor, CURRENT_RELEASE, RELEASE_CHANNELS } from './release'

describe('release channels', () => {
  it('ships under the newest channel', () => {
    expect(CURRENT_RELEASE).toBe(RELEASE_CHANNELS[0])
    expect(CURRENT_RELEASE.label).toBe('Beta')
  })

  it('lists channels newest first, with only the oldest open-ended', () => {
    const times = RELEASE_CHANNELS.map(channel => channel.since)
    expect(times.at(-1)).toBeNull()
    const dated = times.slice(0, -1).map(since => Date.parse(since!))
    expect([...dated].sort((a, b) => b - a)).toEqual(dated)
  })

  it('files deployments by date and unreleased work under the current channel', () => {
    const [beta, alpha] = RELEASE_CHANNELS
    expect(channelFor(null)).toBe(beta)
    expect(channelFor('2026-10-25T00:00:00Z')).toBe(beta)
    expect(channelFor('2027-01-01T00:00:00Z')).toBe(beta)
    expect(channelFor('2026-10-24T23:59:59Z')).toBe(alpha)
    expect(channelFor('2026-09-01T00:00:00Z')).toBe(alpha)
  })
})
