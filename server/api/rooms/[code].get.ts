import { loadRoom } from '../../utils/room-sync'
import { roomMetrics } from '../../utils/metrics'
import { roomKV } from '../../utils/room-storage'

export default defineEventHandler(async (event) => {
  const code = getRouterParam(event, 'code') ?? ''
  const room = await loadRoom(roomKV(), code)
  roomMetrics.recordRoomLookup(room ? 'found' : 'missing')
  if (!room) {
    throw createError({ statusCode: 404, statusMessage: 'Dive not found' })
  }
  return { code: room.code, state: room.state, saved: room.saved ?? null }
})
