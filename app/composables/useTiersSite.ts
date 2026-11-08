import { isTiersHost, mainSiteOrigin } from '~~/shared/tiers-site'

// Whether this tab is the standalone Tier Maker (tiers.griffdive.com), and
// where the main site lives. Lists are kept per origin, so a list leaves the
// standalone site for a crusade by link, never through shared storage.
export function useTiersSite() {
  const standalone = import.meta.client && isTiersHost(window.location.hostname)
  const mainOrigin = import.meta.client ? mainSiteOrigin(window.location.origin) : ''
  return { standalone, mainOrigin }
}
