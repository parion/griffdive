<script setup lang="ts">
import { MISFORTUNE_MIN_DIFFICULTY, MISFORTUNE_RISK } from '~~/shared/engine/config'
import { performanceValor } from '~~/shared/engine/rewards'
import { diverOptions, majorOrderFronts, pactRiskOf, teamRiskOf } from '~~/shared/engine/selectors'
import { VARIANTS } from '~~/shared/engine/progression'
import { deriveFront, deriveMisfortune, deriveStrain, eligibleMisfortunes } from '~~/shared/engine/wheel'
import type { CrusadeVariant, DiverState, EngineAction, ItemRef, MajorOrderSelection, MissionReport } from '~~/shared/engine/types'
import { rememberDiverName } from '~/composables/useGameSocket'

const route = useRoute()
const slotId = computed(() => String(route.params.id))
const session = useDiveSession(slotId.value)
const saves = useSaves()
const { push: pushToast } = useToasts()
const { ownedWarbonds, setOwned } = useOwnedWarbonds()
const { openWarbonds, guideOpen } = useDrawers()
const { hasSeenWarbondIntro, markWarbondIntroSeen } = useWarbondIntro()
const { hasSeenDiveIntro, markDiveIntroSeen } = useDiveIntro()
const { isPhone } = usePhoneShell()

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

// The rewards phase holds two screens — the draft and the honors ceremony.
// The page owns the toggle so the shell's rails can follow it (draft → Valor,
// honors → the squad's token banks); the phase component drives the value.
const rewardsView = ref<'draft' | 'honors'>('draft')

// The rewards phase unmounts between missions, so reset the toggle whenever
// the dive leaves rewards — the next draft always opens on the draft.
watch(phase, (current) => {
  if (current !== 'rewards') {
    rewardsView.value = 'draft'
  }
})

// The Valor rail and the climb strip are shell state, not phase state: the
// page composes them from selectors so every phase shares one rail.
const variantName = computed(() =>
  VARIANTS.find(variant => variant.id === state.value?.settings?.variant)?.name ?? 'Crusade')
const crusadeLabel = computed(() => `${diverName(selfId.value)} · ${variantName.value}`)

const teamRisk = computed(() => state.value ? teamRiskOf(state.value) : 0)
// While a diver is still picking pacts the phase reports its live selection
// upward, so the shell's Valor rail previews the stake before the lock.
const livePactRisk = ref(0)
const pactRisk = computed(() => {
  const diver = self.value
  if (!diver) {
    return 0
  }
  if (state.value?.phase === 'pacts' && !diver.pactsLocked) {
    return livePactRisk.value
  }
  return pactRiskOf(diver)
})
const performance = computed(() => {
  const current = state.value
  if (!current) {
    return 0
  }
  return current.phase === 'rewards' || current.phase === 'forfeit' || current.phase === 'complete'
    ? performanceValor(current.lastReport)
    : 0
})
const valorLocked = computed(() => {
  const phase = state.value?.phase
  return phase === 'diving' || phase === 'rewards' || phase === 'forfeit' || phase === 'complete'
})
const pendingText = computed(() => {
  switch (state.value?.phase) {
    case 'spin': return 'Awaiting spin'
    case 'decision':
    case 'strain': return 'Deciding'
    case 'deal': return 'Ready to deal'
    case 'pacts': return 'Pacts pending'
    default: return ''
  }
})

// The wheel pool card: how many misfortunes are eligible at this difficulty and
// how the risk bands are distributed. Presentation of `eligibleMisfortunes`.
const wheelPool = computed(() => {
  const current = state.value
  if (!current || !['spin', 'decision', 'strain', 'deal', 'pacts'].includes(current.phase)) {
    return null
  }
  const list = eligibleMisfortunes(current.difficulty)
  const bars = [0, 0, 0, 0, 0]
  for (const misfortune of list) {
    const risk = Math.min(5, Math.max(1, MISFORTUNE_RISK[misfortune.id] ?? 1))
    bars[risk - 1] = (bars[risk - 1] ?? 0) + 1
  }
  const joining = list
    .filter(misfortune => MISFORTUNE_MIN_DIFFICULTY[misfortune.id] === current.difficulty)
    .map(misfortune => misfortune.name)
  return {
    count: list.length,
    bars,
    note: joining.length
      ? `${joining.join(', ')} join at difficulty ${current.difficulty}`
      : 'The full pool is on the wheel',
  }
})

const POOL_COLORS = ['var(--khaki)', 'var(--khaki)', 'var(--orange)', 'var(--red)', 'var(--red)']
function poolColor(index: number): string {
  return POOL_COLORS[index] ?? 'var(--line-3)'
}

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

// Dive startup is part of the ritual: a fresh browser gets the Griffdiver
// briefing the moment the diver is seated (right after the name gate), instead
// of the old auto-opened guide. Closing it marks the dive intro seen and hands
// off to the Warbonds panel, so a first-timer reads one surface at a time.
const briefingOpen = ref(false)

watch([self, state], ([diver, current]) => {
  if (!diver || !current || briefingOpen.value || hasSeenDiveIntro.value) {
    return
  }
  briefingOpen.value = true
}, { immediate: true })

function openWarbondsIntro(): void {
  if (!hasSeenWarbondIntro.value && !guideOpen.value && !briefingOpen.value) {
    markWarbondIntroSeen()
    openWarbonds()
  }
}

// A dive start whose briefing was already seen still gets the one-shot
// Warbonds prompt (a browser from before the briefing, or a later crusade).
watch(self, (diver) => {
  if (!diver || briefingOpen.value || !hasSeenDiveIntro.value) {
    return
  }
  openWarbondsIntro()
}, { immediate: true })

// Opening the guide by hand on a first run still hands off to the Warbonds
// panel — but never behind the briefing.
watch(guideOpen, (open) => {
  if (open || !self.value || hasSeenWarbondIntro.value) {
    return
  }
  openWarbondsIntro()
})

function closeBriefing(): void {
  briefingOpen.value = false
  markDiveIntroSeen()
  openWarbondsIntro()
}

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

// The host gate between the wheel decision and the pact hand.
function dealPacts(): void {
  dispatch({ type: 'DEAL_PACTS' })
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

function report(payload: MissionReport): void {
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
  <div class="dive-page">
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

    <AchievedOverlay
      v-else-if="state && state.phase === 'complete' && state.achieved"
      :state="state"
      :crusade-label="crusadeLabel"
      :mode="session.mode"
      :slot-name="session.slotName.value"
    />

    <DivePhone
      v-else-if="state && isPhone"
      :state="state"
      :self-id="selfId"
      :self="self"
      :can-control="canControl"
      :op-length="opLength"
      :mode="session.mode"
      :slot-name="session.slotName.value"
      :status="session.status.value"
      :saved="Boolean(session.saved.value)"
      :is-host="session.selfIsHost.value"
      :online="session.online.value"
      :kicked="kicked"
      :last-error="session.lastError.value?.message ?? null"
      @spin="spin"
      @decide="decideMisfortune"
      @decide-strain="decideStrain"
      @deal="dealPacts"
      @set-major-order="setMajorOrder"
      @reroll="reroll"
      @lock-pacts="lockPacts"
      @pact-risk="livePactRisk = $event"
      @report="report"
      @fail-pact="failPact"
      @pick="pick"
      @reroll-rewards="rerollRewards"
      @ban-rewards="banRewards"
      @spin-bonus="spinBonus"
      @award-bonus="awardBonus"
      @advance="advance"
      @forfeit="forfeit"
      @claim-catch-up-option="claimCatchUpOption"
      @claim-cache="claimCache"
      @start="launchCrusade"
      @copy-invite="copyInvite"
      @open-armory="armoryOpen = true"
      @leave="leaveDive"
      @end="endDive"
      @save-dive="saveDive"
      @unsave-dive="unsaveDive"
      @abandon-slot="abandonSlot"
      @dismiss-error="session.dismissError()"
    />

    <DiveFrame
      v-else-if="state"
      :left="state.phase !== 'forfeit'"
      :right="state.phase !== 'lobby'"
    >
      <template #header>
        <DiveTopBar
          :crusade-label="crusadeLabel"
          :difficulty="state.difficulty"
          :mode="session.mode"
          :slot-name="session.slotName.value"
          :status="session.status.value"
          :saved="Boolean(session.saved.value)"
          :can-control="canControl"
          :is-host="session.selfIsHost.value"
          :lone-host="state.divers.length === 1"
          @copy-invite="copyInvite"
          @open-armory="armoryOpen = true"
          @leave="leaveDive"
          @end="endDive"
          @save-dive="saveDive"
          @unsave-dive="unsaveDive"
        />
      </template>

      <template #ladder>
        <CrusadeStrip
          :difficulty="state.difficulty"
          :achieved="state.achieved"
          :failed="state.phase === 'forfeit'"
          :mission-in-operation="state.missionInOperation"
          :op-length="opLength"
        />
      </template>

      <template #left>
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

        <MissionReportSummary
          v-if="state.phase === 'rewards'"
          :state="state"
        />

        <section
          v-if="wheelPool"
          class="sec pool"
          aria-labelledby="pool-h"
        >
          <div class="sec-h">
            <h2
              id="pool-h"
              class="lbl"
            >
              Wheel pool
            </h2>
            <span class="dash" />
          </div>
          <div class="pool-count">
            <span class="disp">{{ wheelPool.count }}</span>
            <span class="cap">misfortunes on the wheel</span>
          </div>
          <div
            class="pool-bars"
            aria-hidden="true"
          >
            <span
              v-for="(n, i) in wheelPool.bars"
              :key="i"
              :style="{ flexGrow: Math.max(n, 1), background: poolColor(i) }"
            />
          </div>
          <span class="cap pool-note">{{ wheelPool.note }}</span>
        </section>
      </template>

      <template #right>
        <ForfeitCarriesOver
          v-if="state.phase === 'forfeit'"
          :state="state"
        />
        <RewardTokensRail
          v-else-if="state.phase === 'rewards' && rewardsView === 'honors'"
          :state="state"
          :self-id="selfId"
        />
        <ValorMeter
          v-else
          :difficulty="state.difficulty"
          :team-risk="teamRisk"
          :pact-risk="pactRisk"
          :performance="performance"
          :locked="valorLocked"
          :diver-name="diverName(selfId)"
          :pending-text="pendingText"
        />
      </template>

      <template #phases>
        <PhaseRail :phase="state.phase" />
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
            v-if="phase === 'spin' || phase === 'decision' || phase === 'strain' || phase === 'deal'"
            :state="state"
            :self-id="selfId"
            :self="self"
            :can-control="canControl"
            @spin="spin"
            @decide="decideMisfortune"
            @decide-strain="decideStrain"
            @deal="dealPacts"
            @set-major-order="setMajorOrder"
            @reroll="reroll"
          />

          <PactScreen
            v-else-if="phase === 'pacts'"
            :state="state"
            :self-id="selfId"
            :self="self"
            :can-control="canControl"
            @lock="lockPacts"
            @pact-risk="livePactRisk = $event"
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
            v-model:view="rewardsView"
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

    <!-- The phone shell swaps out DiveFrame, which owns the desktop Armory
         drawer — so the phone branch needs its own mount for the same ref. -->
    <ArmoryDrawer
      v-if="state && isPhone"
      v-model:open="armoryOpen"
      :state="state"
      :self-id="selfId"
    />

    <BriefingOverlay
      v-if="briefingOpen && state"
      :state="state"
      :self="self"
      :self-id="selfId"
      :mode="session.mode"
      :online="session.online.value"
      @close="closeBriefing"
    />
  </div>
</template>

<style scoped>
.dive-page { min-height: 100vh; }

.phase-stack { display: grid; gap: var(--gap-panel); }

.error-banner {
  border-color: var(--red);
  color: var(--red);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.kicked { border-color: var(--red); }

.pool { border-style: dashed; border-color: var(--line-2); background: transparent; }
.pool-count { display: flex; align-items: baseline; gap: var(--sp-3); }
.pool-count .disp { font-size: 26px; color: var(--text); }
.pool-bars { display: flex; gap: 3px; }
.pool-bars span { height: 4px; min-width: 6px; }
.pool-note { white-space: normal; }
</style>
