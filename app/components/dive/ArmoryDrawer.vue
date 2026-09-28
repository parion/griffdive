<script setup lang="ts">
import type { DiveState } from '~~/shared/engine/types'

defineProps<{ open: boolean, state: DiveState, selfId: string | null }>()
defineEmits<{ 'update:open': [value: boolean] }>()
</script>

<template>
  <AppDrawer
    :open="open"
    title="Armory"
    description="Every diver's kit — yours and the squad's."
    @update:open="$emit('update:open', $event)"
  >
    <InventoryGrid
      :state="state"
      :self-id="selfId"
    />
  </AppDrawer>
</template>
