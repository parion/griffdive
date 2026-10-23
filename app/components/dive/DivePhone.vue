<script setup lang="ts">
import type { DiveSessionStatus } from '~/composables/useDiveSession'
import { MAX_DIFFICULTY } from '~~/shared/engine/config'
import { allDiversPicked, bonusFor, bonusWinners, bargainLamp, bargainsClosedReason } from '~~/shared/engine/selectors'
import type { CrusadeSettings, DiverState, DiveState, MajorOrderSelection, MissionOutcome, MissionReport } from '~~/shared/engine/types'

const props = defineProps<{
  state: DiveState
  selfId: string | null
  self: DiverState | null
  canControl: boolean
  opLength: number
  mode: 'local' | 'room'
  slotName: string
  status: DiveSessionStatus
  saved: boolean
  isHost: boolean
  online: string[]
  kicked: boolean
  canFork: boolean
  lastError: string | null
}>()

const emit = defineEmits<{
  spin: []
  decide: [accepted: boolean]
  decideStrain: [accepted: boolean]
  deal: []
  setMajorOrder: [order: MajorOrderSelection | null]
  reroll: [wheel: 'misfortune' | 'front' | 'strain']
  lockPacts: [pactIds: string[]]
  preview: [pactIds: string[]]
  report: [payload: MissionReport]
  failPact: [playerId: string, pactId: string]
  failDirective: []
  pick: [optionId: string, choiceItemId?: string]
  rerollRewards: []
  spinBonus: [payload?: { stars: number, outcome: MissionOutcome }]
  awardBonus: [playerIds: string[]]
  advance: []
  buy: [itemId: string]
  forfeit: [itemId: string]
  start: [settings: CrusadeSettings]
  kick: [diverId: string]
  transferHost: [diverId: string]
  copyInvite: []
  openArmory: []
  openBargains: []
  openTutorial: []
  leave: []
  end: []
  saveDive: []
  unsaveDive: []
  newSession: []
  abandonSlot: []
  dismissError: []
}>()

const phase = computed(() => props.state.phase)
const reporting = ref(false)
const squadOpen = ref(false)
const menuOpen = ref(false)

const bargainsOpen = computed(() => !props.kicked && props.self !== null && !bargainsClosedReason(props.state))
const lamp = computed(() => (props.self ? bargainLamp(props.state, props.self) : 'off'))
const honors = computed(() => bonusFor(props.state))
const honorsWinners = computed(() => bonusWinners(props.state).map(diver => diver.name))
const honorsAwarded = computed(() => Boolean(props.state.bonusWinnerIds.length))

watch(phase, () => {
  reporting.value = false
})

// Same regroup beats as the desktop shell, derived from synced state.
const squadBanked = computed(() => phase.value === 'rewards' && allDiversPicked(props.state))
const operationClimbs = computed(() =>
  props.state.missionInOperation >= props.opLength && props.state.difficulty < MAX_DIFFICULTY)
</script>

<template>
  <DivePhoneShell>
    <template #header>
      <PhoneTopBar
        :state="state"
        :phase="phase"
        :reporting="reporting"
        :mode="mode"
        :slot-name="slotName"
        :can-control="canControl"
        :is-host="isHost"
        @open-squad="squadOpen = true"
        @open-armory="emit('openArmory')"
        @open-menu="menuOpen = true"
      />
    </template>

    <div class="phone-scroll">
      <p
        v-if="kicked"
        class="phone-banner kicked"
      >
        You were removed from this dive by the host.
      </p>

      <p
        v-if="lastError"
        class="phone-banner error"
      >
        {{ lastError }}
        <button
          class="btn tiny ghost"
          type="button"
          @click="emit('dismissError')"
        >
          Dismiss
        </button>
      </p>

      <template v-if="!kicked">
        <DivePhaseLobby
          v-if="phase === 'lobby'"
          :state="state"
          :self-id="selfId"
          :can-control="canControl"
          phone
          @start="emit('start', $event)"
        />

        <PhoneWheel
          v-else-if="phase === 'spin' || phase === 'decision' || phase === 'strain' || phase === 'deal'"
          :state="state"
          :self-id="selfId"
          :can-control="canControl"
          @spin="emit('spin')"
          @decide="emit('decide', $event)"
          @decide-strain="emit('decideStrain', $event)"
          @deal="emit('deal')"
          @set-major-order="emit('setMajorOrder', $event)"
          @reroll="emit('reroll', $event)"
        />

        <PhonePacts
          v-else-if="phase === 'pacts'"
          :state="state"
          :self-id="selfId"
          :self="self"
          :can-control="canControl"
          @lock="emit('lockPacts', $event)"
          @preview="emit('preview', $event)"
        />

        <PhoneDiving
          v-else-if="phase === 'diving'"
          :state="state"
          :self-id="selfId"
          :self="self"
          :can-control="canControl"
          :is-host="isHost"
          @report="emit('report', $event)"
          @fail="(playerId, pactId) => emit('failPact', playerId, pactId)"
          @fail-directive="emit('failDirective')"
          @reporting="reporting = $event"
          @spin-bonus="emit('spinBonus', $event)"
          @open-kit="emit('openArmory')"
        />

        <OperationCleared
          v-else-if="squadBanked && operationClimbs"
          :state="state"
          :can-control="canControl"
          phone
          @start="emit('advance')"
          @open-bargains="emit('openBargains')"
        />

        <MissionCleared
          v-else-if="squadBanked"
          :state="state"
          :self="self"
          :self-id="selfId"
          :can-control="canControl"
          :op-length="opLength"
          phone
          @advance="emit('advance')"
          @buy="emit('buy', $event)"
        />

        <PhoneRewardDraft
          v-else-if="phase === 'rewards'"
          :state="state"
          :self-id="selfId"
          :self="self"
          :can-control="canControl"
          :op-length="opLength"
          @pick="(optionId, choiceItemId) => emit('pick', optionId, choiceItemId)"
          @reroll="emit('rerollRewards')"
          @advance="emit('advance')"
        />

        <DivePhaseForfeit
          v-else-if="phase === 'forfeit'"
          :state="state"
          :self-id="selfId"
          :self="self"
          phone
          @forfeit="emit('forfeit', $event)"
        />

        <DivePhaseComplete
          v-else-if="phase === 'complete'"
          :state="state"
          :mode="mode"
          phone
          @abandon-slot="emit('abandonSlot')"
        />
      </template>
    </div>

    <template #lead>
      <button
        v-if="bargainsOpen"
        class="bar-bargains"
        type="button"
        aria-haspopup="dialog"
        :aria-label="`Brasch's Bargains, ${self?.credits ?? 0} credits${lamp === 'off' ? '' : lamp === 'restocked' ? ', restocked' : ', something affordable in stock'}`"
        @click="emit('openBargains')"
      >
        <span
          v-if="lamp !== 'off'"
          class="lamp gold bb-lamp"
          :class="{ pulse: lamp === 'restocked' }"
          aria-hidden="true"
        />
        <IconCredit class="bb-mark" />
        <span class="bb-bal">{{ self?.credits ?? 0 }}</span>
      </button>
    </template>
  </DivePhoneShell>

  <AppDialog
    v-model:open="squadOpen"
    title="Squad"
    description="Seats, status, and host controls."
    size="lg"
  >
    <SquadDock
      :state="state"
      :self-id="selfId"
      :online="online"
      :mode="mode"
      :is-host="isHost"
      :can-control="canControl"
      :slot-name="slotName"
      :honors="honors"
      :honors-winners="honorsWinners"
      :honors-awarded="honorsAwarded"
      inline-manage
      @transfer-host="emit('transferHost', $event)"
      @kick="emit('kick', $event)"
      @copy-invite="emit('copyInvite')"
      @award-bonus="emit('awardBonus', $event)"
    />
  </AppDialog>

  <DiveMenu
    v-model:open="menuOpen"
    :mode="mode"
    :saved="saved"
    :can-fork="canFork"
    :can-control="canControl"
    :is-host="isHost"
    :lone-host="state.divers.length === 1"
    :room-code="slotName"
    @open-tutorial="emit('openTutorial')"
    @copy-invite="emit('copyInvite')"
    @save-dive="emit('saveDive')"
    @unsave-dive="emit('unsaveDive')"
    @new-session="emit('newSession')"
    @leave="emit('leave')"
    @end="emit('end')"
  />
</template>

<style scoped>
.phone-scroll {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 12px 0;
}
.bar-bargains {
  position: relative;
  flex: 0 0 52px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-height: 56px;
  padding: 0;
  border: 1px solid var(--line-3);
  background: var(--panel);
  color: var(--gold);
  font-family: inherit;
  cursor: pointer;
}
.bar-bargains:active { background: var(--raised); }
.bb-mark { width: 20px; height: 20px; }
.bb-bal {
  max-width: 48px;
  overflow: hidden;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
  text-overflow: ellipsis;
  color: var(--text);
}
.bb-lamp { position: absolute; top: 5px; right: 5px; }
.phone-banner {
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--line-2);
  font-size: 12px;
}
.phone-banner.kicked { border-color: var(--red); }
.phone-banner.error { border-color: var(--red); color: var(--red); }
</style>
