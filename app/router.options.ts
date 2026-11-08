import type { RouterConfig } from '@nuxt/schema'
import { isTiersHost } from '~~/shared/tiers-site'

// On the standalone Tier Maker host the maker is the home page. The SPA builds
// its router in the browser, so the hostname is known here.
export default {
  routes: (routes) => {
    if (!import.meta.client || !isTiersHost(window.location.hostname)) {
      return routes
    }
    const maker = routes.find(route => route.name === 'tiers')
    if (!maker) {
      return routes
    }
    return [{ ...maker, name: 'tiers-home', path: '/' }, ...routes.filter(route => route.path !== '/')]
  },
} satisfies RouterConfig
