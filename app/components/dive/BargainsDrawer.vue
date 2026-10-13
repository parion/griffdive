<script setup lang="ts">
import type { DiverState, DiveState } from '~~/shared/engine/types'

defineProps<{
  open: boolean
  state: DiveState
  self: DiverState | null
}>()
defineEmits<{
  'update:open': [value: boolean]
  'buy': [itemId: string]
}>()
</script>

<template>
  <AppDrawer
    :open="open"
    title="Brasch's Bargains"
    description="Earn credits by extracting samples from successful missions. Faster clears earn more."
    @update:open="$emit('update:open', $event)"
  >
    <BraschBargains
      :state="state"
      :self="self"
      @buy="$emit('buy', $event)"
    />
  </AppDrawer>
</template>
