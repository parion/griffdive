<script setup lang="ts">
import { useIntervalFn } from '@vueuse/core'
import { MAX_DIFFICULTY } from '~~/shared/engine/config'
import { createSaveDoc } from '~~/shared/engine/saves'
import { allDiversPicked, bonusFor, bonusWinners, diverOptions, majorOrderFronts, promotionPending } from '~~/shared/engine/selectors'
import { VARIANTS } from '~~/shared/engine/progression'
import { deriveFront, deriveMisfortune, deriveStrain } from '~~/shared/engine/wheel'
import type { CrusadeSettings, DiveState, DiverState, EngineAction, MajorOrderSelection, MissionOutcome, MissionReport } from '~~/shared/engine/types'
import { rememberDiverName, storeSeat } from '~/composables/useGameSocket'

const route = useRoute()
const slotId = computed(() => String(route.params.id))
const session = useDiveSession(slotId.value)
const saves = useSaves()
const { push: pushToast } = useToasts()
const { ownedWarbonds, setOwned } = useOwnedWarbonds()
const { openWarbonds, warbondsOpen } = useDrawers()
const { hasSeenWarbondIntro, markWarbondIntroSeen } = useWarbondIntro()
const { hasSeenDiveIntro, markDiveIntroSeen } = useDiveIntro()
const { markJoinBriefingSeen } = useJoinBriefing()
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
  setNameDraft,
  commitName,
} = useDiveView(session)

const dispatch = (action: EngineAction) => session.dispatch(action)

// A removed diver's hello is refused, so no snapshot arrives: the server's
// refusal message is the whole screen.
const removed = computed(() =>
  session.mode === 'room' && session.lastError.value?.code === 'kicked')

// The SEAF pack lands in the Starting Kit's "?" boxes in a modal over the wheel.
const kitReveal = useKitReveal(state, self, session.awaitingJoin, session.mode === 'local')

watch(phase, () => {
  reporting.value = false
})

// The old Valor readout is gone; the odds strip inside each phase carries the
// same information without a numeric total.
const variantName = computed(() =>
  VARIANTS.find(variant => variant.id === state.value?.settings?.variant)?.name ?? 'Crusade')
const crusadeLabel = computed(() => `${diverName(selfId.value)} · ${variantName.value}`)

// While a diver is still picking pacts the phase reports its live selection
// upward, so the Kit can ghost-grey the items those unsworn pacts would ban.
const pactPreview = ref<string[]>([])
const pactPreviewIds = computed(() =>
  state.value?.phase === 'pacts' && !self.value?.pactsLocked ? pactPreview.value : [])

// The report form and the in-field screen share one beat tab; the shell swaps
// its label to REPORT while the form is open.
const reporting = ref(false)

// The sidebar opens the Kit by itself for the field beat; the report form
// takes the stage without it.
const fieldKit = computed(() => phase.value === 'diving' && !reporting.value)

// Once the whole squad has banked, everyone regroups on an interstitial instead
// of idling on the draft: a mission-cleared beat mid-operation, the climb at
// its end. It is derived from synced state, so every diver sees the same beat;
// the engine stays in rewards and the host's ADVANCE is the only way on.
const squadBanked = computed(() =>
  state.value?.phase === 'rewards' && allDiversPicked(state.value))
const operationClimbs = computed(() =>
  Boolean(state.value)
  && state.value!.missionInOperation >= opLength.value
  && state.value!.difficulty < MAX_DIFFICULTY)

// A new beat starts at its top. Without this the stage keeps the scroll the
// last beat left behind — banking from the bottom of the draft would open the
// next screen halfway down. Narrow desktops scroll the window instead.
watch([phaseKey, squadBanked], () => {
  if (!import.meta.client) {
    return
  }
  document.getElementById('main-content')?.scrollTo({ top: 0 })
  window.scrollTo({ top: 0 })
})

// Squad Honors: the contest is spun when the report files and awarded from the
// dock. The stat is held back until the report's reel has landed (the phase
// moves on), so the dock never spoils the roll. The shell only reads the
// derived state; the engine owns eligibility.
const honors = computed(() => (state.value && state.value.phase !== 'diving' ? bonusFor(state.value) : null))
const honorsWinners = computed(() => (state.value ? bonusWinners(state.value).map(diver => upperName(diver.name)) : []))
const honorsAwarded = computed(() => Boolean(state.value?.bonusWinnerIds.length))
const sessionMenuOpen = ref(false)
const steamOpen = ref(false)
const steamBarOpen = ref(false)

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

// The host tutorial teaches the host's controls, so it is a host's alone: a fresh
// browser gets it as a full page the moment it is first seated as host (right
// with no gate before it), and its Warbonds button declares ownership, so closing
// it lands straight on the dive. Squadmates read the join briefing instead, before they
// are seated, and the Tutorial control replays that for them.
const briefingOpen = ref(false)
const joinReviewOpen = ref(false)
const hostReviewOpen = ref(false)

// Only the dive's founding diver gets it unasked: a squadmate the crown later
// migrates to (the host stepped away) is mid-dive, and reaches it from the
// Tutorial control.
watch(self, (diver, previous) => {
  if (!diver || previous || briefingOpen.value || hasSeenDiveIntro.value || !session.selfIsHost.value) {
    return
  }
  if (state.value?.divers[0]?.id === diver.id) {
    briefingOpen.value = true
  }
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
  hostReviewOpen.value = false
  markDiveIntroSeen()
  markWarbondIntroSeen()
  if (name && name !== self.value?.name) {
    setNameDraft(name)
    commitName()
  }
}

function openBriefing(): void {
  if (session.selfIsHost.value) {
    hostReviewOpen.value = true
  }
  else {
    joinReviewOpen.value = true
  }
}

// Before seating, the room is read once to tell the two first visits apart: an
// empty room is the host's own fresh dive (straight to the host tutorial),
// one that already holds a squad is a join by link (the join briefing). The
// briefing keeps the read fresh so its roster tracks the squad while it reads.
const joinPreview = ref<DiveState | null>(null)
const joinRole = ref<'probing' | 'host' | 'joiner'>('probing')

async function probeRoom(): Promise<void> {
  try {
    const res = await $fetch<{ state: DiveState }>(`/api/rooms/${slotId.value}`)
    joinPreview.value = res.state
    if (joinRole.value === 'probing') {
      joinRole.value = res.state.divers.length > 0 ? 'joiner' : 'host'
    }
  }
  catch {
    if (joinRole.value === 'probing') {
      joinRole.value = 'host'
    }
  }
}

const { pause: stopProbing, resume: startProbing } = useIntervalFn(probeRoom, 10_000, { immediate: false })

watch(() => session.awaitingJoin.value, (held) => {
  if (!held) {
    stopProbing()
    return
  }
  probeRoom()
  startProbing()
}, { immediate: true })

// A host seats straight away; the host tutorial's registry takes their callsign.
watch(joinRole, (role) => {
  if (role === 'host' && session.awaitingJoin.value) {
    session.connect()
  }
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

// The Steam editor is the host's dock, so the crown moving away closes it.
watch(() => session.selfIsHost.value, (isHost) => {
  if (!isHost) {
    steamBarOpen.value = false
  }
})

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

// Brasch's Bargains: one shelf item per operation, paid in credits (self-service).
function buyItem(itemId: string): void {
  if (selfId.value) {
    dispatch({ type: 'BUY_ITEM', playerId: selfId.value, itemId })
  }
}

function spinBonus(payload?: { stars: number, outcome: MissionOutcome }): void {
  dispatch({
    type: 'SPIN_BONUS',
    seed: session.newSeed(),
    stars: payload?.stars,
    outcome: payload?.outcome,
  })
}

function awardBonus(playerIds: string[]): void {
  dispatch({ type: 'AWARD_BONUS', playerIds })
}

// A mid-crusade joiner settles their Field Promotion before they dive — held
// back until the join gate, the briefing (tutorial or Field manual) and the
// Warbonds drawer are done, as the offer draws from the warbonds the diver
// declares there.
const promotionGateOpen = computed(() =>
  !!state.value
  && !!self.value
  && !kicked.value
  && !briefingOpen.value
  && !hostReviewOpen.value
  && !joinReviewOpen.value
  && !warbondsOpen.value
  && !kitReveal.active.value
  && !session.awaitingJoin.value
  && promotionPending(state.value, self.value))

// Held behind the host tutorial and the Warbonds drawer so one modal shows at a time.
const kitRevealOpen = computed({
  get: () => kitReveal.active.value && !briefingOpen.value && !warbondsOpen.value && !session.awaitingJoin.value,
  set: (open) => {
    if (!open) {
      kitReveal.dismiss()
    }
  },
})

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

// Each diver surrenders their own item from the offer they were dealt.
function forfeit(itemId: string): void {
  if (selfId.value) {
    dispatch({ type: 'FORFEIT_ITEM', playerId: selfId.value, itemId })
  }
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

// Host-owned: desktop toggles the dock bar; a phone opens the dialog because
// there is no squad bar to dock above.
function openSteam(): void {
  if (!session.selfIsHost.value) {
    return
  }
  if (isPhone.value) {
    steamOpen.value = true
    return
  }
  steamBarOpen.value = !steamBarOpen.value
}

// Host moderation.
function kick(diverId: string): void {
  dispatch({ type: 'KICK_DIVER', playerId: diverId })
  pushToast('Diver removed — this dive will not seat them again')
}

function transferHost(diverId: string): void {
  dispatch({ type: 'TRANSFER_HOST', playerId: diverId })
}

// The gate runs before joining: confirm stores the name so the first hello
// seats this diver named, then the connection opens.
function confirmJoinName(name: string): void {
  rememberDiverName(name)
  session.connect()
}

// The join briefing covers warbond ownership and the tutorial's ground, so a
// squadmate who read it lands on the dive with nothing else popping up.
function confirmJoinBriefing(name: string): void {
  markJoinBriefingSeen()
  markWarbondIntroSeen()
  confirmJoinName(name)
}

function launchCrusade(settings: CrusadeSettings, majorOrder: MajorOrderSelection | null): void {
  commitName()
  dispatch({ type: 'START_DIVE', settings, seed: session.newSeed(), majorOrder })
}
</script>

<template>
  <div class="dive-page">
    <template v-if="session.awaitingJoin.value">
      <BriefingJoin
        v-if="joinRole === 'joiner'"
        :state="joinPreview"
        :room-code="session.slotName.value"
        @confirm="confirmJoinBriefing"
      />
      <AppBootScreen v-else />
    </template>
    <BriefingHost
      v-else-if="briefingOpen && state"
      :state="state"
      :room-code="session.slotName.value"
      :self-name="self?.name ?? ''"
      @close="closeBriefing"
    />
    <section
      v-else-if="removed"
      class="panel page"
    >
      <h2>Removed from this dive</h2>
      <p>{{ session.lastError.value?.message }}</p>
      <p class="muted small">
        The host's removal stands for this dive. Joining a different dive is unaffected.
      </p>
      <NuxtLink
        class="btn"
        to="/"
      >
        Back to base
      </NuxtLink>
    </section>
    <p
      v-else-if="session.loadError.value"
      class="panel page"
    >
      Dive not found. <NuxtLink to="/">Back to base</NuxtLink>
    </p>
    <section
      v-else-if="session.mode === 'room' && session.connectionFailed.value"
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

    <DiveAchievedOverlay
      v-else-if="state && state.phase === 'complete' && state.achieved"
      :state="state"
      :crusade-label="crusadeLabel"
      :mode="session.mode"
      :slot-name="session.slotName.value"
    />

    <DivePhaseLobby
      v-else-if="state && state.phase === 'lobby' && !kicked"
      :state="state"
      :self-id="selfId"
      :can-control="canControl"
      :room-code="session.slotName.value"
      :last-error="session.lastError.value?.message ?? null"
      @start="launchCrusade"
      @copy-invite="copyInvite"
      @open-menu="sessionMenuOpen = true"
      @transfer-host="transferHost"
      @kick="kick"
      @dismiss-error="session.dismissError()"
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
      :steam="session.steam.value"
      :pact-preview-ids="pactPreviewIds"
      @spin="spin"
      @decide="decideMisfortune"
      @decide-strain="decideStrain"
      @deal="dealPacts"
      @reroll="reroll"
      @lock-pacts="lockPacts"
      @preview="pactPreview = $event"
      @report="report"
      @fail-pact="failPact"
      @fail-directive="failDirective"
      @pick="pick"
      @reroll-rewards="rerollRewards"
      @spin-bonus="spinBonus"
      @award-bonus="awardBonus"
      @advance="advance"
      @buy="buyItem"
      @forfeit="forfeit"
      @kick="kick"
      @transfer-host="transferHost"
      @copy-invite="copyInvite"
      @open-steam="openSteam"
      @open-tutorial="openBriefing"
      @leave="leaveDive"
      @end="endDive"
      @save-dive="saveDive"
      @unsave-dive="unsaveDive"
      @new-session="newSessionOpen = true"
      @abandon-slot="abandonSlot"
      @dismiss-error="session.dismissError()"
    />

    <DiveFrame v-else-if="state">
      <template #header>
        <DiveTopBar
          :state="state"
          :phase="state.phase"
          :reporting="reporting"
          :mode="session.mode"
          :slot-name="session.slotName.value"
          :status="session.status.value"
          :saved="Boolean(session.saved.value)"
          :can-control="canControl"
          :is-host="session.selfIsHost.value"
          @open-tutorial="openBriefing"
          @open-menu="sessionMenuOpen = true"
        />
      </template>

      <p
        v-if="kicked"
        class="panel kicked"
      >
        You were removed from this dive by the host. This dive will not seat you again.
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

      <Transition
        v-if="!kicked"
        name="phase"
        mode="out-in"
      >
        <div
          :key="phaseKey"
          class="phase-stack"
        >
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
            @reroll="reroll"
          />

          <PactScreen
            v-else-if="phase === 'pacts'"
            :state="state"
            :self-id="selfId"
            :self="self"
            :can-control="canControl"
            @lock="lockPacts"
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
            @reporting="reporting = $event"
            @spin-bonus="spinBonus"
          />

          <Transition
            v-if="phase === 'rewards'"
            name="phase"
            mode="out-in"
          >
            <OperationCleared
              v-if="squadBanked && operationClimbs"
              :state="state"
              :self="self"
              :self-id="selfId"
              :can-control="canControl"
              @start="advance"
              @buy="buyItem"
            />
            <MissionCleared
              v-else-if="squadBanked"
              :state="state"
              :self="self"
              :self-id="selfId"
              :can-control="canControl"
              :op-length="opLength"
              @advance="advance"
              @buy="buyItem"
            />
            <DivePhaseRewards
              v-else
              :state="state"
              :self-id="selfId"
              :self="self"
              :can-control="canControl"
              :op-length="opLength"
              @pick="pick"
              @reroll="rerollRewards"
              @advance="advance"
            />
          </Transition>

          <DivePhaseForfeit
            v-if="phase === 'forfeit'"
            :state="state"
            :self-id="selfId"
            :self="self"
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

      <template #aside>
        <DiveSidebar
          :state="state"
          :self-id="selfId"
          :self="self"
          :preview-pact-ids="pactPreviewIds"
          :field-kit="fieldKit"
          @buy="buyItem"
        />
      </template>

      <template #dock>
        <div class="dock-stack">
          <Transition name="steam-bar">
            <SteamLobbyBar
              v-if="steamBarOpen && session.mode === 'room' && session.selfIsHost.value"
              :steam="session.steam.value"
              @set-steam="session.setSteam"
              @close="steamBarOpen = false"
            />
          </Transition>
          <SquadDock
            :state="state"
            :self-id="selfId"
            :online="session.online.value"
            :mode="session.mode"
            :is-host="session.selfIsHost.value"
            :can-control="canControl"
            :slot-name="session.slotName.value"
            :steam="session.steam.value"
            :steam-panel-open="steamBarOpen"
            :honors="honors"
            :honors-winners="honorsWinners"
            :honors-awarded="honorsAwarded"
            @transfer-host="transferHost"
            @kick="kick"
            @copy-invite="copyInvite"
            @open-steam="openSteam"
            @award-bonus="awardBonus"
          />
        </div>
      </template>
    </DiveFrame>
    <AppBootScreen v-else />

    <DiveMenu
      v-if="state"
      v-model:open="sessionMenuOpen"
      :mode="session.mode"
      :saved="Boolean(session.saved.value)"
      :can-fork="canFork"
      :can-control="canControl"
      :is-host="session.selfIsHost.value"
      :lone-host="state.divers.length === 1"
      :room-code="session.slotName.value"
      @open-tutorial="openBriefing"
      @copy-invite="copyInvite"
      @save-dive="saveDive"
      @unsave-dive="unsaveDive"
      @new-session="newSessionOpen = true"
      @leave="leaveDive"
      @end="endDive"
    />

    <AppDialog
      v-if="state"
      v-model:open="steamOpen"
      title="Steam lobby"
      description="Paste the join link from Helldivers 2 so the squad can meet in-game."
      size="sm"
    >
      <SteamLobbyBox
        :steam="session.steam.value"
        @set-steam="session.setSteam"
      />
    </AppDialog>

    <AppDialog
      v-if="state && session.selfIsHost.value"
      v-model:open="hostReviewOpen"
      title="Host tutorial"
      description="What the host does, and where your gear lives."
      size="lg"
    >
      <BriefingHost
        :state="state"
        :room-code="session.slotName.value"
        :self-name="self?.name ?? ''"
        review
        @close="closeBriefing"
      />
    </AppDialog>

    <KitReveal
      v-if="state?.settings && self?.supportKit?.length && state.phase !== 'lobby'"
      :open="kitRevealOpen"
      :variant="state.settings.variant"
      :mode="state.settings.mode"
      :support="self.supportKit"
      @update:open="kitRevealOpen = $event"
    />

    <FieldPromotionGate
      v-if="state && self"
      :open="promotionGateOpen"
      :state="state"
      :diver="self"
      @claim-option="claimCatchUpOption"
      @claim-cache="claimCache"
      @open-warbonds="openWarbonds"
    />

    <AppDialog
      v-if="state && !session.selfIsHost.value"
      v-model:open="joinReviewOpen"
      title="Field manual"
      description="What a squadmate does, and where your gear lives."
      size="lg"
    >
      <BriefingJoin
        :state="state"
        :room-code="session.slotName.value"
        :self-name="self?.name ?? ''"
        review
        @close="joinReviewOpen = false"
      />
    </AppDialog>

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

.dock-stack {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.steam-bar-enter-active,
.steam-bar-leave-active {
  transition: opacity var(--dur-med) var(--ease-out), translate var(--dur-med) var(--ease-out);
}
.steam-bar-enter-from,
.steam-bar-leave-to {
  opacity: 0;
  translate: 0 10px;
}

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

@media (prefers-reduced-motion: reduce) {
  .steam-bar-enter-active,
  .steam-bar-leave-active { transition: none; }
}
</style>
