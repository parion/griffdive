const STORAGE_KEY = 'griffdive:rooms:v2'

// The home page's "continue" list is convenience state, not an archive: keep
// the rooms this browser actually played recently and let the rest go. A room
// record outlives the squad by up to 30 days (CRUSADE_TTL_MS), so without this
// the list only ever grows — one card and one lookup per room ever visited.
export const MAX_RECENT_ROOMS = 12
export const RECENT_ROOM_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

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

// Newest first, capped, and no entry older than the crusade TTL. Unparseable
// timestamps are dropped rather than resurrected as epoch-old rooms.
export function pruneRoomIndex(index: Record<string, string>, now: number = Date.now()): Record<string, string> {
  const kept = Object.entries(index)
    .map(([code, at]) => ({ code, at: Date.parse(at) }))
    .filter(entry => Number.isFinite(entry.at) && now - entry.at <= RECENT_ROOM_MAX_AGE_MS)
    .sort((a, b) => b.at - a.at)
    .slice(0, MAX_RECENT_ROOMS)
  return Object.fromEntries(kept.map(entry => [entry.code, new Date(entry.at).toISOString()]))
}

// Rooms this browser hosted or joined, so the home page can list dives to pick
// back up. Entries are pruned when the server reports the room gone (TTL or
// restart) and age out on their own after a month.
export function useRecentRooms() {
  function listRooms(): RecentRoom[] {
    const stored = readIndex()
    const index = pruneRoomIndex(stored)
    if (Object.keys(index).length !== Object.keys(stored).length) {
      writeIndex(index)
    }
    return Object.entries(index)
      .map(([code, savedAt]) => ({ code, savedAt }))
      .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
  }

  function rememberRoom(code: string): void {
    const index = pruneRoomIndex(readIndex())
    index[code] = new Date().toISOString()
    writeIndex(pruneRoomIndex(index))
  }

  function forgetRoom(code: string): void {
    writeIndex(Object.fromEntries(Object.entries(readIndex()).filter(([key]) => key !== code)))
  }

  return { listRooms, rememberRoom, forgetRoom }
}
