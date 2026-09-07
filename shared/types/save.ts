import type { DiveState } from '../engine/types'

export const SAVE_SCHEMA_VERSION = 7

export interface SaveDoc {
  schemaVersion: number
  engineVersion: number
  catalogVersion: number
  savedAt: string
  slotName: string
  state: DiveState
}
