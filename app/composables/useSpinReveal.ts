import type { Ref } from 'vue'
import { WHEEL_SPIN_MS } from '~/utils/motion'

// Holds a fresh draw's result back while the wheel turns, so the cards never
// spoil the spin. Purely presentational: the engine result already exists.
// Only a seed change spins — a reload or late join shows the settled draw —
// and reduced motion skips straight to the result.
export function useSpinReveal(seed: () => number | null | undefined): Readonly<Ref<boolean>> {
  const spinning = ref(false)
  let timer: ReturnType<typeof setTimeout> | undefined
  watch(seed, (next, previous) => {
    clearTimeout(timer)
    const reduced = import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (next == null || next === previous || reduced) {
      spinning.value = false
      return
    }
    spinning.value = true
    timer = setTimeout(() => {
      spinning.value = false
    }, WHEEL_SPIN_MS)
  })
  onBeforeUnmount(() => clearTimeout(timer))
  return readonly(spinning)
}
