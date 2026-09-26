import type { MajorOrderSelection } from '~~/shared/engine/types'
import { fetchMajorOrder } from '../../utils/major-order'

// The live war moves slowly (orders run hours to days), so a 10-minute cache
// keeps the upstream fan APIs off our request path and absorbs their outages.
const CACHE_TTL_MS = 10 * 60 * 1000

let cache: { at: number, order: MajorOrderSelection | null } | null = null

export default defineEventHandler(async () => {
  const now = Date.now()
  if (cache && now - cache.at < CACHE_TTL_MS) {
    return { order: cache.order }
  }
  try {
    const order = await fetchMajorOrder()
    cache = { at: now, order }
    return { order }
  }
  catch {
    // Degrade gracefully: a failed fetch is not cached, and the client falls
    // back to the manual Major Order picker (offline/static builds do too).
    return { order: null }
  }
})
