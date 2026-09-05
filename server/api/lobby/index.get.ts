import { listLobby } from '../../utils/room-sync'
import { roomKV } from '../../utils/room-storage'

export default defineEventHandler(async () => {
  return { rooms: await listLobby(roomKV()) }
})
