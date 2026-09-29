<script setup lang="ts">
import { ALL_ITEMS, TIER_RANK, WARBONDS } from '~~/shared/data/catalog'
import type { ItemCategory } from '~~/shared/data/types'

const CATEGORIES: (ItemCategory | 'all')[] = [
  'all',
  'primary',
  'secondary',
  'throwable',
  'booster',
  'armor',
  'armorPassive',
  'Supply',
  'Eagle',
  'Orbital',
  'Defense',
]

const category = ref<ItemCategory | 'all'>('all')
const warbond = ref<string>('all')
const search = ref('')

const filtered = computed(() =>
  ALL_ITEMS.filter((item) => {
    if (category.value !== 'all' && item.category !== category.value) {
      return false
    }
    if (warbond.value !== 'all' && item.warbondCode !== warbond.value) {
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

function warbondName(code: string): string {
  return WARBONDS.find(warbond => warbond.code === code)?.displayName ?? code
}
</script>

<template>
  <div class="codex-browser">
    <p class="muted small codex-count">
      {{ filtered.length }} of {{ ALL_ITEMS.length }} items · tiers from the community default list
    </p>

    <section
      class="panel filters"
      aria-label="Catalog filters"
    >
      <label class="field">
        <span class="lbl">Category</span>
        <select
          v-model="category"
          aria-label="Category"
        >
          <option
            v-for="entry in CATEGORIES"
            :key="entry"
            :value="entry"
          >
            {{ entry === 'all' ? 'All categories' : entry }}
          </option>
        </select>
      </label>

      <label class="field">
        <span class="lbl">Warbond</span>
        <select
          v-model="warbond"
          aria-label="Warbond"
        >
          <option value="all">
            All warbonds
          </option>
          <option
            v-for="entry in WARBONDS"
            :key="entry.code"
            :value="entry.code"
          >
            {{ entry.displayName }}
          </option>
        </select>
      </label>

      <label class="field field-search">
        <span class="lbl">Search</span>
        <input
          v-model="search"
          type="text"
          placeholder="Search name or id…"
          aria-label="Search"
        >
      </label>
    </section>

    <template
      v-for="group in tierGroups"
      :key="group.tier"
    >
      <h2
        class="tier-heading"
        :data-tier="group.tier"
      >
        <span class="disp tier-mark">{{ group.tier.toUpperCase() }}</span>
        <span class="tier-label">{{ group.tier.toUpperCase() }} Tier</span>
        <span
          class="dash"
          aria-hidden="true"
        />
        <span class="cap tier-count">{{ group.items.length }} items</span>
      </h2>
      <section class="grid item-grid">
        <ItemCard
          v-for="item in group.items"
          :key="item.id"
          :item="item"
          :note="warbondName(item.warbondCode)"
          disabled
        />
      </section>
    </template>

    <p
      v-if="!tierGroups.length"
      class="muted small"
    >
      No catalog items match these filters.
    </p>
  </div>
</template>

<style scoped>
.codex-browser { display: grid; gap: 0.9rem; }
.codex-count { margin: 0; }

.filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
  gap: 0.75rem;
  padding: 0.8rem 1rem;
}
.field { display: grid; gap: 0.3rem; }
.field select,
.field input[type="text"] { width: 100%; min-width: 0; }
.field-search { grid-column: 1 / -1; }

.tier-heading {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  margin: 1.4rem 0 0.1rem;
}
.tier-mark {
  display: inline-grid;
  place-items: center;
  min-width: 2rem;
  height: 2rem;
  font-size: 1rem;
  color: currentColor;
  border: 1px solid currentColor;
}
.tier-label {
  font-family: var(--font-display);
  font-stretch: 125%;
  font-weight: 800;
  font-size: 1rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  white-space: nowrap;
}
.tier-count { margin-left: auto; flex-shrink: 0; }

.tier-heading[data-tier='s'] { color: var(--tier-s); }
.tier-heading[data-tier='a'] { color: var(--tier-a); }
.tier-heading[data-tier='b'] { color: var(--tier-b); }
.tier-heading[data-tier='c'] { color: var(--tier-c); }

.item-grid { grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr)); }
</style>
