import { describe, expect, it } from 'vitest'
import { CATALOG_VERSION } from '../data/catalog'
import { SAVE_EPOCH, SAVE_SCHEMA_VERSION } from '../types/save'
import { ENGINE_VERSION } from './config'
import { createDiveState } from './reducer'
import { createSaveDoc, normalizeSaveDoc } from './saves'

function currentDoc() {
  return createSaveDoc(createDiveState({ variant: 'medium' }, 'p1', 'Griffin'), 'Crusade', '2026-10-26T00:00:00.000Z')
}

describe('save docs', () => {
  it('stamps the epoch and the current versions', () => {
    const doc = currentDoc()
    expect(doc.epoch).toBe(SAVE_EPOCH)
    expect(doc.schemaVersion).toBe(SAVE_SCHEMA_VERSION)
    expect(doc.engineVersion).toBe(ENGINE_VERSION)
    expect(doc.catalogVersion).toBe(CATALOG_VERSION)
  })

  it('round-trips a current save through JSON', () => {
    const doc = currentDoc()
    expect(normalizeSaveDoc(JSON.parse(JSON.stringify(doc)))).toEqual(doc)
  })

  it('rejects malformed docs', () => {
    expect(normalizeSaveDoc(null)).toBeNull()
    expect(normalizeSaveDoc({ slotName: 'x' })).toBeNull()
    expect(normalizeSaveDoc({ ...currentDoc(), state: null })).toBeNull()
  })

  // Alpha saves were discarded at the beta reset, never migrated.
  it('refuses an alpha save, whatever schema number it carries', () => {
    const { epoch: _epoch, ...alpha } = currentDoc()
    expect(normalizeSaveDoc(alpha)).toBeNull()
    expect(normalizeSaveDoc({ ...alpha, schemaVersion: 20, engineVersion: 30 })).toBeNull()
  })

  it('refuses a save from a newer schema than this build reads', () => {
    expect(normalizeSaveDoc({ ...currentDoc(), schemaVersion: SAVE_SCHEMA_VERSION + 1 })).toBeNull()
  })
})
