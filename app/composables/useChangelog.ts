const GITHUB_REPO = 'parion/griffdive'
const GITHUB_API = 'https://api.github.com'
const CHANGELOG_TTL_MS = 10 * 60 * 1000
const MAX_DEPLOYMENTS = 10
const MAX_COMMITS = 100

export interface ChangelogCommit {
  sha: string
  shortSha: string
  url: string
  subject: string
  type: string | null
}

export interface ChangelogEntry {
  id: number
  sha: string | null
  shortSha: string | null
  url: string
  createdAt: string | null
  state: 'pending' | 'in_progress' | 'success' | 'failure' | 'error' | 'unknown'
  commits: ChangelogCommit[]
}

export type ChangelogStatus = 'idle' | 'loading' | 'ready' | 'error'

interface GhDeployment {
  id: number
  sha: string
  created_at: string
}

interface GhCommit {
  sha: string
  html_url: string
  commit: { message: string }
}

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

function normalizeCommit(raw: GhCommit): ChangelogCommit {
  const subject = raw.commit.message.split('\n', 1)[0] ?? raw.commit.message
  const match = /^(\w+)(?:\([^)]*\))?!?:\s+(.*)$/.exec(subject)
  return {
    sha: raw.sha,
    shortSha: raw.sha.slice(0, 7),
    url: raw.html_url,
    subject: match?.[2] ?? subject,
    type: match?.[1] ?? null,
  }
}

function normalizeState(state: string | undefined): ChangelogEntry['state'] {
  switch (state) {
    case 'success': return 'success'
    case 'failure':
    case 'error':
    case 'inactive': return 'failure'
    case 'in_progress':
    case 'queued':
    case 'pending': return 'in_progress'
    default: return 'unknown'
  }
}

// Commits land in the bucket of the deployment whose sha they build on: walking
// newest→oldest, a commit joins the bucket of the last deployment sha we passed,
// so a deploy entry lists everything shipped since the previous one.
function bucketCommits(deployments: GhDeployment[], commits: ChangelogCommit[]) {
  const bucketOfSha = new Map(deployments.map((deployment, index) => [deployment.sha, index] as const))
  const buckets = new Map<number, ChangelogCommit[]>()
  for (const [index] of deployments.entries()) {
    buckets.set(index, [])
  }
  const pending: ChangelogCommit[] = []
  let cursor = -1
  for (const commit of commits) {
    const bucket = bucketOfSha.get(commit.sha)
    if (bucket !== undefined) {
      cursor = bucket
    }
    if (cursor === -1) {
      pending.push(commit)
    }
    else {
      buckets.get(cursor)?.push(commit)
    }
  }
  return { pending, buckets }
}

// Release notes, not a git log: only diver-meaningful conventional commits are
// listed. Merges, CI, chores and version bumps are plumbing. Bucketing still
// runs over the full history (a deployment's sha is often a merge commit), then
// each bucket is filtered, so boundaries stay correct.
const NOTABLE_COMMIT_TYPES = new Set(['feat', 'fix', 'perf', 'refactor'])

function isNotableCommit(commit: ChangelogCommit): boolean {
  return commit.type !== null && NOTABLE_COMMIT_TYPES.has(commit.type)
}

// A failed or cancelled CI batch is not a release — listing it as a regression
// reads as chaos on what is really a steady deploy history. Its commits roll
// into the next release boundary (or the pending block), never disappear.
function isReleaseState(state: ChangelogEntry['state']): boolean {
  return state !== 'failure' && state !== 'error'
}

function buildEntries(deployments: GhDeployment[], states: ChangelogEntry['state'][], commits: ChangelogCommit[]): ChangelogEntry[] {
  const releases = deployments
    .map((deployment, index) => ({ deployment, state: states[index] ?? 'unknown' }))
    .filter(release => isReleaseState(release.state))
  const { pending, buckets } = bucketCommits(releases.map(release => release.deployment), commits)
  const entries: ChangelogEntry[] = []
  const pendingNotable = pending.filter(isNotableCommit)
  if (pendingNotable.length > 0) {
    const head = releases[0]?.deployment
    entries.push({
      id: -1,
      sha: null,
      shortSha: null,
      url: head
        ? `https://github.com/${GITHUB_REPO}/compare/${head.sha.slice(0, 7)}...main`
        : `https://github.com/${GITHUB_REPO}/commits/main`,
      createdAt: null,
      state: 'pending',
      commits: pendingNotable,
    })
  }
  // Newest first: GitHub lists deployments newest→oldest, so walk forward and
  // keep the pending block (commits past the newest release) at the very top.
  for (let index = 0; index < releases.length; index++) {
    const release = releases[index]
    if (!release) {
      continue
    }
    const notable = (buckets.get(index) ?? []).filter(isNotableCommit)
    if (notable.length === 0) {
      continue
    }
    entries.push({
      id: release.deployment.id,
      sha: release.deployment.sha,
      shortSha: release.deployment.sha.slice(0, 7),
      url: `https://github.com/${GITHUB_REPO}/commit/${release.deployment.sha}`,
      createdAt: release.deployment.created_at,
      state: release.state,
      commits: notable,
    })
  }
  return entries
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
        fetchGithub<GhDeployment[]>(`/repos/${GITHUB_REPO}/deployments?environment=production&per_page=${MAX_DEPLOYMENTS}`),
        fetchGithub<GhCommit[]>(`/repos/${GITHUB_REPO}/commits?per_page=${MAX_COMMITS}`),
      ])
      if (!Array.isArray(deployments) || !Array.isArray(commits)) {
        throw new Error('Unexpected GitHub API response.')
      }
      const states = await Promise.all(deployments.map(deployment =>
        fetchGithub<GhStatus[]>(`/repos/${GITHUB_REPO}/deployments/${deployment.id}/statuses?per_page=1`)
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
