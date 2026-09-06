import { processAction, processClose, processHello } from '../utils/room-sync'
import type { PeerLike } from '../utils/room-sync'
import { roomKV } from '../utils/room-storage'
import { peers as directory } from '../utils/peers'

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
    if (payload.type === 'hello') {
      await processHello(kv, directory, like, payload)
    }
    else if (payload.type === 'action') {
      await processAction(kv, directory, like, payload)
    }
    else {
      like.send(JSON.stringify({ type: 'error', code: 'bad-message', message: 'Unknown message type' }))
    }
  },

  async close(peer) {
    await processClose(roomKV(), directory, asPeerLike(peer))
  },
})
