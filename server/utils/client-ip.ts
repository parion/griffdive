// Fly's edge proxy sets Fly-Client-IP to the address that opened the
// connection. X-Forwarded-For is client-writable on that leg, so keying a
// limiter on it lets an attacker choose a fresh bucket per request. The socket
// address is the only other trusted source: local dev, e2e, direct connections.
export interface HeaderBag {
  get(name: string): string | null | undefined
}

export function clientIpFromHeaders(
  headers: HeaderBag,
  socketAddress?: string | null,
): string | null {
  const proxied = headers.get('fly-client-ip')?.trim()
  if (proxied) {
    return proxied
  }
  return socketAddress?.trim() || null
}
