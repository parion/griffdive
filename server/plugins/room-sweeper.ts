import { sweepRooms } from '../utils/room-sync'
import { roomKV } from '../utils/room-storage'

const SWEEP_INTERVAL_MS = 15 * 60 * 1000

// Idle rooms are only pruned when someone touches them (loadRoom), so a room
// nobody returns to would sit in memory until the process restarts. Reap them
// on a timer; failures are logged and never take the server down.
export default defineNitroPlugin(() => {
  const timer = setInterval(() => {
    sweepRooms(roomKV())
      .then((removed) => {
        if (removed > 0) {
          console.info(`[rooms] swept ${removed} idle room(s)`)
        }
      })
      .catch(error => console.error(`[rooms] sweep failed: ${error instanceof Error ? error.message : error}`))
  }, SWEEP_INTERVAL_MS)
  timer.unref()
})
