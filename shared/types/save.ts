import type { DiveState } from '../engine/types'

// Frozen from alpha (v8) on: every later shape change adds a version-gated
// migration in shared/engine/saves.ts (see AGENTS.md, Save model).
export const SAVE_SCHEMA_VERSION = 10

export interface SaveDoc {
  schemaVersion: number
  engineVersion: number
  catalogVersion: number
  savedAt: string
  slotName: string
  state: DiveState
}
