import { reapSilentPeers } from '../utils/room-sync'
import { roomKV } from '../utils/room-storage'
import { peers } from '../utils/peers'
import { roomMetrics } from '../utils/metrics'

const SWEEP_INTERVAL_MS = 60 * 1000

// Live connections are process memory, and a socket that vanishes without a
// close frame (a sleeping phone, a Wi-Fi handover, a frozen background tab)
// would otherwise stay "online" forever — inflating the presence gauges and
// gating its squad on a diver who will never answer.
export default defineNitroPlugin(() => {
  const timer = setInterval(() => {
    reapSilentPeers(roomKV(), peers)
      .then((reaped) => {
        if (reaped > 0) {
          roomMetrics.recordPeersReaped(reaped)
          console.info(`[presence] reaped ${reaped} silent connection(s)`)
        }
      })
      .catch(error => console.error(`[presence] sweep failed: ${error instanceof Error ? error.message : error}`))
  }, SWEEP_INTERVAL_MS)
  timer.unref()
})
