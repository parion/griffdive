<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core'
import { createSaveDoc } from '~~/shared/engine/saves'
import { diverOptions, majorOrderFronts, pactRiskOf, teamRiskBreakdown, teamRiskOf } from '~~/shared/engine/selectors'
import { VARIANTS } from '~~/shared/engine/progression'
import { deriveFront, deriveMisfortune, deriveStrain } from '~~/shared/engine/wheel'
import type { CrusadeSettings, DiverState, EngineAction, ItemRef, MajorOrderSelection, MissionReport } from '~~/shared/engine/types'
import { rememberDiverName, storeSeat } from '~/composables/useGameSocket'

const route = useRoute()
const slotId = computed(() => String(route.params.id))
const session = useDiveSession(slotId.value)
const saves = useSaves()
const { push: pushToast } = useToasts()
const { ownedWarbonds, setOwned } = useOwnedWarbonds()
const { openWarbonds } = useDrawers()
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

// The desktop right rail tabs between the Kit and Valor. It is shell state, so
// the diver's choice survives phase changes.
const railTab = ref<'kit' | 'valor'>('kit')

// The left rail collapses to an icon column; the choice is per browser so a
// diver who wants the wider mission centre keeps it across dives.
const leftCollapsed = useLocalStorage('griffdive:dive:rail-left-collapsed', false)

// The rail and the climb strip are shell state, not phase state: the page
// composes them from selectors so every phase shares one rail.
const variantName = computed(() =>
  VARIANTS.find(variant => variant.id === state.value?.settings?.variant)?.name ?? 'Crusade')
const crusadeLabel = computed(() => `${diverName(selfId.value)} · ${variantName.value}`)

const teamRisk = computed(() => state.value ? teamRiskOf(state.value) : 0)
const riskBreakdown = computed(() =>
  state.value
    ? teamRiskBreakdown(state.value)
    : { misfortuneRisk: 0, strainRisk: 0, majorOrderRisk: 0, mode: null, modeValor: 0, total: 0 })
// While a diver is still picking pacts the phase reports its live selection
// upward, so the shell's Valor rail previews the stake before the lock — and
// the Kit can ghost-grey the items those unsworn pacts would ban.
const livePactRisk = ref(0)
const pactPreview = ref<string[]>([])
const pactPreviewIds = computed(() =>
  state.value?.phase === 'pacts' && !self.value?.pactsLocked ? pactPreview.value : [])
const pactRisk = computed(() => {
  const diver = self.value
  if (!diver) {
    return 0
  }
  if (state.value?.phase === 'pacts' && !diver.pactsLocked) {
    return livePactRisk.value
  }
  return state.value ? pactRiskOf(diver, state.value.difficulty) : 0
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
const valorReadout = computed(() => ({
  difficulty: state.value?.difficulty ?? 0,
  teamRisk: teamRisk.value,
  misfortuneRisk: riskBreakdown.value.misfortuneRisk,
  strainRisk: riskBreakdown.value.strainRisk,
  majorOrderRisk: riskBreakdown.value.majorOrderRisk,
  modeRisk: riskBreakdown.value.modeValor,
  modeLabel: riskBreakdown.value.mode === 'penance' ? 'Super Penance' : 'SEAF Support',
  pactRisk: pactRisk.value,
  locked: valorLocked.value,
  diverName: diverName(selfId.value),
  pendingText: pendingText.value,
}))

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

// A fresh browser gets the tutorial the moment the diver is seated (right after
// the name gate). Its Warbonds step already declares ownership, so closing it
// lands straight on the dive — chaining a second panel buried the game itself.
const briefingOpen = ref(false)

watch([self, state], ([diver, current]) => {
  if (!diver || !current || briefingOpen.value || hasSeenDiveIntro.value) {
    return
  }
  briefingOpen.value = true
}, { immediate: true })

function openWarbondsIntro(): void {
  if (!hasSeenWarbondIntro.value && !briefingOpen.value) {
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

function closeBriefing(name: string): void {
  briefingOpen.value = false
  markDiveIntroSeen()
  markWarbondIntroSeen()
  if (name && name !== self.value?.name) {
    setNameDraft(name)
    commitName()
  }
}

function openBriefing(): void {
  briefingOpen.value = true
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
      ? deriveMisfortune(seed).id === current.wheel.misfortuneId
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

// The host referees the squad's team directive: mark it broken in the field and
// its shared risk is voided for everyone.
function failDirective(): void {
  dispatch({ type: 'FAIL_MISFORTUNE' })
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

// Requisition: buy a stocked item with the diver's sample bank (self-service).
function buyItem(itemId: string): void {
  if (selfId.value) {
    dispatch({ type: 'BUY_ITEM', playerId: selfId.value, itemId })
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

// Leaving steps away: the seat, kit and purse stay in the room, the squad
// just stops waiting on this diver. Coming back through RESUME (or the invite
// link) picks up exactly where they left.
async function leaveDive(): Promise<void> {
  const id = selfId.value
  if (id && session.mode === 'room') {
    dispatch({ type: 'SET_AWAY', playerId: id, away: true })
    // Wait for the server to apply it, so the Bridge never reads the room
    // before the step-away lands.
    await new Promise<void>((resolve) => {
      const timer = setTimeout(done, 2000)
      const stop = watch(
        () => state.value?.divers.find(diver => diver.id === id)?.away ?? true,
        (away) => {
          if (away) {
            done()
          }
        },
      )
      function done(): void {
        clearTimeout(timer)
        stop()
        resolve()
      }
    })
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

// Any seated diver can continue the crusade as host of a brand-new session:
// the server seats them where the save stopped and parks the divers who aren't
// here as claimable caches. The current dive is untouched.
const newSessionOpen = ref(false)
const canFork = computed(() =>
  session.mode === 'room'
  && !!self.value
  && !!state.value
  && state.value.phase !== 'lobby'
  && state.value.phase !== 'complete')

async function startNewSession(): Promise<void> {
  const current = state.value
  const id = selfId.value
  if (!current || !id) {
    return
  }
  newSessionOpen.value = false
  try {
    const res = await $fetch<{ code: string, selfId: string | null }>('/api/rooms', {
      method: 'POST',
      body: {
        save: { ...createSaveDoc(current, session.slotName.value, new Date().toISOString()), ownerId: id },
        name: self.value?.name ?? '',
      },
    })
    if (res.selfId) {
      storeSeat(res.code, res.selfId)
    }
    pushToast('New session started')
    navigateTo(`/dive/${res.code}`)
  }
  catch {
    pushToast('Could not start a new session', 'warn')
  }
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

function launchCrusade(settings: CrusadeSettings): void {
  commitName()
  dispatch({ type: 'START_DIVE', settings })
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
      :can-fork="canFork"
      :last-error="session.lastError.value?.message ?? null"
      @spin="spin"
      @decide="decideMisfortune"
      @decide-strain="decideStrain"
      @deal="dealPacts"
      @set-major-order="setMajorOrder"
      @reroll="reroll"
      @lock-pacts="lockPacts"
      @pact-risk="livePactRisk = $event"
      @preview="pactPreview = $event"
      @report="report"
      @fail-pact="failPact"
      @fail-directive="failDirective"
      @pick="pick"
      @reroll-rewards="rerollRewards"
      @ban-rewards="banRewards"
      @buy-reward="buyItem"
      @spin-bonus="spinBonus"
      @award-bonus="awardBonus"
      @advance="advance"
      @forfeit="forfeit"
      @claim-catch-up-option="claimCatchUpOption"
      @claim-cache="claimCache"
      @start="launchCrusade"
      @kick="kick"
      @transfer-host="transferHost"
      @copy-invite="copyInvite"
      @open-armory="armoryOpen = true"
      @open-tutorial="openBriefing"
      @leave="leaveDive"
      @end="endDive"
      @save-dive="saveDive"
      @unsave-dive="unsaveDive"
      @new-session="newSessionOpen = true"
      @abandon-slot="abandonSlot"
      @dismiss-error="session.dismissError()"
    />

    <DiveFrame
      v-else-if="state"
      :left="state.phase !== 'forfeit'"
      :right="state.phase !== 'lobby'"
      :left-collapsed="leftCollapsed"
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
          :can-fork="canFork"
          @copy-invite="copyInvite"
          @open-tutorial="openBriefing"
          @leave="leaveDive"
          @end="endDive"
          @save-dive="saveDive"
          @unsave-dive="unsaveDive"
          @new-session="newSessionOpen = true"
        />
      </template>

      <template #ladder>
        <CrusadeStrip
          :difficulty="state.difficulty"
          :achieved="state.achieved"
          :failed="state.phase === 'forfeit'"
          :mission-in-operation="state.missionInOperation"
          :op-length="opLength"
          :route="state.phase === 'lobby'"
        />
      </template>

      <template #left>
        <SquadStrip
          :state="state"
          :self-id="selfId"
          :online="session.online.value"
          :mode="session.mode"
          :is-host="session.selfIsHost.value"
          :can-control="canControl"
          :name-draft="nameDraft"
          :collapsed="leftCollapsed"
          @update:name-draft="setNameDraft"
          @commit="commitName"
          @transfer-host="transferHost"
          @kick="kick"
          @toggle="leftCollapsed = !leftCollapsed"
        />

        <SteamLobbyBox
          v-if="session.mode === 'room'"
          :steam="session.steam.value"
          :is-host="session.selfIsHost.value"
          :collapsed="leftCollapsed"
          @set-steam="session.setSteam"
          @expand="leftCollapsed = false"
        />

        <div
          v-if="!leftCollapsed"
          class="rail-lower"
        >
          <MissionReportSummary
            v-if="state.phase === 'rewards'"
            :state="state"
          />
        </div>
      </template>

      <template #right>
        <KitValorRail
          v-model="railTab"
          :state="state"
          :self-id="selfId"
          :valor="valorReadout"
          :preview-pact-ids="pactPreviewIds"
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
            :state="state"
            :self-id="selfId"
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
            @preview="pactPreview = $event"
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
            @fail-directive="failDirective"
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
            @buy="buyItem"
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
    </DiveFrame>
    <p
      v-else
      class="panel page muted"
    >
      Loading dive…
    </p>

    <!-- Desktop carries the Kit in its right rail; the phone shell has no rail,
         so its header opens the Kit in a drawer. -->
    <ArmoryDrawer
      v-if="state && isPhone"
      v-model:open="armoryOpen"
      :state="state"
      :self-id="selfId"
      :preview-pact-ids="pactPreviewIds"
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

    <AppDialog
      v-model:open="newSessionOpen"
      title="Start a new session?"
      description="Continue this crusade as host in a fresh room with a new code. Divers who aren't here leave the squad and their kits become claimable caches; this dive stays intact."
    >
      <div class="row">
        <button
          class="btn primary"
          type="button"
          @click="startNewSession"
        >
          Start new session
        </button>
        <button
          class="btn ghost"
          type="button"
          @click="newSessionOpen = false"
        >
          Cancel
        </button>
      </div>
    </AppDialog>
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

/* Everything below the squad list is bottom-anchored in the left rail. */
.rail-lower {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: var(--gap-panel);
  min-width: 0;
}
</style>
