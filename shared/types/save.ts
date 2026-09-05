import type { DiveState } from '../engine/types'

export const SAVE_SCHEMA_VERSION = 3

export interface SaveDoc {
  schemaVersion: number
  engineVersion: number
  catalogVersion: number
  savedAt: string
  slotName: string
  state: DiveState
}
