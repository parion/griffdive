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
  <main class="page">
    <header class="page-header">
      <div>
        <h1>Codex</h1>
        <p class="muted small">
          {{ filtered.length }} of {{ ALL_ITEMS.length }} items · tiers from the community default list
        </p>
      </div>
    </header>

    <section class="panel row">
      <select v-model="category">
        <option
          v-for="entry in CATEGORIES"
          :key="entry"
          :value="entry"
        >
          {{ entry === 'all' ? 'All categories' : entry }}
        </option>
      </select>
      <select v-model="warbond">
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
      <input
        v-model="search"
        type="text"
        placeholder="Search name or id…"
      >
    </section>

    <template
      v-for="group in tierGroups"
      :key="group.tier"
    >
      <h2
        class="tier-heading"
        :data-tier="group.tier"
      >
        <span class="label">{{ group.tier.toUpperCase() }} Tier</span>
        <span class="count">{{ group.items.length }}</span>
      </h2>
      <section class="grid">
        <div
          v-for="item in group.items"
          :key="item.id"
          class="codex-row"
        >
          <ItemCard
            :item="item"
            disabled
          />
          <p class="muted small">
            {{ warbondName(item.warbondCode) }}
          </p>
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped>
.codex-row { display: grid; gap: 0.2rem; }
.panel select, .panel input[type="text"] { min-width: 0; flex: 1 1 10rem; }
.tier-heading {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  margin: 1.75rem 0 0.75rem;
  font-family: var(--font-display);
  font-size: 1rem;
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
  font-size: 0.75rem;
  font-weight: 400;
  letter-spacing: 0.06em;
  opacity: 0.7;
}
.tier-heading[data-tier='s'] { color: var(--tier-s); }
.tier-heading[data-tier='a'] { color: var(--tier-a); }
.tier-heading[data-tier='b'] { color: var(--tier-b); }
.tier-heading[data-tier='c'] { color: var(--tier-c); }
</style>
