// Nitro's error handler writes 4xx/5xx responses itself, so they never reach
// afterResponse. Both paths share one take-once marker: whichever runs first
// records the request, and the other finds nothing left to count.
export const HTTP_METRICS_PATH_KEY = 'griffdiveMetricsPath'

export interface HttpMetricsEvent {
  context?: Record<string, unknown>
  node?: { res?: { statusCode?: number } }
}

export function markHttpRequest(event: HttpMetricsEvent, path: string): void {
  if (event.context) {
    event.context[HTTP_METRICS_PATH_KEY] = path
  }
}

export function takeHttpRequestPath(event: HttpMetricsEvent): string | null {
  const path = event.context?.[HTTP_METRICS_PATH_KEY]
  if (typeof path !== 'string') {
    return null
  }
  Reflect.deleteProperty(event.context!, HTTP_METRICS_PATH_KEY)
  return path
}

export function responseStatus(event: HttpMetricsEvent): number {
  return event.node?.res?.statusCode ?? 0
}

// The error hook can run before the error handler writes its status, so prefer
// the status carried by the error and treat an unclassified failure as a 500.
export function errorStatus(error: unknown, event: HttpMetricsEvent): number {
  const statusCode = (error as { statusCode?: unknown } | null)?.statusCode
  if (typeof statusCode === 'number' && statusCode >= 400) {
    return statusCode
  }
  const response = responseStatus(event)
  return response >= 400 ? response : 500
}

export function recordHttpRequestOnce(
  event: HttpMetricsEvent,
  status: number,
  record: (path: string, status: number) => void,
): void {
  const path = takeHttpRequestPath(event)
  if (path) {
    record(path, status)
  }
}
