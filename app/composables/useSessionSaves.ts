import { createSaveDoc, normalizeSaveDoc } from '~~/shared/engine/saves'
import type { DiveState } from '~~/shared/engine/types'
import type { SessionSave } from '~~/shared/types/save'

const STORAGE_KEY = 'griffdive:sessions:v2'

// Personal session saves are convenience copies, not the source of truth: past
// this many the oldest mirror drops so localStorage stays bounded.
const SESSION_SAVE_CAP = 20

function readIndex(): Record<string, SessionSave> {
  if (!import.meta.client) {
    return {}
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return {}
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const index: Record<string, SessionSave> = {}
    for (const [roomCode, value] of Object.entries(parsed)) {
      const doc = normalizeSaveDoc(value)
      const extra = value as { roomCode?: unknown, ownerId?: unknown }
      if (!doc || typeof extra.roomCode !== 'string' || typeof extra.ownerId !== 'string') {
        continue
      }
      index[roomCode] = { ...doc, roomCode: extra.roomCode, ownerId: extra.ownerId }
    }
    return index
  }
  catch {
    return {}
  }
}

function writeIndex(index: Record<string, SessionSave>): void {
  if (!import.meta.client) {
    return
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(index))
  }
  catch {
    // Storage full or unavailable: the mirror is convenience only — the room
    // (and any exported JSON) remains the durable copy.
  }
}

// Every seated diver's browser keeps a personal copy of the session it is in,
// so any of them can later seed a new room from it as host (see AGENTS.md,
// Personal session saves).
export function useSessionSaves() {
  function listSessions(): SessionSave[] {
    return Object.values(readIndex())
      .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
  }

  function loadSession(roomCode: string): SessionSave | null {
    return readIndex()[roomCode] ?? null
  }

  function mirrorSession(input: {
    roomCode: string
    ownerId: string
    state: DiveState
    slotName: string
    savedAt: string
  }): void {
    const index = readIndex()
    index[input.roomCode] = {
      ...createSaveDoc(input.state, input.slotName, input.savedAt),
      roomCode: input.roomCode,
      ownerId: input.ownerId,
    }
    const kept = Object.entries(index)
      .sort((a, b) => b[1].savedAt.localeCompare(a[1].savedAt))
      .slice(0, SESSION_SAVE_CAP)
    writeIndex(Object.fromEntries(kept))
  }

  function deleteSession(roomCode: string): void {
    writeIndex(Object.fromEntries(
      Object.entries(readIndex()).filter(([code]) => code !== roomCode),
    ))
  }

  function exportSession(roomCode: string): void {
    const save = loadSession(roomCode)
    if (!save || !import.meta.client) {
      return
    }
    const blob = new Blob([JSON.stringify(save, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `griffdive-session-${roomCode}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return { listSessions, loadSession, mirrorSession, deleteSession, exportSession }
}
