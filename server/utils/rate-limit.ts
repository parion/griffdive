// In-memory sliding-window limiter, one per process — enough for the single
// Fly machine (horizontal scale needs a shared store like the room KV swap).
export interface RateLimiter {
  take(key: string): boolean
}

// Bound the key map so a flood of unique addresses cannot grow it forever.
const MAX_KEYS = 10_000

export function createRateLimiter(
  limit: number,
  windowMs: number,
  now: () => number = Date.now,
): RateLimiter {
  const hits = new Map<string, number[]>()

  return {
    take(key) {
      const at = now()
      const cutoff = at - windowMs
      const recent = (hits.get(key) ?? []).filter(time => time > cutoff)
      if (recent.length >= limit) {
        hits.set(key, recent)
        return false
      }
      recent.push(at)
      hits.set(key, recent)
      if (hits.size > MAX_KEYS) {
        for (const [other, times] of hits) {
          if (times.every(time => time <= cutoff)) {
            hits.delete(other)
          }
        }
      }
      return true
    },
  }
}
