<script setup lang="ts">
import { WARBONDS } from '~~/shared/data/catalog'
import { MAX_DIFFICULTY, MAX_PACTS, maxStarsFor, missionsPerOperation } from '~~/shared/engine/config'
import { difficultyName } from '~~/shared/engine/progression'
import { pactRiskTotal } from '~~/shared/engine/pacts'
import {
  activeMisfortune,
  allDiversPicked,
  ceilingRange,
  ceilingRangeForDifficulty,
  currentFront,
  diverCeiling,
  diverOptions,
  teamRiskOf,
} from '~~/shared/engine/selectors'
import type { CrusadeVariant, EngineAction, ItemRef } from '~~/shared/engine/types'

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
watch(
  () => session.state.value?.wheel?.seed,
  () => {
    pactSelection.value = []
  },
)

function togglePact(pactId: string): void {
  const set = new Set(pactSelection.value)
  if (set.has(pactId)) {
    set.delete(pactId)
  }
  else if (set.size < MAX_PACTS) {
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

// spin and pacts share one scene so the wheel reveal isn't interrupted by the
// phase flip that follows the spin.
const phaseKey = computed(() => {
  const phase = session.state.value?.phase
  return phase === 'spin' || phase === 'pacts' ? 'spin-pacts' : phase
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

function report(outcome: 'success' | 'failure'): void {
  dispatch({
    type: 'REPORT_RESULT',
    outcome,
    stars: outcome === 'success' ? stars.value : 0,
    timePct: timePct.value ?? undefined,
  })
  reportMode.value = 'none'
}

function pick(optionId: string): void {
  if (session.selfId.value) {
    dispatch({ type: 'PICK_REWARD', playerId: session.selfId.value, optionId })
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

// Online-room lobby: the host configures and launches the crusade here.
const lobbyVariant = ref<CrusadeVariant>('standard')
const lobbyWarbonds = ref<string[]>([])
const nameDraft = ref('')

onMounted(() => {
  lobbyWarbonds.value = WARBONDS.map(warbond => warbond.code)
  nameDraft.value = storedDiverName()
})

function commitName(): void {
  const name = nameDraft.value.trim() || 'Diver'
  rememberDiverName(name)
  nameDraft.value = name
  if (session.selfId.value) {
    dispatch({ type: 'SET_NAME', playerId: session.selfId.value, name })
  }
}

function launchCrusade(): void {
  commitName()
  dispatch({
    type: 'START_DIVE',
    settings: {
      variant: lobbyVariant.value,
      ownedWarbondCodes: [...lobbyWarbonds.value],
    },
  })
}
</script>

<template>
  <main class="page">
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
          <p class="muted small">
            {{ difficultyName(session.state.value.difficulty) }} ({{ session.state.value.difficulty }})
            · operation mission {{ session.state.value.missionInOperation }}/{{ opLength }}
            · mission #{{ session.state.value.missionIndex + 1 }}
          </p>
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
            />{{ diver.name }}
            <span
              v-if="diver.id === session.state.value?.hostId"
              class="crown"
            >★</span>
            <span
              v-if="diver.id === session.selfId.value"
              class="muted small"
            >(you)</span>
          </span>
        </div>
      </section>

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
              <div class="setup-grid">
                <label class="field">
                  <span class="muted small">Your name</span>
                  <input
                    v-model="nameDraft"
                    type="text"
                    maxlength="32"
                    @change="commitName"
                  >
                </label>
                <CrusadeSetup
                  v-model:variant="lobbyVariant"
                  v-model:owned-warbond-codes="lobbyWarbonds"
                  start-label="Launch crusade"
                  @start="launchCrusade"
                />
              </div>
            </section>
            <p
              v-else
              class="panel muted"
            >
              Waiting for the host to launch the crusade…
            </p>
          </template>

          <template v-if="session.state.value.phase === 'spin' || session.state.value.phase === 'pacts'">
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
                      >{{ pactId }}</span>
                    </p>
                  </div>
                  <template v-else>
                    <PactPicker
                      :misfortune-id="misfortune?.id ?? null"
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
                  · vs <strong>{{ front?.displayName }}</strong>
                </template>
                <template v-else>
                  No team misfortune — safe dive
                  · vs <strong>{{ front?.displayName }}</strong>
                </template>
              </p>
              <p class="row small">
                <span class="muted">Your pacts:</span>
                <span
                  v-for="pactId in self?.pactIds ?? []"
                  :key="pactId"
                  class="chip"
                >{{ pactId }}</span>
                <span
                  v-if="!self?.pactIds.length"
                  class="muted"
                >none — safe dive</span>
              </p>
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
                from any diver's kit or the shared stratagem pool.
                The wheel result carries over to the retry.
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
                · shared pool: {{ session.state.value.sharedStratagemIds.length }} stratagems
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

      <details class="panel">
        <summary>Squad inventory</summary>
        <InventoryGrid :state="session.state.value" />
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
.diver-chip { display: inline-flex; align-items: center; gap: 0.35rem; }
.crown { color: var(--gold); }
.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--muted);
  display: inline-block;
}
.dot.on { background: var(--teal); }
.setup-grid { display: grid; gap: 1rem; }
.field { display: grid; gap: 0.4rem; }
</style>
