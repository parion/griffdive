<script setup lang="ts">
import type { Arrow } from '~~/shared/engine/hero'

const props = defineProps<{
  arrow: Arrow
  state?: 'pending' | 'done'
}>()

const ROTATION: Readonly<Record<Arrow, number>> = { U: 0, R: 90, D: 180, L: 270 }
const rotation = computed(() => `rotate(${ROTATION[props.arrow]}deg)`)
</script>

<template>
  <svg
    class="arrow"
    :class="state ?? 'pending'"
    viewBox="0 0 24 24"
    aria-hidden="true"
    :style="{ transform: rotation }"
  >
    <path d="M12 3 21 13h-5.5v8h-7v-8H3z" />
  </svg>
</template>

<style scoped>
.arrow {
  width: 1em;
  height: 1em;
  fill: var(--line-5);
  transition: fill var(--dur-fast) var(--ease-out);
}

.arrow.done { fill: var(--gold); }
</style>
