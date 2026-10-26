import { kitAllowedOnServer } from '~~/shared/kit-access'

// /kit is a design sheet, not a product surface. Gate it at the seam so a
// production request never receives the page shell, even if someone guesses the
// path. The staging app is named `*-staging`, which Fly exposes as FLY_APP_NAME.
export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname
  if (path !== '/kit' && !path.startsWith('/kit/')) {
    return
  }
  if (kitAllowedOnServer(import.meta.dev, process.env.FLY_APP_NAME)) {
    return
  }
  throw createError({ statusCode: 404, statusMessage: 'Not Found' })
})
