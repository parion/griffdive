import type { FrontId } from '~~/shared/data/fronts'
import type { FrontPlan } from '~~/shared/engine/types'

// The setup's front plan, owned by whoever launches the crusade (the Bridge's
// solo setup, the room lobby). Playing the war is the default: the plan opens
// on the live Major Order the moment one is known, until the host picks
// something else. An order that vanishes under the selection falls back to a
// rolled front so a launch never claims an order it lacks.
export function useFrontPlan() {
  const { order, status, pending, refresh } = useMajorOrder()
  const plan = ref<FrontPlan>(order.value ? 'majorOrder' : 'rolled')
  const lockedFront = ref<FrontId>('terminids')
  const chosen = ref(false)

  watch(order, (next) => {
    if (next && !chosen.value) {
      plan.value = 'majorOrder'
    }
    if (!next && plan.value === 'majorOrder') {
      plan.value = 'rolled'
    }
  }, { immediate: true })

  function choose(next: FrontPlan): void {
    chosen.value = true
    plan.value = next
  }

  const pin = computed(() => frontPinFor(plan.value, lockedFront.value, order.value))

  return { plan, lockedFront, choose, pin, order, status, pending, refresh }
}
