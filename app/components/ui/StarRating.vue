<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: number
  length?: number
  disabled?: boolean
}>(), { length: 5, disabled: false })

const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

const hovered = ref<number | null>(null)
const focused = ref<number | null>(null)

const preview = computed(() => hovered.value ?? focused.value ?? props.modelValue)

function select(value: number): void {
  if (!props.disabled) {
    emit('update:modelValue', value)
  }
}
</script>

<template>
  <div
    class="star-rating"
    :class="{ disabled: props.disabled }"
    role="radiogroup"
    :aria-label="`Mission stars, ${props.length} available`"
    @mouseleave="hovered = null"
  >
    <button
      v-for="value in props.length"
      :key="value"
      type="button"
      class="star"
      :class="{ filled: value <= preview }"
      role="radio"
      :aria-checked="value === props.modelValue"
      :aria-label="`${value} ${value === 1 ? 'star' : 'stars'}`"
      :disabled="props.disabled"
      @click="select(value)"
      @mouseenter="hovered = value"
      @focus="focused = value"
      @blur="focused = null"
    >
      ★
    </button>
  </div>
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
