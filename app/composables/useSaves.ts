import { createSaveDoc, normalizeSaveDoc } from '~~/shared/engine/saves'
import type { DiveState } from '~~/shared/engine/types'
import type { SaveDoc } from '~~/shared/types/save'

const STORAGE_KEY = 'griffdive:saves:v1'

function readIndex(): Record<string, SaveDoc> {
  if (!import.meta.client) {
    return {}
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, SaveDoc>) : {}
  }
  catch {
    return {}
  }
}

function writeIndex(index: Record<string, SaveDoc>): void {
  if (!import.meta.client) {
    return
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(index))
}

function newSlotId(): string {
  return crypto.randomUUID()
}

export function useSaves() {
  function listSaves(): { id: string, doc: SaveDoc }[] {
    const index = readIndex()
    return Object.entries(index)
      .map(([id, doc]) => ({ id, doc: normalizeSaveDoc(doc) }))
      .filter((entry): entry is { id: string, doc: SaveDoc } => entry.doc !== null)
      .sort((a, b) => b.doc.savedAt.localeCompare(a.doc.savedAt))
  }

  function loadSlot(id: string): SaveDoc | null {
    const doc = readIndex()[id]
    return doc ? normalizeSaveDoc(doc) : null
  }

  function createSlot(state: DiveState, slotName: string): string {
    const id = newSlotId()
    const index = readIndex()
    index[id] = createSaveDoc(state, slotName, new Date().toISOString())
    writeIndex(index)
    return id
  }

  function persistSlot(id: string, state: DiveState, slotName?: string): void {
    const index = readIndex()
    const existing = index[id]
    if (!existing) {
      return
    }
    index[id] = {
      ...createSaveDoc(state, slotName ?? existing.slotName, new Date().toISOString()),
      schemaVersion: existing.schemaVersion,
    }
    writeIndex(index)
  }

  function deleteSlot(id: string): void {
    const index = readIndex()
    writeIndex(Object.fromEntries(Object.entries(index).filter(([key]) => key !== id)))
  }

  function exportSave(id: string): void {
    const doc = loadSlot(id)
    if (!doc || !import.meta.client) {
      return
    }
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `griffdive-${doc.slotName.replace(/[^a-z0-9_-]+/gi, '-')}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  async function importSave(file: File): Promise<string | null> {
    try {
      const doc = normalizeSaveDoc(JSON.parse(await file.text()))
      if (!doc) {
        return null
      }
      const id = newSlotId()
      const index = readIndex()
      index[id] = doc
      writeIndex(index)
      return id
    }
    catch {
      return null
    }
  }

  return { listSaves, loadSlot, createSlot, persistSlot, deleteSlot, exportSave, importSave }
}
