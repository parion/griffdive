import type { DiveState } from '../engine/types'

// Beta was a clean slate: every alpha save was discarded, not migrated, and
// the versions restarted at 1. The epoch marks a save as written after that
// reset, so an alpha save stamped with a low schema number is never mistaken
// for a current one. From here on every shape change adds a version-gated
// migration in shared/engine/saves.ts (see game-rules.md, Save model).
export const SAVE_EPOCH = 'beta'
export const SAVE_SCHEMA_VERSION = 1

export interface SaveDoc {
  epoch: typeof SAVE_EPOCH
  schemaVersion: number
  engineVersion: number
  catalogVersion: number
  savedAt: string
  slotName: string
  state: DiveState
}

// A personal session save: the browser-local mirror every seated diver keeps
// of a room (see AGENTS.md, Personal session saves). It is a SaveDoc plus the
// room it came from and the seat its owner held, so the owner can seed a new
// session from it — as host, with their own seat and inventory intact.
export interface SessionSave extends SaveDoc {
  roomCode: string
  ownerId: string
}
