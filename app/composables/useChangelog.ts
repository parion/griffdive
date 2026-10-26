import type { ChangelogEntry } from '~~/shared/utils/changelog'

const CHANGELOG_TTL_MS = 10 * 60 * 1000

export type ChangelogStatus = 'idle' | 'loading' | 'ready' | 'error'

// Module-level state: the changelog is app-shell-wide, so refetches are shared
// across mounts. The server proxies and caches GitHub (server/api/changelog.get.ts).
const entries = ref<ChangelogEntry[]>([])
const status = ref<ChangelogStatus>('idle')
const error = ref<string | null>(null)
let fetchedAt = 0

// Only the proxy's own 503 carries player-facing copy; anything else (a static
// build with no server, a network drop) gets the generic line.
function errorMessage(err: unknown): string {
  // The body, not the status line: HTTP reason phrases drop the em dash.
  const { statusCode, data } = (err ?? {}) as { statusCode?: unknown, data?: { message?: unknown } }
  return statusCode === 503 && typeof data?.message === 'string' ? data.message : 'Could not load the changelog.'
}

export function useChangelog() {
  async function load(force = false): Promise<void> {
    if (!import.meta.client || status.value === 'loading') {
      return
    }
    if (!force && status.value === 'ready' && Date.now() - fetchedAt < CHANGELOG_TTL_MS) {
      return
    }
    status.value = 'loading'
    error.value = null
    try {
      entries.value = await $fetch<ChangelogEntry[]>('/api/changelog')
      fetchedAt = Date.now()
      status.value = 'ready'
    }
    catch (err) {
      error.value = errorMessage(err)
      status.value = 'error'
    }
  }

  return { status, entries, error, load }
}
