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
