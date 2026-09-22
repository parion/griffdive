<script setup lang="ts">
import { pactName } from '~~/shared/data/pacts'
import { applyPactToggle, hasLegalLoadout, pactConflictsWith, pactRiskTotal, pactSubsumedBy } from '~~/shared/engine/pacts'
import { activeMisfortune, ceilingRangeForDifficulty, pactOfferFor, pactRiskOf, teamRiskOf } from '~~/shared/engine/selectors'
import type { DiverState, DiveState } from '~~/shared/engine/types'

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
  reroll: [wheel: 'misfortune' | 'front' | 'strain']
  lock: [pactIds: string[]]
}>()

const selection = ref<string[]>([])

// A new draw or a flipped decision rolls a fresh offer — start the pick clean.
// Primitive getters compare by value; a getter returning a fresh array would
// re-fire on every snapshot (e.g. another diver locking pacts) and wipe picks
// that are still in progress.
watch(
  () => props.state.wheel?.seed,
  () => {
    selection.value = []
  },
)
watch(
  () => props.state.misfortuneAccepted,
  () => {
    selection.value = []
  },
)

// The offer exists only once the wheel decision is in; it is derived from the
// seed, so every client shows this diver the same 2–3 pacts.
const offer = computed(() =>
  props.selfId ? pactOfferFor(props.state, props.selfId) : [])

const wheelRange = computed(() => ceilingRangeForDifficulty(props.state.difficulty))
const teamRisk = computed(() => teamRiskOf(props.state))
const selfPactRisk = computed(() => (props.self ? pactRiskOf(props.self) : 0))

function toggle(pactId: string): void {
  selection.value = applyPactToggle(
    offer.value.map(pact => pact.id),
    selection.value,
    pactId,
  )
}

// Offered pacts the current selection rules out — greyed with the reason:
// covered by a stronger pick, a same-axis conflict, or a loadout that can no
// longer field HD2's four required stratagems.
const coverage = computed<Record<string, string>>(() => {
  const blocked: Record<string, string> = {}
  const misfortuneId = activeMisfortune(props.state)?.id ?? null
  const owned = props.state.personalInventories[props.selfId ?? ''] ?? []
  const baseLegal = hasLegalLoadout(misfortuneId, [], owned)
  for (const pact of offer.value) {
    if (selection.value.includes(pact.id)) {
      continue
    }
    const subsumer = pactSubsumedBy(pact.id, selection.value)
    if (subsumer) {
      blocked[pact.id] = `Covered by ${pactName(subsumer)}`
      continue
    }
    const conflict = pactConflictsWith(pact.id, selection.value)
    if (conflict) {
      blocked[pact.id] = `Conflicts with ${pactName(conflict)}`
      continue
    }
    if (baseLegal && !hasLegalLoadout(misfortuneId, [...selection.value, pact.id], owned)) {
      blocked[pact.id] = 'Leaves too few stratagems to ready up'
    }
  }
  return blocked
})
</script>

<template>
  <WheelPanel
    :state="state"
    :can-control="canControl"
    @spin="emit('spin')"
    @decide="emit('decide', $event)"
    @decide-strain="emit('decideStrain', $event)"
    @reroll="emit('reroll', $event)"
  />
  <p
    v-if="wheelRange && !state.wheel"
    class="row small muted"
  >
    No misfortune: <TierBadge
      :tier="wheelRange.min"
      size="sm"
    /> · strongest accepted: <TierBadge
      :tier="wheelRange.max"
      size="sm"
    /> (~{{ Math.round(wheelRange.odds * 100) }}%)
  </p>
  <template v-if="state.phase === 'pacts'">
    <Transition
      name="phase"
      mode="out-in"
    >
      <div
        :key="self?.pactsLocked ? 'locked' : 'picking'"
        class="stack"
      >
        <div
          v-if="self?.pactsLocked"
          class="panel"
        >
          <h2>Pacts locked</h2>
          <p class="muted small">
            Waiting for the rest of the squad to lock in…
          </p>
          <p class="row small">
            <span class="muted">Yours:</span>
            <span
              v-for="pactId in self.pactIds"
              :key="pactId"
              class="chip"
            >{{ pactName(pactId) }}</span>
          </p>
          <ValorMeter
            :difficulty="state.difficulty"
            :team-risk="teamRisk"
            :pact-risk="selfPactRisk"
            locked
          />
        </div>
        <template v-else>
          <PactPicker
            :offer="offer"
            :selected="selection"
            :blocked="coverage"
            @toggle="toggle"
            @lock="emit('lock', selection)"
          />
          <ValorMeter
            :difficulty="state.difficulty"
            :team-risk="teamRisk"
            :pact-risk="pactRiskTotal(selection)"
          />
        </template>
      </div>
    </Transition>
  </template>
</template>

<style scoped>
.stack { display: grid; gap: 0.6rem; }
</style>
