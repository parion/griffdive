<script setup lang="ts">
import { startingItemIds } from '~~/shared/engine/progression'
import type { DiveState } from '~~/shared/engine/types'
import { storedDiverName } from '~/composables/useGameSocket'
import type { BriefingStep } from './BriefingLayout.vue'

// The host's first-run page: a name, then the five beats of a mission with
// the host's own (the spin and the report) lit.
const props = withDefaults(defineProps<{
  state: DiveState
  roomCode: string
  // Replayed from the session menu rather than the first seating.
  review?: boolean
  selfName?: string
}>(), { review: false, selfName: '' })

const emit = defineEmits<{ close: [name: string] }>()

// A host seats under the placeholder name before they type their own.
const placeholder = (value: string): string => (value === 'Diver' ? '' : value)
const name = ref(placeholder(props.selfName) || placeholder(storedDiverName()))
const callsign = computed(() => name.value.trim())
// The host's own seat reads the name as it is typed, not the placeholder.
const divers = computed(() =>
  props.state.divers.map(diver => (diver.id === props.state.hostId && callsign.value ? { ...diver, name: callsign.value } : diver)))

const STEPS: readonly BriefingStep[] = [
  { id: 'spin', who: 'you', text: 'Spin for the squad’s directive. Take it for better loot, or skip it.' },
  { id: 'pacts', who: 'all', text: 'Everyone swears their own pacts. More risk, better loot, for them alone.' },
  { id: 'dive', who: 'all', text: 'Play the mission in Helldivers 2 and extract.' },
  { id: 'report', who: 'you', text: 'Copy the stars, time and samples off the end-of-mission screen.' },
  { id: 'loot', who: 'all', text: 'Everyone banks one reward. Clear the operation and the squad climbs.' },
]

function submit(): void {
  if (callsign.value) {
    emit('close', callsign.value)
  }
}
</script>

<template>
  <BriefingLayout
    v-model:name="name"
    :review="review"
    :room-code="roomCode"
    kicker="Host guide"
    :steps="STEPS"
    :divers="divers"
    :host-id="state.hostId"
    :difficulty="state.difficulty"
    :status="briefingStatus(state.phase)"
    :cta-label="review ? 'Back to the dive' : 'Start the dive'"
    :can-submit="callsign.length > 0"
    :kit-ids="startingItemIds(state.settings?.variant ?? 'medium')"
    :kit-note="startingGearNote(state.settings, 'you')"
    @submit="submit"
  >
    <template #title>
      <template v-if="review">
        Everything a host needs.
      </template>
      <template v-else>
        You hold the <span class="jb-drafted">wheel.</span>
      </template>
    </template>
    <template #lede>
      You run the table; Griffdive keeps the rules. Everyone else swears their pacts and plays.
    </template>
  </BriefingLayout>
</template>
