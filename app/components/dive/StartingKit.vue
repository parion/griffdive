<script setup lang="ts">
import { itemImageUrl } from '~~/shared/data/images'
import { SEAF_SUPPORT_KIT, startingItemIds } from '~~/shared/engine/progression'
import type { CrusadeMode, CrusadeVariant } from '~~/shared/engine/types'

// The kit every diver drops with for the chosen start. SEAF Support gear is
// edged teal so the mode's extra gear reads at a glance.
const props = defineProps<{
  variant: CrusadeVariant
  mode?: CrusadeMode
}>()

const ids = computed(() => startingItemIds(props.variant, props.mode))
const groups = computed(() => kitGroups(ids.value))
const support = new Set<string>([...SEAF_SUPPORT_KIT.stratagems, ...SEAF_SUPPORT_KIT.boosters])
const supportCount = computed(() => ids.value.filter(id => support.has(id)).length)
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
          :class="{ wide: item.category === 'primary' || item.category === 'secondary', seaf: support.has(item.id) }"
          :title="support.has(item.id) ? `${item.displayName} · SEAF Support` : item.displayName"
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
    <p class="kit-note">
      {{ supportCount ? `Surplus kit + ${supportCount} SEAF Support items.` : 'Bare surplus kit.' }}
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
.kit-items li.seaf { border-color: var(--teal); box-shadow: inset 0 -2px 0 var(--teal); }
.kit-items img { width: 28px; height: 28px; object-fit: contain; }
.kit-items li.wide img { width: 54px; height: 30px; }
.kit-note { flex-basis: 100%; margin: 0; font-size: 11px; line-height: 1.4; color: var(--muted); }
</style>
