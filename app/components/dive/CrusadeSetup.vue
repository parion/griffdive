<script setup lang="ts">
import { WARBONDS } from '~~/shared/data/catalog'
import { STARTING_KITS, VARIANTS, difficultyName } from '~~/shared/engine/progression'
import type { CrusadeVariant } from '~~/shared/engine/types'

const props = withDefaults(defineProps<{
  variant: CrusadeVariant
  ownedWarbondCodes: string[]
  startLabel?: string
  showStart?: boolean
}>(), { startLabel: 'Start crusade', showStart: true })

const emit = defineEmits<{
  'update:variant': [variant: CrusadeVariant]
  'update:ownedWarbondCodes': [codes: string[]]
  'start': []
}>()

const allSelected = computed(() => props.ownedWarbondCodes.length === WARBONDS.length)

function toggleAllWarbonds(event: Event): void {
  emit('update:ownedWarbondCodes', (event.target as HTMLInputElement).checked
    ? WARBONDS.map(warbond => warbond.code)
    : [])
}

function toggleWarbond(code: string, checked: boolean): void {
  const set = new Set(props.ownedWarbondCodes)
  if (checked) {
    set.add(code)
  }
  else {
    set.delete(code)
  }
  emit('update:ownedWarbondCodes', [...set])
}
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
    <div class="field">
      <span class="row spread">
        <span class="muted small">Owned warbonds</span>
        <label class="small row"><input
          type="checkbox"
          :checked="allSelected"
          @change="toggleAllWarbonds"
        > all</label>
      </span>
      <div class="warbond-grid">
        <label
          v-for="warbond in WARBONDS"
          :key="warbond.code"
          class="warbond"
        >
          <input
            type="checkbox"
            :checked="ownedWarbondCodes.includes(warbond.code)"
            @change="toggleWarbond(warbond.code, ($event.target as HTMLInputElement).checked)"
          >
          {{ warbond.displayName }}
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

.warbond-grid {
  display: grid;
  gap: 0.25rem 0.9rem;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
}

.warbond { display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; cursor: pointer; }
</style>
