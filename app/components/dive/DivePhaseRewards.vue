<script setup lang="ts">
import { ALL_WARBOND_CODES, ITEMS_BY_ID } from '~~/shared/data/catalog'
import { MAX_DIFFICULTY } from '~~/shared/engine/config'
import { performanceValor } from '~~/shared/engine/rewards'
import { allDiversPicked, bonusEligible, canBanAnyReward, canBanReward, canRerollRewards, diverOptions, pactRiskOf, rewardPoolFor, teamRiskOf } from '~~/shared/engine/selectors'
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

// The draft and the honors ceremony are distinct screens, not stacked cards:
// the reward draft links out to honors, honors runs the ceremony and advances.
const view = defineModel<'draft' | 'honors'>('view', { default: 'draft' })

// A new mission's draft always opens on the draft, never stuck on honors.
watch(() => props.state.missionIndex, () => {
  view.value = 'draft'
})

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
// Honors are a limited prize: the ceremony only runs on a full-star clear that
// lands on the squad-size cadence. Otherwise the draft advances directly.
const bonusUp = computed(() => ready.value && bonusEligible(props.state))

const draftResolved = computed(() =>
  props.self !== null && (props.self.pickedOptionId !== null || props.self.rewardBanned))
const draftBanned = computed(() => props.self?.rewardBanned ?? false)

const advanceLabel = computed(() =>
  props.state.missionInOperation >= props.opLength
    ? `Complete operation → difficulty ${Math.min(props.state.difficulty + 1, MAX_DIFFICULTY)}`
    : 'Next mission')

// Ceiling preview inputs: the same figures the shell's Valor meter is built
// from, so the track and the rail can never disagree.
const teamRisk = computed(() => teamRiskOf(props.state))
const pactRisk = computed(() => (props.self ? pactRiskOf(props.self) : 0))
const performance = computed(() => performanceValor(props.state.lastReport))

const kicker = computed(() =>
  `Mission ${props.state.missionInOperation} of ${props.opLength} · extracted`)
</script>

<template>
  <BonusCeremony
    v-if="view === 'honors' && bonusUp"
    :state="state"
    :self-id="selfId"
    :self="self"
    :can-control="canControl"
    @spin="emit('spinBonus')"
    @award="playerId => emit('awardBonus', playerId)"
    @advance="emit('advance')"
  />

  <RewardDraft
    v-else
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
    :banned-ids="self?.bannedItemIds ?? []"
    :stars="state.lastReport?.stars ?? 0"
    :difficulty="state.difficulty"
    :team-risk="teamRisk"
    :pact-risk="pactRisk"
    :performance="performance"
    :rerolled="Boolean(self?.rewardRerollSeed)"
    :ready="ready"
    :bonus-up="bonusUp"
    :can-control="canControl"
    :advance-label="advanceLabel"
    :kicker="kicker"
    @pick="(optionId, choiceItemId) => emit('pick', optionId, choiceItemId)"
    @reroll="emit('reroll')"
    @ban="optionIds => emit('ban', optionIds)"
    @advance="emit('advance')"
    @open-honors="view = 'honors'"
  />
</template>
