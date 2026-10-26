import { CATALOG_VERSION } from '../data/catalog'
import { SAVE_EPOCH, SAVE_SCHEMA_VERSION } from '../types/save'
import type { SaveDoc } from '../types/save'
import { ENGINE_VERSION } from './config'

export function createSaveDoc(state: SaveDoc['state'], slotName: string, savedAt: string): SaveDoc {
  return {
    epoch: SAVE_EPOCH,
    schemaVersion: SAVE_SCHEMA_VERSION,
    engineVersion: ENGINE_VERSION,
    catalogVersion: CATALOG_VERSION,
    savedAt,
    slotName,
    state,
  }
}

// Beta restarted the save versions at 1 with no migration chain (see
// game-rules.md, Save model), so an alpha save — no epoch stamp, or a schema
// number that now means something else — is refused rather than misread. The
// next breaking shape change bumps SAVE_SCHEMA_VERSION and adds the first
// version-gated step here instead of the strict equality.
export function normalizeSaveDoc(raw: unknown): SaveDoc | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }
  const doc = raw as Partial<SaveDoc>
  if (
    doc.epoch !== SAVE_EPOCH
    || doc.schemaVersion !== SAVE_SCHEMA_VERSION
    || typeof doc.engineVersion !== 'number'
    || typeof doc.catalogVersion !== 'number'
    || typeof doc.savedAt !== 'string'
    || typeof doc.slotName !== 'string'
    || !doc.state
    || typeof doc.state !== 'object'
    || typeof doc.state.phase !== 'string'
    || typeof doc.state.difficulty !== 'number'
  ) {
    return null
  }
  return doc as SaveDoc
}
