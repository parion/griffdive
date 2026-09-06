import { Counter, Gauge, Registry, collectDefaultMetrics } from '@prometheus-io/client'
import { isLobbyRoom } from '~~/shared/types/messages'
import type { PeerDirectory } from './room-sync'

// Live signals the gauges snapshot at scrape time. Injected by the metrics
// plugin so this module stays Nitro-free and unit-testable.
export interface RoomMetricsSource {
  peers: PeerDirectory
  openRooms(): Promise<number>
}

export interface RoomMetrics {
  registry: Registry
  bind(source: RoomMetricsSource): void
  recordDiveStarted(): void
}

export function createRoomMetrics(): RoomMetrics {
  const registry = new Registry()
  collectDefaultMetrics({ register: registry })

  let source: RoomMetricsSource | null = null

  const divesStarted = new Counter({
    name: 'griffdive_dives_started_total',
    help: 'Crusades launched (START_DIVE) since process start',
    registers: [registry],
  })

  // Gauges are registry-owned: the registry keeps them alive and invokes
  // their collect() at scrape time, so no handles are kept.
  new Gauge({
    name: 'griffdive_online_players',
    help: 'Divers with a live, seated connection across all rooms',
    registers: [registry],
    collect() {
      this.set(presence().players)
    },
  })

  new Gauge({
    name: 'griffdive_active_rooms',
    help: 'Rooms with at least one seated diver connected',
    registers: [registry],
    collect() {
      this.set(presence().rooms)
    },
  })

  new Gauge({
    name: 'griffdive_open_rooms',
    help: 'Rooms currently published to the open-dive lobby',
    registers: [registry],
    async collect() {
      this.set(source ? await source.openRooms() : 0)
    },
  })

  // PlayerIds are unique per room, so a Set across rooms counts distinct
  // divers. Lobby listeners and pre-hello sockets are not divers.
  function presence(): { players: number, rooms: number } {
    const directory = source?.peers
    if (!directory) {
      return { players: 0, rooms: 0 }
    }
    const players = new Set<string>()
    let rooms = 0
    for (const roomCode of directory.rooms()) {
      if (isLobbyRoom(roomCode)) {
        continue
      }
      let seated = false
      for (const peer of directory.list(roomCode)) {
        const playerId = peer.context.playerId
        if (typeof playerId === 'string') {
          players.add(playerId)
          seated = true
        }
      }
      if (seated) {
        rooms += 1
      }
    }
    return { players: players.size, rooms }
  }

  return {
    registry,
    bind(next: RoomMetricsSource) {
      source = next
    },
    recordDiveStarted() {
      divesStarted.inc()
    },
  }
}

// One registry per process, shared by the sync core and the scrape plugin.
export const roomMetrics = createRoomMetrics()
