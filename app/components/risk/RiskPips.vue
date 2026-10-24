<script setup lang="ts">
withDefaults(defineProps<{
  value: number
  max?: number
  rolling?: boolean
  tone?: 'red' | 'gold' | 'orange'
}>(), {
  max: 5,
  rolling: false,
  tone: 'red',
})
</script>

<template>
  <span
    class="pips"
    :class="[tone, { rolling }]"
    role="img"
    :aria-label="rolling ? 'risk rolling' : `risk ${value} of ${max}`"
  >
    <i
      v-for="i in max"
      :key="i"
      :class="{ on: !rolling && i <= value }"
      :style="{ '--i': i - 1, '--d': Math.min(i - 1, max - i) }"
    >
      <svg
        viewBox="0 0 16 16"
        aria-hidden="true"
      >
        <path d="M8 1C4.4 1 2 3.5 2 6.8c0 1.9.9 3.3 2.2 4.1V14h1.9v-1.6h1V14h1.8v-1.6h1V14h1.9v-3.1C13.1 10.1 14 8.7 14 6.8 14 3.5 11.6 1 8 1Z" />
        <circle
          class="eye"
          cx="5.6"
          cy="7.2"
          r="1.5"
        />
        <circle
          class="eye"
          cx="10.4"
          cy="7.2"
          r="1.5"
        />
      </svg>
    </i>
  </span>
</template>

<style scoped>
.pips.gold { --pip: var(--gold); }
.pips.orange { --pip: var(--orange); }

/* While a draw is reeling, the pips chase back and forth instead of revealing
   the result early. Mirrored delays light 1-2-3-2-1, then the cycle repeats. */
.pips.rolling i {
  color: var(--pip);
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
