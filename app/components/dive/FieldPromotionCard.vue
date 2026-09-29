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
// every client. The grant is a fixed draft; claimed picks drop out of it.
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
  <section class="sec promotion">
    <header class="sh">
      <span
        class="stp promo-stamp"
        aria-hidden="true"
      >Promotion</span>
      <h2 class="lbl">
        Field Promotion
      </h2>
      <span class="dash" />
      <span class="cap">{{ diver.catchUpOwed }} / {{ diver.catchUpGranted }} picks</span>
    </header>
    <p class="sub muted">
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
          class="cache cut-sm"
          type="button"
          @click="emit('claimCache', cache.ownerId)"
        >
          <span class="cache-title cap">Claim a fallen diver's kit</span>
          <span class="cache-items muted small">{{ itemNames(cache.itemIds).join(' · ') }}</span>
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
.promotion { border-color: var(--line-4); }
.promo-stamp {
  color: var(--teal);
  border-color: var(--teal);
  padding: 2px 7px;
  font-size: 0.68rem;
}

.cache-list { display: grid; gap: 0.5rem; }

.cache {
  display: grid;
  gap: 0.25rem;
  padding: 0.6rem 0.8rem;
  text-align: left;
  background: var(--ground);
  border: 1px solid var(--line-3);
  color: inherit;
  font: inherit;
  cursor: pointer;
  transition: border-color var(--dur-fast), background-color var(--dur-fast);
}
.cache:hover,
.cache:focus-visible {
  border-color: var(--gold);
  background: rgba(255, 214, 66, 0.05);
}

.cache-title { color: var(--khaki); }
.cache-items { overflow-wrap: anywhere; }

.banked { margin: 0; }
</style>
