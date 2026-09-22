const STORAGE_KEY = 'griffdive:dive-intro:v1'

// Like the remembered diver name: the "How a dive works" primer opens once per
// browser at first seat, then stays reachable from the Guide button.
const seen = ref(false)
let loaded = false

function load(): void {
  if (loaded || !import.meta.client) {
    return
  }
  loaded = true
  seen.value = localStorage.getItem(STORAGE_KEY) === '1'
}

export function useDiveIntro() {
  load()

  function markDiveIntroSeen(): void {
    seen.value = true
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, '1')
    }
  }

  return { hasSeenDiveIntro: seen, markDiveIntroSeen }
}
