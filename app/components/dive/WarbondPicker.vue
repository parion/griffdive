<script setup lang="ts">
import { WARBONDS } from '~~/shared/data/catalog'

const props = defineProps<{ warbondCodes: string[] }>()

const emit = defineEmits<{
  'update:warbondCodes': [codes: string[]]
}>()

const allSelected = computed(() => props.warbondCodes.length === WARBONDS.length)

function toggleAll(event: Event): void {
  emit('update:warbondCodes', (event.target as HTMLInputElement).checked
    ? WARBONDS.map(warbond => warbond.code)
    : [])
}

function toggle(code: string, checked: boolean): void {
  const set = new Set(props.warbondCodes)
  if (checked) {
    set.add(code)
  }
  else {
    set.delete(code)
  }
  emit('update:warbondCodes', [...set])
}
</script>

<template>
  <div class="field">
    <span class="row spread">
      <span class="muted small">Your warbonds</span>
      <label class="small row"><input
        type="checkbox"
        :checked="allSelected"
        @change="toggleAll"
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
          :checked="warbondCodes.includes(warbond.code)"
          @change="toggle(warbond.code, ($event.target as HTMLInputElement).checked)"
        >
        {{ warbond.displayName }}
      </label>
    </div>
  </div>
</template>

<style scoped>
.field { display: grid; gap: 0.4rem; }

.warbond-grid {
  display: grid;
  gap: 0.25rem 0.9rem;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
}

.warbond { display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; cursor: pointer; }
.warbond input { accent-color: var(--gold); }
</style>
