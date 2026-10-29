<script setup lang="ts">
import { ALL_WARBOND_CODES } from '~~/shared/data/catalog'
import { MAX_DIFFICULTY } from '~~/shared/engine/config'
import {
  allDiversPicked,
  canRerollRewards,
  diverOptions,
  draftSummaryFor,
  honorsPending,
  pactRiskOf,
  rewardPoolFor,
  teamRiskOf,
} from '~~/shared/engine/selectors'
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
  advance: []
}>()

const options = computed(() => (props.self ? diverOptions(props.state, props.self) : []))

const rewardPool = computed(() => {
  if (!props.self) {
    return []
  }
  const banned = new Set(props.self.bannedItemIds)
  return rewardPoolFor(props.self.warbondCodes ?? ALL_WARBOND_CODES, props.state.tierList)
    .filter(item => !banned.has(item.id))
})
const ownedIds = computed(() => props.state.personalInventories[props.selfId ?? ''] ?? [])

const squadDrafts = computed(() =>
  props.state.divers
    .filter(diver => diver.id !== props.selfId)
    .map(diver => ({ id: diver.id, name: upperName(diver.name), summary: draftSummaryFor(props.state, diver) })),
)

const rewardTokens = computed(() => props.self?.rewardTokens ?? 0)
const canReroll = computed(() =>
  props.self ? canRerollRewards(props.state, props.self).allowed : false)
const ready = computed(() => allDiversPicked(props.state))
const draftResolved = computed(() =>
  props.self !== null && (props.self.pickedOptionId !== null || props.self.rewardBanned))

const advanceLabel = computed(() =>
  props.state.missionInOperation >= props.opLength
    ? `Complete operation → difficulty ${Math.min(props.state.difficulty + 1, MAX_DIFFICULTY)}`
    : 'Next mission')

const teamRisk = computed(() => teamRiskOf(props.state))
const pactRisk = computed(() => (props.self ? pactRiskOf(props.self, props.state.difficulty) : 0))
</script>

<template>
  <RewardDraft
    :options="options"
    :picked-id="self?.pickedOptionId ?? null"
    :pool="rewardPool"
    :owned-ids="ownedIds"
    :options-lost="self?.failedPactIds.length ?? 0"
    :squad-drafts="squadDrafts"
    :token-count="rewardTokens"
    :can-reroll="canReroll"
    :resolved="draftResolved"
    :stars="state.lastReport?.stars ?? 0"
    :difficulty="state.difficulty"
    :team-risk="teamRisk"
    :pact-risk="pactRisk"
    :ready="ready"
    :can-control="canControl"
    :advance-label="advanceLabel"
    :advance-locked="honorsPending(state)"
    @pick="(optionId, choiceItemId) => emit('pick', optionId, choiceItemId)"
    @reroll="emit('reroll')"
    @advance="emit('advance')"
  />
</template>
