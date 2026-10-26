import type { ChangelogEntry, ChangelogState, GhCommit, GhDeployment } from '~~/shared/utils/changelog'
import { buildEntries, CHANGELOG_REPO, normalizeCommit, normalizeState } from '~~/shared/utils/changelog'

const GITHUB_API = 'https://api.github.com'
const FETCH_TIMEOUT_MS = 6000
const MAX_DEPLOYMENTS = 10
const MAX_COMMITS = 100

interface GhStatus {
  state: string
}

export class GithubRateLimitError extends Error {}

// Unauthenticated, GitHub allows 60 requests an hour per IP and one changelog
// read costs up to 12, so a token (5000/hr) is optional but recommended.
async function fetchGithub<T>(path: string, token: string): Promise<T> {
  const headers: Record<string, string> = { 'Accept': 'application/vnd.github+json', 'User-Agent': 'griffdive' }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  const res = await fetch(`${GITHUB_API}${path}`, { headers, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
  if (res.status === 429 || (res.status === 403 && (res.headers.get('x-ratelimit-remaining') === '0' || res.headers.has('retry-after')))) {
    throw new GithubRateLimitError('GitHub rate limit reached')
  }
  if (!res.ok) {
    throw new Error(`GitHub API responded ${res.status}`)
  }
  return await res.json() as T
}

export async function fetchChangelog(token: string): Promise<ChangelogEntry[]> {
  const [deployments, commits] = await Promise.all([
    // Production releases only: PR review apps also create GitHub
    // deployments (environment `review`) and must not pollute the changelog.
    fetchGithub<GhDeployment[]>(`/repos/${CHANGELOG_REPO}/deployments?environment=production&per_page=${MAX_DEPLOYMENTS}`, token),
    fetchGithub<GhCommit[]>(`/repos/${CHANGELOG_REPO}/commits?per_page=${MAX_COMMITS}`, token),
  ])
  if (!Array.isArray(deployments) || !Array.isArray(commits)) {
    throw new TypeError('Unexpected GitHub API response.')
  }
  const states: ChangelogState[] = await Promise.all(deployments.map(deployment =>
    fetchGithub<GhStatus[]>(`/repos/${CHANGELOG_REPO}/deployments/${deployment.id}/statuses?per_page=1`, token)
      .then(list => normalizeState(list[0]?.state))
      .catch(() => 'unknown' as const),
  ))
  return buildEntries(deployments, states, commits.map(normalizeCommit))
}
