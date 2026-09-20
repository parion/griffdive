<script setup lang="ts">
import { ITEMS_BY_ID } from '~~/shared/data/catalog'
import { sortKitItems } from '~~/shared/data/ordering'
import type { Item, ItemCategory } from '~~/shared/data/types'
import type { DiveState, ItemRef } from '~~/shared/engine/types'

interface TypeGroup { id: string, label: string, items: Item[], empty?: string }
interface DiverKit { diverId: string, diverName: string, items: Item[], groups: TypeGroup[] }

const props = withDefaults(defineProps<{
  state: DiveState
  selfId?: string | null
  selectMode?: boolean
}>(), { selfId: null, selectMode: false })

const emit = defineEmits<{ forfeit: [itemRef: ItemRef] }>()

const view = ref('mine')

function resolve(ids: readonly string[]): Item[] {
  return ids
    .map(id => ITEMS_BY_ID.get(id))
    .filter((item): item is Item => item !== undefined)
}

function typeGroupsFor(items: Item[]): TypeGroup[] {
  const sorted = sortKitItems(items)
  const inCategories = (categories: readonly ItemCategory[]): Item[] =>
    sorted.filter(item => categories.includes(item.category))
  const groups: TypeGroup[] = []
  const add = (id: string, label: string, entries: Item[], empty?: string) => {
    if (entries.length || empty) groups.push({ id, label, items: entries, empty })
  }
  add('weapons', 'Weapons', inCategories(['primary', 'secondary']))
  add('throwables', 'Throwables', inCategories(['throwable']))
  add('stratagems', 'Stratagems', sorted.filter(item => item.type === 'stratagem'))
  add('armor', 'Armor', inCategories(['armorPassive']))
  // Boosters always render their group, even when empty — a boosterless diver
  // needs to see the slot exists and that rewards can fill it.
  add('boosters', 'Boosters', inCategories(['booster']), 'No boosters available yet — rewards can unlock one.')
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

const viewTabs = computed(() => otherKits.value.length
  ? [{ value: 'mine', label: 'My kit' }, { value: 'squad', label: 'Squad' }]
  : [{ value: 'mine', label: 'My kit' }])

watch(() => otherKits.value.length, (count) => {
  if (count === 0) {
    view.value = 'mine'
  }
})

function forfeit(ownerId: string, itemId: string): void {
  emit('forfeit', { ownerId, itemId })
}
</script>

<template>
  <div class="inventory">
    <AppTabs
      v-if="!selectMode"
      v-model="view"
      :tabs="viewTabs"
      label="Inventory view"
    >
      <template #mine>
        <div class="kit-categories">
          <section
            v-for="group in mineGroups"
            :key="group.id"
            class="inv-group"
          >
            <h3>
              {{ group.label }}
              <span class="muted small">({{ group.items.length }})</span>
            </h3>
            <p
              v-if="!group.items.length"
              class="muted small"
            >
              {{ group.empty }}
            </p>
            <TransitionGroup
              v-else
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
        </div>
      </template>

      <template #squad>
        <div class="kit-categories">
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
              <p
                v-if="!group.items.length"
                class="muted small"
              >
                {{ group.empty }}
              </p>
              <TransitionGroup
                v-else
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
        </div>
      </template>
    </AppTabs>

    <template v-else>
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
  </div>
</template>

<style scoped>
.inventory { display: grid; gap: 1rem; }
.kit-categories { display: grid; gap: 1rem; }
.inv-group { display: grid; gap: 0.5rem; position: relative; }
.inv-group > h3 { margin: 0; }
.inv-group > p { margin: 0; }
.kit-type { display: grid; gap: 0.4rem; }
.kit-type > p { margin: 0; }
.kit-type h4 {
  margin: 0;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
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
