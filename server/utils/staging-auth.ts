import { createHash, timingSafeEqual } from 'node:crypto'

// Compares an `Authorization: Basic …` header against the configured
// `user:password`. Both sides are hashed first so the comparison is
// constant-time regardless of length.
export function basicAuthMatches(header: string | undefined, expected: string): boolean {
  if (!expected || !header?.startsWith('Basic ')) {
    return false
  }
  const supplied = Buffer.from(header.slice('Basic '.length).trim(), 'base64').toString('utf8')
  const digest = (value: string) => createHash('sha256').update(value).digest()
  return timingSafeEqual(digest(supplied), digest(expected))
}
