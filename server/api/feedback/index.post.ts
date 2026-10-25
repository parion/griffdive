import { randomUUID } from 'node:crypto'
import { roomMetrics } from '../../utils/metrics'
import { feedbackKV } from '../../utils/feedback-storage'
import { isHoneypot, newFeedbackId, sanitizeFeedback, saveFeedback } from '../../utils/feedback'
import { createRateLimiter } from '../../utils/rate-limit'

// Eight notes per ten minutes is more than a squad of four ever needs, and it
// keeps a script from filling the inbox. The e2e server raises it (FEEDBACK_LIMIT).
const feedbackLimiter = createRateLimiter(Number.parseInt(process.env.FEEDBACK_LIMIT ?? '', 10) || 8, 10 * 60_000)

// A note is a couple of KB; anything past this is not a diver typing.
const MAX_BODY_BYTES = 16 * 1024

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  if (!feedbackLimiter.take(ip)) {
    roomMetrics.recordFeedbackRejected('rate_limited')
    throw createError({ statusCode: 429, statusMessage: 'Too many notes from this connection — try again later.' })
  }

  const raw = await readRawBody(event)
  if (!raw) {
    roomMetrics.recordFeedbackRejected('invalid')
    throw createError({ statusCode: 400, statusMessage: 'Write a note first.' })
  }
  if (raw.length > MAX_BODY_BYTES) {
    roomMetrics.recordFeedbackRejected('too_large')
    throw createError({ statusCode: 413, statusMessage: 'That note is too long.' })
  }

  let body: unknown
  try {
    body = JSON.parse(raw)
  }
  catch {
    roomMetrics.recordFeedbackRejected('malformed')
    throw createError({ statusCode: 400, statusMessage: 'Malformed request body.' })
  }

  // A bot filled the invisible field. Answer exactly like a success so it has
  // nothing to learn, but store and count nothing (the rejection counter is
  // deliberately not incremented either — a script could measure its own hits).
  if (isHoneypot(body)) {
    return { id: newFeedbackId(randomUUID()) }
  }

  const payload = sanitizeFeedback(body)
  if (!payload) {
    roomMetrics.recordFeedbackRejected('invalid')
    throw createError({ statusCode: 400, statusMessage: 'Write at least a few words.' })
  }

  const entry = { ...payload, id: newFeedbackId(randomUUID()), at: Date.now() }
  await saveFeedback(feedbackKV(), entry)
  roomMetrics.recordFeedback(entry.category)

  return { id: entry.id }
})
