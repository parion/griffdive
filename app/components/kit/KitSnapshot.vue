<script setup lang="ts">
import { ITEMS_BY_ID } from '~~/shared/data/catalog'
import { itemImageUrl } from '~~/shared/data/images'
import type { Item, ItemCategory } from '~~/shared/data/types'
import type { DiveState } from '~~/shared/engine/types'

const props = withDefaults(defineProps<{
  state: DiveState
  selfId: string | null
  compact?: boolean
}>(), { compact: false })

const emit = defineEmits<{ open: [] }>()

const owned = computed<Item[]>(() =>
  (props.state.personalInventories[props.selfId ?? ''] ?? [])
    .map(id => ITEMS_BY_ID.get(id))
    .filter((item): item is Item => Boolean(item)))

function firstOf(category: ItemCategory): Item | null {
  return owned.value.find(item => item.category === category) ?? null
}

const weapons = computed(() =>
  (['primary', 'secondary', 'throwable'] as const)
    .map(category => firstOf(category))
    .filter((item): item is Item => Boolean(item)))

const stratagems = computed(() =>
  owned.value.filter(item => item.type === 'stratagem').slice(0, 4))

const booster = computed(() => firstOf('booster'))
const armor = computed(() => firstOf('armorPassive'))

const weaponCount = computed(() =>
  owned.value.filter(item => ['primary', 'secondary', 'throwable'].includes(item.category)).length)
const stratagemCount = computed(() =>
  owned.value.filter(item => item.type === 'stratagem').length)
</script>

<template>
  <section class="snapshot">
    <header class="snap-head">
      <span class="cap">Your kit</span>
      <button
        class="open"
        type="button"
        @click="emit('open')"
      >
        Open full kit
      </button>
    </header>
    <p class="snap-sub">
      Surplus issue. Every item you bank lands here.
    </p>

    <div class="group">
      <span class="cap">Weapons <b>{{ weaponCount }}</b></span>
      <div class="tiles">
        <span
          v-for="item in weapons"
          :key="item.id"
          class="tile"
          :data-tier="item.tier"
        >
          <img
            v-if="itemImageUrl(item)"
            :src="itemImageUrl(item)"
            alt=""
            loading="lazy"
            draggable="false"
          >
          <span class="tile-name">{{ item.displayName }}</span>
        </span>
      </div>
    </div>

    <div class="group">
      <span class="cap">Stratagems <b>{{ stratagemCount }}</b></span>
      <div class="tiles four">
        <span
          v-for="item in stratagems"
          :key="item.id"
          class="tile strat"
          :data-tier="item.tier"
        >
          <img
            v-if="itemImageUrl(item)"
            :src="itemImageUrl(item)"
            alt=""
            loading="lazy"
            draggable="false"
          >
          <span class="tile-name">{{ item.displayName }}</span>
        </span>
      </div>
    </div>

    <div class="group inline">
      <span class="cap">Booster</span>
      <span
        v-if="booster"
        class="inline-item"
        :data-tier="booster.tier"
      >{{ booster.displayName }}</span>
      <span
        v-else
        class="none"
      >None earned yet</span>
      <span
        v-if="armor"
        class="armor"
        :data-tier="armor.tier"
      >{{ armor.displayName }}</span>
    </div>
  </section>
</template>

<style scoped>
.snapshot { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.snap-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.open {
  min-height: 36px;
  border: 0;
  background: none;
  color: var(--gold);
  font: 700 11px var(--font-body);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
}
.open:hover { color: var(--gold-bright); }
.snap-sub { margin: -6px 0 0; color: var(--dim); font-size: 12px; }

.group { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.group.inline { flex-direction: row; align-items: center; gap: 9px; }
.group.inline .cap { min-width: 56px; }
.tiles {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px;
}
.tiles.four { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.tile {
  --tier: var(--tier-c);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  min-width: 0;
  min-height: 82px;
  padding: 7px 4px 6px;
  background: var(--panel);
  box-shadow: inset 0 0 0 1px var(--line-2), inset 0 -3px 0 var(--tier);
  color: var(--khaki);
  text-align: center;
}
.tile[data-tier='c'] { --tier: var(--tier-c); }
.tile[data-tier='b'] { --tier: var(--tier-b); }
.tile[data-tier='a'] { --tier: var(--tier-a); }
.tile[data-tier='s'] { --tier: var(--tier-s); }
.tile img {
  width: 100%;
  height: 36px;
  object-fit: contain;
}
.tile.strat img { height: 28px; }
.tile-name {
  font-size: 9px;
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: 0.03em;
  overflow-wrap: anywhere;
}
.inline-item,
.armor {
  color: var(--text);
  font-size: 12px;
  font-weight: 600;
}
.armor { margin-left: auto; color: var(--gold); }
.none { color: var(--dim); font-size: 12px; }

@media (max-width: 420px) {
  .tiles.four { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
