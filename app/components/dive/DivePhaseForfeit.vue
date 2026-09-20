<script setup lang="ts">
import type { DiveState, ItemRef } from '~~/shared/engine/types'

defineProps<{ state: DiveState, canControl: boolean }>()

const emit = defineEmits<{ forfeit: [itemRef: ItemRef] }>()
</script>

<template>
  <section class="panel forfeit">
    <h2>Operation failed</h2>
    <p class="muted">
      The operation restarts. Choose <strong>one</strong> item for the squad to lose —
      any item from any diver's personal inventory, stratagems included.
      The front carries over; the retry draws a fresh misfortune.
    </p>
  </section>
  <InventoryGrid
    :state="state"
    :select-mode="canControl"
    @forfeit="emit('forfeit', $event)"
  />
</template>

<style scoped>
.forfeit { border-color: var(--red); }
</style>
