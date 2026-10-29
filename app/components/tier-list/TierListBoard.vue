<script setup lang="ts">
import { RadioGroupItem, RadioGroupRoot } from 'reka-ui'
import { ALL_ITEMS, WARBONDS } from '~~/shared/data/catalog'
import { itemImageUrl } from '~~/shared/data/images'
import type { Item, ItemCategory, Tier } from '~~/shared/data/types'
import { TIERS, tieredCatalog } from '~~/shared/engine/tierList'
import type { TierList } from '~~/shared/engine/tierList'

// The Tier Maker's board: every catalog item grouped under the tier the draft
// gives it, each with a four-way S/A/B/C switch. Tap-to-assign, not drag, so
// it works one-handed on a phone between missions.
const props = defineProps<{ draft: TierList }>()
const emit = defineEmits<{ set: [itemId: string, tier: Tier] }>()

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

const category = ref<ItemCategory | 'all'>('all')
const warbond = ref<string>('all')
const search = ref('')
const movedOnly = ref(false)

const catalog = computed(() => tieredCatalog(props.draft))
const defaults = new Map(ALL_ITEMS.map(item => [item.id, item.tier]))

function moved(item: Item): boolean {
  return defaults.get(item.id) !== item.tier
}

const filtered = computed(() => {
  const query = search.value.trim().toLowerCase()
  return catalog.value.items.filter(item =>
    (category.value === 'all' || item.category === category.value)
    && (warbond.value === 'all' || item.warbondCode === warbond.value)
    && (!movedOnly.value || moved(item))
    && (!query || item.displayName.toLowerCase().includes(query) || item.id.includes(query)))
})

const groups = computed(() => TIERS.map(tier => ({
  tier,
  items: filtered.value
    .filter(item => item.tier === tier)
    .sort((a, b) => a.displayName.localeCompare(b.displayName)),
})))
</script>

<template>
  <div class="tl-board">
    <section
      class="panel tl-filters"
      aria-label="Item filters"
    >
      <label class="field">
        <span class="lbl">Category</span>
        <select v-model="category">
          <option
            v-for="entry in CATEGORIES"
            :key="entry"
            :value="entry"
          >
            {{ entry === 'all' ? 'All categories' : categoryLabel(entry) }}
          </option>
        </select>
      </label>
      <label class="field">
        <span class="lbl">Warbond</span>
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
      </label>
      <label class="field">
        <span class="lbl">Search</span>
        <input
          v-model="search"
          type="search"
          placeholder="Item name…"
        >
      </label>
      <label class="tl-moved-only">
        <input
          v-model="movedOnly"
          type="checkbox"
        >
        <span>Moved items only</span>
      </label>
    </section>

    <section
      v-for="group in groups"
      :key="group.tier"
      class="tl-tier"
      :aria-labelledby="`tl-tier-${group.tier}`"
    >
      <h2
        :id="`tl-tier-${group.tier}`"
        class="tl-tier-h"
        :data-tier="group.tier"
      >
        <span class="tl-tier-letter disp">{{ group.tier.toUpperCase() }}</span>
        <span class="tl-tier-word">Tier</span>
        <span
          class="dash"
          aria-hidden="true"
        />
        <span class="cap">{{ group.items.length }} items</span>
      </h2>
      <p
        v-if="!group.items.length"
        class="muted small tl-empty"
      >
        Nothing here{{ filtered.length < catalog.items.length ? ' under these filters' : '' }}.
      </p>
      <ul
        v-else
        class="tl-rows"
      >
        <li
          v-for="item in group.items"
          :key="item.id"
          class="tl-row"
          :class="{ moved: moved(item) }"
        >
          <img
            v-if="itemImageUrl(item)"
            class="tl-icon"
            :src="itemImageUrl(item)"
            alt=""
            loading="lazy"
            draggable="false"
          >
          <span
            v-else
            class="tl-icon"
            aria-hidden="true"
          />
          <span class="tl-id">
            <span class="tl-name">{{ item.displayName }}</span>
            <span class="tl-sub">
              {{ categoryLabel(item.category) }}
              <template v-if="moved(item)"> · default {{ defaults.get(item.id)?.toUpperCase() }}</template>
            </span>
          </span>
          <RadioGroupRoot
            orientation="horizontal"
            :model-value="item.tier"
            class="tl-switch"
            :aria-label="`${item.displayName} tier`"
            @update:model-value="emit('set', item.id, $event as Tier)"
          >
            <RadioGroupItem
              v-for="tier in TIERS"
              :key="tier"
              :value="tier"
              class="tl-seg"
              :data-tier="tier"
              :aria-label="`${tier.toUpperCase()} tier${defaults.get(item.id) === tier ? ' (default)' : ''}`"
            >
              {{ tier.toUpperCase() }}
              <span
                v-if="defaults.get(item.id) === tier"
                class="tl-default-dot"
                aria-hidden="true"
              />
            </RadioGroupItem>
          </RadioGroupRoot>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.tl-board { display: grid; gap: 18px; min-width: 0; container: tl-board / inline-size; }
.tl-filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
  align-items: end;
  gap: 0.75rem;
}
.field { display: grid; gap: 0.3rem; min-width: 0; }
.field select,
.field input { width: 100%; min-width: 0; }
.tl-moved-only { display: inline-flex; align-items: center; gap: 8px; min-height: 36px; font-size: 0.82rem; color: var(--khaki); cursor: pointer; }

.tl-tier { display: grid; gap: 6px; min-width: 0; }
.tl-tier-h {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.tl-tier-letter { font-size: 1.6rem; line-height: 1; }
.tl-tier-word { color: var(--muted); }
.tl-tier-h .dash { flex: 1; }
.tl-tier-h .cap { color: var(--muted); }
.tl-empty { margin: 0; }

.tl-rows {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 22rem), 1fr));
  gap: 4px;
}
.tl-row {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 6px 8px;
  border: 1px solid var(--line-1);
  border-left: 3px solid var(--line-2);
  background: var(--panel);
}
.tl-row.moved { border-left-color: var(--gold); background: var(--raised); }
.tl-icon { width: 36px; height: 36px; object-fit: contain; }
.tl-id { display: grid; gap: 1px; min-width: 0; }
.tl-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.86rem; font-weight: 600; }
.tl-sub { font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
.tl-row.moved .tl-sub { color: var(--khaki); }

.tl-switch { display: inline-flex; border: 1px solid var(--line-3); }
.tl-seg {
  position: relative;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 700;
  background: transparent;
  border: 0;
  border-left: 1px solid var(--line-2);
  cursor: pointer;
  opacity: 0.55;
  transition: background-color var(--dur-fast), opacity var(--dur-fast);
}
.tl-seg:first-child { border-left: 0; }
.tl-seg:hover { opacity: 0.9; }
.tl-seg[data-state='checked'] { opacity: 1; background: color-mix(in srgb, currentColor 18%, transparent); box-shadow: inset 0 -2px 0 currentColor; }
.tl-default-dot {
  position: absolute;
  top: 3px;
  right: 3px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: currentColor;
}
@container tl-board (max-width: 360px) {
  .tl-seg { width: 28px; }
  .tl-row { grid-template-columns: 28px minmax(0, 1fr) auto; gap: 8px; }
  .tl-icon { width: 28px; height: 28px; }
}
</style>
