<script setup lang="ts">
import type { RewardOption } from '~~/shared/engine/rewards'

defineProps<{ options: RewardOption[], pickedId: string | null }>()
const emit = defineEmits<{ pick: [optionId: string] }>()
</script>

<template>
  <section class="panel">
    <h2>Rewards — choose one</h2>
    <p class="muted small">
      Stratagems join the shared squad pool; everything else is yours.
    </p>
    <div class="grid">
      <Motion
        v-for="(option, index) in options"
        :key="option.optionId"
        as="div"
        class="draft-slot"
        :initial="{ opacity: 0, y: 18, scale: 0.9 }"
        :animate="{ opacity: 1, y: 0, scale: 1 }"
        :transition="{ ...SPRING_SNAP, delay: index * 0.07 }"
      >
        <div
          class="slot-body"
          :class="{
            picked: option.optionId === pickedId,
            dimmed: pickedId !== null && option.optionId !== pickedId,
          }"
        >
          <ItemCard
            :item="option.item"
            :selected="option.optionId === pickedId"
            :disabled="pickedId !== null"
            @select="emit('pick', option.optionId)"
          />
        </div>
      </Motion>
    </div>
  </section>
</template>

<style scoped>
.draft-slot { display: grid; border-radius: 10px; }
/* Pick/dim live in CSS: motion-v re-runs a spring whenever the animate prop
   gets a new object identity, so re-renders (persistence, host echo, the
   advance button entering) would restart the pop mid-flight. A class flip
   transitions exactly once. */
.slot-body {
  display: grid;
  transition:
    transform var(--dur-med) var(--ease-snap),
    opacity var(--dur-med) var(--ease-out);
}
.slot-body.dimmed {
  opacity: 0.3;
  transform: scale(0.96);
}
.slot-body.picked {
  transform: scale(1.05) translateY(-3px);
  animation: draft-glow 1.1s var(--ease-out) 1;
}
@keyframes draft-glow {
  0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--gold) 55%, transparent); }
  100% { box-shadow: 0 0 0 14px transparent; }
}
</style>
