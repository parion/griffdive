import type { FeedbackCategory, FeedbackContext, FeedbackDraft } from '~~/shared/types/feedback'
import { MAX_DIFFICULTY, MIN_DIFFICULTY } from '~~/shared/engine/config'
import { DIVE_PHASES } from '~~/shared/engine/types'
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_CONTACT_MAX,
  FEEDBACK_MESSAGE_MAX,
  FEEDBACK_MESSAGE_MIN,
} from '~~/shared/types/feedback'

// Notes are kept long enough to act on and short enough that the inbox is not a
// growing archive. The cap is the real backstop: fine for a fan project.
export const FEEDBACK_RETENTION_MS = 180 * 24 * 60 * 60 * 1000
export const FEEDBACK_INBOX_CAP = 500

const INBOX_KEY = 'inbox'
const CONTEXT_TEXT_MAX = 40
const KNOWN_PATHS = ['/', '/dive', '/codex', '/kit', '/privacy'] as const

export interface FeedbackEntry {
  id: string
  at: number
  category: FeedbackCategory
  message: string
  contact: string | null
  context: FeedbackContext
}

export interface FeedbackKV {
  getItem(key: string): Promise<unknown>
  setItem(key: string, value: FeedbackEntry[]): Promise<void>
}

export type FeedbackPayload = Pick<FeedbackEntry, 'category' | 'message' | 'contact' | 'context'>

// Control characters are invisible in a review tool and only ever help a
// payload smuggle something; tabs and newlines stay so paragraphs survive.
function cleanText(value: unknown, max: number): string {
  if (typeof value !== 'string') {
    return ''
  }
  return value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max)
    .trim()
}

function cleanContext(raw: unknown): FeedbackContext {
  if (!raw || typeof raw !== 'object') {
    return {}
  }
  const input = raw as Record<string, unknown>
  const context: FeedbackContext = {}

  if (typeof input.version === 'string') {
    const version = cleanText(input.version, CONTEXT_TEXT_MAX)
    if (version) {
      context.version = version
    }
  }

  if (typeof input.path === 'string') {
    const path = input.path.split('?')[0] ?? ''
    if ((KNOWN_PATHS as readonly string[]).includes(path)) {
      context.path = path
    }
    else if (path.startsWith('/dive')) {
      context.path = '/dive'
    }
  }

  if (
    typeof input.difficulty === 'number'
    && Number.isInteger(input.difficulty)
    && input.difficulty >= MIN_DIFFICULTY
    && input.difficulty <= MAX_DIFFICULTY
  ) {
    context.difficulty = input.difficulty
  }

  if (typeof input.phase === 'string' && (DIVE_PHASES as readonly string[]).includes(input.phase)) {
    context.phase = input.phase
  }

  return context
}

export function isHoneypot(draft: unknown): boolean {
  if (!draft || typeof draft !== 'object') {
    return false
  }
  const website = (draft as { website?: unknown }).website
  return typeof website === 'string' && website.trim().length > 0
}

export function sanitizeFeedback(draft: unknown): FeedbackPayload | null {
  if (!draft || typeof draft !== 'object') {
    return null
  }
  const input = draft as FeedbackDraft
  const message = cleanText(input.message, FEEDBACK_MESSAGE_MAX)
  if (message.length < FEEDBACK_MESSAGE_MIN) {
    return null
  }

  const category = FEEDBACK_CATEGORIES.includes(input.category as FeedbackCategory)
    ? input.category as FeedbackCategory
    : 'other'
  // A reply-to is a courtesy, not an identity: one line, and never required.
  const contact = cleanText(input.contact, FEEDBACK_CONTACT_MAX).replace(/\n/g, ' ')

  return {
    category,
    message,
    contact: contact || null,
    context: cleanContext(input.context),
  }
}

export function newFeedbackId(uuid: string): string {
  return uuid.replace(/-/g, '').slice(0, 10).toUpperCase()
}

function isEntry(value: unknown): value is FeedbackEntry {
  if (!value || typeof value !== 'object') {
    return false
  }
  const entry = value as FeedbackEntry
  return (
    typeof entry.id === 'string'
    && entry.id.length > 0
    && typeof entry.at === 'number'
    && FEEDBACK_CATEGORIES.includes(entry.category)
    && typeof entry.message === 'string'
    && (entry.contact === null || typeof entry.contact === 'string')
    && !!entry.context
    && typeof entry.context === 'object'
  )
}

export async function readInbox(kv: FeedbackKV, now = Date.now()): Promise<FeedbackEntry[]> {
  const raw = await kv.getItem(INBOX_KEY)
  if (!Array.isArray(raw)) {
    return []
  }
  return raw.filter(entry => isEntry(entry) && now - entry.at < FEEDBACK_RETENTION_MS)
}

// Writes are serialized for the process: read-modify-write on one key would
// otherwise drop a note when two divers file at the same instant.
let writes: Promise<unknown> = Promise.resolve()

export function saveFeedback(kv: FeedbackKV, entry: FeedbackEntry, now = Date.now()): Promise<void> {
  const task = async (): Promise<void> => {
    const inbox = await readInbox(kv, now)
    inbox.push(entry)
    await kv.setItem(INBOX_KEY, inbox.slice(-FEEDBACK_INBOX_CAP))
  }
  const run = writes.then(task, task)
  writes = run.then(() => undefined, () => undefined)
  return run
}
