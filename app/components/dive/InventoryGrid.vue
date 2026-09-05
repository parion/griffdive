<script setup lang="ts">
import { ITEMS_BY_ID } from '~~/shared/data/catalog'
import type { Item } from '~~/shared/data/types'
import type { DiveState, ItemRef } from '~~/shared/engine/types'

const props = withDefaults(defineProps<{
  state: DiveState
  selectMode?: boolean
}>(), { selectMode: false })

const emit = defineEmits<{ forfeit: [itemRef: ItemRef] }>()

function resolve(ids: readonly string[]): Item[] {
  return ids
    .map(id => ITEMS_BY_ID.get(id))
    .filter((item): item is Item => item !== undefined)
}

const sharedItems = computed(() => resolve(props.state.sharedStratagemIds))

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
    <section class="inv-group">
      <h3>Shared stratagems <span class="muted small">({{ sharedItems.length }})</span></h3>
      <TransitionGroup
        tag="div"
        name="inv"
        class="grid"
      >
        <ItemCard
          v-for="item in sharedItems"
          :key="item.id"
          :item="item"
          compact
          :disabled="!selectMode"
          @select="forfeit('shared', item.id)"
        />
      </TransitionGroup>
    </section>
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
        class="grid"
      >
        <ItemCard
          v-for="item in group.items"
          :key="item.id"
          :item="item"
          compact
          :disabled="!selectMode"
          @select="forfeit(group.diver.id, item.id)"
        />
      </TransitionGroup>
    </section>
  </div>
</template>

<style scoped>
.inventory { display: grid; gap: 1rem; }
.inv-group { display: grid; gap: 0.5rem; position: relative; }

.inv-move,
.inv-enter-active { transition: opacity 220ms var(--ease-out), transform 220ms var(--ease-out); }
.inv-enter-from { opacity: 0; transform: scale(0.85); }
.inv-leave-active { position: absolute; }
.inv-leave-active,
.inv-leave-to { transition: opacity 180ms ease-in, transform 180ms ease-in; }
.inv-leave-to { opacity: 0; transform: scale(0.8); }
</style>
