<script setup lang="ts">
// A click-to-set segmented bar (the report screen's time-remaining control).
// Presentational: the parent owns the value. Cells fill based on the ratio.
const props = withDefaults(defineProps<{
  modelValue: number
  max?: number
  cells?: number
  label: string
  ariaLabel?: string
  tone?: string
}>(), {
  max: 100,
  cells: 20,
  tone: 'var(--teal)',
})

const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

const ariaLabel = computed(() => props.ariaLabel ?? props.label)
const step = computed(() => props.max / props.cells)

function setFromCell(index: number): void {
  const value = Math.round((index + 1) * step.value)
  emit('update:modelValue', Math.min(props.max, value))
}

function nudge(delta: number): void {
  const value = Math.max(0, Math.min(props.max, props.modelValue + delta))
  if (value !== props.modelValue) {
    emit('update:modelValue', value)
  }
}
</script>

<template>
  <div
    class="seg-field"
    :style="{ '--tone': tone }"
  >
    <div class="seg-head">
      <span class="lbl">{{ label }}</span>
      <span class="disp seg-value">{{ modelValue }}<span class="seg-unit">%</span></span>
    </div>
    <div class="seg-row">
      <button
        class="ghost step"
        type="button"
        :aria-label="`Less ${ariaLabel.toLowerCase()}`"
        :disabled="modelValue <= 0"
        @click="nudge(-step)"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.4"
          aria-hidden="true"
        >
          <path d="M5 12h14" />
        </svg>
      </button>
      <div
        class="seg-bar"
        role="progressbar"
        :aria-label="ariaLabel"
        :aria-valuemin="0"
        :aria-valuemax="max"
        :aria-valuenow="modelValue"
        :aria-valuetext="`${modelValue} percent`"
      >
        <button
          v-for="i in cells"
          :key="i"
          class="seg-cell"
          :class="{ on: (i / cells) * max <= modelValue }"
          type="button"
          :aria-label="`Set ${ariaLabel.toLowerCase()} to ${Math.round((i / cells) * 100)} percent`"
          @click="setFromCell(i - 1)"
        />
      </div>
      <button
        class="ghost step"
        type="button"
        :aria-label="`More ${ariaLabel.toLowerCase()}`"
        :disabled="modelValue >= max"
        @click="nudge(step)"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.4"
          aria-hidden="true"
        >
          <path d="M5 12h14M12 5v14" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.seg-field { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.seg-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.seg-value { font-size: 1.6rem; color: var(--tone); }
.seg-unit { font-size: 0.85rem; color: var(--dim); margin-left: 2px; }
.seg-row { display: flex; align-items: center; gap: 10px; }
.seg-bar {
  flex-grow: 1;
  display: flex;
  gap: 3px;
  height: 44px;
  padding: 0;
}
.seg-cell {
  flex-grow: 1;
  flex-basis: 0;
  min-width: 0;
  border: 0;
  padding: 0;
  background: var(--raised);
  cursor: pointer;
  transition: background-color 0.15s var(--ease-out);
}
.seg-cell:hover { background: color-mix(in srgb, var(--tone) 35%, var(--raised)); }
.seg-cell.on { background: var(--tone); }
.step {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  color: var(--text);
}
.step svg { width: 16px; height: 16px; }
</style>
