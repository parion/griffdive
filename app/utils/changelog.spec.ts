import { describe, expect, it } from 'vitest'
import { buildEntries, groupCommits, normalizeCommit, normalizeState, type ChangelogCommit, type ChangelogState, type GhDeployment } from './changelog'

function sha(ref: string): string {
  return ref.padEnd(40, '0')
}

function deployment(id: number, ref: string, createdAt = '2026-10-13T12:00:00Z'): GhDeployment {
  return { id, sha: sha(ref), created_at: createdAt }
}

function commit(ref: string, message: string): ChangelogCommit {
  return normalizeCommit({ sha: sha(ref), html_url: `https://example.test/${ref}`, commit: { message } })
}

describe('normalizeCommit', () => {
  it('reads the type and subject off conventional commits', () => {
    expect(normalizeCommit({ sha: sha('x'), html_url: 'https://example.test/x', commit: { message: 'feat(dive)!: gate joiners\n\nbody' } }))
      .toMatchObject({ type: 'feat', subject: 'gate joiners', shortSha: sha('x').slice(0, 7) })
  })

  it('treats merges, untyped subjects and plumbing types as untyped', () => {
    expect(commit('a', 'Merge pull request #77 from parion/fix').type).toBeNull()
    expect(commit('b', 'docs: update the index').type).toBeNull()
    expect(commit('c', 'no prefix here')).toMatchObject({ type: null, subject: 'no prefix here' })
  })
})

describe('normalizeState', () => {
  it('folds GitHub deployment statuses into the changelog phases', () => {
    expect(normalizeState('success')).toBe('success')
    expect(normalizeState('waiting')).toBe('waiting')
    expect(normalizeState('queued')).toBe('in_progress')
    expect(normalizeState('in_progress')).toBe('in_progress')
    expect(normalizeState('pending')).toBe('in_progress')
    expect(normalizeState('failure')).toBe('failure')
    expect(normalizeState('error')).toBe('failure')
    expect(normalizeState('inactive')).toBe('failure')
    expect(normalizeState(undefined)).toBe('unknown')
  })
})

describe('groupCommits', () => {
  it('groups by release order and drops the plumbing', () => {
    const groups = groupCommits([
      commit('a', 'refactor: x'),
      commit('b', 'chore: y'),
      commit('c', 'fix: z'),
      commit('d', 'feat: w'),
      commit('e', 'Merge branch main'),
    ])
    expect(groups.map(group => group.type)).toEqual(['feat', 'fix', 'refactor'])
    expect(groups.map(group => group.label)).toEqual(['Features', 'Fixes', 'Refactors'])
    expect(groups[0]?.commits.map(entry => entry.subject)).toEqual(['w'])
  })
})

describe('buildEntries', () => {
  const history = [
    commit('main-b', 'fix: still on main'),
    commit('rel-3', 'Merge pull request #9 from parion/x'),
    commit('ship-3', 'feat: shipped in release 3'),
    commit('rel-2', 'Merge pull request #8 from parion/y'),
    commit('ship-2', 'fix: shipped in release 2'),
    commit('rel-1', 'Merge pull request #7 from parion/y'),
    commit('ship-1', 'refactor: shipped in release 1'),
    commit('plumbing', 'chore: nothing to see'),
  ]

  it('cuts the history at release boundaries, newest first, pending on top', () => {
    const entries = buildEntries(
      [deployment(3, 'rel-3'), deployment(2, 'rel-2'), deployment(1, 'rel-1')],
      ['success', 'success', 'success'] as ChangelogState[],
      history,
    )
    expect(entries.map(entry => entry.id)).toEqual([-1, 3, 2, 1])
    expect(entries.map(entry => entry.state)).toEqual(['pending', 'success', 'success', 'success'])
    expect(entries[0]?.groups).toEqual([
      { type: 'fix', label: 'Fixes', commits: [commit('main-b', 'fix: still on main')] },
    ])
    expect(entries[0]?.url).toBe(`https://github.com/parion/griffdive/compare/${sha('rel-3').slice(0, 7)}...main`)
    expect(entries[1]?.groups.map(group => [group.label, group.commits.map(entry => entry.subject)])).toEqual([
      ['Features', ['shipped in release 3']],
    ])
    expect(entries[3]?.groups.map(group => group.label)).toEqual(['Refactors'])
  })

  it('rolls a failed batch into the next release instead of listing it', () => {
    const entries = buildEntries(
      [deployment(3, 'rel-3'), deployment(2, 'rel-2'), deployment(1, 'rel-1')],
      ['success', 'failure', 'success'] as ChangelogState[],
      [
        commit('main-b', 'fix: still on main'),
        commit('rel-3', 'Merge pull request #9 from parion/x'),
        commit('failed-b', 'feat: merged into the cancelled batch'),
        commit('rel-2', 'Merge pull request #8 from parion/y'),
        commit('failed-a', 'fix: also in the cancelled batch'),
        commit('rel-1', 'Merge pull request #7 from parion/y'),
        commit('ship-1', 'perf: shipped in release 1'),
      ],
    )
    expect(entries.map(entry => entry.id)).toEqual([-1, 3, 1])
    expect(entries[1]?.groups.flatMap(group => group.commits.map(entry => entry.subject))).toEqual([
      'merged into the cancelled batch',
      'also in the cancelled batch',
    ])
    expect(entries[2]?.groups.map(group => group.label)).toEqual(['Performance'])
  })

  it('skips releases that shipped no notable commits', () => {
    const entries = buildEntries(
      [deployment(2, 'rel-2'), deployment(1, 'rel-1')],
      ['success', 'success'] as ChangelogState[],
      [
        commit('rel-2', 'Merge pull request #8 from parion/y'),
        commit('chore-1', 'chore: bump deps'),
        commit('rel-1', 'Merge pull request #7 from parion/y'),
        commit('ship-1', 'feat: shipped in release 1'),
      ],
    )
    expect(entries.map(entry => entry.id)).toEqual([1])
  })

  it('keeps an unreleased history readable without any deployment', () => {
    const entries = buildEntries([], [], [commit('main-a', 'feat: first light')])
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      id: -1,
      state: 'pending',
      url: 'https://github.com/parion/griffdive/commits/main',
    })
  })
})
