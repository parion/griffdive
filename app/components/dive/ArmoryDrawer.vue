<script setup lang="ts">
import type { DiveState } from '~~/shared/engine/types'

withDefaults(defineProps<{
  open: boolean
  state: DiveState
  selfId: string | null
  previewPactIds?: string[]
}>(), { previewPactIds: () => [] })
defineEmits<{ 'update:open': [value: boolean] }>()
</script>

<template>
  <AppDrawer
    :open="open"
    title="Kit"
    description="What each diver carries, with this mission's bans."
    @update:open="$emit('update:open', $event)"
  >
    <KitPanel
      :state="state"
      :self-id="selfId"
      :preview-pact-ids="previewPactIds"
    />
  </AppDrawer>
</template>
