import type { MaybeRefOrGetter } from 'vue'
import type { Item } from '~~/shared/data/types'
import { isRetiered, tieredCatalog } from '~~/shared/engine/tierList'
import type { TierList } from '~~/shared/engine/tierList'

// The tier list of the dive on screen. Module scope rather than provide/inject
// because the Codex drawer is mounted by app.vue, outside the dive page, and
// must still show the squad's tiers.
const active = shallowRef<TierList | null>(null)

// Called by the dive page: mirrors the crusade's list while the page lives.
export function useActiveTierList(source: MaybeRefOrGetter<TierList | null | undefined>): void {
  watch(() => toValue(source) ?? null, (list) => {
    active.value = list
  }, { immediate: true })
  onScopeDispose(() => {
    active.value = null
  })
}

// Every item lookup a component renders goes through here, so a re-tiered item
// shows its crusade tier everywhere, never the catalog default.
export function useTierCatalog() {
  const catalog = computed(() => tieredCatalog(active.value))

  function itemById(id: string | null | undefined): Item | undefined {
    return id ? catalog.value.byId.get(id) : undefined
  }

  function itemsByIds(ids: readonly string[]): Item[] {
    return ids.map(id => catalog.value.byId.get(id)).filter((item): item is Item => item !== undefined)
  }

  return {
    tierList: computed(() => active.value),
    items: computed(() => catalog.value.items),
    itemById,
    itemsByIds,
    isRetiered: (item: Item) => isRetiered(item, active.value),
  }
}
