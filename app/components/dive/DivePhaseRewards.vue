<script setup lang="ts">
import { ALL_WARBOND_CODES } from '~~/shared/data/catalog'
import { MAX_DIFFICULTY } from '~~/shared/engine/config'
import { performanceValor } from '~~/shared/engine/rewards'
import { allDiversPicked, diverOptions, pactRiskOf, rewardPoolFor, teamRiskOf } from '~~/shared/engine/selectors'
import type { DiverState, DiveState } from '~~/shared/engine/types'

const props = defineProps<{
  state: DiveState
  selfId: string | null
  self: DiverState | null
  canControl: boolean
  opLength: number
}>()

const emit = defineEmits<{
  pick: [optionId: string, choiceItemId?: string]
  advance: []
}>()

const teamRisk = computed(() => teamRiskOf(props.state))
const selfPactRisk = computed(() => (props.self ? pactRiskOf(props.self) : 0))
const selfPerformance = computed(() => performanceValor(props.state.lastReport))
const options = computed(() => (props.self ? diverOptions(props.state, props.self) : []))

// Liberty's Cross picks from the diver's own catalog: their declared warbonds
// minus anything already owned. Same personal-pool rule as the rolled offers.
const rewardPool = computed(() =>
  props.self ? rewardPoolFor(props.self.warbondCodes ?? ALL_WARBOND_CODES) : [])
const ownedIds = computed(() => props.state.personalInventories[props.selfId ?? ''] ?? [])

const ready = computed(() => allDiversPicked(props.state))
</script>

<template>
  <ValorMeter
    :difficulty="state.difficulty"
    :team-risk="teamRisk"
    :pact-risk="selfPactRisk"
    :performance="selfPerformance"
    locked
  />
  <RewardDraft
    :options="options"
    :picked-id="self?.pickedOptionId ?? null"
    :pool="rewardPool"
    :owned-ids="ownedIds"
    :options-lost="self?.failedPactIds.length ?? 0"
    @pick="(optionId, choiceItemId) => emit('pick', optionId, choiceItemId)"
  />
  <Transition name="phase">
    <div
      v-if="ready"
      class="row"
    >
      <button
        class="btn primary"
        type="button"
        :disabled="!canControl"
        @click="emit('advance')"
      >
        {{ state.missionInOperation >= opLength
          ? `Complete operation → difficulty ${Math.min(state.difficulty + 1, MAX_DIFFICULTY)}`
          : 'Next mission' }}
      </button>
      <span
        v-if="!canControl"
        class="muted small"
      >Waiting for the host…</span>
    </div>
  </Transition>
</template>
