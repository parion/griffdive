<script setup lang="ts">
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
</script>

<template>
  <div class="setup-grid">
    <div class="field">
      <span class="muted small">Variant</span>
      <div class="variant-grid">
        <label
          v-for="entry in VARIANTS"
          :key="entry.id"
          class="variant-card"
          :class="{ on: variant === entry.id }"
        >
          <input
            type="radio"
            name="variant"
            :value="entry.id"
            :checked="variant === entry.id"
            @change="emit('update:variant', entry.id)"
          >
          <strong>{{ entry.name }}</strong>
          <span class="muted small">{{ entry.squadSize }} · starts at {{ difficultyName(STARTING_KITS[entry.id].startDifficulty) }}</span>
          <span class="small muted">{{ entry.description }}</span>
        </label>
      </div>
    </div>
    <button
      v-if="showStart"
      class="btn primary"
      type="button"
      @click="emit('start')"
    >
      {{ startLabel }}
    </button>
  </div>
</template>

<style scoped>
.setup-grid { display: grid; gap: 1rem; }
.field { display: grid; gap: 0.4rem; }
.variant-grid { display: grid; gap: 0.5rem; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }

.variant-card {
  display: grid;
  gap: 0.2rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.6rem 0.7rem;
  cursor: pointer;
}

.variant-card.on { border-color: var(--gold); outline: 1px solid var(--gold); }
.variant-card input { accent-color: var(--gold); }
</style>
