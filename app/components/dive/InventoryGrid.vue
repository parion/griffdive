<script setup lang="ts">
import { ITEMS_BY_ID } from '~~/shared/data/catalog'
import type { Item, ItemCategory } from '~~/shared/data/types'
import type { DiveState, ItemRef } from '~~/shared/engine/types'

interface TypedEntry { item: Item, owners: string[] }
interface TypeGroup { id: string, label: string, entries: TypedEntry[] }

const props = withDefaults(defineProps<{
  state: DiveState
  selectMode?: boolean
}>(), { selectMode: false })

const emit = defineEmits<{ forfeit: [itemRef: ItemRef] }>()

type InventoryView = 'type' | 'diver'
const view = ref<InventoryView>('type')
const activeView = computed<InventoryView>(() => (props.selectMode ? 'diver' : view.value))

function resolve(ids: readonly string[]): Item[] {
  return ids
    .map(id => ITEMS_BY_ID.get(id))
    .filter((item): item is Item => item !== undefined)
}

const ownedEntries = computed(() => {
  const byItem = new Map<string, TypedEntry>()
  for (const diver of props.state.divers) {
    for (const id of props.state.personalInventories[diver.id] ?? []) {
      const item = ITEMS_BY_ID.get(id)
      if (!item) continue
      const entry = byItem.get(id)
      if (entry) entry.owners.push(diver.name)
      else byItem.set(id, { item, owners: [diver.name] })
    }
  }
  return byItem
})

function personalEntries(categories: readonly ItemCategory[]): TypedEntry[] {
  return [...ownedEntries.value.values()].filter(entry => categories.includes(entry.item.category))
}

function personalStratagems(): TypedEntry[] {
  return [...ownedEntries.value.values()].filter(entry => entry.item.type === 'stratagem')
}

const typeGroups = computed<TypeGroup[]>(() => {
  const groups: TypeGroup[] = []
  const weapons = personalEntries(['primary', 'secondary'])
  if (weapons.length) groups.push({ id: 'weapons', label: 'Weapons', entries: weapons })
  const throwables = personalEntries(['throwable'])
  if (throwables.length) groups.push({ id: 'throwables', label: 'Throwables', entries: throwables })
  const stratagems = personalStratagems()
  if (stratagems.length) groups.push({ id: 'stratagems', label: 'Stratagems', entries: stratagems })
  const armor = personalEntries(['armorPassive'])
  if (armor.length) groups.push({ id: 'armor', label: 'Armor', entries: armor })
  const boosters = personalEntries(['booster'])
  if (boosters.length) groups.push({ id: 'boosters', label: 'Boosters', entries: boosters })
  return groups
})

const personalGroups = computed(() =>
  props.state.divers.map(diver => ({
    diver,
    items: resolve(props.state.personalInventories[diver.id] ?? []),
  })),
)

function forfeit(ownerId: string, itemId: string): void {
  emit('forfeit', { ownerId, itemId })
}
</script>

<template>
  <div class="inventory">
    <div
      v-if="!selectMode"
      class="view-toggle"
    >
      <button
        type="button"
        :class="{ active: activeView === 'type' }"
        @click="view = 'type'"
      >
        By type
      </button>
      <button
        type="button"
        :class="{ active: activeView === 'diver' }"
        @click="view = 'diver'"
      >
        By diver
      </button>
    </div>

    <template v-if="activeView === 'type'">
      <section
        v-for="group in typeGroups"
        :key="group.id"
        class="inv-group"
      >
        <h3>
          {{ group.label }}
          <span class="muted small">({{ group.entries.length }})</span>
        </h3>
        <TransitionGroup
          tag="div"
          name="inv"
          class="showcase-grid"
        >
          <ItemCard
            v-for="entry in group.entries"
            :key="entry.item.id"
            :item="entry.item"
            showcase
            :owners="entry.owners"
            disabled
          />
        </TransitionGroup>
      </section>
    </template>

    <template v-else>
      <section
        v-for="group in personalGroups"
        :key="group.diver.id"
        class="inv-group"
      >
        <h3>
          {{ group.diver.name }}'s kit
          <span class="muted small">({{ group.items.length }})</span>
        </h3>
        <TransitionGroup
          tag="div"
          name="inv"
          class="showcase-grid"
        >
          <ItemCard
            v-for="item in group.items"
            :key="item.id"
            :item="item"
            showcase
            :disabled="!selectMode"
            @select="forfeit(group.diver.id, item.id)"
          />
        </TransitionGroup>
      </section>
    </template>
  </div>
</template>

<style scoped>
.inventory { display: grid; gap: 1rem; }
.inv-group { display: grid; gap: 0.5rem; position: relative; }

.view-toggle {
  display: inline-flex;
  width: max-content;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}
.view-toggle button {
  font: inherit;
  font-size: 0.78rem;
  padding: 0.28rem 0.75rem;
  background: transparent;
  border: 0;
  color: var(--muted);
  cursor: pointer;
}
.view-toggle button.active {
  background: var(--bg-raised);
  color: var(--gold);
  font-weight: 700;
}

.showcase-grid {
  display: grid;
  gap: 0.5rem;
  grid-template-columns: repeat(auto-fill, minmax(9.5rem, 1fr));
}

.inv-move,
.inv-enter-active { transition: opacity 220ms var(--ease-out), transform 220ms var(--ease-out); }
.inv-enter-from { opacity: 0; transform: scale(0.85); }
.inv-leave-active { position: absolute; }
.inv-leave-active,
.inv-leave-to { transition: opacity 180ms ease-in, transform 180ms ease-in; }
.inv-leave-to { opacity: 0; transform: scale(0.8); }
</style>
