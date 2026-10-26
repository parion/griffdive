import { kitAllowedOnHost } from '~~/shared/kit-access'

// The server middleware already answers 404 for a direct production request.
// This client guard covers in-app navigation to the lazy-loaded route, so the
// sheet stays unreachable even after the app has booted.
export default defineNuxtRouteMiddleware(() => {
  const hostname = import.meta.client ? window.location.hostname : undefined
  if (kitAllowedOnHost(import.meta.dev, hostname)) {
    return
  }
  return abortNavigation(createError({ statusCode: 404, statusMessage: 'Page not found' }))
})
