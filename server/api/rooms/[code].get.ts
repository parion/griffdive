import { loadRoom, onlineDiverIds } from '../../utils/room-sync'
import { roomMetrics } from '../../utils/metrics'
import { roomKV } from '../../utils/room-storage'
import { peers } from '../../utils/peers'

export default defineEventHandler(async (event) => {
  const code = getRouterParam(event, 'code') ?? ''
  const room = await loadRoom(roomKV(), code)
  roomMetrics.recordRoomLookup(room ? 'found' : 'missing')
  if (!room) {
    throw createError({ statusCode: 404, statusMessage: 'Dive not found' })
  }
  // `online` is presence, not persistence: the record outlives the squad, so a
  // caller must not read "the room exists" as "someone is there".
  return {
    code: room.code,
    state: room.state,
    saved: room.saved ?? null,
    online: onlineDiverIds(peers, room.code, room.state),
  }
})
