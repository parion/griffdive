<script setup lang="ts">
import { ITEMS_BY_ID } from '~~/shared/data/catalog'
import { availableCaches, catchUpOptionsFor } from '~~/shared/engine/selectors'
import type { DiveState, DiverState } from '~~/shared/engine/types'
import { SPRING_SNAP, riseIn } from '~/utils/motion'

const props = defineProps<{
  state: DiveState
  diver: DiverState
}>()

const emit = defineEmits<{
  claimOption: [optionId: string]
  claimCache: [ownerId: string]
}>()

// The offer is derived like every other roll — same seed, same options on
// every client. It re-derives against the remaining owed count.
const options = computed(() => catchUpOptionsFor(props.state, props.diver))
const caches = computed(() => availableCaches(props.state))
const untouched = computed(() => props.diver.catchUpOwed === props.diver.catchUpGranted)

// The one-time choice — a fallen diver's cache or the promotion — only exists
// while the promotion is untouched and a cache is actually available.
const mode = ref<'choice' | 'options'>(caches.value.length > 0 ? 'choice' : 'options')

function itemNames(itemIds: string[]): string[] {
  return itemIds.map(id => ITEMS_BY_ID.get(id)?.displayName ?? id)
}
</script>

<template>
  <section class="panel promotion">
    <h2>Field Promotion</h2>
    <p class="muted small">
      You joined mid-crusade — the squad climbed without you. Claim
      {{ diver.catchUpOwed }}
      {{ diver.catchUpOwed === 1 ? 'pick' : 'picks' }} at the current
      difficulty's base tier. Risk is still yours to take: no promotion pick
      ever reaches S or S+.
    </p>

    <template v-if="mode === 'choice' && untouched">
      <div class="cache-list">
        <button
          v-for="cache in caches"
          :key="cache.ownerId"
          class="cache"
          type="button"
          @click="emit('claimCache', cache.ownerId)"
        >
          <span class="cache-title">Claim a fallen diver's kit</span>
          <span class="muted small">{{ itemNames(cache.itemIds).join(' · ') }}</span>
        </button>
      </div>
      <button
        class="btn ghost"
        type="button"
        @click="mode = 'options'"
      >
        Roll the promotion instead
      </button>
    </template>

    <template v-else>
      <p class="row small muted">
        <span>{{ diver.catchUpOwed }} of {{ diver.catchUpGranted }} picks left</span>
      </p>
      <div class="grid">
        <Motion
          v-for="(option, index) in options"
          :key="option.optionId"
          as="div"
          :initial="{ opacity: 0, y: 18, scale: 0.9 }"
          :animate="{ opacity: 1, y: 0, scale: 1 }"
          :transition="{ ...SPRING_SNAP, delay: index * 0.07 }"
        >
          <ItemCard
            :item="option.item"
            @select="emit('claimOption', option.optionId)"
          />
        </Motion>
      </div>
      <Motion
        v-if="diver.catchUpOwed === 0"
        as="p"
        class="row small muted banked"
        v-bind="riseIn(0)"
      >
        Promotion banked — welcome back to the fight, diver.
      </Motion>
    </template>
  </section>
</template>

<style scoped>
.cache-list {
  display: grid;
  gap: 0.5rem;
}

.cache {
  display: grid;
  gap: 0.25rem;
  padding: 0.6rem 0.8rem;
  text-align: left;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.cache:hover,
.cache:focus-visible {
  border-color: var(--gold);
}

.cache-title {
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--khaki);
}

.banked {
  margin: 0;
}
</style>
