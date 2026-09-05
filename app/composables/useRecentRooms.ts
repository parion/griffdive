const STORAGE_KEY = 'griffdive:rooms:v1'

export interface RecentRoom { code: string, savedAt: string }

function readIndex(): Record<string, string> {
  if (!import.meta.client) {
    return {}
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, string>) : {}
  }
  catch {
    return {}
  }
}

function writeIndex(index: Record<string, string>): void {
  if (!import.meta.client) {
    return
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(index))
}

// Rooms this browser hosted or joined, so the home page can list live dives.
// Entries are pruned when the server reports the room gone (TTL or restart).
export function useRecentRooms() {
  function listRooms(): RecentRoom[] {
    return Object.entries(readIndex())
      .map(([code, savedAt]) => ({ code, savedAt }))
      .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
  }

  function rememberRoom(code: string): void {
    const index = readIndex()
    index[code] = new Date().toISOString()
    writeIndex(index)
  }

  function forgetRoom(code: string): void {
    writeIndex(Object.fromEntries(Object.entries(readIndex()).filter(([key]) => key !== code)))
  }

  return { listRooms, rememberRoom, forgetRoom }
}
