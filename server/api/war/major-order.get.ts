import type { MajorOrderSelection } from '~~/shared/engine/types'
import { fetchMajorOrder } from '../../utils/major-order'

// The live war moves slowly (orders run hours to days), so a 10-minute cache
// keeps the upstream fan APIs off our request path and absorbs their outages.
const CACHE_TTL_MS = 10 * 60 * 1000

let cache: { at: number, order: MajorOrderSelection | null } | null = null
// The last non-null order ever fetched: served (stale) when a refresh fails, so
// a flaky upstream never blanks the panel mid-operation.
let lastGood: MajorOrderSelection | null = null

export default defineEventHandler(async () => {
  const now = Date.now()
  if (cache && now - cache.at < CACHE_TTL_MS) {
    return { order: cache.order }
  }
  try {
    const order = await fetchMajorOrder()
    cache = { at: now, order }
    if (order) {
      lastGood = order
    }
    return { order }
  }
  catch {
    // Degrade gracefully: a failed fetch is not cached and falls back to the
    // last good order (or null, which leaves the manual picker).
    return { order: lastGood }
  }
})
