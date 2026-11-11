<script setup lang="ts">
import { specialistById } from '~~/shared/data/specialists'
import { canEnlist } from '~~/shared/engine/specialists'
import type { DiveState, DiverState } from '~~/shared/engine/types'

// A diver seated mid-crusade may still take a commission before their first
// mission ends. Enlisting is final, so the choice is confirmed, not instant.
const props = defineProps<{
  state: DiveState
  self: DiverState | null
}>()

const emit = defineEmits<{ enlist: [specialistId: string] }>()

const open = ref(false)
const pending = ref<string | null>(null)

const available = computed(() =>
  props.self !== null && props.state.phase !== 'lobby' && canEnlist(props.state, props.self))
const pendingName = computed(() => specialistById(pending.value)?.name ?? null)

function confirm(): void {
  if (pending.value) {
    emit('enlist', pending.value)
  }
  open.value = false
}
</script>

<template>
  <template v-if="available && self">
    <AppBanner tone="info">
      You joined mid-crusade. You can still take a specialist before this mission ends.
      <template #actions>
        <button
          class="btn tiny ghost"
          type="button"
          @click="open = true"
        >
          Choose specialist
        </button>
      </template>
    </AppBanner>
    <AppDialog
      v-model:open="open"
      title="Choose a specialist"
      description="The issued kit replaces the SEAF pack you were seated with. This choice is final."
      size="xl"
    >
      <SpecialistPicker
        :selected="pending"
        :warbond-codes="self.warbondCodes"
        :state="state"
        :self="self"
        @update:selected="pending = $event"
      />
      <template #footer>
        <button
          class="btn primary cut-sm"
          type="button"
          :disabled="!pending"
          @click="confirm"
        >
          {{ pendingName ? `Enlist as ${pendingName}` : 'Pick a specialist' }}
        </button>
      </template>
    </AppDialog>
  </template>
</template>
