import { createRoom } from '../../utils/room-sync'
import { roomKV } from '../../utils/room-storage'

export default defineEventHandler(async () => {
  const code = await createRoom(roomKV())
  return { code }
})
