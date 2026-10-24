import type { DiveState } from '../engine/types'

// Frozen from alpha (v8) on: every later shape change adds a version-gated
// migration in shared/engine/saves.ts (see AGENTS.md, Save model).
export const SAVE_SCHEMA_VERSION = 18

export interface SaveDoc {
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
