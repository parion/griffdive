import type { Ref } from 'vue'

// Holds a companion panel (the squad's drafts) back until a reveal has played
// out, so a settled result never pre-empts the fanfare. Purely presentational:
// the state it shows is already final. A new key restarts the wait, a resolved
// draft (zero duration) settles at once, and reduced motion skips it.
export function useRevealComplete(
  key: () => unknown,
  duration: () => number,
): Readonly<Ref<boolean>> {
  const complete = ref(false)
  let timer: ReturnType<typeof setTimeout> | undefined
  watch(key, () => {
    clearTimeout(timer)
    if (import.meta.server) {
      return
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const wait = reduced ? 0 : duration()
    if (wait <= 0) {
      complete.value = true
      return
    }
    complete.value = false
    timer = setTimeout(() => {
      complete.value = true
    }, wait)
  }, { immediate: true })
  onBeforeUnmount(() => clearTimeout(timer))
  return readonly(complete)
}
