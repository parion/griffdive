// Beta was a clean slate (see game-rules.md, Save model): alpha save slots,
// session mirrors, recent rooms and room seats are dropped from every browser
// rather than migrated. The beta keys are new names, so this runs on every
// boot without touching current data. Preferences (name, warbonds, intros)
// carry over.
const ALPHA_KEYS = ['griffdive:saves:v1', 'griffdive:sessions:v1', 'griffdive:rooms:v1']
const ALPHA_SEAT_PREFIX = 'griffdive:player:'

export default defineNuxtPlugin(() => {
  try {
    const seats = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i))
      .filter((key): key is string => !!key?.startsWith(ALPHA_SEAT_PREFIX))
    for (const key of [...ALPHA_KEYS, ...seats]) {
      localStorage.removeItem(key)
    }
  }
  catch {
    // Storage unavailable: there is nothing readable to purge either.
  }
})
