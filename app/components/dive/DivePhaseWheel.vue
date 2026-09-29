<script setup lang="ts">
import { ceilingRangeForDifficulty } from '~~/shared/engine/selectors'
import type { DiverState, DiveState, MajorOrderSelection } from '~~/shared/engine/types'

const props = defineProps<{
  state: DiveState
  selfId: string | null
  self: DiverState | null
  canControl: boolean
}>()

const emit = defineEmits<{
  spin: []
  decide: [accepted: boolean]
  decideStrain: [accepted: boolean]
  deal: []
  setMajorOrder: [order: MajorOrderSelection | null]
  reroll: [wheel: 'misfortune' | 'front' | 'strain']
}>()

const wheelRange = computed(() => ceilingRangeForDifficulty(props.state.difficulty))
</script>

<template>
  <WheelPanel
    :state="state"
    :can-control="canControl"
    @spin="emit('spin')"
    @decide="emit('decide', $event)"
    @decide-strain="emit('decideStrain', $event)"
    @deal="emit('deal')"
    @reroll="emit('reroll', $event)"
  >
    <template #front-before-roll>
      <MajorOrderPicker
        :state="state"
        :can-control="canControl"
        @select="emit('setMajorOrder', $event)"
      />
    </template>
  </WheelPanel>

  <p
    v-if="wheelRange && !state.wheel"
    class="wheel-preview row"
  >
    <span class="cap">No directive ceiling</span>
    <TierBadge
      :tier="wheelRange.min"
      size="sm"
    />
    <span class="cap">strongest accepted</span>
    <TierBadge
      :tier="wheelRange.max"
      size="sm"
    />
    <span class="cap muted">~{{ Math.round(wheelRange.odds * 100) }}% at best</span>
  </p>
</template>

<style scoped>
.wheel-preview {
  gap: 0.5rem;
  margin: 0;
  align-items: center;
}
</style>
