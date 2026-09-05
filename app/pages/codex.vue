<script setup lang="ts">
import { ALL_ITEMS, WARBONDS } from '~~/shared/data/catalog'
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

    <section class="grid">
      <div
        v-for="item in filtered"
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
  </main>
</template>

<style scoped>
.codex-row { display: grid; gap: 0.2rem; }
.panel select, .panel input[type="text"] { min-width: 0; flex: 1 1 10rem; }
</style>
