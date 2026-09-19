<script setup lang="ts">
import { MAX_DIFFICULTY, maxStarsFor, missionsPerOperation, sampleAvailability } from '~~/shared/engine/config'
import { ALL_WARBOND_CODES } from '~~/shared/data/catalog'
import { difficultyName } from '~~/shared/engine/progression'
import { difficultyImageUrl } from '~~/shared/data/images'
import { pactName } from '~~/shared/data/pacts'
import { applyPactToggle, hasLegalLoadout, pactConflictsWith, pactRiskTotal, pactSubsumedBy } from '~~/shared/engine/pacts'
import { performanceValor } from '~~/shared/engine/rewards'
import {
  activeMisfortune,
  allDiversPicked,
  ceilingRangeForDifficulty,
  currentFront,
  diverCeiling,
  diverOptions,
  pactOfferFor,
  pactRiskOf,
  rewardPoolFor,
  teamRiskOf,
} from '~~/shared/engine/selectors'
import { performanceValor } from '~~/shared/engine/rewards'
import type { CrusadeVariant, EngineAction, ItemRef } from '~~/shared/engine/types'
import { deriveFront, deriveMisfortune } from '~~/shared/engine/wheel'
import { rememberDiverName } from '~/composables/useGameSocket'

const route = useRoute()
const slotId = computed(() => String(route.params.id))
const session = useDiveSession(slotId.value)
const saves = useSaves()

const dispatch = (action: EngineAction) => session.dispatch(action)

const canControl = computed(() => session.mode === 'local' || session.selfIsHost.value)

const self = computed(() =>
  session.state.value?.divers.find(diver => diver.id === session.selfId.value) ?? null)
const misfortune = computed(() => (session.state.value ? activeMisfortune(session.state.value) : null))
const front = computed(() => (session.state.value ? currentFront(session.state.value) : null))

const { push: pushToast } = useToasts()

function diverName(id: string | null): string {
  return session.state.value?.divers.find(diver => diver.id === id)?.name ?? 'another diver'
}

// Hostship moves under the squad's feet (disconnect migration) with no other
// signal — announce the crown's arrival and departure.
watch(
  () => session.state.value?.hostId ?? null,
  (hostId, previous) => {
    if (!hostId || !previous || hostId === previous) {
      return
    }
    if (hostId === session.selfId.value) {
      pushToast('You are now host.')
    }
    else if (previous === session.selfId.value) {
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

const pactSelection = ref<string[]>([])
// A new draw or a flipped decision rolls a fresh offer — start the pick clean.
// Primitive getters compare by value; a getter returning a fresh array would
// re-fire on every snapshot (e.g. another diver locking pacts) and wipe picks
// that are still in progress.
watch(
  () => session.state.value?.wheel?.seed,
  () => {
    pactSelection.value = []
  },
)
watch(
  () => session.state.value?.misfortuneAccepted,
  () => {
    pactSelection.value = []
  },
)

// The offer exists only once the wheel decision is in; it is derived from the
// seed, so every client shows this diver the same 2–3 pacts.
const pactOffer = computed(() =>
  session.state.value && session.selfId.value
    ? pactOfferFor(session.state.value, session.selfId.value)
    : [])

// Once the diver banks their reward, surface the squad inventory so the new
// item is visible without hunting for it.
const squadInventory = ref<HTMLDetailsElement | null>(null)
watch(
  () => self.value?.pickedOptionId ?? null,
  (picked) => {
    if (picked && squadInventory.value) {
      squadInventory.value.open = true
    }
  },
)

function togglePact(pactId: string): void {
  pactSelection.value = applyPactToggle(
    pactOffer.value.map(pact => pact.id),
    pactSelection.value,
    pactId,
  )
}

// Offered pacts the current selection rules out — greyed with the reason:
// covered by a stronger pick, a same-axis conflict, or a loadout that can no
// longer field HD2's four required stratagems.
const pactCoverage = computed<Record<string, string>>(() => {
  const state = session.state.value
  if (!state) {
    return {}
  }
  const blocked: Record<string, string> = {}
  const misfortuneId = misfortune.value?.id ?? null
  const owned = state.personalInventories[session.selfId.value ?? ''] ?? []
  const baseLegal = hasLegalLoadout(misfortuneId, [], owned)
  for (const pact of pactOffer.value) {
    if (pactSelection.value.includes(pact.id)) {
      continue
    }
    const subsumer = pactSubsumedBy(pact.id, pactSelection.value)
    if (subsumer) {
      blocked[pact.id] = `Covered by ${pactName(subsumer)}`
      continue
    }
    const conflict = pactConflictsWith(pact.id, pactSelection.value)
    if (conflict) {
      blocked[pact.id] = `Conflicts with ${pactName(conflict)}`
      continue
    }
    if (baseLegal && !hasLegalLoadout(misfortuneId, [...pactSelection.value, pact.id], owned)) {
      blocked[pact.id] = 'Leaves too few stratagems to ready up'
    }
  }
  return blocked
})

const lockedCeiling = computed(() =>
  session.state.value && self.value ? diverCeiling(session.state.value, self.value) : null,
)

// The diver's committed pact risk (failed pacts already voided) — the locked
// Valor meter and the briefing both read it, so a field-failed pact visibly
// drops the ceiling everywhere at once.
const selfPactRisk = computed(() => (self.value ? pactRiskOf(self.value) : 0))
const selfPerformance = computed(() => performanceValor(session.state.value?.lastReport ?? null))

const wheelRange = computed(() =>
  session.state.value ? ceilingRangeForDifficulty(session.state.value.difficulty) : null,
)

const options = computed(() =>
  session.state.value && self.value ? diverOptions(session.state.value, self.value) : [],
)

// Liberty's Cross picks from the diver's own catalog: their declared warbonds
// minus anything already owned. Same personal-pool rule as the rolled offers.
const rewardPool = computed(() =>
  self.value ? rewardPoolFor(self.value.warbondCodes ?? ALL_WARBOND_CODES) : [])
const ownedIds = computed(() =>
  session.state.value?.personalInventories[session.selfId.value ?? ''] ?? [])

// spin, the wheel decision and pacts share one scene so the wheel reveal isn't
// interrupted by the phase flips that follow the spin.
const phaseKey = computed(() => {
  const phase = session.state.value?.phase
  return phase === 'spin' || phase === 'decision' || phase === 'pacts' ? 'spin-pacts' : phase
})

const reportMode = ref<'none' | 'success' | 'failure'>('none')
const stars = ref(1)
const timePct = ref(0)
const samples = ref({ common: 0, rare: 0, super: 0 })

// Slider maxima come from the game's per-difficulty sample availability.
const sampleMax = computed(() =>
  sampleAvailability(session.state.value?.difficulty ?? MAX_DIFFICULTY))

// Live preview of the team-performance Valor this report will carry.
const performancePreview = computed(() =>
  performanceValor({
    outcome: 'success',
    stars: 0,
    timePct: timePct.value,
    samples: { ...samples.value },
  }))

const maxStars = computed(() =>
  maxStarsFor(session.state.value?.difficulty ?? MAX_DIFFICULTY))
const opLength = computed(() =>
  missionsPerOperation(session.state.value?.difficulty ?? MAX_DIFFICULTY))

function spin(): void {
  dispatch({ type: 'SPIN_WHEEL', seed: newSeed() })
}

function reroll(wheel: 'misfortune' | 'front'): void {
  const state = session.state.value
  if (!state?.wheel) {
    return
  }
  // Spins are seeds, but a reroll must actually move: draw fresh seeds until
  // the derived result differs from the one being replaced (the reducer refuses
  // a same-result seed too, so a hostile client can't fake it).
  let seed = newSeed()
  for (let attempt = 0; attempt < 32; attempt++) {
    const same = wheel === 'misfortune'
      ? deriveMisfortune(seed, state.difficulty).id === state.wheel.misfortuneId
      : deriveFront(seed) === state.frontId
    if (!same) {
      break
    }
    seed = newSeed()
  }
  dispatch({ type: 'REROLL_WHEEL', wheel, seed })
}

function decideMisfortune(accepted: boolean): void {
  dispatch({ type: 'ACCEPT_MISFORTUNE', accepted })
}

function lockPacts(): void {
  if (session.selfId.value) {
    dispatch({ type: 'SET_PACTS', playerId: session.selfId.value, pactIds: [...pactSelection.value] })
  }
}

// Broken pacts are marked in the field: by the diver themselves, or by the
// host refereeing the squad.
function failPact(playerId: string, pactId: string): void {
  dispatch({ type: 'FAIL_PACT', playerId, pactId })
}

function report(outcome: 'success' | 'failure'): void {
  dispatch({
    type: 'REPORT_RESULT',
    outcome,
    stars: outcome === 'success' ? stars.value : 0,
    timePct: timePct.value,
    samples: outcome === 'success' ? { ...samples.value } : undefined,
  })
  reportMode.value = 'none'
}

// The stars field opens at the difficulty's best result — most clears are
// full-star, so the common case needs no adjustment.
function openReport(mode: 'success' | 'failure'): void {
  reportMode.value = mode
  stars.value = maxStars.value
  timePct.value = 0
  samples.value = { common: 0, rare: 0, super: 0 }
}

function cancelReport(): void {
  reportMode.value = 'none'
  stars.value = maxStars.value
  timePct.value = 0
  samples.value = { common: 0, rare: 0, super: 0 }
}

function pick(optionId: string, choiceItemId?: string): void {
  if (!session.selfId.value) {
    return
  }
  dispatch(choiceItemId
    ? { type: 'PICK_REWARD', playerId: session.selfId.value, optionId, choiceItemId }
    : { type: 'PICK_REWARD', playerId: session.selfId.value, optionId })
}

function claimCatchUpOption(optionId: string): void {
  if (session.selfId.value) {
    dispatch({ type: 'CLAIM_CATCHUP_OPTION', playerId: session.selfId.value, optionId })
  }
}

function claimCache(cacheOwnerId: string): void {
  if (session.selfId.value) {
    dispatch({ type: 'CLAIM_CACHE', playerId: session.selfId.value, cacheOwnerId })
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
  if (session.selfId.value) {
    dispatch({ type: 'LEAVE_DIVE', playerId: session.selfId.value })
  }
  navigateTo('/')
}

function abandonSlot(): void {
  if (session.mode === 'local') {
    saves.deleteSlot(slotId.value)
  }
  navigateTo('/')
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

function isOnline(diverId: string): boolean {
  return session.online.value.includes(diverId)
}

// Waiting status per diver, from engine state — purely presentational, so the
// squad can see who still needs to act. Absent outside the deciding phases.
const diverStatuses = computed<Record<string, string>>(() => {
  const state = session.state.value
  const statuses: Record<string, string> = {}
  if (!state) {
    return statuses
  }
  for (const diver of state.divers) {
    if (state.phase === 'pacts') {
      statuses[diver.id] = diver.pactsLocked ? 'ready' : 'choosing pacts'
    }
    else if (state.phase === 'rewards') {
      if (diver.skipsCurrentDraft) {
        statuses[diver.id] = 'skips this draft'
      }
      else {
        statuses[diver.id] = diver.pickedOptionId !== null ? 'ready' : 'choosing reward'
      }
    }
  }
  return statuses
})

// Host moderation: remove a diver who left or is blocking the squad.
function canKick(diverId: string): boolean {
  return session.mode === 'room'
    && session.selfIsHost.value
    && diverId !== session.selfId.value
    && diverId !== session.state.value?.hostId
}

function kick(diverId: string): void {
  dispatch({ type: 'KICK_DIVER', playerId: diverId })
}

// Host moderation: the crown can be handed to any other seated diver.
function canTransferHost(diverId: string): boolean {
  return session.mode === 'room'
    && session.selfIsHost.value
    && diverId !== session.selfId.value
    && diverId !== session.state.value?.hostId
}

function transferHost(diverId: string): void {
  dispatch({ type: 'TRANSFER_HOST', playerId: diverId })
}

const kicked = computed(() =>
  session.mode === 'room'
  && !!session.state.value
  && !!session.selfId.value
  && !session.state.value.divers.some(diver => diver.id === session.selfId.value))

// Online-room lobby: the host configures and launches the crusade here.
const lobbyVariant = ref<CrusadeVariant>('standard')
const nameDraft = ref('')
const nameTouched = ref(false)

// Adopt the diver's actual name (welcome snapshot / local save) until edited.
watch(() => self.value?.name, (name) => {
  if (name && !nameTouched.value) {
    nameDraft.value = name
  }
}, { immediate: true })

function commitName(): void {
  const name = nameDraft.value.trim() || 'Diver'
  nameTouched.value = true
  rememberDiverName(name)
  nameDraft.value = name
  if (session.selfId.value) {
    dispatch({ type: 'SET_NAME', playerId: session.selfId.value, name })
  }
}

// The name gate runs before joining: confirm stores the name so the first
// hello seats this diver named, then the connection opens.
function confirmJoinName(name: string): void {
  rememberDiverName(name)
  session.connect()
}

function launchCrusade(): void {
  commitName()
  dispatch({ type: 'START_DIVE', settings: { variant: lobbyVariant.value } })
}

// Warbonds are what each diver actually owns — declared per diver, any phase.
function commitWarbonds(codes: string[]): void {
  if (session.selfId.value) {
    dispatch({ type: 'SET_WARBONDS', playerId: session.selfId.value, warbondCodes: codes })
  }
}
</script>

<template>
  <main class="page">
    <JoinNameGate
      v-if="session.awaitingName.value"
      @confirm="confirmJoinName"
    />
    <p
      v-if="session.loadError.value"
      class="panel"
    >
      Dive not found. <NuxtLink to="/">Back to base</NuxtLink>
    </p>
    <section
      v-else-if="session.mode === 'room' && !session.awaitingName.value && session.connectionFailed.value"
      class="panel"
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
    <template v-else-if="session.state.value">
      <header class="page-header">
        <div>
          <div class="title-row">
            <h1 class="mono">
              {{ session.slotName.value || 'Dive' }}
            </h1>
            <button
              v-if="session.mode === 'room'"
              class="copy-code"
              type="button"
              aria-label="Copy invite link"
              title="Copy invite link"
              @click="copyInvite"
            >
              <IconCopy />
            </button>
          </div>
          <div class="dive-meta">
            <img
              class="diff-icon"
              :src="difficultyImageUrl(session.state.value.difficulty)"
              alt=""
              draggable="false"
            >
            <div class="meta-stack">
              <span class="diff-descriptor">
                <span class="diff-name">{{ difficultyName(session.state.value.difficulty) }}</span>
                <span class="diff-num">{{ session.state.value.difficulty }}</span>
              </span>
              <MissionTrack
                :mission-in-operation="session.state.value.missionInOperation"
                :op-length="opLength"
                :mission-index="session.state.value.missionIndex"
                :failed="session.state.value.phase === 'forfeit'"
              />
            </div>
          </div>
        </div>
        <div class="row">
          <span
            v-if="session.mode === 'room'"
            class="chip"
            :class="{ warn: session.status.value !== 'connected' }"
          >
            {{ session.status.value }}
          </span>
          <span
            v-if="lockedCeiling"
            class="row small muted"
          >ceiling <Motion
            :key="lockedCeiling"
            as="span"
            class="badge-pop"
            :initial="{ opacity: 0, scale: 0.4 }"
            :animate="{ opacity: 1, scale: 1 }"
            :transition="{ type: 'spring', stiffness: 500, damping: 15 }"
          ><TierBadge
            :tier="lockedCeiling"
            size="sm"
          /></Motion></span>
          <span class="muted small">tokens {{ session.state.value.rerollTokens }}</span>
          <button
            v-if="session.mode === 'room' && session.state.value.phase !== 'complete'"
            class="btn ghost tiny"
            type="button"
            @click="leaveDive"
          >
            Leave dive
          </button>
          <button
            v-if="canControl && session.state.value.phase !== 'complete'"
            class="btn ghost tiny"
            type="button"
            @click="endDive"
          >
            End dive
          </button>
        </div>
      </header>

      <section class="panel squad-strip">
        <div class="row">
          <span
            v-for="diver in session.state.value.divers"
            :key="diver.id"
            class="chip diver-chip"
            :class="{ warn: !isOnline(diver.id) }"
            :title="isOnline(diver.id) ? 'online' : 'offline'"
          >
            <span
              class="dot"
              :class="{ on: isOnline(diver.id) }"
              role="img"
              :aria-label="isOnline(diver.id) ? 'Online' : 'Offline'"
            /><input
              v-if="diver.id === session.selfId.value"
              v-model="nameDraft"
              class="self-name"
              type="text"
              maxlength="32"
              title="Your name"
              aria-label="Your name"
              @change="commitName"
            >
            <template v-else>{{ diver.name }}</template>
            <span
              v-if="diver.id === session.state.value?.hostId"
              class="crown"
              role="img"
              aria-label="Host"
            >★</span>
            <span
              v-if="diverStatuses[diver.id]"
              class="status-chip"
              :class="{ ready: diverStatuses[diver.id] === 'ready' }"
              role="img"
              :aria-label="diverStatuses[diver.id]"
              :title="diverStatuses[diver.id]"
            >{{ diverStatuses[diver.id] }}</span>
            <span
              v-if="diver.catchUpOwed > 0"
              class="catchup-chip"
              role="img"
              :aria-label="`Field Promotion: ${diver.catchUpOwed} picks owed`"
              title="Field Promotion picks owed"
            >+{{ diver.catchUpOwed }}</span>
            <span
              v-if="diver.id === session.selfId.value"
              class="muted small"
            >(you)</span>
            <button
              v-if="canTransferHost(diver.id)"
              class="handover"
              type="button"
              :aria-label="`Hand host to ${diver.name}`"
              title="Hand over host"
              @click="transferHost(diver.id)"
            >
              host
            </button>
            <button
              v-if="canKick(diver.id)"
              class="kick"
              type="button"
              :aria-label="`Kick ${diver.name} from the squad`"
              title="Kick from squad"
              @click="kick(diver.id)"
            >
              ×
            </button>
          </span>
          <p
            v-if="session.mode === 'room' && session.state.value.divers.length === 1"
            class="lone-host"
          >
            You're the only diver here — share the invite link to bring in your squad.
          </p>
        </div>
      </section>

      <p
        v-if="kicked"
        class="panel kicked"
      >
        You were removed from this dive by the host.
        <NuxtLink to="/">Back to base</NuxtLink>
      </p>

      <details
        v-if="self"
        class="panel self-warbonds"
      >
        <summary>Your warbonds</summary>
        <p class="muted small">
          Warbonds are personal purchases — your reward offers only include items you own.
          Each diver declares their own; the host doesn't set these.
        </p>
        <WarbondPicker
          :warbond-codes="self.warbondCodes"
          @update:warbond-codes="commitWarbonds"
        />
      </details>

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
        v-if="self && self.catchUpOwed > 0 && session.state.value.phase !== 'complete'"
        :state="session.state.value"
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
          <template v-if="session.state.value.phase === 'lobby'">
            <section
              v-if="canControl"
              class="panel"
            >
              <h2>Launch the crusade</h2>
              <CrusadeSetup
                v-model:variant="lobbyVariant"
                start-label="Launch crusade"
                @start="launchCrusade"
              />
            </section>
            <p
              v-else
              class="panel muted"
            >
              Waiting for the host to launch the crusade…
            </p>
          </template>

          <template v-if="session.state.value.phase === 'spin' || session.state.value.phase === 'decision' || session.state.value.phase === 'pacts'">
            <WheelPanel
              :state="session.state.value"
              :can-control="canControl"
              @spin="spin"
              @decide="decideMisfortune"
              @reroll="reroll"
            />
            <p
              v-if="wheelRange && !session.state.value.wheel"
              class="row small muted"
            >
              No misfortune: <TierBadge
                :tier="wheelRange.min"
                size="sm"
              /> · strongest accepted: <TierBadge
                :tier="wheelRange.max"
                size="sm"
              /> (~{{ Math.round(wheelRange.odds * 100) }}%)
            </p>
            <template v-if="session.state.value.phase === 'pacts'">
              <Transition
                name="phase"
                mode="out-in"
              >
                <div
                  :key="self?.pactsLocked ? 'locked' : 'picking'"
                  class="stack"
                >
                  <div
                    v-if="self?.pactsLocked"
                    class="panel"
                  >
                    <h2>Pacts locked</h2>
                    <p class="muted small">
                      Waiting for the rest of the squad to lock in…
                    </p>
                    <p class="row small">
                      <span class="muted">Yours:</span>
                      <span
                        v-for="pactId in self.pactIds"
                        :key="pactId"
                        class="chip"
                      >{{ pactName(pactId) }}</span>
                    </p>
                    <ValorMeter
                      :difficulty="session.state.value.difficulty"
                      :team-risk="teamRiskOf(session.state.value)"
                      :pact-risk="selfPactRisk"
                      locked
                    />
                  </div>
                  <template v-else>
                    <PactPicker
                      :offer="pactOffer"
                      :selected="pactSelection"
                      :blocked="pactCoverage"
                      @toggle="togglePact"
                      @lock="lockPacts"
                    />
                    <ValorMeter
                      :difficulty="session.state.value.difficulty"
                      :team-risk="teamRiskOf(session.state.value)"
                      :pact-risk="pactRiskTotal(pactSelection)"
                    />
                  </template>
                </div>
              </Transition>
            </template>
          </template>

          <template v-if="session.state.value.phase === 'diving'">
            <section class="panel">
              <h2>Briefing</h2>
              <p>
                <template v-if="misfortune">
                  <strong>{{ misfortune.name }}</strong> — {{ misfortune.rule }}
                  · vs <strong
                    :style="front ? { color: front.accent } : undefined"
                  >{{ front?.displayName }}</strong>
                </template>
                <template v-else>
                  No team misfortune — safe dive
                  · vs <strong
                    :style="front ? { color: front.accent } : undefined"
                  >{{ front?.displayName }}</strong>
                </template>
              </p>
              <PactBriefing
                :divers="session.state.value.divers"
                :self-id="session.selfId.value"
                :is-host="session.selfIsHost.value"
                @fail="failPact"
              />
              <ValorMeter
                :difficulty="session.state.value.difficulty"
                :team-risk="teamRiskOf(session.state.value)"
                :pact-risk="selfPactRisk"
                locked
              />
              <div
                v-if="canControl"
                class="row"
              >
                <button
                  class="btn primary"
                  type="button"
                  @click="openReport('success')"
                >
                  Mission complete
                </button>
                <button
                  class="btn danger"
                  type="button"
                  @click="openReport('failure')"
                >
                  Mission failed
                </button>
              </div>
              <p
                v-else
                class="muted small"
              >
                Waiting for the host to report the mission result.
              </p>
              <div
                v-if="reportMode !== 'none'"
                class="report-form"
              >
                <div
                  v-if="reportMode === 'success'"
                  class="row"
                >
                  <span class="muted small">Stars</span>
                  <StarRating
                    v-model="stars"
                    :length="maxStars"
                  />
                  <span class="muted small">of {{ maxStars }} at this difficulty</span>
                </div>
                <div
                  v-if="reportMode === 'success'"
                  class="report-fields"
                >
                  <RangeField
                    v-model="samples.common"
                    :max="sampleMax.common"
                    icon="/images/svgs/Common_Sample_Icon.svg"
                    aria-label="Common samples"
                  />
                  <RangeField
                    v-if="sampleMax.rare > 0"
                    v-model="samples.rare"
                    :max="sampleMax.rare"
                    icon="/images/svgs/Rare_Sample_Icon.svg"
                    aria-label="Rare samples"
                  />
                  <RangeField
                    v-if="sampleMax.super > 0"
                    v-model="samples.super"
                    :max="sampleMax.super"
                    icon="/images/svgs/Super_Sample_Icon.svg"
                    aria-label="Super samples"
                  />
                </div>
                <RangeField
                  v-model="timePct"
                  :max="100"
                  label="Time remaining %"
                  aria-label="Time remaining percent"
                />
                <p
                  v-if="reportMode === 'success'"
                  class="muted small valor-preview"
                >
                  Team performance adds <strong>+{{ performancePreview.toFixed(2) }}</strong> Valor
                </p>
                <div class="row">
                  <button
                    class="btn primary"
                    type="button"
                    @click="report(reportMode === 'success' ? 'success' : 'failure')"
                  >
                    Submit {{ reportMode === 'success' ? 'success' : 'failure' }}
                  </button>
                  <button
                    class="btn ghost tiny"
                    type="button"
                    @click="cancelReport"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </section>
          </template>

          <template v-if="session.state.value.phase === 'rewards'">
            <ValorMeter
              :difficulty="session.state.value.difficulty"
              :team-risk="teamRiskOf(session.state.value)"
              :pact-risk="selfPactRisk"
              :performance="selfPerformance"
              locked
            />
            <RewardDraft
              :options="options"
              :picked-id="self?.pickedOptionId ?? null"
              :pool="rewardPool"
              :owned-ids="ownedIds"
              :options-lost="self?.failedPactIds.length ?? 0"
              @pick="pick"
            />
            <Transition name="phase">
              <div
                v-if="allDiversPicked(session.state.value)"
                class="row"
              >
                <button
                  class="btn primary"
                  type="button"
                  :disabled="!canControl"
                  @click="advance"
                >
                  {{ session.state.value.missionInOperation >= opLength
                    ? `Complete operation → difficulty ${Math.min(session.state.value.difficulty + 1, MAX_DIFFICULTY)}`
                    : 'Next mission' }}
                </button>
                <span
                  v-if="!canControl"
                  class="muted small"
                >Waiting for the host…</span>
              </div>
            </Transition>
          </template>

          <template v-if="session.state.value.phase === 'forfeit'">
            <section class="panel forfeit">
              <h2>Operation failed</h2>
              <p class="muted">
                The operation restarts. Choose <strong>one</strong> item for the squad to lose —
                any item from any diver's personal inventory, stratagems included.
                The front carries over; the retry draws a fresh misfortune.
              </p>
            </section>
            <InventoryGrid
              :state="session.state.value"
              :select-mode="canControl"
              @forfeit="forfeit"
            />
          </template>

          <template v-if="session.state.value.phase === 'complete'">
            <section class="panel victory">
              <Motion
                as="h1"
                :initial="{ opacity: 0, scale: 0.8, y: 12 }"
                :animate="{ opacity: 1, scale: 1, y: 0 }"
                :transition="{ type: 'spring', stiffness: 260, damping: 14 }"
              >
                {{ session.state.value.achieved ? 'GRIFFDIVE ACHIEVED' : 'Dive ended' }}
              </Motion>
              <p class="muted">
                {{ session.state.value.achieved
                  ? 'Operation complete at difficulty 10. Super Earth thanks you, divers.'
                  : 'The crusade was ended early.' }}
              </p>
              <p class="row small muted">
                {{ session.state.value.missionIndex }} missions · {{ session.state.value.completedCombos.length }} combos completed
                · {{ Object.values(session.state.value.personalInventories).flat().length }} items owned across the squad
              </p>
              <div class="row">
                <button
                  v-if="session.mode === 'local'"
                  class="btn danger"
                  type="button"
                  @click="abandonSlot"
                >
                  Delete save
                </button>
                <NuxtLink
                  class="btn"
                  to="/"
                >Back to base</NuxtLink>
              </div>
            </section>
          </template>
        </div>
      </Transition>

      <details
        v-if="session.state.value.phase !== 'lobby'"
        ref="squadInventory"
        class="panel"
      >
        <summary>Kit inventory</summary>
        <InventoryGrid
          :state="session.state.value"
          :self-id="session.selfId.value"
        />
      </details>
    </template>
    <p
      v-else
      class="panel muted"
    >
      Loading dive…
    </p>
  </main>
</template>

<style scoped>
.phase-stack { display: grid; gap: 1rem; }
.stack { display: grid; gap: 0.6rem; }
.badge-pop { display: inline-grid; }

.dive-meta {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-top: 0.1rem;
}

.diff-icon {
  height: 2.5rem;
  padding: 0.2rem 0.45rem;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  object-fit: contain;
  flex-shrink: 0;
}

.meta-stack {
  display: grid;
  gap: 0.3rem;
}

.diff-descriptor {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.diff-name {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--khaki);
}

.diff-num {
  display: inline-grid;
  place-items: center;
  min-width: 1.15rem;
  height: 1.15rem;
  padding: 0 0.25rem;
  border: 1px solid var(--gold);
  border-radius: 4px;
  color: var(--gold);
  font-size: 0.7rem;
  font-weight: 700;
}

.report-form {
  display: grid;
  gap: 0.5rem;
  border-top: 1px dashed var(--border);
  padding-top: 0.6rem;
}
.report-fields {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
}
.valor-preview {
  margin: 0;
}
.valor-preview strong {
  color: var(--gold);
}

.victory { text-align: center; align-items: center; }
.victory h1 { color: var(--gold); animation: victory-glow 2.4s ease-in-out 1.2s infinite; }
@keyframes victory-glow {
  0%, 100% { text-shadow: 0 0 0 transparent; }
  50% { text-shadow: 0 0 26px color-mix(in srgb, var(--gold) 50%, transparent); }
}
.forfeit { border-color: var(--red); }
.error-banner {
  border-color: var(--red);
  color: var(--red);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.squad-strip { padding: 0.6rem 0.75rem; }
.lone-host {
  margin: 0;
  flex: 1 1 14rem;
  color: var(--gold);
  font-weight: 700;
  animation: lone-glow 2.4s ease-in-out infinite;
}
@keyframes lone-glow {
  0%, 100% { text-shadow: 0 0 4px color-mix(in srgb, var(--gold) 35%, transparent); }
  50% { text-shadow: 0 0 14px color-mix(in srgb, var(--gold) 90%, transparent); }
}
@media (prefers-reduced-motion: reduce) {
  .lone-host {
    animation: none;
    text-shadow: 0 0 8px color-mix(in srgb, var(--gold) 60%, transparent);
  }
}
.title-row {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}
.copy-code {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: none;
  color: var(--muted);
  cursor: pointer;
  transition:
    color var(--dur-fast) var(--ease-out),
    border-color var(--dur-fast) var(--ease-out);
}
.copy-code:hover {
  border-color: var(--gold);
  color: var(--gold);
}
.copy-code svg {
  width: 0.9rem;
  height: 0.9rem;
}
.status-chip {
  padding: 0 0.3rem;
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--muted);
  font-size: 0.65rem;
  letter-spacing: 0.02em;
  white-space: nowrap;
}
.status-chip.ready {
  border-color: var(--teal);
  color: var(--teal);
}
.catchup-chip {
  padding: 0 0.3rem;
  border: 1px solid var(--teal);
  border-radius: 4px;
  color: var(--teal);
  font-size: 0.7rem;
  font-weight: 700;
}
.self-warbonds { padding: 0.6rem 0.8rem; }
.self-warbonds summary {
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--khaki);
}
.diver-chip { display: inline-flex; align-items: center; gap: 0.35rem; }
.kick {
  width: 0.9rem;
  padding: 0;
  border: none;
  background: none;
  color: var(--red);
  font: inherit;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
}
.handover {
  padding: 0 0.25rem;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: none;
  color: var(--khaki);
  font: inherit;
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  line-height: 1.4;
  white-space: nowrap;
  cursor: pointer;
}
.handover:hover {
  border-color: var(--gold);
  color: var(--gold);
}

/* Pointer devices reveal the moderation affordances on chip hover; touch
   devices always show them — there is no hover to rely on. */
@media (hover: hover) and (pointer: fine) {
  .kick {
    width: 0;
    opacity: 0;
    overflow: hidden;
    transition:
      opacity var(--dur-fast) var(--ease-out),
      width var(--dur-fast) var(--ease-out);
  }

  .diver-chip:hover .kick,
  .kick:focus-visible {
    width: 0.9rem;
    opacity: 1;
  }

  .handover {
    max-width: 0;
    padding-inline: 0;
    opacity: 0;
    overflow: hidden;
    transition:
      opacity var(--dur-fast) var(--ease-out),
      max-width var(--dur-fast) var(--ease-out),
      padding-inline var(--dur-fast) var(--ease-out);
  }

  .diver-chip:hover .handover,
  .handover:focus-visible {
    max-width: 4rem;
    padding-inline: 0.25rem;
    opacity: 1;
  }
}
.kicked { border-color: var(--red); }
.self-name {
  width: 9ch;
  min-width: 5ch;
  padding: 0 0.15rem;
  background: transparent;
  border: none;
  border-bottom: 1px dashed var(--border);
  border-radius: 0;
  color: inherit;
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
}
.self-name:focus {
  outline: none;
  border-bottom-color: var(--gold);
}
.crown { color: var(--gold); }
.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--muted);
  display: inline-block;
}
.dot.on { background: var(--teal); }
</style>
