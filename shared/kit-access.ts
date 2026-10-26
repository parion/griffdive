// The design sheet at /kit is a dev/review surface, never a product page. It is
// reachable on a local dev server and on the Fly staging app only; production
// answers 404 and never links it. Fly stamps FLY_APP_NAME on every machine, so
// the server can tell the deployments apart without trusting a Host header.

export const KIT_STAGING_APP_SUFFIX = '-staging'
export const KIT_STAGING_HOST_SUFFIX = '-staging.fly.dev'

export function kitAllowedOnServer(dev: boolean, flyAppName: string | undefined): boolean {
  if (dev) {
    return true
  }
  return (flyAppName ?? '').toLowerCase().endsWith(KIT_STAGING_APP_SUFFIX)
}

export function kitAllowedOnHost(dev: boolean, hostname: string | undefined): boolean {
  if (dev) {
    return true
  }
  if (!hostname) {
    return false
  }
  return hostname.split(':')[0]!.toLowerCase().endsWith(KIT_STAGING_HOST_SUFFIX)
}
