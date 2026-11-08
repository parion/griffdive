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

  it('migrates a v1 Armor Pack pull into the repeatable packs list', () => {
    const current = currentDoc()
    const divers = current.state.divers.map((diver) => {
      if (!diver.bargain) {
        return diver
      }
      const { packs: _packs, ...legacy } = diver.bargain
      return { ...diver, bargain: { ...legacy, pack: { seed: 7, itemIds: ['extrapadding'] } } }
    })
    const migrated = normalizeSaveDoc({
      ...current,
      schemaVersion: 1,
      state: { ...current.state, divers },
    })
    expect(migrated?.schemaVersion).toBe(SAVE_SCHEMA_VERSION)
    const bargain = migrated!.state.divers[0]!.bargain!
    expect(bargain.packs).toEqual([{ seed: 7, itemIds: ['extrapadding'] }])
    expect((bargain as { pack?: unknown }).pack).toBeUndefined()
  })

  it('refuses a save from a newer schema than this build reads', () => {
    expect(normalizeSaveDoc({ ...currentDoc(), schemaVersion: SAVE_SCHEMA_VERSION + 1 })).toBeNull()
  })
})
