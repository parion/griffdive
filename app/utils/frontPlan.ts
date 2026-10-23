import type { FrontId } from '~~/shared/data/fronts'
import type { FrontPlan, MajorOrderSelection } from '~~/shared/engine/types'

// The pin START_DIVE carries for the setup's front plan. The engine validates
// it (a plan without a usable pin rolls instead); this only picks what to send.
export function frontPinFor(
  plan: FrontPlan,
  lockedFront: FrontId,
  liveOrder: MajorOrderSelection | null,
): MajorOrderSelection | null {
  if (plan === 'majorOrder') {
    return liveOrder
  }
  if (plan === 'locked') {
    return { fronts: [lockedFront] }
  }
  return null
}

export const FRONT_PLAN_LABELS: Record<FrontPlan, string> = {
  majorOrder: 'Major Order',
  locked: 'Locked',
  rolled: 'Rolled',
}

// "2d 4h" / "3h 12m" / "8m" until an order's expiry; empty when unknown.
export function orderCountdown(expiresAt: string | undefined, now: number): string {
  const expires = expiresAt ? Date.parse(expiresAt) : Number.NaN
  if (!Number.isFinite(expires)) {
    return ''
  }
  const minutes = Math.floor((expires - now) / 60_000)
  if (minutes <= 0) {
    return 'ending'
  }
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  if (days > 0) {
    return `${days}d ${hours}h`
  }
  return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`
}
