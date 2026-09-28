<script setup lang="ts">
import { pactName } from '~~/shared/data/pacts'
import { applyPactToggle, hasLegalLoadout, pactConflictsWith, pactRiskTotal, pactSubsumedBy } from '~~/shared/engine/pacts'
import { activeMisfortune, ceilingRangeForDifficulty, pactOfferFor } from '~~/shared/engine/selectors'
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
  setMajorOrder: [order: MajorOrderSelection | null]
  reroll: [wheel: 'misfortune' | 'front' | 'strain']
  lock: [pactIds: string[]]
  pactRisk: [value: number]
}>()

const selection = ref<string[]>([])

// The Valor rail lives in the shell, so the phase reports its live selection
// risk upward. Presentation only — `pactRiskTotal` is the engine's own sum.
watch(
  selection,
  ids => emit('pactRisk', pactRiskTotal(ids)),
  { immediate: true },
)

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
    <span class="cap">No misfortune ceiling</span>
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

  <template v-if="state.phase === 'pacts'">
    <Transition
      name="phase"
      mode="out-in"
    >
      <div
        :key="self?.pactsLocked ? 'locked' : 'picking'"
        class="stack"
      >
        <section
          v-if="self?.pactsLocked"
          class="sec cut-sm pact-locked"
        >
          <header class="sh">
            <span
              class="disp stp sworn"
              role="img"
              aria-label="Pacts sworn"
            >Sworn</span>
            <h2 class="disp pact-locked-title">
              Pacts locked
            </h2>
            <span
              class="dash"
              aria-hidden="true"
            />
            <span class="cap">Awaiting squad</span>
          </header>
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
            <span
              v-if="self.pactIds.length === 0"
              class="muted small"
            >None — a safe dive.</span>
          </p>
        </section>
        <template v-else>
          <PactPicker
            :offer="offer"
            :selected="selection"
            :blocked="coverage"
            @toggle="toggle"
            @lock="emit('lock', selection)"
          />
        </template>
      </div>
    </Transition>
  </template>
</template>

<style scoped>
.stack { display: grid; gap: 0.6rem; }

.wheel-preview {
  gap: 0.5rem;
  margin: 0;
  align-items: center;
}

.pact-locked { gap: 0.7rem; }
.pact-locked-title { margin: 0; flex: 1; color: var(--text); }
.sworn {
  color: var(--teal);
  border-color: var(--teal);
  padding: 2px 8px;
  font-size: 0.7rem;
}
</style>
