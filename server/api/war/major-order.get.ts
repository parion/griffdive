import type { MajorOrderSelection } from '~~/shared/engine/types'
import type { MajorOrderFetch } from '../../utils/major-order'
import { fetchMajorOrder } from '../../utils/major-order'

// The live war moves slowly (orders run hours to days), so a 10-minute cache
// keeps the upstream fan APIs off our request path and absorbs their outages.
const CACHE_TTL_MS = 10 * 60 * 1000

let cache: { at: number, result: MajorOrderFetch } | null = null
// The last non-null order ever fetched: served (stale) when a refresh fails, so
// a flaky upstream never blanks the panel mid-operation.
let lastGood: MajorOrderSelection | null = null

export default defineEventHandler(async () => {
  const now = Date.now()
  if (cache && now - cache.at < CACHE_TTL_MS) {
    return { order: cache.result.order, status: cache.result.status }
  }
  try {
    const result = await fetchMajorOrder()
    // A clean "no order" and a live order are real API outcomes worth caching;
    // an unavailable one is transient, so retry it on the next request.
    if (result.status !== 'unavailable') {
      cache = { at: now, result }
    }
    if (result.status === 'active') {
      lastGood = result.order
    }
    return { order: result.order, status: result.status }
  }
  catch {
    // Degrade gracefully: a failed fetch is not cached and falls back to the
    // last good order, or reads as unavailable (manual picker stays available).
    return { order: lastGood, status: lastGood ? 'active' : 'unavailable' }
  }
})
