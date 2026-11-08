import { drainPeers } from '../utils/room-sync'
import { peers } from '../utils/peers'

// A deploy stops the only machine (the volume binds to it), so every squad
// drops at once. Nitro's own shutdown destroys upgraded sockets without a word;
// this runs first and warns divers that the server is restarting, not gone.
// Dev servers skip it: a signal listener there would keep the process alive.
export default defineNitroPlugin(() => {
  if (import.meta.dev) {
    return
  }
  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.once(signal, () => {
      const drained = drainPeers(peers)
      console.info(`[restart] ${signal}: told ${drained} connection(s) the server is restarting`)
    })
  }
})
