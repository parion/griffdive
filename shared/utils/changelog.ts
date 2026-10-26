// GitHub deployment records and commits → the changelog's release cards.
// Pure shaping lives here so the /api/changelog proxy only fetches and caches,
// and the release boundaries stay covered by unit tests.

export const CHANGELOG_REPO = 'parion/griffdive'

export type ChangelogCommitType = 'feat' | 'fix' | 'perf' | 'refactor'

// A release card's deployment phase. `pending` is the synthetic card for
// commits on main past the newest release; `unknown` covers a deployment
// whose status could not be read.
export type ChangelogState = 'pending' | 'waiting' | 'in_progress' | 'success' | 'failure' | 'unknown'

export interface ChangelogCommit {
  sha: string
  shortSha: string
  url: string
  subject: string
  type: ChangelogCommitType | null
}

// Raw GitHub API shapes, narrowed to what the builder reads.
export interface GhDeployment {
  id: number
  sha: string
  created_at: string
}

export interface GhCommit {
  sha: string
  html_url: string
  commit: { message: string }
}

export interface ChangelogGroup {
  type: ChangelogCommitType
  label: string
  commits: ChangelogCommit[]
}

export interface ChangelogEntry {
  id: number
  sha: string | null
  shortSha: string | null
  url: string
  createdAt: string | null
  state: ChangelogState
  groups: ChangelogGroup[]
}

const COMMIT_TYPES = new Set<string>(['feat', 'fix', 'perf', 'refactor'])

export function normalizeCommit(raw: GhCommit): ChangelogCommit {
  const subject = raw.commit.message.split('\n', 1)[0] ?? raw.commit.message
  const match = /^(\w+)(?:\([^)]*\))?!?:\s+(.*)$/.exec(subject)
  const type = match?.[1]
  return {
    sha: raw.sha,
    shortSha: raw.sha.slice(0, 7),
    url: raw.html_url,
    subject: match?.[2] ?? subject,
    type: type !== undefined && COMMIT_TYPES.has(type) ? type as ChangelogCommitType : null,
  }
}

export function normalizeState(state: string | undefined): ChangelogState {
  switch (state) {
    case 'success': return 'success'
    case 'waiting': return 'waiting'
    case 'in_progress':
    case 'queued':
    case 'pending': return 'in_progress'
    case 'failure':
    case 'error':
    case 'inactive': return 'failure'
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

// Release notes, not a git log: merges, CI, chores and version bumps are
// plumbing. Bucketing still runs over the full history (a deployment's sha is
// often a merge commit), then each bucket is grouped, so boundaries stay right.
const GROUPS: readonly { type: ChangelogCommitType, label: string }[] = [
  { type: 'feat', label: 'Features' },
  { type: 'fix', label: 'Fixes' },
  { type: 'perf', label: 'Performance' },
  { type: 'refactor', label: 'Refactors' },
]

export function groupCommits(commits: ChangelogCommit[]): ChangelogGroup[] {
  return GROUPS
    .map(group => ({ ...group, commits: commits.filter(commit => commit.type === group.type) }))
    .filter(group => group.commits.length > 0)
}

// A failed or cancelled release is not a phase the squad lived through — its
// commits roll into the next release boundary (or the pending block), never
// disappear or read as chaos on a steady deploy history.
function isReleaseState(state: ChangelogState): boolean {
  return state !== 'failure'
}

export function buildEntries(deployments: GhDeployment[], states: ChangelogState[], commits: ChangelogCommit[]): ChangelogEntry[] {
  const releases = deployments
    .map((deployment, index) => ({ deployment, state: states[index] ?? 'unknown' }))
    .filter(release => isReleaseState(release.state))
  const { pending, buckets } = bucketCommits(releases.map(release => release.deployment), commits)
  const entries: ChangelogEntry[] = []
  const pendingGroups = groupCommits(pending)
  if (pendingGroups.length > 0) {
    const head = releases[0]?.deployment
    entries.push({
      id: -1,
      sha: null,
      shortSha: null,
      url: head
        ? `https://github.com/${CHANGELOG_REPO}/compare/${head.sha.slice(0, 7)}...main`
        : `https://github.com/${CHANGELOG_REPO}/commits/main`,
      createdAt: null,
      state: 'pending',
      groups: pendingGroups,
    })
  }
  // Newest first: GitHub lists deployments newest→oldest, so walk forward and
  // keep the pending block (commits past the newest release) at the very top.
  for (let index = 0; index < releases.length; index++) {
    const release = releases[index]
    if (!release) {
      continue
    }
    const groups = groupCommits(buckets.get(index) ?? [])
    if (groups.length === 0) {
      continue
    }
    entries.push({
      id: release.deployment.id,
      sha: release.deployment.sha,
      shortSha: release.deployment.sha.slice(0, 7),
      url: `https://github.com/${CHANGELOG_REPO}/commit/${release.deployment.sha}`,
      createdAt: release.deployment.created_at,
      state: release.state,
      groups,
    })
  }
  return entries
}
