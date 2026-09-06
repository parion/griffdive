import { createServer } from 'node:http'
import { roomMetrics } from '../utils/metrics'
import { peers } from '../utils/peers'
import { roomKV } from '../utils/room-storage'
import { listLobby } from '../utils/room-sync'

// Scrape endpoint on a private port: only internal_port 8080 is publicly
// routed on Fly, so this port is reachable by Fly's metrics scraper alone.
export default defineNitroPlugin(() => {
  roomMetrics.bind({
    peers,
    openRooms: async () => (await listLobby(roomKV())).length,
  })

  const port = Number.parseInt(process.env.METRICS_PORT ?? '9091', 10)
  const server = createServer(async (request, response) => {
    if (request.url !== '/metrics') {
      response.statusCode = 404
      response.end()
      return
    }
    response.setHeader('content-type', roomMetrics.registry.contentType)
    response.end(await roomMetrics.registry.metrics())
  })
  // A busy port must not take the app down — metrics are best-effort.
  server.on('error', (error) => {
    console.error(`[metrics] scrape endpoint unavailable: ${error.message}`)
  })
  server.listen(port, '0.0.0.0')
})
