<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: number
  max: number
  min?: number
  step?: number
  label?: string
  icon?: string
  ariaLabel?: string
}>(), { min: 0, step: 1, label: '', icon: '', ariaLabel: '' })

const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

function clamp(value: number): number {
  const stepped = Math.round(value / props.step) * props.step
  return Math.min(props.max, Math.max(props.min, stepped))
}

function onNumber(event: Event): void {
  const raw = Number((event.target as HTMLInputElement).value)
  emit('update:modelValue', clamp(Number.isFinite(raw) ? raw : props.min))
}

function onSlider(event: Event): void {
  emit('update:modelValue', clamp(Number((event.target as HTMLInputElement).value)))
}
</script>

<template>
  <div class="range-field">
    <div class="range-head">
      <slot name="icon">
        <img
          v-if="icon"
          class="range-icon"
          :src="icon"
          alt=""
          draggable="false"
        >
      </slot>
      <span
        v-if="label"
        class="range-label"
      >{{ label }}</span>
      <input
        class="range-value"
        type="number"
        :min="min"
        :max="max"
        :step="step"
        :value="modelValue"
        :aria-label="ariaLabel || label"
        @input="onNumber"
      >
    </div>
    <input
      class="range-slider"
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :value="modelValue"
      :aria-label="ariaLabel || label"
      @input="onSlider"
    >
  </div>
</template>

<style scoped>
.range-field {
  display: grid;
  gap: 0.3rem;
  width: 100%;
  max-width: 11rem;
  margin-inline: auto;
}

.range-head {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
}

.range-icon {
  width: 1.35rem;
  height: 1.35rem;
  flex-shrink: 0;
}

.range-label {
  font-size: 0.78rem;
  color: var(--muted);
}

.range-value {
  width: 3.75rem;
  padding: 0.25rem 0.4rem;
  font: inherit;
  font-size: 1.15rem;
  font-weight: 700;
  text-align: center;
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 6px;
  appearance: textfield;
}

.range-value:focus {
  outline: none;
  border-color: var(--gold);
}

/* Drop the browser's number spinners — the slider is the coarse control. */
.range-value::-webkit-outer-spin-button,
.range-value::-webkit-inner-spin-button {
  appearance: none;
  margin: 0;
}

.range-slider {
  width: 100%;
  margin: 0;
  accent-color: var(--gold);
  cursor: pointer;
}
</style>
