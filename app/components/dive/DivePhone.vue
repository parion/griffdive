<script setup lang="ts">
// The phone orchestrator: fixed bands + the current phase's phone layout. It
// mirrors the desktop dive page's phase switch, but every phase renders a
// bottom-sheet composition instead of the three-rail terminal.
import type { DiveSessionStatus } from '~/composables/useDiveSession'
import type { CrusadeVariant, DiverState, DiveState, ItemRef, MajorOrderSelection, MissionOutcome, SampleCounts } from '~~/shared/engine/types'

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
  pactRisk: [value: number]
  report: [payload: { outcome: MissionOutcome, stars: number, timePct: number, samples?: SampleCounts }]
  failPact: [playerId: string, pactId: string]
  pick: [optionId: string, choiceItemId?: string]
  rerollRewards: []
  banRewards: [optionIds: string[]]
  spinBonus: []
  awardBonus: [playerId: string]
  advance: []
  forfeit: [itemRef: ItemRef]
  claimCatchUpOption: [optionId: string]
  claimCache: [cacheOwnerId: string]
  start: [variant: CrusadeVariant]
  kick: [diverId: string]
  transferHost: [diverId: string]
  copyInvite: []
  openArmory: []
  leave: []
  end: []
  saveDive: []
  unsaveDive: []
  abandonSlot: []
  dismissError: []
}>()

const phase = computed(() => props.state.phase)

// Host moderation rides the shell's bottom sheet: tapping a squadmate in the
// bar opens their hand-over / kick actions.
const modTarget = ref<string | null>(null)
const modDiver = computed(() => props.state.divers.find(diver => diver.id === modTarget.value) ?? null)

function initial(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || '?'
}
function handover(diverId: string): void {
  emit('transferHost', diverId)
  modTarget.value = null
}
function kickDiver(diverId: string): void {
  emit('kick', diverId)
  modTarget.value = null
}
</script>

<template>
  <DivePhoneShell>
    <template #header>
      <PhoneTopBar
        :mode="mode"
        :slot-name="slotName"
        :status="status"
        :saved="saved"
        :can-control="canControl"
        :is-host="isHost"
        :lone-host="state.divers.length === 1"
        @copy-invite="emit('copyInvite')"
        @open-armory="emit('openArmory')"
        @leave="emit('leave')"
        @end="emit('end')"
        @save-dive="emit('saveDive')"
        @unsave-dive="emit('unsaveDive')"
      />
    </template>

    <template #crusade>
      <PhoneCrusadeBar
        :difficulty="state.difficulty"
        :achieved="state.achieved"
        :failed="phase === 'forfeit'"
        :mission-in-operation="state.missionInOperation"
        :op-length="opLength"
      />
    </template>

    <template #squad>
      <PhoneSquadBar
        :state="state"
        :self-id="selfId"
        :online="online"
        :mode="mode"
        :is-host="isHost"
        @select="modTarget = $event"
      />
    </template>

    <div class="phone-scroll">
      <p
        v-if="kicked"
        class="phone-banner kicked"
      >
        You were removed from this dive by the host.
        <NuxtLink to="/">
          Back to base
        </NuxtLink>
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

      <FieldPromotionCard
        v-if="self && self.catchUpOwed > 0 && phase !== 'complete'"
        :state="state"
        :diver="self"
        @claim-option="emit('claimCatchUpOption', $event)"
        @claim-cache="emit('claimCache', $event)"
      />

      <template v-if="!kicked">
        <DivePhaseLobby
          v-if="phase === 'lobby'"
          :state="state"
          :self-id="selfId"
          :can-control="canControl"
          @start="emit('start', $event)"
        />

        <PhoneWheel
          v-else-if="phase === 'spin' || phase === 'decision' || phase === 'strain' || phase === 'deal'"
          :state="state"
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
          @pact-risk="emit('pactRisk', $event)"
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
          @ban="emit('banRewards', $event)"
          @spin-bonus="emit('spinBonus')"
          @award-bonus="emit('awardBonus', $event)"
          @advance="emit('advance')"
        />

        <DivePhaseForfeit
          v-else-if="phase === 'forfeit'"
          :state="state"
          :can-control="canControl"
          @forfeit="emit('forfeit', $event)"
        />

        <DivePhaseComplete
          v-else-if="phase === 'complete'"
          :state="state"
          :mode="mode"
          @abandon-slot="emit('abandonSlot')"
        />
      </template>
    </div>

    <template #sheet>
      <Transition name="sheet">
        <div
          v-if="modDiver"
          class="mod-sheet"
          role="dialog"
          aria-label="Moderate diver"
        >
          <span
            class="sheet-top"
            aria-hidden="true"
          />
          <div class="mod-head">
            <span class="cut-sm disp mod-av">{{ initial(modDiver.name) }}</span>
            <div class="mod-copy">
              <span class="mod-name">{{ modDiver.name }}</span>
              <span class="mod-sub">Host moderation</span>
            </div>
            <button
              class="btn ghost mod-cancel"
              type="button"
              @click="modTarget = null"
            >
              Cancel
            </button>
          </div>
          <div class="mod-actions">
            <button
              class="btn ghost"
              type="button"
              @click="handover(modDiver.id)"
            >
              Make host
            </button>
            <button
              class="btn danger"
              type="button"
              @click="kickDiver(modDiver.id)"
            >
              Kick from squad
            </button>
          </div>
        </div>
      </Transition>
    </template>
  </DivePhoneShell>
</template>

<style scoped>
.phone-scroll {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 10px 12px 16px;
}
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

.mod-sheet {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 12px calc(14px + env(safe-area-inset-bottom, 0px));
  background: var(--panel);
  border-top: 2px solid var(--gold);
}
.sheet-top {
  position: absolute;
  left: 0;
  top: -2px;
  width: 64px;
  height: 3px;
  background: var(--gold);
}
.mod-head { display: flex; align-items: center; gap: 10px; }
.mod-av {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  background: var(--line-2);
  color: var(--text);
  font-size: 14px;
}
.mod-copy { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1 1 auto; }
.mod-name { font-size: 13px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
.mod-sub { font-size: 9px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); }
.mod-cancel { flex-shrink: 0; }
.mod-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.mod-actions .btn { min-height: 48px; }
</style>
