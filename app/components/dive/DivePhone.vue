<script setup lang="ts">
import type { DiveSessionStatus } from '~/composables/useDiveSession'
import { allDiversPicked, bonusFor, bonusWinners } from '~~/shared/engine/selectors'
import type { DiverState, DiveState, MissionReport } from '~~/shared/engine/types'
import type { SteamLobbyInfo } from '~~/shared/types/messages'

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
  steam: SteamLobbyInfo | null
  pactPreviewIds?: string[]
}>()

const emit = defineEmits<{
  spin: []
  decide: [accepted: boolean]
  decideStrain: [accepted: boolean]
  deal: []
  reroll: [wheel: 'misfortune' | 'front' | 'strain']
  lockPacts: [pactIds: string[]]
  preview: [pactIds: string[]]
  report: [payload: MissionReport]
  failPact: [playerId: string, pactId: string]
  failDirective: []
  holdPact: [playerId: string, pactId: string]
  holdDirective: []
  pick: [optionId: string, choiceItemId?: string]
  rerollRewards: []
  spinBonus: []
  awardBonus: [playerIds: string[]]
  advance: []
  forfeit: [itemId: string]
  kick: [diverId: string]
  transferHost: [diverId: string]
  copyInvite: []
  openSteam: []
  openTutorial: []
  leave: []
  end: []
  saveDive: []
  unsaveDive: []
  newSession: []
  abandonSlot: []
  dismissError: []
}>()

const { sidePanel } = useDrawers()
const phase = computed(() => props.state.phase)
const squadOpen = ref(false)
const menuOpen = ref(false)

// No squad bar on a phone, so the Steam control hands off to the join dialog.
function openSteamFromSquad(): void {
  squadOpen.value = false
  nextTick(() => emit('openSteam'))
}

// Held back while the report's reel is still rolling.
const honors = computed(() => (props.state.phase !== 'diving' ? bonusFor(props.state) : null))
const honorsWinners = computed(() => bonusWinners(props.state).map(diver => upperName(diver.name)))
const honorsAwarded = computed(() => Boolean(props.state.bonusWinnerIds.length))

// Same squad-climbs beat as the desktop shell, derived from synced state.
const squadBanked = computed(() => phase.value === 'rewards' && allDiversPicked(props.state))
</script>

<template>
  <PhoneShell>
    <template #header>
      <PhoneTopBar
        :state="state"
        :mode="mode"
        :slot-name="slotName"
        :can-control="canControl"
        :is-host="isHost"
        @open-squad="squadOpen = true"
        @open-menu="menuOpen = true"
      />
    </template>

    <div class="phone-scroll">
      <AppBanner
        v-if="kicked"
        tone="error"
      >
        You were removed from this dive by the host. This dive will not seat you again.
      </AppBanner>

      <AppBanner
        v-if="lastError"
        tone="error"
      >
        {{ lastError }}
        <template #actions>
          <button
            class="btn tiny ghost"
            type="button"
            @click="emit('dismissError')"
          >
            Dismiss
          </button>
        </template>
      </AppBanner>

      <template v-if="!kicked">
        <PhoneWheel
          v-if="phase === 'spin' || phase === 'decision' || phase === 'strain' || phase === 'deal'"
          :state="state"
          :self-id="selfId"
          :can-control="canControl"
          @spin="emit('spin')"
          @decide="emit('decide', $event)"
          @decide-strain="emit('decideStrain', $event)"
          @deal="emit('deal')"
          @reroll="emit('reroll', $event)"
          @open-kit="sidePanel = 'kit'"
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
        />

        <ClimbCleared
          v-else-if="squadBanked"
          :state="state"
          :self="self"
          :self-id="selfId"
          :can-control="canControl"
          :op-length="opLength"
          phone
          @advance="emit('advance')"
          @hold-pact="(playerId, pactId) => emit('holdPact', playerId, pactId)"
          @fail-pact="(playerId, pactId) => emit('failPact', playerId, pactId)"
          @hold-directive="emit('holdDirective')"
          @fail-directive="emit('failDirective')"
          @spin-bonus="emit('spinBonus')"
          @award-bonus="emit('awardBonus', $event)"
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

    <template #dock>
      <DiveSidebar
        :state="state"
        :self-id="selfId"
        :self="self"
        :preview-pact-ids="pactPreviewIds"
        sheet
      />
    </template>
  </PhoneShell>

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
      :steam="steam"
      :honors="honors"
      :honors-winners="honorsWinners"
      :honors-awarded="honorsAwarded"
      inline-manage
      @transfer-host="emit('transferHost', $event)"
      @kick="emit('kick', $event)"
      @copy-invite="emit('copyInvite')"
      @open-steam="openSteamFromSquad"
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
</style>
