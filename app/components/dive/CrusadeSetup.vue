<script setup lang="ts">
import { RadioGroupItem, RadioGroupRoot } from 'reka-ui'
import { baseTierFor, missionsPerOperation } from '~~/shared/engine/config'
import { STARTING_KITS, VARIANTS, difficultyName } from '~~/shared/engine/progression'
import type { CrusadeVariant } from '~~/shared/engine/types'

withDefaults(defineProps<{
  variant: CrusadeVariant
  startLabel?: string
  showStart?: boolean
}>(), { startLabel: 'Start crusade', showStart: true })

const emit = defineEmits<{
  'update:variant': [variant: CrusadeVariant]
  'start': []
}>()

const cards = computed(() => VARIANTS.map((entry) => {
  const start = STARTING_KITS[entry.id].startDifficulty
  return {
    ...entry,
    start,
    tier: baseTierFor(start),
    missions: missionsPerOperation(start),
  }
}))

function select(value: unknown): void {
  emit('update:variant', value as CrusadeVariant)
}
</script>

<template>
  <div class="setup">
    <RadioGroupRoot
      :model-value="variant"
      class="variant-grid"
      aria-label="Variant"
      @update:model-value="select"
    >
      <RadioGroupItem
        v-for="entry in cards"
        :key="entry.id"
        :value="entry.id"
        class="variant-card cut-sm"
        :class="{ on: variant === entry.id }"
      >
        <span class="vl">{{ entry.start }} START</span>
        <span class="vc-body">
          <span class="vc-head">
            <strong class="vc-name disp">{{ entry.name }}</strong>
            <span
              class="tb vc-tier"
              :data-tier="entry.tier"
            >{{ entry.tier }}</span>
          </span>
          <span class="vc-diff cap">{{ difficultyName(entry.start) }}</span>
          <span class="vc-meta odl">{{ entry.squadSize }} · OP {{ entry.missions }} MISSIONS</span>
          <span class="vc-pips">
            <i
              v-for="k in entry.missions"
              :key="k"
            />
          </span>
          <span class="vc-desc muted small">{{ entry.description }}</span>
        </span>
      </RadioGroupItem>
    </RadioGroupRoot>
    <button
      v-if="showStart"
      class="btn primary block cut-sm"
      type="button"
      @click="emit('start')"
    >
      {{ startLabel }}
    </button>
  </div>
</template>

<style scoped>
.setup { display: grid; gap: 0.85rem; }

.variant-grid {
  display: grid;
  gap: 0.5rem;
  grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
}

.variant-card {
  display: flex;
  gap: 0.5rem;
  padding: 0.55rem 0.6rem;
  border: 1px solid var(--line-2);
  background: var(--rail);
  cursor: pointer;
  text-align: left;
  color: inherit;
  font: inherit;
  transition: border-color var(--dur-fast), background-color var(--dur-fast);
}
.variant-card:hover { border-color: var(--line-4); }
.variant-card.on {
  border-color: var(--gold);
  background: rgba(255, 214, 66, 0.05);
}

.vc-body { display: grid; gap: 0.2rem; min-width: 0; flex-grow: 1; }
.vc-head { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
.vc-name { font-size: 0.9rem; color: var(--text); }
.vc-tier { font-size: 0.68rem; min-width: 1.3rem; padding: 0.05rem 0.25rem; }
.vc-diff { color: var(--gold); }
.vc-meta { color: var(--dim); }
.vc-pips { display: flex; gap: 3px; }
.vc-pips i {
  width: 14px;
  height: 4px;
  border: 1px solid var(--line-4);
}
.variant-card.on .vc-pips i { border-color: var(--gold); }
.vc-desc { line-height: 1.3; }
</style>
