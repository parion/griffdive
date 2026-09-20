<script setup lang="ts">
withDefaults(defineProps<{ value: number, max?: number, rolling?: boolean }>(), {
  max: 5,
  rolling: false,
})
</script>

<template>
  <span
    class="pips"
    :class="{ rolling }"
    role="img"
    :aria-label="rolling ? 'risk rolling' : `risk ${value} of ${max}`"
  >
    <i
      v-for="i in max"
      :key="i"
      :class="{ on: !rolling && i <= value }"
      :style="{ '--i': i - 1, '--d': Math.min(i - 1, max - i) }"
    />
  </span>
</template>

<style scoped>
/* While a draw is reeling, the pips chase back and forth instead of revealing
   the result early. Mirrored delays light 1-2-3-2-1, then the cycle repeats. */
.pips.rolling i {
  background: var(--gold);
  border-color: var(--gold);
  opacity: 0.35;
  animation: pip-roll 300ms ease-in-out infinite alternate;
  animation-delay: calc(var(--d, 0) * 130ms);
}

@keyframes pip-roll {
  from { opacity: 0.25; transform: scale(0.85); }
  to { opacity: 1; transform: scale(1.15); }
}

@media (prefers-reduced-motion: reduce) {
  .pips.rolling i {
    animation: none;
    opacity: 0.6;
  }
}
</style>
