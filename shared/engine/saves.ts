import { CATALOG_VERSION } from '../data/catalog'
import { SAVE_EPOCH, SAVE_SCHEMA_VERSION } from '../types/save'
import type { SaveDoc } from '../types/save'
import { ENGINE_VERSION } from './config'
import type { ArmorPackDeal, BargainDeal, DiveState } from './types'

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

// v1 → v2: the Armor Pack became repeatable, so a diver's deal carries an array
// of pulls instead of the operation's single `pack`. Older saves are migrated
// on read rather than discarded (beta policy in game-rules.md, Save model).
function migrateV1toV2(state: DiveState): DiveState {
  if (!Array.isArray(state.divers)) {
    return state
  }
  return {
    ...state,
    divers: state.divers.map((diver) => {
      const legacy = diver.bargain as (BargainDeal & { pack?: ArmorPackDeal | null }) | null
      if (!legacy) {
        return diver
      }
      const { pack, ...deal } = legacy
      return {
        ...diver,
        bargain: {
          ...deal,
          packs: Array.isArray(deal.packs) ? deal.packs : pack ? [pack] : [],
        },
      }
    }),
  }
}

// Beta restarted the save versions at 1 with no migration chain (see
// game-rules.md, Save model), so an alpha save — no epoch stamp, or a schema
// number that now means something else — is refused rather than misread. Each
// later breaking shape change adds a version-gated step here.
export function normalizeSaveDoc(raw: unknown): SaveDoc | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }
  const doc = raw as Partial<SaveDoc>
  if (
    doc.epoch !== SAVE_EPOCH
    || (doc.schemaVersion !== 1 && doc.schemaVersion !== SAVE_SCHEMA_VERSION)
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
  const state = doc.schemaVersion === 1 ? migrateV1toV2(doc.state as DiveState) : doc.state
  return { ...doc, schemaVersion: SAVE_SCHEMA_VERSION, state } as SaveDoc
}
