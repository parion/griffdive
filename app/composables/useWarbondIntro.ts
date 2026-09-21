const STORAGE_KEY = 'griffdive:warbond-intro:v1'

// Like the remembered diver name: the dive-start Warbonds prompt opens once per
// browser, then stays quiet on later dives.
const seen = ref(false)
let loaded = false

function load(): void {
  if (loaded || !import.meta.client) {
    return
  }
  loaded = true
  seen.value = localStorage.getItem(STORAGE_KEY) === '1'
}

export function useWarbondIntro() {
  load()

  function markWarbondIntroSeen(): void {
    seen.value = true
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, '1')
    }
  }

  return { hasSeenWarbondIntro: seen, markWarbondIntroSeen }
}
