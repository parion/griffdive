import { TIER_LIST_PRESETS } from '~~/shared/data/tierLists'
import { TIER_LIST_LIBRARY_MAX } from '~~/shared/engine/config'
import { normalizeTierList, tierListFromGroups } from '~~/shared/engine/tierList'
import type { TierList } from '~~/shared/engine/tierList'

const STORAGE_KEY = 'griffdive:tier-lists:v1'

export interface SavedTierList extends TierList {
  id: string
  updatedAt: string
}

// One choice the host makes at setup: the community default, a featured
// preset, or a list from this browser's library.
export interface TierListChoice {
  id: string
  name: string
  source: 'default' | 'preset' | 'library'
  blurb?: string
  list: TierList | null
}

export const DEFAULT_TIER_CHOICE_ID = 'default'

// Module scope keeps one library per tab; SPA mode means no SSR bleed.
const lists = ref<SavedTierList[]>([])
const pickedId = ref<string>(DEFAULT_TIER_CHOICE_ID)
let loaded = false

function load(): void {
  if (loaded || !import.meta.client) {
    return
  }
  loaded = true
  read()
  // The Tier Maker opens in its own tab from setup, so a list saved there
  // reaches the lobby still open in this one.
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) {
      read()
    }
  })
}

function read(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return
    }
    const parsed = JSON.parse(raw) as { lists?: unknown, pickedId?: unknown }
    lists.value = (Array.isArray(parsed.lists) ? parsed.lists : [])
      .flatMap((entry: Partial<SavedTierList>) => {
        const list = normalizeTierList(entry)
        return list && typeof entry.id === 'string'
          ? [{ ...list, id: entry.id, updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : '' }]
          : []
      })
      .slice(0, TIER_LIST_LIBRARY_MAX)
    if (typeof parsed.pickedId === 'string') {
      pickedId.value = parsed.pickedId
    }
  }
  catch {
    // A corrupt library falls back to empty; the default list always plays.
  }
}

function persist(): void {
  if (!import.meta.client) {
    return
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ lists: lists.value, pickedId: pickedId.value }))
}

// The browser's tier-list library: lists made in the Tier Maker or imported
// from a share code, plus the one this browser last chose to host with.
export function useTierLists() {
  load()

  const choices = computed<TierListChoice[]>(() => [
    { id: DEFAULT_TIER_CHOICE_ID, name: 'Default tiers', source: 'default', list: null },
    ...TIER_LIST_PRESETS.map(preset => ({
      id: `preset:${preset.id}`,
      name: preset.name,
      source: 'preset' as const,
      blurb: preset.blurb,
      list: tierListFromGroups(preset.name, preset.tiers),
    })),
    ...lists.value.map(entry => ({
      id: entry.id,
      name: entry.name,
      source: 'library' as const,
      list: { name: entry.name, tiers: entry.tiers },
    })),
  ])

  const picked = computed(() =>
    choices.value.find(choice => choice.id === pickedId.value) ?? choices.value[0]!)

  const full = computed(() => lists.value.length >= TIER_LIST_LIBRARY_MAX)

  function pick(id: string): void {
    pickedId.value = id
    persist()
  }

  function find(id: string): SavedTierList | null {
    return lists.value.find(entry => entry.id === id) ?? null
  }

  function save(list: TierList, id?: string): SavedTierList | null {
    const clean = normalizeTierList(list)
    if (!clean) {
      return null
    }
    const existing = id ? find(id) : null
    if (!existing && full.value) {
      return null
    }
    const entry: SavedTierList = { ...clean, id: existing?.id ?? crypto.randomUUID(), updatedAt: new Date().toISOString() }
    lists.value = existing
      ? lists.value.map(candidate => (candidate.id === entry.id ? entry : candidate))
      : [entry, ...lists.value]
    persist()
    return entry
  }

  function remove(id: string): void {
    lists.value = lists.value.filter(entry => entry.id !== id)
    if (pickedId.value === id) {
      pickedId.value = DEFAULT_TIER_CHOICE_ID
    }
    persist()
  }

  return { tierLists: lists, choices, picked, pickedId, full, pick, find, save, remove }
}
