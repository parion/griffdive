const STORAGE_KEY = 'griffdive:onboarding:v1'

// Like the remembered diver name: the full-screen onboarding runs once per
// browser, then stays replayable from the home "Take the tour" button.
const seen = ref(false)
let loaded = false

function load(): void {
  if (loaded || !import.meta.client) {
    return
  }
  loaded = true
  seen.value = localStorage.getItem(STORAGE_KEY) === '1'
}

export function useOnboarding() {
  load()

  function markOnboardingSeen(): void {
    seen.value = true
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, '1')
    }
  }

  return { hasSeenOnboarding: seen, markOnboardingSeen }
}
