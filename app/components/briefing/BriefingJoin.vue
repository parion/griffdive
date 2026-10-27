<script setup lang="ts">
import { MIN_DIFFICULTY } from '~~/shared/engine/config'
import { STARTING_KITS, startingItemIds } from '~~/shared/engine/progression'
import { seatingBlocked } from '~~/shared/engine/room'
import type { DiveState } from '~~/shared/engine/types'
import { storedDiverName } from '~/composables/useGameSocket'
import type { BriefingFact, BriefingStep } from './BriefingLayout.vue'

// The joiner's first-run page: a name, then the five beats of a mission with
// the squadmate's own (the pacts and the loot) lit.
const props = withDefaults(defineProps<{
  // The room as it stands before seating (a pre-join snapshot), or the live
  // dive when replayed from the session menu.
  state: DiveState | null
  roomCode: string
  // Replayed from inside the dive: the diver is already seated and named.
  review?: boolean
  selfName?: string
}>(), { review: false, selfName: '' })

const emit = defineEmits<{ confirm: [name: string], close: [] }>()

const saved = storedDiverName()
const name = ref(props.review ? props.selfName : saved === 'Diver' ? '' : saved)
const callsign = computed(() => name.value.trim())

const host = computed(() =>
  props.state?.divers.find(diver => diver.id === props.state?.hostId) ?? props.state?.divers[0] ?? null)
const difficulty = computed(() => props.state?.difficulty ?? MIN_DIFFICULTY)
const blocked = computed(() => (!props.review && props.state ? seatingBlocked(props.state) : null))
const canJoin = computed(() => props.review || (callsign.value.length > 0 && !blocked.value))

// A squad already above its starting rung means the joiner owes a catch-up.
const promotion = computed<BriefingFact | null>(() => {
  const settings = props.state?.settings
  return !props.review && settings && difficulty.value > STARTING_KITS[settings.variant].startDifficulty
    ? { title: 'Field Promotion waiting.', text: 'The squad has already climbed, so you’ll be offered catch-up gear the moment you land.' }
    : null
})

const STEPS: readonly BriefingStep[] = [
  { id: 'spin', who: 'host', text: 'The host spins for the squad’s directive. Have your say on voice.' },
  { id: 'pacts', who: 'you', text: 'Swear any of your pacts, or none. Each one raises your own loot odds.' },
  { id: 'dive', who: 'all', text: 'Play the mission in Helldivers 2 and extract.' },
  { id: 'report', who: 'host', text: 'The host files the stars, time and samples.' },
  { id: 'loot', who: 'you', text: 'Bank one reward, then spend credits at Brasch’s Bargains.' },
]

function submit(): void {
  if (props.review) {
    emit('close')
  }
  else if (canJoin.value) {
    emit('confirm', callsign.value)
  }
}
</script>

<template>
  <BriefingLayout
    v-model:name="name"
    :review="review"
    :room-code="roomCode"
    kicker="You’re invited"
    :steps="STEPS"
    :divers="state?.divers ?? []"
    :host-id="state?.hostId ?? null"
    :difficulty="difficulty"
    :status="state ? briefingStatus(state.phase) : 'Gathering the squad…'"
    :status-tone="blocked ? 'orange' : 'teal'"
    :own-seat="!review"
    :cta-label="review ? 'Back to the dive' : 'Join the dive'"
    :can-submit="canJoin"
    :kit-ids="startingItemIds(state?.settings?.variant ?? 'medium')"
    :kit-note="startingGearNote(state?.settings, 'the host')"
    :warning="blocked ? `${blocked}. Keep this page open and try again in a moment.` : null"
    :note="promotion"
    @submit="submit"
  >
    <template #title>
      <template v-if="review">
        Everything a squadmate needs.
      </template>
      <template v-else>
        You've been <span class="jb-drafted">drafted.</span>
      </template>
    </template>
    <template #lede>
      <template v-if="host">
        <b class="jb-callsign">{{ upperName(host.name) }}</b> is leading
      </template>
      <template v-else>
        A host is leading
      </template>
      a squad up the Helldivers 2 difficulty ladder. Your part is small.
    </template>
  </BriefingLayout>
</template>
