<script setup lang="ts">
import { ITEMS_BY_ID } from '~~/shared/data/catalog'
import type { Item } from '~~/shared/data/types'
import { availableCaches, catchUpOptionsFor } from '~~/shared/engine/selectors'
import type { DiveState, DiverState } from '~~/shared/engine/types'
import { SPRING_SNAP } from '~/utils/motion'

const props = defineProps<{
  open: boolean
  state: DiveState
  diver: DiverState
}>()

const emit = defineEmits<{
  claimOption: [optionId: string]
  claimCache: [ownerId: string]
  openWarbonds: []
}>()

// A joiner settles their promotion before they dive, so they reach the squad
// with their gear ready. The gate holds only while the engine says something
// is left to claim (promotionPending), never the squad.
const options = computed(() => catchUpOptionsFor(props.state, props.diver))
const untouched = computed(() => props.diver.catchUpOwed === props.diver.catchUpGranted)
const caches = computed(() => untouched.value
  ? availableCaches(props.state).map(cache => ({
      ownerId: cache.ownerId,
      items: cache.itemIds
        .map(id => ITEMS_BY_ID.get(id))
        .filter((item): item is Item => item !== undefined),
    }))
  : [])

// Fallen divers' kits lead while they're on the table: claiming one is the
// encouraged path back to the squad's altitude.
const browsingPicks = ref(false)
const showCaches = computed(() => caches.value.length > 0 && !browsingPicks.value)
const picksLabel = computed(() => props.diver.catchUpOwed === 1 ? 'pick' : 'picks')
</script>

<template>
  <AppDialog
    :open="open"
    title="Field Promotion"
    size="lg"
    :dismissible="false"
    :show-close="false"
  >
    <template #description>
      <template v-if="showCaches">
        The squad climbed without you. Claim a fallen diver's earned kit — or take
        {{ diver.catchUpOwed }} promotion {{ picksLabel }} at the current difficulty's base tier.
      </template>
      <template v-else>
        The squad climbed without you. Claim {{ diver.catchUpOwed }} {{ picksLabel }} at the current
        difficulty's base tier before you dive. No promotion pick ever reaches S or S+.
      </template>
    </template>

    <div class="gate">
      <div class="gate-head">
        <span
          class="stp promo-stamp"
          aria-hidden="true"
        >Promotion</span>
        <span class="dash" />
        <span class="cap">{{ diver.catchUpOwed }} / {{ diver.catchUpGranted }} {{ picksLabel }} left</span>
      </div>

      <template v-if="showCaches">
        <ul
          class="cache-list"
          aria-label="Fallen divers' kits"
        >
          <li
            v-for="cache in caches"
            :key="cache.ownerId"
          >
            <button
              class="cache cut-sm"
              type="button"
              @click="emit('claimCache', cache.ownerId)"
            >
              <span class="cache-title cap">
                Claim a fallen diver's kit
                <span class="muted">· {{ cache.items.length }} {{ cache.items.length === 1 ? 'item' : 'items' }}</span>
              </span>
              <span class="cache-items">
                <span
                  v-for="item in cache.items"
                  :key="item.id"
                  class="cache-item small"
                >
                  <span
                    class="tier-badge sm"
                    :data-tier="item.tier"
                  >{{ item.tier.toUpperCase() }}</span>
                  {{ item.displayName }}
                </span>
              </span>
            </button>
          </li>
        </ul>
        <button
          class="btn ghost"
          type="button"
          @click="browsingPicks = true"
        >
          Take the promotion picks instead
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
        <button
          v-if="caches.length > 0"
          class="btn ghost"
          type="button"
          @click="browsingPicks = false"
        >
          Back to fallen divers' kits
        </button>
      </template>
    </div>

    <template #footer>
      <p class="foot row small muted">
        Picks draw from your declared warbonds.
        <button
          class="btn tiny ghost"
          type="button"
          @click="emit('openWarbonds')"
        >
          Warbonds
        </button>
      </p>
    </template>
  </AppDialog>
</template>

<style scoped>
.gate { display: grid; gap: 0.75rem; }

.gate-head {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.promo-stamp {
  color: var(--teal);
  border-color: var(--teal);
  padding: 2px 7px;
  font-size: 0.68rem;
}

.cache-list {
  display: grid;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.cache {
  display: grid;
  gap: 0.4rem;
  width: 100%;
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

.cache-items {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem 0.8rem;
}

.cache-item {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(9.5rem, 1fr));
  gap: var(--gap-grid);
}

.foot {
  margin: 0;
  justify-content: space-between;
  width: 100%;
}
</style>
