<script setup lang="ts">
import { itemImageUrl } from '~~/shared/data/images'
import { SEAF_SUPPORT_TIER } from '~~/shared/engine/config'
import { startingItemIds, supportRollsFor } from '~~/shared/engine/progression'
import type { CrusadeMode, CrusadeVariant } from '~~/shared/engine/types'

// The surplus kit every diver drops with for the chosen start. SEAF Support is
// rolled per diver at launch, so it shows as a recipe rather than as items.
const props = defineProps<{
  variant: CrusadeVariant
  mode?: CrusadeMode
}>()

const ids = computed(() => startingItemIds(props.variant))
const groups = computed(() => kitGroups(ids.value))
const rolls = computed(() => supportRollsFor(props.variant, props.mode))
const recipe = computed(() => (rolls.value ? supportRollList(rolls.value) : []))
</script>

<template>
  <div class="kit">
    <div
      v-for="group in groups"
      :key="group.label"
      class="kit-g"
    >
      <span class="kit-g-label">{{ group.label }}</span>
      <ul class="kit-items">
        <li
          v-for="item in group.items"
          :key="item.id"
          :class="{ wide: item.category === 'primary' || item.category === 'secondary' }"
          :title="item.displayName"
        >
          <img
            :src="itemImageUrl(item)"
            :alt="item.displayName"
            loading="lazy"
            draggable="false"
          >
        </li>
      </ul>
    </div>
    <div
      v-if="recipe.length"
      class="kit-g kit-support"
    >
      <span class="kit-g-label">SEAF Support · rolled per diver</span>
      <ul class="kit-recipe">
        <li
          v-for="entry in recipe"
          :key="entry"
        >
          {{ entry }}
        </li>
      </ul>
    </div>
    <p class="kit-note">
      {{ recipe.length
        ? `Surplus kit + a random ${SEAF_SUPPORT_TIER.toUpperCase()}-tier pack, rolled separately for each diver at launch.`
        : 'Bare surplus kit.' }}
      Every reward adds to it.
    </p>
  </div>
</template>

<style scoped>
.kit {
  display: flex;
  flex-wrap: wrap;
  align-content: start;
  gap: 10px 16px;
  padding: 12px;
  border: 1px solid var(--line-2);
  background: var(--panel);
}
.kit-g { display: grid; align-content: start; gap: 5px; min-width: 0; }
.kit-g-label { font-size: 9px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: var(--muted); }
.kit-items { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 4px; }
.kit-items li {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  background: var(--raised);
  border: 1px solid var(--line-2);
}
.kit-items li.wide { width: 60px; }
.kit-support { flex-basis: 100%; }
.kit-recipe { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 4px; }
.kit-recipe li {
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text);
  background: var(--raised);
  border: 1px solid var(--teal);
  box-shadow: inset 0 -2px 0 var(--teal);
}
.kit-items img { width: 28px; height: 28px; object-fit: contain; }
.kit-items li.wide img { width: 54px; height: 30px; }
.kit-note { flex-basis: 100%; margin: 0; font-size: 11px; line-height: 1.4; color: var(--muted); }
</style>
