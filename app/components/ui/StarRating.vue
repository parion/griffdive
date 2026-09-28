<script setup lang="ts">
import { RadioGroupItem, RadioGroupRoot } from 'reka-ui'

const props = withDefaults(defineProps<{
  modelValue: number
  length?: number
  disabled?: boolean
  size?: 'md' | 'lg'
}>(), { length: 5, disabled: false, size: 'md' })

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
    :class="[`size-${props.size}`, { disabled: props.disabled }]"
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
  gap: 0.25rem;
}

.star {
  appearance: none;
  display: grid;
  place-items: center;
  width: 2.1rem;
  height: 2.1rem;
  border: 1px solid var(--line-3);
  background: var(--panel);
  padding: 0;
  font-size: 1.15rem;
  line-height: 1;
  cursor: pointer;
  color: var(--ghost-ink);
  transition: color var(--dur-fast), border-color var(--dur-fast), background-color var(--dur-fast), transform var(--dur-fast);
}

.star.filled {
  color: var(--gold);
  border-color: var(--gold);
  background: rgba(255, 214, 66, 0.08);
  text-shadow: 0 0 8px rgba(255, 214, 66, 0.45);
}

.star:hover:not(:disabled) { border-color: var(--khaki); }

.size-lg { gap: 0.4rem; }
.size-lg .star {
  width: 3rem;
  height: 3rem;
  font-size: 1.9rem;
  text-shadow: 0 0 14px color-mix(in srgb, var(--gold) 55%, transparent);
}

.star:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 2px;
}

.disabled .star {
  cursor: not-allowed;
}
</style>
