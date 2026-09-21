import { describe, expect, it } from 'vitest'
import { createRateLimiter } from './rate-limit'

describe('rate limiter', () => {
  it('allows up to the limit within the window, then refuses', () => {
    const limiter = createRateLimiter(2, 1000, () => 0)
    expect(limiter.take('ip')).toBe(true)
    expect(limiter.take('ip')).toBe(true)
    expect(limiter.take('ip')).toBe(false)
  })

  it('frees the budget once the window passes', () => {
    let now = 0
    const limiter = createRateLimiter(1, 1000, () => now)
    expect(limiter.take('ip')).toBe(true)
    expect(limiter.take('ip')).toBe(false)
    now = 1001
    expect(limiter.take('ip')).toBe(true)
  })

  it('tracks keys independently', () => {
    const limiter = createRateLimiter(1, 1000, () => 0)
    expect(limiter.take('a')).toBe(true)
    expect(limiter.take('b')).toBe(true)
    expect(limiter.take('a')).toBe(false)
  })
})
