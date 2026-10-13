import {
  buildEntries,
  CHANGELOG_REPO,
  normalizeCommit,
  normalizeState,
  type ChangelogEntry,
  type ChangelogState,
  type GhCommit,
  type GhDeployment,
} from '~/utils/changelog'

const GITHUB_API = 'https://api.github.com'
const CHANGELOG_TTL_MS = 10 * 60 * 1000
const MAX_DEPLOYMENTS = 10
const MAX_COMMITS = 100

export type ChangelogStatus = 'idle' | 'loading' | 'ready' | 'error'

interface GhStatus {
  state: string
}

async function fetchGithub<T>(path: string): Promise<T> {
  const res = await fetch(`${GITHUB_API}${path}`, { headers: { Accept: 'application/vnd.github+json' } })
  if (res.status === 403 || res.status === 429) {
    throw new Error('GitHub rate limit reached — try again in a few minutes.')
  }
  if (!res.ok) {
    throw new Error(`GitHub API responded ${res.status}`)
  }
  return await res.json() as T
}

// Module-level state: the changelog is app-shell-wide, so refetches are shared
// across mounts and rate-limit-friendly within the TTL.
const entries = ref<ChangelogEntry[]>([])
const status = ref<ChangelogStatus>('idle')
const error = ref<string | null>(null)
let fetchedAt = 0

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
      const [deployments, commits] = await Promise.all([
        // Production releases only: PR review apps also create GitHub
        // deployments (environment `review`) and must not pollute the changelog.
        fetchGithub<GhDeployment[]>(`/repos/${CHANGELOG_REPO}/deployments?environment=production&per_page=${MAX_DEPLOYMENTS}`),
        fetchGithub<GhCommit[]>(`/repos/${CHANGELOG_REPO}/commits?per_page=${MAX_COMMITS}`),
      ])
      if (!Array.isArray(deployments) || !Array.isArray(commits)) {
        throw new Error('Unexpected GitHub API response.')
      }
      const states: ChangelogState[] = await Promise.all(deployments.map(deployment =>
        fetchGithub<GhStatus[]>(`/repos/${CHANGELOG_REPO}/deployments/${deployment.id}/statuses?per_page=1`)
          .then(list => normalizeState(list[0]?.state))
          .catch(() => 'unknown' as const),
      ))
      entries.value = buildEntries(deployments, states, commits.map(normalizeCommit))
      fetchedAt = Date.now()
      status.value = 'ready'
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Could not reach GitHub.'
      status.value = 'error'
    }
  }

  return { status, entries, error, load }
}
