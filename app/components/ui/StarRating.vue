<script setup lang="ts">
import { RadioGroupItem, RadioGroupRoot } from 'reka-ui'

const props = withDefaults(defineProps<{
  modelValue: number
  length?: number
  disabled?: boolean
}>(), { length: 5, disabled: false })

const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

const hovered = ref<number | null>(null)
const focused = ref<number | null>(null)

const preview = computed(() => hovered.value ?? focused.value ?? props.modelValue)

function select(value: unknown): void {
  if (!props.disabled) {
    emit('update:modelValue', Number(value))
  }
}
</script>

<template>
  <RadioGroupRoot
    :model-value="props.modelValue"
    :disabled="props.disabled"
    class="star-rating"
    :class="{ disabled: props.disabled }"
    :aria-label="`Mission stars, ${props.length} available`"
    @update:model-value="select"
    @mouseleave="hovered = null"
  >
    <RadioGroupItem
      v-for="value in props.length"
      :key="value"
      :value="value"
      class="star"
      :class="{ filled: value <= preview }"
      :aria-label="`${value} ${value === 1 ? 'star' : 'stars'}`"
      @mouseenter="hovered = value"
      @focus="focused = value"
      @blur="focused = null"
    >
      ★
    </RadioGroupItem>
  </RadioGroupRoot>
</template>

<style scoped>
.star-rating {
  display: inline-flex;
  gap: 0.15rem;
}

.star {
  appearance: none;
  border: 0;
  background: none;
  padding: 0 0.1rem;
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
  color: var(--muted);
  opacity: 0.45;
  transition: opacity var(--dur-fast) var(--ease-out);
}

.star.filled {
  color: var(--gold);
  opacity: 1;
}

.star:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 2px;
  border-radius: 2px;
}

.disabled .star {
  cursor: not-allowed;
}
</style>
