import { useMediaQuery } from '@vueuse/core'

// The dive's one structural breakpoint. Above it the fixed three-rail terminal
// renders; below it the phone shell (specs 04, 13–17) swaps in. It lives in JS
// rather than CSS so the shell can pick a whole component tree, not just
// restyle the desktop one.
const PHONE_QUERY = '(max-width: 1020px)'

export function usePhoneShell() {
  const isPhone = useMediaQuery(PHONE_QUERY)
  return { isPhone }
}
