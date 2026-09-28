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
      :style="{ animationDelay: `${0.06 + value * 0.07}s` }"
      :aria-label="`${value} ${value === 1 ? 'star' : 'stars'}`"
      @mouseenter="hovered = value"
      @focus="focused = value"
      @blur="focused = null"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        class="star-glyph"
      >
        <path
          d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"
          fill="currentColor"
          stroke="currentColor"
          stroke-width="1.4"
          stroke-linejoin="round"
        />
      </svg>
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
  width: 2.6rem;
  height: 2.6rem;
  border: 1px solid var(--line-3);
  background: var(--panel);
  padding: 0;
  cursor: pointer;
  color: var(--ghost-ink);
  animation: starIn 0.5s var(--ease-out) both;
  transition: color var(--dur-fast), border-color var(--dur-fast), background-color var(--dur-fast), transform var(--dur-fast);
}

.star-glyph {
  width: 1.3rem;
  height: 1.3rem;
  display: block;
}

.star.filled {
  color: var(--gold);
  border-color: var(--gold);
  background: rgba(255, 214, 66, 0.08);
  filter: drop-shadow(0 0 6px rgba(255, 214, 66, 0.5));
}

.star:hover:not(:disabled) { border-color: var(--khaki); }

.size-lg { gap: 0.5rem; }
.size-lg .star {
  width: 4.1rem;
  height: 4.1rem;
}
.size-lg .star-glyph {
  width: 2.75rem;
  height: 2.75rem;
}

@media (prefers-reduced-motion: reduce) {
  .star { animation: none; }
}

.star:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 2px;
}

.disabled .star {
  cursor: not-allowed;
}
</style>
