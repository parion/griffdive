// The Tier Maker also stands alone on its own subdomain (tiers.griffdive.com),
// so anyone can rank the catalog without starting a crusade. The same build
// serves both hosts: a `tiers.` hostname puts the Tier Maker at `/` and sends
// every other page back to the main site. Works for `tiers.localhost` too.
const TIERS_PREFIX = 'tiers.'

export function isTiersHost(hostname: string | undefined): boolean {
  return (hostname ?? '').toLowerCase().startsWith(TIERS_PREFIX)
}

// The main site for a tiers origin: `https://tiers.griffdive.com` →
// `https://griffdive.com`, port kept.
export function mainSiteOrigin(origin: string): string {
  const url = new URL(origin)
  if (isTiersHost(url.hostname)) {
    url.hostname = url.hostname.slice(TIERS_PREFIX.length)
  }
  return url.origin
}
