<script setup lang="ts">
import { RadioGroupItem, RadioGroupRoot } from 'reka-ui'
import { tierListChangeCount } from '~~/shared/engine/tierList'

// The host's tier-list choice at setup: the community default, a featured
// list, or one from this browser's library. The choice is remembered, so a
// squad that always plays its own list never has to pick it again.
withDefaults(defineProps<{ disabled?: boolean }>(), { disabled: false })

const { choices, picked, pick } = useTierLists()

const SOURCE_LABEL = { default: 'Community', preset: 'Featured', library: 'Yours' } as const

const rows = computed(() => choices.value.map(choice => ({
  ...choice,
  changes: tierListChangeCount(choice.list),
})))
</script>

<template>
  <div class="tl-picker">
    <RadioGroupRoot
      :model-value="picked.id"
      class="tl-options"
      aria-label="Tier list"
      :disabled="disabled"
      @update:model-value="pick(String($event))"
    >
      <RadioGroupItem
        v-for="row in rows"
        :key="row.id"
        :value="row.id"
        class="tl-option cut-sm"
        :class="{ on: picked.id === row.id }"
        :aria-label="row.changes ? `${row.name}, ${row.changes} items moved` : `${row.name}, every item at its default tier`"
      >
        <span class="tl-src">{{ SOURCE_LABEL[row.source] }}</span>
        <span class="tl-name">{{ row.name }}</span>
        <span class="tl-meta">{{ row.changes ? `${row.changes} moved` : 'No changes' }}</span>
      </RadioGroupItem>
    </RadioGroupRoot>
    <div class="tl-foot">
      <TierListTag :list="picked.list" />
      <NuxtLink
        to="/tiers"
        target="_blank"
        class="btn tiny ghost cut-sm"
        aria-label="Tier Maker (opens in a new tab)"
      >
        Tier Maker ↗
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.tl-picker { display: grid; gap: 8px; min-width: 0; container: tl-picker / inline-size; }
.tl-options {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
  gap: 6px;
}
.tl-option {
  display: grid;
  align-content: start;
  gap: 2px;
  min-height: 56px;
  min-width: 0;
  padding: 8px 10px;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  border: 1px solid var(--line-2);
  background: var(--panel);
  transition: border-color var(--dur-fast), background-color var(--dur-fast);
}
.tl-option:hover:not(:disabled) { border-color: var(--line-4); }
.tl-option:disabled { cursor: not-allowed; opacity: 0.6; }
.tl-option.on { border-color: var(--gold); background: var(--raised); }
.tl-src { font-size: 9px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); }
.tl-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.tl-option.on .tl-name { color: var(--gold); }
.tl-meta { font-size: 11px; color: var(--muted); }
.tl-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-width: 0; }
</style>
