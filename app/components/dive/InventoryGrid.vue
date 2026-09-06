<script setup lang="ts">
import { ITEMS_BY_ID } from '~~/shared/data/catalog'
import type { Item, ItemCategory } from '~~/shared/data/types'
import type { DiveState, ItemRef } from '~~/shared/engine/types'

interface TypeGroup { id: string, label: string, items: Item[] }
interface DiverKit { diverId: string, diverName: string, items: Item[], groups: TypeGroup[] }

const props = withDefaults(defineProps<{
  state: DiveState
  selfId?: string | null
  selectMode?: boolean
}>(), { selfId: null, selectMode: false })

const emit = defineEmits<{ forfeit: [itemRef: ItemRef] }>()

type InventoryView = 'mine' | 'squad'
const view = ref<InventoryView>('mine')

function resolve(ids: readonly string[]): Item[] {
  return ids
    .map(id => ITEMS_BY_ID.get(id))
    .filter((item): item is Item => item !== undefined)
}

function typeGroupsFor(items: Item[]): TypeGroup[] {
  const inCategories = (categories: readonly ItemCategory[]): Item[] =>
    items.filter(item => categories.includes(item.category))
  const groups: TypeGroup[] = []
  const add = (id: string, label: string, entries: Item[]) => {
    if (entries.length) groups.push({ id, label, items: entries })
  }
  add('weapons', 'Weapons', inCategories(['primary', 'secondary']))
  add('throwables', 'Throwables', inCategories(['throwable']))
  add('stratagems', 'Stratagems', items.filter(item => item.type === 'stratagem'))
  add('armor', 'Armor', inCategories(['armorPassive']))
  add('boosters', 'Boosters', inCategories(['booster']))
  return groups
}

function kitFor(diver: DiveState['divers'][number]): DiverKit {
  const items = resolve(props.state.personalInventories[diver.id] ?? [])
  return { diverId: diver.id, diverName: diver.name, items, groups: typeGroupsFor(items) }
}

const mineGroups = computed<TypeGroup[]>(() =>
  typeGroupsFor(resolve(props.state.personalInventories[props.selfId ?? ''] ?? [])))

const otherKits = computed<DiverKit[]>(() =>
  props.state.divers.filter(diver => diver.id !== props.selfId).map(kitFor))

const allKits = computed<DiverKit[]>(() => props.state.divers.map(kitFor))

function forfeit(ownerId: string, itemId: string): void {
  emit('forfeit', { ownerId, itemId })
}
</script>

<template>
  <div class="inventory">
    <div
      v-if="!selectMode && otherKits.length"
      class="view-toggle"
    >
      <button
        type="button"
        :class="{ active: view === 'mine' }"
        @click="view = 'mine'"
      >
        My kit
      </button>
      <button
        type="button"
        :class="{ active: view === 'squad' }"
        @click="view = 'squad'"
      >
        Squad
      </button>
    </div>

    <template v-if="selectMode">
      <section
        v-for="kit in allKits"
        :key="kit.diverId"
        class="inv-group"
      >
        <h3>
          {{ kit.diverName }}'s kit
          <span class="muted small">({{ kit.items.length }})</span>
        </h3>
        <TransitionGroup
          tag="div"
          name="inv"
          class="showcase-grid"
        >
          <ItemCard
            v-for="item in kit.items"
            :key="item.id"
            :item="item"
            showcase
            @select="forfeit(kit.diverId, item.id)"
          />
        </TransitionGroup>
      </section>
    </template>

    <template v-else-if="view === 'mine'">
      <section
        v-for="group in mineGroups"
        :key="group.id"
        class="inv-group"
      >
        <h3>
          {{ group.label }}
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
            disabled
          />
        </TransitionGroup>
      </section>
    </template>

    <template v-else>
      <section
        v-for="kit in otherKits"
        :key="kit.diverId"
        class="inv-group"
      >
        <h3>
          {{ kit.diverName }}'s kit
          <span class="muted small">({{ kit.items.length }})</span>
        </h3>
        <div
          v-for="group in kit.groups"
          :key="group.id"
          class="kit-type"
        >
          <h4>
            {{ group.label }}
            <span class="muted small">({{ group.items.length }})</span>
          </h4>
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
              disabled
            />
          </TransitionGroup>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.inventory { display: grid; gap: 1rem; }
.inv-group { display: grid; gap: 0.5rem; position: relative; }
.kit-type { display: grid; gap: 0.4rem; }
.kit-type h4 {
  margin: 0.25rem 0 0;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
}

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
