<script setup lang="ts">
import { ALL_WARBOND_CODES, ITEMS_BY_ID } from '~~/shared/data/catalog'
import { MAX_DIFFICULTY } from '~~/shared/engine/config'
import { performanceValor } from '~~/shared/engine/rewards'
import { allDiversPicked, canBanAnyReward, canBanReward, canRerollRewards, diverOptions, pactRiskOf, rewardPoolFor, teamRiskOf } from '~~/shared/engine/selectors'
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
  reroll: []
  ban: [optionIds: string[]]
  spinBonus: []
  awardBonus: [playerId: string]
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

// The rest of the squad's draft state for the icon-only indicators: what each
// other diver banked, or that they are still choosing.
const squadPicks = computed(() =>
  props.state.divers
    .filter(diver => diver.id !== props.selfId)
    .map(diver => ({
      id: diver.id,
      name: diver.name,
      item: diver.pickedOptionId ? ITEMS_BY_ID.get(diver.pickedOptionId) ?? null : null,
      skipped: diver.skipsCurrentDraft,
    })),
)

// Bonus-honors token spenders: the engine owns the rules (token cost, an open
// draft, non-choice targets) — this is the legible half. The allow-list drives
// the draft's ban affordances.
const rewardTokens = computed(() => props.self?.rewardTokens ?? 0)
const canReroll = computed(() =>
  props.self ? canRerollRewards(props.state, props.self).allowed : false)
const canBan = computed(() =>
  props.self ? canBanAnyReward(props.state, props.self) : false)
const bannableIds = computed(() => {
  const self = props.self
  if (!self) {
    return []
  }
  return diverOptions(props.state, self)
    .filter(option => canBanReward(props.state, self, option.optionId).allowed)
    .map(option => option.optionId)
})

const ready = computed(() => allDiversPicked(props.state))
const draftResolved = computed(() =>
  props.self !== null && (props.self.pickedOptionId !== null || props.self.rewardBanned))
const draftBanned = computed(() => props.self?.rewardBanned ?? false)
</script>

<template>
  <ValorMeter
    v-if="!ready"
    :difficulty="state.difficulty"
    :team-risk="teamRisk"
    :pact-risk="selfPactRisk"
    :performance="selfPerformance"
    locked
  />
  <BonusCeremony
    v-else
    :state="state"
    :self-id="selfId"
    :self="self"
    :can-control="canControl"
    @spin="emit('spinBonus')"
    @award="playerId => emit('awardBonus', playerId)"
  />
  <RewardDraft
    :options="options"
    :picked-id="self?.pickedOptionId ?? null"
    :pool="rewardPool"
    :owned-ids="ownedIds"
    :options-lost="self?.failedPactIds.length ?? 0"
    :squad-picks="squadPicks"
    :token-count="rewardTokens"
    :can-reroll="canReroll"
    :can-ban="canBan"
    :bannable-ids="bannableIds"
    :resolved="draftResolved"
    :banned="draftBanned"
    @pick="(optionId, choiceItemId) => emit('pick', optionId, choiceItemId)"
    @reroll="emit('reroll')"
    @ban="optionIds => emit('ban', optionIds)"
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
