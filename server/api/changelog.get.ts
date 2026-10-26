import type { ChangelogEntry } from '~~/shared/utils/changelog'
import { fetchChangelog, GithubRateLimitError } from '../utils/changelog'

// One shared fetch per window for every client, instead of each browser
// spending its own 60/hr unauthenticated GitHub quota.
const CACHE_TTL_MS = 10 * 60 * 1000

let cache: { at: number, entries: ChangelogEntry[] } | null = null
let inflight: Promise<ChangelogEntry[]> | null = null

export default defineEventHandler(async () => {
  const now = Date.now()
  if (cache && now - cache.at < CACHE_TTL_MS) {
    return cache.entries
  }
  try {
    inflight ??= fetchChangelog(useRuntimeConfig().githubToken).finally(() => {
      inflight = null
    })
    const entries = await inflight
    cache = { at: Date.now(), entries }
    return entries
  }
  catch (error) {
    // A stale log beats an error card: release history only ever grows.
    if (cache) {
      return cache.entries
    }
    throw createError({
      statusCode: 503,
      message: error instanceof GithubRateLimitError
        ? 'GitHub rate limit reached — try again in a few minutes.'
        : 'Could not reach GitHub.',
    })
  }
})
