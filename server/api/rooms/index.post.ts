import { RoomLimitError, createRoom } from '../../utils/room-sync'
import { roomKV } from '../../utils/room-storage'
import { createRateLimiter } from '../../utils/rate-limit'

// Ten new dives a minute per address is far more than a squad ever needs and
// keeps a script from filling the single machine with rooms.
const createLimiter = createRateLimiter(10, 60_000)

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  if (!createLimiter.take(ip)) {
    throw createError({ statusCode: 429, statusMessage: 'Too many dives started — try again shortly.' })
  }
  try {
    const code = await createRoom(roomKV())
    return { code }
  }
  catch (error) {
    if (error instanceof RoomLimitError) {
      throw createError({ statusCode: 503, statusMessage: 'The servers are full — try again later.' })
    }
    throw error
  }
})
