<script setup lang="ts">
import { TIER_RANK } from '~~/shared/data/catalog'
import type { Item, ItemCategory } from '~~/shared/data/types'

const props = defineProps<{
  open: boolean
  pool: Item[]
  ownedIds: string[]
}>()

const emit = defineEmits<{ close: [], choose: [itemId: string] }>()

const CATEGORIES: (ItemCategory | 'all')[] = [
  'all',
  'primary',
  'secondary',
  'throwable',
  'booster',
  'armorPassive',
  'Supply',
  'Eagle',
  'Orbital',
  'Defense',
]

const search = ref('')
const category = ref<ItemCategory | 'all'>('all')
const searchInput = ref<HTMLInputElement | null>(null)

const owned = computed(() => new Set(props.ownedIds))

const filtered = computed(() =>
  props.pool.filter((item) => {
    if (category.value !== 'all' && item.category !== category.value) {
      return false
    }
    const query = search.value.trim().toLowerCase()
    if (query && !item.displayName.toLowerCase().includes(query) && !item.id.includes(query)) {
      return false
    }
    return true
  }),
)

const tierGroups = computed(() =>
  [...new Set(filtered.value.map(item => item.tier))]
    .sort((a, b) => TIER_RANK[b] - TIER_RANK[a])
    .map(tier => ({
      tier,
      items: filtered.value.filter(item => item.tier === tier),
    })),
)

const claimableCount = computed(() => props.pool.filter(item => !owned.value.has(item.id)).length)

function choose(item: Item): void {
  if (owned.value.has(item.id)) {
    return
  }
  emit('choose', item.id)
}

function focusSearch(event: Event): void {
  event.preventDefault()
  nextTick(() => searchInput.value?.focus())
}

watch(() => props.open, (open) => {
  if (open) {
    search.value = ''
    category.value = 'all'
  }
})
</script>

<template>
  <AppDialog
    :open="props.open"
    title="Liberty’s Cross"
    size="md"
    content-class="choice-dialog"
    @update:open="value => { if (!value) emit('close') }"
    @open-auto-focus="focusSearch"
  >
    <template #title>
      <span class="choice-title"><span class="mark">S+</span> Liberty’s Cross</span>
    </template>
    <template #description>
      {{ claimableCount }} of {{ pool.length }} items claimable — anything from your own warbonds,
      nothing already owned.
    </template>

    <section class="panel filters">
      <select
        v-model="category"
        aria-label="Filter by category"
      >
        <option
          v-for="entry in CATEGORIES"
          :key="entry"
          :value="entry"
        >
          {{ entry === 'all' ? 'All categories' : entry }}
        </option>
      </select>
      <input
        ref="searchInput"
        v-model="search"
        type="text"
        placeholder="Search name or id…"
        aria-label="Search the codex"
      >
    </section>

    <p
      v-if="filtered.length === 0"
      class="muted small"
    >
      Nothing in your catalog matches.
    </p>

    <template
      v-for="group in tierGroups"
      :key="group.tier"
    >
      <h3
        class="tier-heading"
        :data-tier="group.tier"
      >
        <span class="label">{{ group.tier.toUpperCase() }} Tier</span>
        <span class="count">{{ group.items.length }}</span>
      </h3>
      <section class="grid">
        <div
          v-for="item in group.items"
          :key="item.id"
          class="slot"
          :class="{ held: owned.has(item.id) }"
        >
          <ItemCard
            :item="item"
            compact
            :disabled="owned.has(item.id)"
            :title="owned.has(item.id) ? 'Already owned' : undefined"
            @select="choose(item)"
          />
        </div>
      </section>
    </template>
  </AppDialog>
</template>

<style scoped>
:deep(.choice-dialog) {
  border-color: color-mix(in srgb, var(--tier-splus) 40%, var(--border));
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5), 0 0 34px color-mix(in srgb, var(--tier-splus) 14%, transparent);
}

.choice-title {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 700;
  font-stretch: 125%;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.mark {
  display: inline-grid;
  place-items: center;
  min-width: 1.7rem;
  height: 1.7rem;
  padding: 0 0.2rem;
  border: 1px solid currentColor;
  border-radius: 5px;
  font-size: 0.75rem;
}

.filters {
  position: sticky;
  top: -1.1rem;
  z-index: 1;
  margin-bottom: 0.75rem;
  padding: 0.6rem;
  background: var(--bg-raised);
}
.filters select, .filters input[type="text"] { min-width: 0; flex: 1 1 10rem; }

.tier-heading {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  margin: 1.1rem 0 0.6rem;
  font-family: var(--font-display);
  font-size: 0.85rem;
  font-weight: 700;
  font-stretch: 125%;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.tier-heading::before, .tier-heading::after {
  content: '';
  align-self: center;
  flex: 1;
  height: 1px;
  background: currentColor;
  opacity: 0.35;
}
.tier-heading .count {
  font-family: var(--font-body);
  font-size: 0.7rem;
  font-weight: 400;
  letter-spacing: 0.06em;
  opacity: 0.7;
}

.slot.held { opacity: 0.4; }
</style>
