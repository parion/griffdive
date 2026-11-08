import { describe, expect, it, vi } from 'vitest'
import {
  errorStatus,
  markHttpRequest,
  recordHttpRequestOnce,
  responseStatus,
  takeHttpRequestPath,
} from './http-metrics'

function fakeEvent(status?: number) {
  return {
    context: {} as Record<string, unknown>,
    node: { res: status === undefined ? {} : { statusCode: status } },
  }
}

describe('HTTP request metrics', () => {
  it('counts a request exactly once across the afterResponse and error hooks', () => {
    const event = fakeEvent(429)
    const record = vi.fn()
    markHttpRequest(event, '/api/rooms')

    recordHttpRequestOnce(event, responseStatus(event), record)
    recordHttpRequestOnce(event, errorStatus({ statusCode: 429 }, event), record)

    expect(record).toHaveBeenCalledTimes(1)
    expect(record).toHaveBeenCalledWith('/api/rooms', 429)
  })

  it('takes the marker so a later hook sees nothing to count', () => {
    const event = fakeEvent()
    markHttpRequest(event, '/api/rooms')

    expect(takeHttpRequestPath(event)).toBe('/api/rooms')
    expect(takeHttpRequestPath(event)).toBeNull()
  })

  it('reads the status the error handler will write', () => {
    expect(errorStatus({ statusCode: 429 }, fakeEvent())).toBe(429)
    expect(errorStatus({ statusCode: 503 }, fakeEvent(200))).toBe(503)
    expect(errorStatus(new Error('boom'), fakeEvent(502))).toBe(502)
  })

  it('treats an unclassified error as a 500', () => {
    expect(errorStatus(new Error('boom'), fakeEvent(200))).toBe(500)
    expect(errorStatus(new Error('boom'), fakeEvent())).toBe(500)
  })
})
