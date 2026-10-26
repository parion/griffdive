import { basicAuthMatches } from '../utils/staging-auth'

// Staging is private: with STAGING_AUTH (`user:password`, a Fly secret set on
// the staging app only) every page and API call asks for a password. Unset —
// production, review apps, local dev and e2e — this is a no-op. The WebSocket
// upgrade bypasses Nitro middleware, which is acceptable: a socket can only
// join a room, and rooms are created over the guarded REST route.
const expected = process.env.STAGING_AUTH ?? ''

export default defineEventHandler((event) => {
  if (!expected) {
    return
  }
  setResponseHeader(event, 'X-Robots-Tag', 'noindex, nofollow')
  if (basicAuthMatches(getRequestHeader(event, 'authorization'), expected)) {
    return
  }
  setResponseHeader(event, 'WWW-Authenticate', 'Basic realm="Griffdive staging", charset="UTF-8"')
  setResponseStatus(event, 401)
  return 'Staging is private.'
})
