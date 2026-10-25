import { describe, expect, it } from 'vitest'
import {
  FEEDBACK_INBOX_CAP,
  FEEDBACK_RETENTION_MS,
  isHoneypot,
  newFeedbackId,
  readInbox,
  sanitizeFeedback,
  saveFeedback,
} from './feedback'
import type { FeedbackEntry, FeedbackKV } from './feedback'

function fakeKV(initial?: unknown): FeedbackKV & { value?: unknown } {
  const kv = {
    value: initial,
    async getItem() {
      return kv.value
    },
    async setItem(_key: string, next: FeedbackEntry[]) {
      kv.value = next
    },
  }
  return kv
}

function entry(overrides: Partial<FeedbackEntry> = {}): FeedbackEntry {
  return {
    id: 'ABCDEF1234',
    at: 1_000,
    category: 'bug',
    message: 'The wheel stuttered.',
    contact: null,
    context: {},
    ...overrides,
  }
}

describe('feedback intake', () => {
  it('normalizes a note and defaults an unknown category', () => {
    const clean = sanitizeFeedback({
      category: 'nonsense',
      message: '  The\n\n\n\nwheel   stuttered.  ',
      contact: '  diver@example.com  ',
      context: { version: 'engine-29', path: '/dive/AB3C45?x=1', difficulty: 7, phase: 'spin' },
    })

    expect(clean).toEqual({
      category: 'other',
      message: 'The\n\nwheel   stuttered.',
      contact: 'diver@example.com',
      context: { version: 'engine-29', path: '/dive', difficulty: 7, phase: 'spin' },
    })
  })

  it('refuses notes that carry nothing to act on', () => {
    expect(sanitizeFeedback(null)).toBeNull()
    expect(sanitizeFeedback({ message: '  a  ' })).toBeNull()
    expect(sanitizeFeedback({ message: 42 })).toBeNull()
    expect(sanitizeFeedback({})).toBeNull()
  })

  it('caps length and strips control characters', () => {
    const clean = sanitizeFeedback({
      message: `ok\u0000\u0007 ${'x'.repeat(4000)}`,
      contact: `line\nbreak ${'y'.repeat(400)}`,
    })

    expect(clean?.message.startsWith('ok ')).toBe(true)
    expect(clean?.message.length).toBeLessThanOrEqual(2000)
    expect(clean?.message).not.toContain('\u0000')
    expect(clean?.contact?.length).toBeLessThanOrEqual(200)
    expect(clean?.contact).not.toContain('\n')
  })

  it('keeps only allowlisted machine context', () => {
    const clean = sanitizeFeedback({
      message: 'Note that is long enough.',
      context: {
        version: 'engine-29',
        path: '/admin?token=secret',
        difficulty: 99,
        phase: 'not-a-phase',
      },
    })

    expect(clean?.context).toEqual({ version: 'engine-29' })
  })

  it('treats a filled honeypot as a bot', () => {
    expect(isHoneypot({ website: 'https://spam.example' })).toBe(true)
    expect(isHoneypot({ website: '   ' })).toBe(false)
    expect(isHoneypot({ website: 7 })).toBe(false)
    expect(isHoneypot(null)).toBe(false)
  })

  it('formats a short uppercase reference from a uuid', () => {
    expect(newFeedbackId('3f2b8c1e-4d5a-4b6c-8d9e-0f1a2b3c4d5e')).toBe('3F2B8C1E4D')
    expect(newFeedbackId('short')).toBe('SHORT')
  })
})

describe('feedback inbox', () => {
  it('drops expired and corrupt entries on read', async () => {
    const now = 10 * FEEDBACK_RETENTION_MS
    const kv = fakeKV([
      entry({ id: 'FRESH00001', at: now - 1_000 }),
      entry({ id: 'STALE00001', at: now - FEEDBACK_RETENTION_MS - 1 }),
      { id: 'BROKEN', at: 'yesterday' } as unknown as FeedbackEntry,
    ])

    const inbox = await readInbox(kv, now)
    expect(inbox.map(item => item.id)).toEqual(['FRESH00001'])
  })

  it('tolerates a missing or non-array store', async () => {
    expect(await readInbox(fakeKV(undefined), 0)).toEqual([])
    expect(await readInbox(fakeKV({ nope: true }), 0)).toEqual([])
  })

  it('keeps the newest notes under the cap', async () => {
    const now = 5_000
    const existing = Array.from({ length: FEEDBACK_INBOX_CAP + 10 }, (_, index) =>
      entry({ id: `OLD${String(index).padStart(7, '0')}`, at: now - index }))
    const kv = fakeKV(existing)

    await saveFeedback(kv, entry({ id: 'NEWEST0001', at: now }), now)

    const inbox = (await readInbox(kv, now)) as FeedbackEntry[]
    expect(inbox).toHaveLength(FEEDBACK_INBOX_CAP)
    expect(inbox.at(-1)?.id).toBe('NEWEST0001')
  })

  it('serializes concurrent writes so no note is lost', async () => {
    const store = { value: [] as FeedbackEntry[] }
    const kv: FeedbackKV = {
      async getItem() {
        const snapshot = store.value
        await new Promise(resolve => setTimeout(resolve, 5))
        return snapshot
      },
      async setItem(_key, next) {
        store.value = next
      },
    }

    await Promise.all([
      saveFeedback(kv, entry({ id: 'AAAA000001' }), 10),
      saveFeedback(kv, entry({ id: 'BBBB000001' }), 10),
    ])

    expect(store.value.map(item => item.id).sort()).toEqual(['AAAA000001', 'BBBB000001'])
  })
})
