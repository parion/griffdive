import { describe, expect, it } from 'vitest'
import { clientIpFromHeaders } from './client-ip'

describe('trusted client address', () => {
  it('ignores a client-supplied X-Forwarded-For header', () => {
    const headers = new Headers({ 'x-forwarded-for': '198.51.100.9' })
    expect(clientIpFromHeaders(headers, '203.0.113.7')).toBe('203.0.113.7')
  })

  it('honours the proxy-set Fly-Client-IP over the socket address', () => {
    const headers = new Headers({
      'fly-client-ip': '198.51.100.2',
      'x-forwarded-for': '198.51.100.9',
    })
    expect(clientIpFromHeaders(headers, '203.0.113.7')).toBe('198.51.100.2')
  })

  it('falls back to the socket address when no proxy header is present', () => {
    expect(clientIpFromHeaders(new Headers(), '203.0.113.7')).toBe('203.0.113.7')
    expect(clientIpFromHeaders(new Headers(), '')).toBeNull()
    expect(clientIpFromHeaders(new Headers())).toBeNull()
  })
})
