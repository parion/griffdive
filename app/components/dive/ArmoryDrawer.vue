<script setup lang="ts">
import type { DiveState } from '~~/shared/engine/types'

withDefaults(defineProps<{
  open: boolean
  state: DiveState
  selfId: string | null
  previewPactIds?: string[]
}>(), { previewPactIds: () => [] })
defineEmits<{ 'update:open': [value: boolean] }>()

const { isPhone } = usePhoneShell()
</script>

<template>
  <AppDrawer
    :open="open"
    title="Kit"
    :side="isPhone ? 'bottom' : 'right'"
    description="What each diver carries, with this mission's bans."
    @update:open="$emit('update:open', $event)"
  >
    <KitPanel
      style="--kit-surface: var(--bg-raised)"
      :state="state"
      :self-id="selfId"
      :preview-pact-ids="previewPactIds"
    />
  </AppDrawer>
</template>
