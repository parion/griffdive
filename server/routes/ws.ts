import { processAction, processClose, processHello } from '../utils/room-sync'
import type { PeerLike, RoomLimits } from '../utils/room-sync'
import { roomKV } from '../utils/room-storage'
import { peers as directory } from '../utils/peers'
import { createRateLimiter } from '../utils/rate-limit'

// Process-wide throttles: joins are the room-code brute-force surface, actions
// the storage-write flood surface. Generous enough that real play never sees
// them (a diver cannot click 120 times in 10 seconds).
const limits: RoomLimits = {
  hello: createRateLimiter(20, 60_000),
  action: createRateLimiter(120, 10_000),
}

function asPeerLike(peer: unknown): PeerLike {
  return peer as PeerLike
}

export default defineWebSocketHandler({
  upgrade(request) {
    const url = new URL(request.url, 'http://localhost')
    ;(request.context as Record<string, unknown>).roomCode = url.searchParams.get('room') ?? ''
  },

  async message(peer, message) {
    if (message.text() === 'ping') {
      peer.send('pong')
      return
    }
    let payload: { type?: string, name?: unknown, playerId?: unknown, action?: unknown }
    try {
      payload = JSON.parse(message.text())
    }
    catch {
      asPeerLike(peer).send(JSON.stringify({ type: 'error', code: 'bad-message', message: 'Malformed message' }))
      return
    }
    const like = asPeerLike(peer)
    const kv = roomKV()
    try {
      if (payload.type === 'hello') {
        await processHello(kv, directory, like, payload, limits)
      }
      else if (payload.type === 'action') {
        await processAction(kv, directory, like, payload, limits)
      }
      else {
        like.send(JSON.stringify({ type: 'error', code: 'bad-message', message: 'Unknown message type' }))
      }
    }
    catch (error) {
      // One bad message must never take down the process-wide room server:
      // answer with an error and keep serving everyone else.
      console.error(`[ws] message handler failed: ${error instanceof Error ? error.message : error}`)
      like.send(JSON.stringify({ type: 'error', code: 'bad-message', message: 'Message could not be processed' }))
    }
  },

  async close(peer) {
    try {
      await processClose(roomKV(), directory, asPeerLike(peer))
    }
    catch (error) {
      console.error(`[ws] close handler failed: ${error instanceof Error ? error.message : error}`)
    }
  },
})
