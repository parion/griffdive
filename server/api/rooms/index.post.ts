import { InvalidSaveError, RoomLimitError, createRoom, createRoomFromSave } from '../../utils/room-sync'
import { roomKV } from '../../utils/room-storage'
import { createRateLimiter } from '../../utils/rate-limit'

// Ten new dives a minute per address is far more than a squad ever needs and
// keeps a script from filling the single machine with rooms.
const createLimiter = createRateLimiter(10, 60_000)

// A session save is a few dozen KB of JSON; anything past this is abuse.
const MAX_SAVE_BODY_BYTES = 256 * 1024

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  if (!createLimiter.take(ip)) {
    throw createError({ statusCode: 429, statusMessage: 'Too many dives started — try again shortly.' })
  }

  // Body is optional: a plain POST starts a fresh lobby, a POST with a personal
  // session save seeds a new room from it (the saver becomes host).
  const raw = await readRawBody(event)
  let body: { save?: unknown, name?: unknown } | null = null
  if (raw) {
    if (raw.length > MAX_SAVE_BODY_BYTES) {
      throw createError({ statusCode: 413, statusMessage: 'Save is too large.' })
    }
    try {
      body = JSON.parse(raw) as { save?: unknown, name?: unknown }
    }
    catch {
      throw createError({ statusCode: 400, statusMessage: 'Malformed request body.' })
    }
  }
  const name = typeof body?.name === 'string' ? body.name : ''

  try {
    if (body?.save) {
      return await createRoomFromSave(roomKV(), body.save, name)
    }
    return { code: await createRoom(roomKV()), selfId: null }
  }
  catch (error) {
    if (error instanceof RoomLimitError) {
      throw createError({ statusCode: 503, statusMessage: 'The servers are full — try again later.' })
    }
    if (error instanceof InvalidSaveError) {
      throw createError({ statusCode: 400, statusMessage: error.message })
    }
    throw error
  }
})
