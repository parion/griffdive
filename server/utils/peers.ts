import { createPeerDirectory } from './room-sync'

// One directory per process: the WS route routes messages with it, the
// metrics gauges read presence from it.
export const peers = createPeerDirectory()
