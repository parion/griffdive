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

function buildEntries(deployments: GhDeployment[], states: ChangelogEntry['state'][], commits: ChangelogCommit[]): ChangelogEntry[] {
  const { pending, buckets } = bucketCommits(deployments, commits)
  const entries: ChangelogEntry[] = []
  if (pending.length > 0) {
    const head = deployments[0]
    entries.push({
      id: -1,
      sha: null,
      shortSha: null,
      url: head
        ? `https://github.com/${GITHUB_REPO}/compare/${head.sha.slice(0, 7)}...main`
        : `https://github.com/${GITHUB_REPO}/commits/main`,
      createdAt: null,
      state: 'pending',
      commits: pending,
    })
  }
  for (let index = deployments.length - 1; index >= 0; index--) {
    const deployment = deployments[index]
    if (!deployment) {
      continue
    }
    entries.push({
      id: deployment.id,
      sha: deployment.sha,
      shortSha: deployment.sha.slice(0, 7),
      url: `https://github.com/${GITHUB_REPO}/commit/${deployment.sha}`,
      createdAt: deployment.created_at,
      state: states[index] ?? 'unknown',
      commits: buckets.get(index) ?? [],
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
        fetchGithub<GhDeployment[]>(`/repos/${GITHUB_REPO}/deployments?per_page=${MAX_DEPLOYMENTS}`),
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
