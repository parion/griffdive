<script setup lang="ts">
import { startingItemIds } from '~~/shared/engine/progression'
import type { DiveState } from '~~/shared/engine/types'
import { storedDiverName } from '~/composables/useGameSocket'
import type { BriefingFact, BriefingStep } from './BriefingLayout.vue'

// The host's first-run page: a name, then the job only the host does —
// spinning the wheel and filing each result — in five beats.
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
  { who: 'you', beat: 'Spin', text: 'Spin the Wheel of Adversity for the mission’s directive, then take it for better loot or skip it.' },
  { who: 'all', beat: 'Swear pacts', text: 'Everyone swears their own pacts: personal rules that raise only their own loot odds.' },
  { who: 'all', beat: 'Dive', text: 'Play the mission in Helldivers 2 and extract.' },
  { who: 'you', beat: 'Report', text: 'Enter the stars, time left and samples from the end-of-mission screen.' },
  { who: 'all', beat: 'Loot', text: 'Everyone banks one reward. Clear an operation and the squad climbs a difficulty.' },
]

const FACTS: readonly BriefingFact[] = [
  { title: 'Manage the squad', text: 'Kick an idle player, or make someone else host, from the squad list.' },
  { title: 'If a mission fails', text: 'Report it as failed. The squad replays the operation and each player gives up one earned item.' },
  { title: 'Continue later', text: 'Start a new session from the ⋯ menu to pick the run back up. Gear from players who don’t return can be claimed by new ones.' },
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
    guide-name="Host tutorial"
    :facts="FACTS"
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
      You set up the run and drive each mission; Griffdive tracks the rules. Everyone else just
      swears their pacts and plays.
    </template>
  </BriefingLayout>
</template>
