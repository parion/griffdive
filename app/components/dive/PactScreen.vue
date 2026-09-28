<script setup lang="ts">
import { STRATAGEM_SLOTS_REQUIRED, missionsPerOperation } from '~~/shared/engine/config'
import { factionImageUrl, strainImageUrl } from '~~/shared/data/images'
import { pactName } from '~~/shared/data/pacts'
import {
  applyPactToggle,
  hasLegalLoadout,
  legalStratagemCount,
  pactConflictsWith,
  pactRiskTotal,
  pactSubsumedBy,
} from '~~/shared/engine/pacts'
import {
  activeMisfortune,
  currentFront,
  currentStrain,
  filteredPactsFor,
  pactOfferFor,
  teamRiskBreakdown,
} from '~~/shared/engine/selectors'
import type { DiverState, DiveState } from '~~/shared/engine/types'

const props = withDefaults(defineProps<{
  state: DiveState
  selfId: string | null
  self: DiverState | null
  canControl?: boolean
}>(), { canControl: true })

const opLength = computed(() => missionsPerOperation(props.state.difficulty))

const emit = defineEmits<{
  lock: [pactIds: string[]]
  pactRisk: [value: number]
}>()

const selection = ref<string[]>([])

// A new draw or a flipped decision rolls a fresh offer — start the pick clean.
watch(
  () => props.state.wheel?.seed,
  () => {
    selection.value = []
  },
)
watch(
  () => props.state.misfortuneAccepted,
  () => {
    selection.value = []
  },
)

const offer = computed(() =>
  props.selfId ? pactOfferFor(props.state, props.selfId) : [])

// The Valor rail lives in the shell, so the screen reports its live selection
// risk upward. Presentation only — `pactRiskTotal` is the engine's own sum.
watch(
  selection,
  ids => emit('pactRisk', pactRiskTotal(ids)),
  { immediate: true },
)

function toggle(pactId: string): void {
  selection.value = applyPactToggle(
    offer.value.map(pact => pact.id),
    selection.value,
    pactId,
  )
}

// Offered pacts the current selection rules out — greyed with the reason.
const coverage = computed<Record<string, string>>(() => {
  const blocked: Record<string, string> = {}
  const misfortuneId = activeMisfortune(props.state)?.id ?? null
  const owned = props.state.personalInventories[props.selfId ?? ''] ?? []
  const baseLegal = hasLegalLoadout(misfortuneId, [], owned)
  for (const pact of offer.value) {
    if (selection.value.includes(pact.id)) {
      continue
    }
    const subsumer = pactSubsumedBy(pact.id, selection.value)
    if (subsumer) {
      blocked[pact.id] = `Covered by ${pactName(subsumer)}`
      continue
    }
    const conflict = pactConflictsWith(pact.id, selection.value)
    if (conflict) {
      blocked[pact.id] = `Conflicts with ${pactName(conflict)}`
      continue
    }
    if (baseLegal && !hasLegalLoadout(misfortuneId, [...selection.value, pact.id], owned)) {
      blocked[pact.id] = 'Leaves too few stratagems to ready up'
    }
  }
  return blocked
})

const locked = computed(() => Boolean(props.self?.pactsLocked))

// ---- Summary bar --------------------------------------------------------

const front = computed(() => currentFront(props.state))
const strain = computed(() => currentStrain(props.state))
const misfortune = computed(() => activeMisfortune(props.state))
const breakdown = computed(() => teamRiskBreakdown(props.state))

const frontImage = computed(() => (front.value ? factionImageUrl(front.value.id) : undefined))
const strainImage = computed(() => (strain.value ? strainImageUrl(strain.value.id) : undefined))
const opLongRisk = computed(() => breakdown.value.strainRisk + breakdown.value.majorOrderRisk)

// ---- Filter / floor notes ----------------------------------------------

const filtered = computed(() => filteredPactsFor(props.state))
const floorCount = computed(() => {
  const misfortuneId = activeMisfortune(props.state)?.id ?? null
  const owned = props.state.personalInventories[props.selfId ?? ''] ?? []
  return legalStratagemCount(misfortuneId, selection.value, owned)
})

// ---- Hold-to-lock ------------------------------------------------------

const HOLD_MS = 650
const holding = ref(false)
const committed = ref(false)
let holdTimer: ReturnType<typeof setTimeout> | undefined

const canLock = computed(() => !locked.value && offer.value.length > 0)

function lockNow(): void {
  emit('lock', selection.value)
}
function down(): void {
  if (!canLock.value) {
    return
  }
  committed.value = false
  holding.value = true
  clearTimeout(holdTimer)
  holdTimer = setTimeout(() => {
    committed.value = true
    holding.value = false
    lockNow()
  }, HOLD_MS)
}
function up(): void {
  holding.value = false
  clearTimeout(holdTimer)
  if (committed.value) {
    setTimeout(() => {
      committed.value = false
    }, 300)
  }
}
function click(): void {
  if (committed.value) {
    committed.value = false
    return
  }
  if (canLock.value) {
    lockNow()
  }
}
onBeforeUnmount(() => clearTimeout(holdTimer))

const swornText = computed(() => `${selection.value.length}/${offer.value.length} sworn`)
const opLabel = computed(() =>
  `Mission ${props.state.missionInOperation} of ${opLength.value} · ${props.self?.name ?? 'offer'}'s offer`)
</script>

<template>
  <section class="pact-screen">
    <header class="pact-head">
      <div class="pact-head-l">
        <span class="lbl">{{ opLabel }}</span>
        <h1 class="disp pact-title">
          Swear your pacts
        </h1>
      </div>
      <div
        class="offer-tally"
        role="status"
      >
        <span
          class="offer-pips"
          aria-hidden="true"
        >
          <span
            v-for="(pact, i) in offer"
            :key="pact.id"
            class="offer-pip"
            :class="{ on: i < selection.length }"
          />
        </span>
        <span class="tally-text">{{ swornText }}</span>
      </div>
    </header>

    <section
      class="team-bar"
      aria-label="Team risk, locked for the squad"
    >
      <span
        class="team-bar-lock hazard-soft"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
        >
          <path d="M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3" />
        </svg>
      </span>

      <div class="team-cell">
        <span class="lbl">Misfortune · squad</span>
        <div class="team-cell-row">
          <RiskPips
            :value="breakdown.misfortuneRisk"
            :max="5"
          />
          <span class="team-name">{{ misfortune?.name ?? 'Safe dive' }}</span>
          <span
            v-if="breakdown.misfortuneRisk > 0"
            class="team-risk disp"
          >+{{ breakdown.misfortuneRisk }}</span>
        </div>
      </div>

      <div
        v-if="front"
        class="team-cell front-cell"
        :style="{ '--front-accent': front.accent }"
      >
        <span class="lbl">Front · strain · op-long</span>
        <div class="team-cell-row">
          <img
            v-if="frontImage"
            :src="frontImage"
            alt=""
            width="26"
            height="26"
            class="team-front-icon"
          >
          <img
            v-if="strainImage && state.strainAccepted"
            :src="strainImage"
            alt=""
            width="18"
            height="18"
            class="team-strain-icon"
          >
          <span class="team-name"><b class="front-name">{{ front.displayName }}</b><template v-if="strain && state.strainAccepted"> · {{ strain.name }}</template></span>
          <span
            v-if="opLongRisk > 0"
            class="team-risk disp op-long"
          >+{{ opLongRisk }} ×{{ opLength }}</span>
        </div>
        <div
          v-if="opLongRisk > 0"
          class="hold-pips"
          role="img"
          :aria-label="`Held for all ${opLength} missions of the operation`"
        >
          <span
            v-for="i in opLength"
            :key="i"
            class="hold-cell on"
          />
        </div>
      </div>

      <div
        class="team-cell team-total"
        role="img"
        :aria-label="`Team risk ${breakdown.total}, the floor under every diver's Valor`"
      >
        <span class="lbl">Team</span>
        <div class="team-cell-row">
          <span class="total-pips">
            <span
              v-for="i in 5"
              :key="i"
              class="total-pip"
              :class="{ on: i <= breakdown.total }"
            />
          </span>
          <span class="total-num disp">{{ breakdown.total }}</span>
        </div>
      </div>
    </section>

    <PactPicker
      :offer="offer"
      :selected="selection"
      :blocked="coverage"
      :disabled="locked"
      @toggle="toggle"
    />

    <div class="pact-notes">
      <div
        v-if="filtered.length"
        class="filter-note"
        role="note"
        :aria-label="`${filtered.length} pacts filtered from the offer`"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path d="M3 4h18l-7 8.5V19l-4 2v-8.5z" />
        </svg>
        <span class="filter-count">{{ filtered.length }} FILTERED</span>
        <span class="filter-sep">·</span>
        <span
          v-for="(pact, i) in filtered.slice(0, 2)"
          :key="pact.id"
          class="filter-name"
        >{{ pactName(pact.id) }}<template v-if="i < Math.min(filtered.length, 2) - 1">, </template></span>
        <span v-if="misfortune">— {{ misfortune.name }} ALREADY BANS IT</span>
      </div>

      <div
        class="floor-note"
        role="note"
        :aria-label="`Loadout floor: ${floorCount} stratagems still legal`"
      >
        <span class="floor-label">LOADOUT FLOOR · {{ STRATAGEM_SLOTS_REQUIRED }} STRATAGEMS</span>
        <span class="floor-count disp">{{ floorCount }}</span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="3"
          aria-hidden="true"
        >
          <path d="M5 12l5 5 9-10" />
        </svg>
      </div>
    </div>

    <div class="pact-cta">
      <button
        v-if="!locked"
        class="hold cut"
        type="button"
        :disabled="!canLock"
        aria-label="Lock in &amp; dive — press and hold to lock"
        @pointerdown="down"
        @pointerup="up"
        @pointerleave="up"
        @click="click"
      >
        <span
          class="hazard crawl hold-fill"
          :class="{ on: holding }"
          aria-hidden="true"
        />
        <span class="hold-label">
          <span class="disp">Lock in &amp; dive</span>
          <span class="hold-sub">HOLD TO LOCK</span>
        </span>
      </button>
      <div
        v-else
        class="locked-row"
        role="status"
      >
        <span class="disp locked-stamp stamp">Locked</span>
        <p class="locked-copy">
          <span>Pacts sworn.</span>
          <span class="muted">Waiting for the rest of the squad…</span>
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.pact-screen {
  display: flex;
  flex-direction: column;
  gap: 0;
  min-height: 0;
}

.pact-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  position: relative;
}
.pact-head-l { display: flex; flex-direction: column; gap: 6px; }
.pact-title { margin: 0; font-size: var(--fs-h1); color: var(--text); }

.offer-tally {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  height: 44px;
  padding: 0 0.9rem;
  border: 1px solid var(--line-2);
  background: var(--rail);
}
.offer-pips { display: flex; gap: 4px; }
.offer-pip {
  width: 12px;
  height: 17px;
  border: 1px solid var(--line-4);
  background: var(--panel);
  transition: background-color 0.25s var(--ease-out), border-color 0.25s var(--ease-out);
}
.offer-pip.on { background: var(--gold); border-color: var(--gold); }
.tally-text {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: var(--khaki);
  white-space: nowrap;
}

/* ---- Team risk summary bar ---- */
.team-bar {
  margin-top: 18px;
  display: flex;
  align-items: stretch;
  min-height: 56px;
  border: 1px solid var(--line-2);
  background: var(--rail);
}
.team-bar-lock {
  width: 44px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  color: var(--gold);
  border-right: 1px solid var(--line-2);
}
.team-bar-lock svg {
  width: 18px;
  height: 18px;
  padding: 2px;
  background: var(--rail);
  box-sizing: content-box;
}
.team-cell {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  padding: 0.5rem 1.1rem;
  border-right: 1px solid var(--line-1);
  min-width: 0;
}
.team-cell .lbl { font-size: 9px; }
.team-cell-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.team-name {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.front-name { color: var(--front-accent, var(--red)); }
.front-cell {
  flex-grow: 1;
  position: relative;
  background: linear-gradient(90deg, color-mix(in srgb, var(--red) 8%, transparent), transparent 70%);
}
.team-front-icon { width: 26px; height: 26px; object-fit: contain; flex-shrink: 0; }
.team-strain-icon { width: 18px; height: 18px; object-fit: contain; flex-shrink: 0; }
.team-risk { color: var(--gold); font-size: 1.05rem; }
.team-risk.op-long { color: var(--orange); }
.hold-pips { display: flex; align-items: center; gap: 3px; margin-left: auto; }
.hold-cell { width: 10px; height: 10px; border: 2px solid var(--orange); background: var(--orange); }
.team-total { border-right: 0; background: var(--panel); }
.total-pips { display: flex; gap: 2px; }
.total-pip { width: 9px; height: 9px; background: var(--line-2); }
.total-pip.on { background: var(--gold); }
.total-num { font-size: 1.6rem; color: var(--text); }

/* ---- Notes ---- */
.pact-notes {
  margin-top: 1rem;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}
.filter-note,
.floor-note {
  display: flex;
  align-items: center;
  gap: 9px;
  height: 32px;
  padding: 0 12px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  white-space: nowrap;
  overflow: hidden;
}
.filter-note {
  border: 1px dashed var(--line-4);
  background: var(--ground);
  color: var(--muted);
}
.filter-note svg { width: 14px; height: 14px; color: var(--khaki); flex-shrink: 0; }
.filter-count { color: var(--text); }
.filter-name { color: var(--khaki); text-decoration: line-through; text-decoration-color: var(--red); text-decoration-thickness: 2px; }
.filter-sep { color: var(--muted); }
.floor-note {
  margin-left: auto;
  border: 1px solid color-mix(in srgb, var(--teal) 45%, transparent);
  background: color-mix(in srgb, var(--teal) 5%, transparent);
  color: var(--teal);
}
.floor-note svg { width: 14px; height: 14px; }
.floor-count { font-size: 1rem; }

/* ---- CTA ---- */
.pact-cta { margin-top: 18px; }
.hold {
  position: relative;
  overflow: hidden;
  width: 100%;
  min-height: 62px;
  border: 0;
  background: var(--gold);
  color: var(--on-gold);
  touch-action: none;
  user-select: none;
  cursor: pointer;
}
.hold:disabled { opacity: 0.4; cursor: not-allowed; }
.hold-fill {
  position: absolute;
  inset: 0;
  opacity: 0.4;
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 650ms linear;
}
.hold-fill.on { transform: scaleX(1); }
.hold-fill:not(.on) { transition: none; }
.hold-label {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}
.hold-sub { font-size: 10px; font-weight: 700; letter-spacing: 0.24em; }

.locked-row {
  display: flex;
  align-items: center;
  gap: 22px;
  min-height: 62px;
}
.locked-stamp {
  display: inline-block;
  margin-left: 8px;
  padding: 8px 18px;
  font-size: 1.6rem;
  border: 3px solid var(--gold);
  color: var(--gold);
}
.locked-copy {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.1em;
}
.locked-copy .muted { font-size: 11px; letter-spacing: 0.14em; }
</style>
