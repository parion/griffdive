const STORAGE_KEY = 'griffdive:join-briefing:v1'

// The joiner's one-page briefing shows once per browser: a diver who already
// read it (and has a name) drops straight into the next squad they're invited to.
const seen = ref(false)
let loaded = false

function load(): void {
  if (loaded || !import.meta.client) {
    return
  }
  loaded = true
  seen.value = localStorage.getItem(STORAGE_KEY) === '1'
}

export function hasSeenJoinBriefing(): boolean {
  load()
  return seen.value
}

export function useJoinBriefing() {
  load()

  function markJoinBriefingSeen(): void {
    seen.value = true
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, '1')
    }
  }

  return { hasSeenJoinBriefing: seen, markJoinBriefingSeen }
}
