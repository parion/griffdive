import { createServer } from 'node:http'
import { roomMetrics } from '../utils/metrics'
import { peers } from '../utils/peers'
import { censusRooms } from '../utils/room-sync'
import { roomKV } from '../utils/room-storage'

// The census reads every room's header fields; 2 minutes is fresh enough for
// "where is everyone / what is stuck" while staying trivial on the single box.
const CENSUS_INTERVAL_MS = 120_000

// Scrape endpoint on a private port: only internal_port 8080 is publicly
// routed on Fly, so this port is reachable by Fly's metrics scraper alone.
export default defineNitroPlugin((nitroApp) => {
  roomMetrics.bind({ peers })

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

  // Cold HTTP hits by route: client-side navigation and the PWA service worker
  // never reach the server, so this counts arrivals, not page views. The
  // route bucket rides the request context into afterResponse.
  nitroApp.hooks.hook('request', (event) => {
    (event.context as Record<string, unknown>).griffdiveMetricsPath = event.path
  })
  nitroApp.hooks.hook('afterResponse', (event) => {
    const path = (event.context as Record<string, unknown>).griffdiveMetricsPath
    if (typeof path === 'string') {
      roomMetrics.recordHttpRequest(path, responseStatus(event))
    }
  })

  async function runCensus(): Promise<void> {
    try {
      roomMetrics.census(await censusRooms(roomKV()))
    }
    catch (error) {
      console.error(`[metrics] census failed: ${error instanceof Error ? error.message : error}`)
    }
  }
  void runCensus()
  const censusTimer = setInterval(() => {
    void runCensus()
  }, CENSUS_INTERVAL_MS)
  censusTimer.unref()
})

function responseStatus(event: unknown): number {
  const node = (event as { node?: { res?: { statusCode?: number } } }).node
  return node?.res?.statusCode ?? 0
}
