<script setup lang="ts">
import { diverOptions, majorOrderFronts } from '~~/shared/engine/selectors'
import { deriveFront, deriveMisfortune, deriveStrain } from '~~/shared/engine/wheel'
import type { CrusadeVariant, DiverState, EngineAction, ItemRef, MajorOrderSelection, MissionOutcome, SampleCounts } from '~~/shared/engine/types'
import { rememberDiverName } from '~/composables/useGameSocket'

const route = useRoute()
const slotId = computed(() => String(route.params.id))
const session = useDiveSession(slotId.value)
const saves = useSaves()
const { push: pushToast } = useToasts()
const { ownedWarbonds, setOwned } = useOwnedWarbonds()
const { openWarbonds, guideOpen, openGuide } = useDrawers()
const { hasSeenWarbondIntro, markWarbondIntroSeen } = useWarbondIntro()
const { hasSeenDiveIntro, markDiveIntroSeen } = useDiveIntro()

const {
  state,
  self,
  selfId,
  phase,
  canControl,
  kicked,
  opLength,
  phaseKey,
  diverName,
  nameDraft,
  setNameDraft,
  commitName,
} = useDiveView(session)

const dispatch = (action: EngineAction) => session.dispatch(action)

const armoryOpen = ref(false)

// Warbonds are what each diver actually owns — declared per diver, any phase,
// and driven by the global Warbonds drawer. A local save seeds the working list
// from its own draft; a room join pushes the browser's declared list to the
// server instead of clobbering it with the seated default.
const warbondsInitialized = ref(false)
watch([self, selfId], ([diver, id]) => {
  if (!diver || !id || warbondsInitialized.value) {
    return
  }
  warbondsInitialized.value = true
  if (session.mode === 'local') {
    setOwned([...diver.warbondCodes])
    return
  }
  const local = [...ownedWarbonds.value]
  const same = local.length === diver.warbondCodes.length
    && local.every(code => diver.warbondCodes.includes(code))
  if (!same) {
    dispatch({ type: 'SET_WARBONDS', playerId: id, warbondCodes: local })
  }
})

watch(ownedWarbonds, (codes) => {
  if (!warbondsInitialized.value || !selfId.value) {
    return
  }
  const current = self.value?.warbondCodes ?? []
  const same = current.length === codes.length && current.every(code => codes.includes(code))
  if (!same) {
    dispatch({ type: 'SET_WARBONDS', playerId: selfId.value, warbondCodes: [...codes] })
  }
})

// Dive startup is part of the ritual — a fresh solo dive opens the guide on
// mount, and a room join opens it the moment the diver is seated (right after
// the name gate). It fires once ever, like the remembered name.
watch(self, (diver) => {
  if (!diver) {
    return
  }
  if (!hasSeenDiveIntro.value) {
    markDiveIntroSeen()
    openGuide()
    return
  }
  if (!hasSeenWarbondIntro.value && !guideOpen.value) {
    markWarbondIntroSeen()
    openWarbonds()
  }
}, { immediate: true })

// The guide goes first; the Warbonds panel (declare what you own) follows it so
// a first-timer reads one panel at a time, never both at once.
watch(guideOpen, (open) => {
  if (open || !self.value || hasSeenWarbondIntro.value) {
    return
  }
  markWarbondIntroSeen()
  openWarbonds()
})

// Hostship moves under the squad's feet (disconnect migration) with no other
// signal — announce the crown's arrival and departure.
watch(
  () => state.value?.hostId ?? null,
  (hostId, previous) => {
    if (!hostId || !previous || hostId === previous) {
      return
    }
    if (hostId === selfId.value) {
      pushToast('You are now host.')
    }
    else if (previous === selfId.value) {
      pushToast(`Host moved to ${diverName(hostId)}.`)
    }
  },
)

// A dropped socket silently pauses sync and re-seats host — say so, but only
// once per outage so auto-reconnect churn doesn't spam the stack.
let wasConnected = false
let reportedLost = false
watch(
  () => session.status.value,
  (status) => {
    if (status === 'connected') {
      if (reportedLost) {
        pushToast('Reconnected.')
      }
      wasConnected = true
      reportedLost = false
    }
    else if (status === 'disconnected' && wasConnected && !reportedLost) {
      pushToast('Connection lost — reconnecting…', 'warn')
      reportedLost = true
    }
  },
)

function spin(): void {
  dispatch({ type: 'SPIN_WHEEL', seed: session.newSeed() })
}

function reroll(wheel: 'misfortune' | 'front' | 'strain'): void {
  const current = state.value
  if (!current?.wheel) {
    return
  }
  // Spins are seeds, but a reroll must actually move: draw fresh seeds until
  // the derived result differs from the one being replaced (the reducer refuses
  // a same-result seed too, so a hostile client can't fake it).
  let seed = session.newSeed()
  for (let attempt = 0; attempt < 32; attempt++) {
    const same = wheel === 'misfortune'
      ? deriveMisfortune(seed, current.difficulty).id === current.wheel.misfortuneId
      : wheel === 'front'
        ? deriveFront(seed, majorOrderFronts(current)) === current.frontId
        : deriveStrain(seed, current.difficulty, current.frontId!)?.id === current.strainId
    if (!same) {
      break
    }
    seed = session.newSeed()
  }
  dispatch({ type: 'REROLL_WHEEL', wheel, seed })
}

function decideMisfortune(accepted: boolean): void {
  dispatch({ type: 'ACCEPT_MISFORTUNE', accepted })
}

function decideStrain(accepted: boolean): void {
  dispatch({ type: 'ACCEPT_STRAIN', accepted })
}

// The Major Order is the operation's front commitment, host-set before the
// first spin: it pins the front draw and banks a reroll token on completion.
// The picker's live suggestion (Phase B) carries the same selection shape.
function setMajorOrder(order: MajorOrderSelection | null): void {
  dispatch({ type: 'SET_MAJOR_ORDER', order })
}

function lockPacts(pactIds: string[]): void {
  if (selfId.value) {
    dispatch({ type: 'SET_PACTS', playerId: selfId.value, pactIds })
  }
}

// Broken pacts are marked in the field: by the diver themselves, or by the
// host refereeing the squad.
function failPact(playerId: string, pactId: string): void {
  dispatch({ type: 'FAIL_PACT', playerId, pactId })
}

function report(payload: { outcome: MissionOutcome, stars: number, timePct: number, samples?: SampleCounts }): void {
  dispatch({ type: 'REPORT_RESULT', ...payload })
}

function pick(optionId: string, choiceItemId?: string): void {
  if (!selfId.value) {
    return
  }
  dispatch(choiceItemId
    ? { type: 'PICK_REWARD', playerId: selfId.value, optionId, choiceItemId }
    : { type: 'PICK_REWARD', playerId: selfId.value, optionId })
}

// A reward reroll spends a token and must move: draw fresh seeds until the
// offer actually changes (the reducer refuses a same-offer seed too).
function rerollRewards(): void {
  const current = state.value
  const diver = self.value
  if (!current || !diver) {
    return
  }
  const offerKey = (entry: DiverState): string =>
    diverOptions(current, entry).map(option => option.optionId).join('|')
  const currentKey = offerKey(diver)
  let seed = session.newSeed()
  for (let attempt = 0; attempt < 32; attempt++) {
    if (offerKey({ ...diver, rewardRerollSeed: seed }) !== currentKey) {
      break
    }
    seed = session.newSeed()
  }
  dispatch({ type: 'REROLL_REWARDS', playerId: diver.id, seed })
}

function banRewards(optionIds: string[]): void {
  if (selfId.value) {
    dispatch({ type: 'BAN_REWARDS', playerId: selfId.value, optionIds })
  }
}

function spinBonus(): void {
  dispatch({ type: 'SPIN_BONUS', seed: session.newSeed() })
}

function awardBonus(playerId: string): void {
  dispatch({ type: 'AWARD_BONUS', playerId })
}

function claimCatchUpOption(optionId: string): void {
  if (selfId.value) {
    dispatch({ type: 'CLAIM_CATCHUP_OPTION', playerId: selfId.value, optionId })
  }
}

function claimCache(cacheOwnerId: string): void {
  if (selfId.value) {
    dispatch({ type: 'CLAIM_CACHE', playerId: selfId.value, cacheOwnerId })
  }
}

function advance(): void {
  dispatch({ type: 'ADVANCE' })
}

function forfeit(itemRef: ItemRef): void {
  dispatch({ type: 'FORFEIT_ITEM', itemRef })
}

function endDive(): void {
  dispatch({ type: 'END_DIVE' })
}

// Dropping out is soft: the diver's inventory parks as a legacy cache, and
// the same diver rejoining under their stored playerId reclaims it.
function leaveDive(): void {
  if (selfId.value) {
    dispatch({ type: 'LEAVE_DIVE', playerId: selfId.value })
  }
  navigateTo('/')
}

function abandonSlot(): void {
  if (session.mode === 'local') {
    saves.deleteSlot(slotId.value)
  }
  navigateTo('/')
}

// Saving pins the shared room server-side so the squad can resume after the
// idle timeout — and after a browser clears its own storage. Any diver may pin;
// removing the pin is host moderation.
function saveDive(): void {
  if (session.status.value !== 'connected') {
    pushToast('Reconnect before saving', 'warn')
    return
  }
  session.saveDive()
  pushToast('Dive saved')
}

function unsaveDive(): void {
  if (session.status.value !== 'connected') {
    pushToast('Reconnect first', 'warn')
    return
  }
  session.unsaveDive()
  pushToast('Save removed')
}

function copyInvite(): void {
  if (!import.meta.client) {
    return
  }
  if (!navigator.clipboard?.writeText) {
    pushToast('Could not copy the invite')
    return
  }
  navigator.clipboard
    .writeText(location.href)
    .then(() => pushToast('Invite copied'))
    .catch(() => pushToast('Could not copy the invite'))
}

// Host moderation.
function kick(diverId: string): void {
  dispatch({ type: 'KICK_DIVER', playerId: diverId })
}

function transferHost(diverId: string): void {
  dispatch({ type: 'TRANSFER_HOST', playerId: diverId })
}

// The name gate runs before joining: confirm stores the name so the first
// hello seats this diver named, then the connection opens.
function confirmJoinName(name: string): void {
  rememberDiverName(name)
  session.connect()
}

function launchCrusade(variant: CrusadeVariant): void {
  commitName()
  dispatch({ type: 'START_DIVE', settings: { variant } })
}
</script>

<template>
  <main
    id="main-content"
    class="dive-page"
    tabindex="-1"
  >
    <JoinNameGate
      v-if="session.awaitingName.value"
      @confirm="confirmJoinName"
    />
    <p
      v-if="session.loadError.value"
      class="panel page"
    >
      Dive not found. <NuxtLink to="/">Back to base</NuxtLink>
    </p>
    <section
      v-else-if="session.mode === 'room' && !session.awaitingName.value && session.connectionFailed.value"
      class="panel page"
    >
      <h2>Can't reach the dive server</h2>
      <p class="muted small">
        Live dives sync over a WebSocket, and this browser couldn't hold a connection to
        <span class="mono">{{ session.slotName.value }}</span>. Check your network, then retry —
        solo crusades run fully offline.
      </p>
      <div class="row">
        <button
          class="btn primary"
          type="button"
          @click="session.connect()"
        >
          Reconnect
        </button>
        <NuxtLink
          class="btn"
          to="/"
        >Back to base</NuxtLink>
      </div>
    </section>
    <DiveFrame v-else-if="state">
      <template #strip>
        <DiveHeader
          :state="state"
          :mode="session.mode"
          :status="session.status.value"
          :self-id="selfId"
          :can-control="canControl"
          :is-host="session.selfIsHost.value"
          :op-length="opLength"
          :slot-name="session.slotName.value"
          :saved="session.saved.value"
          @copy-invite="copyInvite"
          @leave="leaveDive"
          @end="endDive"
          @save-dive="saveDive"
          @unsave-dive="unsaveDive"
        />
      </template>

      <template #left>
        <button
          class="armory-btn cut"
          type="button"
          @click="armoryOpen = true"
        >
          <IconWarbond class="armory-icon" />
          <span>Armory</span>
        </button>
        <section
          class="sec"
          aria-labelledby="ladder-h"
        >
          <div class="sec-h">
            <h2
              id="ladder-h"
              class="lbl"
            >
              <span class="sn">01</span> The climb
            </h2>
            <span class="dash" />
          </div>
          <CrusadeLadder
            :difficulty="state.difficulty"
            :achieved="state.achieved"
          />
        </section>
        <section
          class="sec"
          aria-labelledby="squad-h"
        >
          <div class="sec-h">
            <h2
              id="squad-h"
              class="lbl"
            >
              Squad
            </h2>
            <span class="dash" />
          </div>
          <SquadStrip
            :state="state"
            :self-id="selfId"
            :online="session.online.value"
            :mode="session.mode"
            :is-host="session.selfIsHost.value"
            :name-draft="nameDraft"
            @update:name-draft="setNameDraft"
            @commit="commitName"
            @transfer-host="transferHost"
            @kick="kick"
          />
        </section>
      </template>

      <template #right>
        <section
          class="sec"
          aria-labelledby="phases-h"
        >
          <div class="sec-h">
            <h2
              id="phases-h"
              class="lbl"
            >
              Mission phases
            </h2>
            <span class="dash" />
          </div>
          <PhaseRail :phase="state.phase" />
        </section>
      </template>

      <p
        v-if="kicked"
        class="panel kicked"
      >
        You were removed from this dive by the host.
        <NuxtLink to="/">Back to base</NuxtLink>
      </p>

      <p
        v-if="session.lastError.value"
        class="panel error-banner"
      >
        {{ session.lastError.value.message }}
        <button
          class="btn tiny ghost"
          type="button"
          @click="session.dismissError()"
        >
          Dismiss
        </button>
      </p>

      <!-- The Field Promotion persists across phases: a mid-crusade joiner
           catches up whenever it suits them, never gating the squad. -->
      <FieldPromotionCard
        v-if="self && self.catchUpOwed > 0 && state.phase !== 'complete'"
        :state="state"
        :diver="self"
        @claim-option="claimCatchUpOption"
        @claim-cache="claimCache"
      />

      <Transition
        v-if="!kicked"
        name="phase"
        mode="out-in"
      >
        <div
          :key="phaseKey"
          class="phase-stack"
        >
          <DivePhaseLobby
            v-if="phase === 'lobby'"
            :can-control="canControl"
            @start="launchCrusade"
          />

          <DivePhaseWheel
            v-if="phase === 'spin' || phase === 'decision' || phase === 'strain' || phase === 'pacts'"
            :state="state"
            :self-id="selfId"
            :self="self"
            :can-control="canControl"
            @spin="spin"
            @decide="decideMisfortune"
            @decide-strain="decideStrain"
            @set-major-order="setMajorOrder"
            @reroll="reroll"
            @lock="lockPacts"
          />

          <DivePhaseDiving
            v-if="phase === 'diving'"
            :state="state"
            :self-id="selfId"
            :self="self"
            :can-control="canControl"
            :is-host="session.selfIsHost.value"
            @report="report"
            @fail="failPact"
          />

          <DivePhaseRewards
            v-if="phase === 'rewards'"
            :state="state"
            :self-id="selfId"
            :self="self"
            :can-control="canControl"
            :op-length="opLength"
            @pick="pick"
            @reroll="rerollRewards"
            @ban="banRewards"
            @spin-bonus="spinBonus"
            @award-bonus="awardBonus"
            @advance="advance"
          />

          <DivePhaseForfeit
            v-if="phase === 'forfeit'"
            :state="state"
            :can-control="canControl"
            @forfeit="forfeit"
          />

          <DivePhaseComplete
            v-if="phase === 'complete'"
            :state="state"
            :mode="session.mode"
            @abandon-slot="abandonSlot"
          />
        </div>
      </Transition>

      <ArmoryDrawer
        v-model:open="armoryOpen"
        :state="state"
        :self-id="selfId"
      />
    </DiveFrame>
    <p
      v-else
      class="panel page muted"
    >
      Loading dive…
    </p>
  </main>
</template>

<style scoped>
.dive-page { min-height: 100vh; }

.phase-stack { display: grid; gap: 10px; }

.error-banner {
  border-color: var(--red);
  color: var(--red);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.kicked { border-color: var(--red); }

.armory-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 10px;
  border: 1px solid var(--line-4);
  background: var(--rail);
  color: var(--khaki);
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  cursor: pointer;
  transition: color var(--dur-fast), border-color var(--dur-fast), background-color var(--dur-fast);
}
.armory-btn:hover { color: var(--gold); border-color: var(--gold); background: rgba(255, 214, 66, 0.06); }
.armory-icon { width: 18px; height: 18px; }
</style>
