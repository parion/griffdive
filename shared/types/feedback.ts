// Feedback is the one free-text path into Griffdive. It is deliberately small:
// a category, a note, an optional reply-to, and the machine context needed to
// reproduce a bug. No account, no room code, no diver name.

export const FEEDBACK_CATEGORIES = ['bug', 'idea', 'balance', 'other'] as const

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number]

export const FEEDBACK_MESSAGE_MAX = 2000
export const FEEDBACK_MESSAGE_MIN = 3
export const FEEDBACK_CONTACT_MAX = 200
export const FEEDBACK_REFERENCE_LENGTH = 10

export interface FeedbackContext {
  /** Engine build the note was filed against, e.g. `engine-29`. */
  version?: string
  /** Top-level screen, from a fixed allowlist — never a raw path or query. */
  path?: string
  difficulty?: number
  phase?: string
}

export interface FeedbackDraft {
  category?: FeedbackCategory
  message?: string
  contact?: string
  context?: FeedbackContext
  /** Honeypot: visually hidden, so only a script fills it. */
  website?: string
}

export interface FeedbackReceipt {
  /** Short human-quotable reference, also used to locate the note for deletion. */
  id: string
}
