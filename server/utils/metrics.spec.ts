import { describe, expect, it } from 'vitest'
import { createRoomMetrics } from './metrics'
import { createPeerDirectory } from './room-sync'
import type { PeerLike } from './room-sync'

function fakePeer(id: string, playerId?: string): PeerLike {
  return {
    id,
    context: playerId ? { playerId } : {},
    send: () => {},
  }
}

describe('room-metrics', () => {
  it('counts distinct seated players, active rooms and lobby-published rooms', async () => {
    const peers = createPeerDirectory()
    peers.add('AB3C45', fakePeer('ws-1', 'p1'))
    peers.add('AB3C45', fakePeer('ws-2', 'p1')) // same diver, second tab
    peers.add('AB3C45', fakePeer('ws-3')) // connected, not yet seated
    peers.add('XY8Z90', fakePeer('ws-4', 'p2'))
    peers.add('__lobby__', fakePeer('ws-listener'))

    const metrics = createRoomMetrics()
    metrics.bind({ peers, openRooms: async () => 1 })
    metrics.recordDiveStarted()
    metrics.recordDiveStarted()

    const text = await metrics.registry.metrics()
    expect(text).toContain('griffdive_online_players 2')
    expect(text).toContain('griffdive_active_rooms 2')
    expect(text).toContain('griffdive_open_rooms 1')
    expect(text).toContain('griffdive_dives_started_total 2')
  })

  it('renders zeroes without throwing before the plugin binds a source', async () => {
    const metrics = createRoomMetrics()

    const text = await metrics.registry.metrics()
    expect(text).toContain('griffdive_online_players 0')
    expect(text).toContain('griffdive_active_rooms 0')
    expect(text).toContain('griffdive_open_rooms 0')
    expect(text).toContain('griffdive_dives_started_total 0')
  })
})
