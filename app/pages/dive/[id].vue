<script setup lang="ts">
import { MAX_DIFFICULTY, maxStarsFor, missionsPerOperation } from '~~/shared/engine/config'
import { ALL_WARBOND_CODES } from '~~/shared/data/catalog'
import { difficultyName } from '~~/shared/engine/progression'
import { difficultyImageUrl } from '~~/shared/data/images'
import { pactName } from '~~/shared/data/pacts'
import { pactRiskTotal } from '~~/shared/engine/pacts'
import {
  activeMisfortune,
  allDiversPicked,
  ceilingRange,
  ceilingRangeForDifficulty,
  currentFront,
  diverCeiling,
  diverOptions,
  pactOfferFor,
  rewardPoolFor,
  teamRiskOf,
} from '~~/shared/engine/selectors'
import type { CrusadeVariant, EngineAction, ItemRef } from '~~/shared/engine/types'
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
  const set = new Set(pactSelection.value)
  if (set.has(pactId)) {
    set.delete(pactId)
  }
  else if (set.size < pactOffer.value.length) {
    set.add(pactId)
  }
  pactSelection.value = [...set]
}

const liveRange = computed(() =>
  session.state.value
    ? ceilingRange(session.state.value.difficulty, teamRiskOf(session.state.value), pactRiskTotal(pactSelection.value))
    : null,
)

const lockedCeiling = computed(() =>
  session.state.value && self.value ? diverCeiling(session.state.value, self.value) : null,
)

const wheelRange = computed(() =>
  session.state.value ? ceilingRangeForDifficulty(session.state.value.difficulty) : null,
)

const options = computed(() =>
  session.state.value && self.value ? diverOptions(session.state.value, self.value) : [],
)

// Diver's Choice picks from the diver's own catalog: their declared warbonds
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
const timePct = ref<number | null>(null)

const maxStars = computed(() =>
  maxStarsFor(session.state.value?.difficulty ?? MAX_DIFFICULTY))
const opLength = computed(() =>
  missionsPerOperation(session.state.value?.difficulty ?? MAX_DIFFICULTY))

function spin(): void {
  dispatch({ type: 'SPIN_WHEEL', seed: newSeed() })
}

function reroll(wheel: 'misfortune' | 'front'): void {
  dispatch({ type: 'REROLL_WHEEL', wheel, seed: newSeed() })
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
    timePct: timePct.value ?? undefined,
  })
  reportMode.value = 'none'
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
  if (import.meta.client) {
    navigator.clipboard.writeText(location.href)
  }
}

function isOnline(diverId: string): boolean {
  return session.online.value.includes(diverId)
}

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
    <template v-else-if="session.state.value">
      <header class="page-header">
        <div>
          <h1 class="mono">
            {{ session.slotName.value || 'Dive' }}
          </h1>
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
          <button
            v-if="session.mode === 'room'"
            class="btn ghost tiny"
            type="button"
            @click="copyInvite"
          >
            Copy invite
          </button>
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
            v-if="session.mode === 'room' && canControl && session.state.value.phase !== 'complete'"
            class="btn tiny"
            :class="session.state.value.openToLobby ? 'ghost' : 'primary'"
            type="button"
            @click="dispatch({ type: 'TOGGLE_OPEN', open: !session.state.value.openToLobby })"
          >
            {{ session.state.value.openToLobby ? 'Close to lobby' : 'Open to lobby' }}
          </button>
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
            >★</span>
            <span
              v-if="diver.catchUpOwed > 0"
              class="catchup-chip"
              title="Field Promotion picks owed"
            >+{{ diver.catchUpOwed }}</span>
            <span
              v-if="diver.id === session.selfId.value"
              class="muted small"
            >(you)</span>
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
                  </div>
                  <template v-else>
                    <PactPicker
                      :offer="pactOffer"
                      :selected="pactSelection"
                      @toggle="togglePact"
                      @lock="lockPacts"
                    />
                    <p
                      v-if="liveRange"
                      class="row small muted"
                    >
                      Base <TierBadge
                        :tier="liveRange.min"
                        size="sm"
                      /> → up to
                      <Motion
                        :key="`${liveRange.max}-${liveRange.odds}`"
                        as="span"
                        class="badge-pop"
                        :initial="{ opacity: 0, scale: 0.4 }"
                        :animate="{ opacity: 1, scale: 1 }"
                        :transition="{ type: 'spring', stiffness: 500, damping: 15 }"
                      >
                        <TierBadge :tier="liveRange.max" />
                      </Motion>
                      <span>(~{{ Math.round(liveRange.odds * 100) }}% · luck {{ teamRiskOf(session.state.value) + pactRiskTotal(pactSelection) }})</span>
                    </p>
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
              <p class="row small muted">
                Ceiling up to <TierBadge :tier="lockedCeiling ?? 'C'" />
              </p>
              <div
                v-if="canControl"
                class="row"
              >
                <button
                  class="btn primary"
                  type="button"
                  @click="reportMode = 'success'"
                >
                  Mission complete
                </button>
                <button
                  class="btn danger"
                  type="button"
                  @click="reportMode = 'failure'"
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
                <label class="row small muted">
                  Time remaining % (optional)
                  <input
                    v-model.number="timePct"
                    type="number"
                    min="0"
                    max="100"
                    style="width: 5rem"
                  >
                </label>
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
                    @click="reportMode = 'none'"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </section>
          </template>

          <template v-if="session.state.value.phase === 'rewards'">
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

/* Pointer devices reveal the kick affordance on chip hover; touch devices
   always show it — there is no hover to rely on. */
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
