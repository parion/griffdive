import { isTiersHost, mainSiteOrigin } from '~~/shared/tiers-site'

// The standalone Tier Maker host serves the maker and the privacy page; any
// other page belongs to the main site.
const STANDALONE = new Set(['tiers-home', 'tiers', 'privacy'])

export default defineNuxtRouteMiddleware((to) => {
  if (!import.meta.client || !isTiersHost(window.location.hostname) || STANDALONE.has(String(to.name))) {
    return
  }
  return navigateTo(`${mainSiteOrigin(window.location.origin)}${to.fullPath}`, { external: true })
})
