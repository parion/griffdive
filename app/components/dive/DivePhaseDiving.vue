<script setup lang="ts">
import { MAJOR_ORDER_RISK, MISFORTUNE_RISK, STRAIN_RISK, maxStarsFor, sampleAvailability } from '~~/shared/engine/config'
import { performanceValor } from '~~/shared/engine/rewards'
import { activeMisfortune, activeStrain, currentFront, pactRiskOf, teamRiskOf } from '~~/shared/engine/selectors'
import type { DiverState, DiveState, MissionOutcome, SampleCounts } from '~~/shared/engine/types'

const props = defineProps<{
  state: DiveState
  selfId: string | null
  self: DiverState | null
  canControl: boolean
  isHost: boolean
}>()

const emit = defineEmits<{
  report: [payload: { outcome: MissionOutcome, stars: number, timePct: number, samples?: SampleCounts }]
  fail: [playerId: string, pactId: string]
}>()

const misfortune = computed(() => activeMisfortune(props.state))
const front = computed(() => currentFront(props.state))
const strain = computed(() => activeStrain(props.state))
const selfPactRisk = computed(() => (props.self ? pactRiskOf(props.self) : 0))
const teamRisk = computed(() => teamRiskOf(props.state))

// Per-source risk chips for the locked status strip (total stays teamRiskOf).
const misfortuneRisk = computed(() =>
  props.state.misfortuneAccepted ? MISFORTUNE_RISK[misfortune.value?.id ?? ''] ?? 0 : 0)
const strainRisk = computed(() =>
  props.state.strainAccepted ? STRAIN_RISK[strain.value?.id ?? ''] ?? 0 : 0)
const majorOrderRisk = computed(() => (props.state.majorOrder?.live ? MAJOR_ORDER_RISK : 0))

const reportMode = ref<'none' | 'success' | 'failure'>('none')
const stars = ref(1)
const timePct = ref(0)
const samples = ref<SampleCounts>({ common: 0, rare: 0, super: 0 })

// Slider maxima come from the game's per-difficulty sample availability.
const sampleMax = computed(() => sampleAvailability(props.state.difficulty))
const maxStars = computed(() => maxStarsFor(props.state.difficulty))

// Live preview of the team-performance Valor this report will carry.
const performancePreview = computed(() =>
  performanceValor({
    outcome: 'success',
    stars: 0,
    timePct: timePct.value,
    samples: { ...samples.value },
  }))

// The report fields are live local state, not engine state. Clear them the
// moment a report lands, or the next briefing inherits the last mission's
// performance (a stale decimal on the locked Valor meter).
function resetReportFields(): void {
  stars.value = maxStars.value
  timePct.value = 0
  samples.value = { common: 0, rare: 0, super: 0 }
}

function submit(outcome: MissionOutcome): void {
  emit('report', {
    outcome,
    stars: outcome === 'success' ? stars.value : 0,
    timePct: timePct.value,
    samples: outcome === 'success' ? { ...samples.value } : undefined,
  })
  reportMode.value = 'none'
  resetReportFields()
}

// The stars field opens at the difficulty's best result — most clears are
// full-star, so the common case needs no adjustment.
function openReport(mode: 'success' | 'failure'): void {
  reportMode.value = mode
  resetReportFields()
}

function cancelReport(): void {
  reportMode.value = 'none'
  resetReportFields()
}
</script>

<template>
  <section class="panel briefing">
    <h2 class="sec-h briefing-head">
      <span
        class="lamp teal pulse"
        aria-hidden="true"
      />
      <span class="lbl gold">Briefing · in the field</span>
      <span class="cap muted">report when the squad is out</span>
    </h2>

    <div
      class="status"
      aria-label="Team risk, locked for the squad"
    >
      <span
        class="status-icon hazard-soft"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect
            x="6"
            y="11"
            width="12"
            height="9"
          />
          <path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" />
        </svg>
      </span>

      <div class="status-cell">
        <span class="lbl">Misfortune · squad</span>
        <div class="status-line">
          <RiskPips
            v-if="misfortune"
            :value="misfortuneRisk"
            :max="5"
          />
          <span class="status-name">{{ misfortune?.name ?? 'Safe dive' }}</span>
          <span
            v-if="misfortune"
            class="status-val disp"
          >+{{ misfortuneRisk }}</span>
        </div>
      </div>

      <div class="status-cell front-cell">
        <span class="lbl">Front · strain · op-long</span>
        <div class="status-line">
          <span
            class="status-name disp"
            :style="front ? { color: front.accent } : undefined"
          >{{ front?.displayName ?? 'Unknown front' }}</span>
          <template v-if="strain">
            <span class="status-sep">·</span>
            <span class="status-name">{{ strain.name }}</span>
          </template>
          <span
            v-if="strainRisk"
            class="status-val disp strain-val"
          >+{{ strainRisk }}</span>
          <span
            v-if="majorOrderRisk"
            class="status-val disp mo-val"
          >MO +{{ majorOrderRisk }}</span>
        </div>
      </div>

      <div
        class="status-total"
        role="img"
        :aria-label="`Team risk ${teamRisk}, the floor under every diver's Valor`"
      >
        <span class="lbl">Team</span>
        <span class="disp team-num">{{ teamRisk }}</span>
      </div>
    </div>

    <ValorMeter
      :difficulty="state.difficulty"
      :team-risk="teamRisk"
      :pact-risk="selfPactRisk"
      :performance="performancePreview"
      locked
    />

    <PactBriefing
      :divers="state.divers"
      :self-id="selfId"
      :is-host="isHost"
      @fail="(playerId, pactId) => emit('fail', playerId, pactId)"
    />

    <div
      v-if="canControl && reportMode === 'none'"
      class="outcome ticks"
    >
      <div class="row spread outcome-head">
        <span class="lbl">Outcome · host calls it</span>
        <span class="cap muted">win = objectives + extraction</span>
      </div>
      <div class="outcome-buttons">
        <button
          class="btn primary cut outcome-btn success"
          type="button"
          @click="openReport('success')"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M12 20V8M7 13l5-5 5 5M4 4h16" />
          </svg>
          <span class="outcome-copy">
            <span class="disp">Mission complete</span>
            <span class="cap">file the report</span>
          </span>
        </button>
        <button
          class="btn danger cut outcome-btn failure"
          type="button"
          @click="openReport('failure')"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
          <span class="outcome-copy">
            <span class="disp">Mission failed</span>
            <span class="cap">forfeit 1 item · retry op</span>
          </span>
        </button>
      </div>
    </div>
    <p
      v-else-if="!canControl"
      class="cap muted waiting"
    >
      Waiting for the host to report the mission result.
    </p>

    <div
      v-if="reportMode !== 'none'"
      class="report-form"
    >
      <div
        v-if="reportMode === 'success'"
        class="report-victory"
      >
        <span class="victory-banner">
          <span
            class="wing"
            aria-hidden="true"
          />
          Mission completed
          <span
            class="wing flip"
            aria-hidden="true"
          />
        </span>
        <StarRating
          v-model="stars"
          :length="maxStars"
          size="lg"
        />
        <span class="cap muted">of {{ maxStars }} at difficulty {{ state.difficulty }}</span>
      </div>
      <div
        v-else
        class="report-failure"
      >
        <span class="disp failure-banner">Mission failed</span>
        <span class="cap muted">no stars · the operation repeats</span>
      </div>

      <div class="report-fields">
        <template v-if="reportMode === 'success'">
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
        </template>
        <RangeField
          v-model="timePct"
          :max="100"
          aria-label="Time remaining percent"
        >
          <template #icon>
            <AppTooltip content="Time remaining">
              <button
                class="icon-tip"
                type="button"
                aria-label="Time remaining"
              >
                <IconClock />
              </button>
            </AppTooltip>
          </template>
        </RangeField>
      </div>

      <div class="row report-actions">
        <button
          class="btn primary cut"
          type="button"
          @click="submit(reportMode === 'success' ? 'success' : 'failure')"
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

<style scoped>
.briefing {
  gap: 0.85rem;
}

.briefing-head { margin: 0; }

.gold { color: var(--gold); }

/* Locked team-risk strip: misfortune + front/strain + the shared total. */
.status {
  display: grid;
  grid-template-columns: 44px minmax(0, 1.35fr) minmax(0, 1fr) auto;
  align-items: stretch;
  border: 1px solid var(--line-2);
  background: var(--rail);
}

.status-icon {
  display: grid;
  place-items: center;
  border-right: 1px solid var(--line-2);
  color: var(--gold);
}

.status-icon svg {
  width: 18px;
  height: 18px;
  background: var(--rail);
  padding: 2px;
  box-sizing: content-box;
}

.status-cell {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  min-width: 0;
  padding: 8px 14px;
  border-right: 1px solid var(--line-1);
}

.front-cell {
  background: linear-gradient(90deg, color-mix(in srgb, var(--red) 8%, transparent), transparent 70%);
}

.status-line {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.status-name {
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-sep { color: var(--line-4); }

.status-val {
  font-size: 1rem;
  color: var(--gold);
  white-space: nowrap;
}

.strain-val { color: var(--orange); }
.mo-val { color: var(--teal); }

.status-total {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 0 16px;
  background: var(--panel);
}

.team-num {
  font-size: 1.9rem;
  line-height: 1;
  color: var(--text);
}

/* Outcome call: two big action plates. */
.outcome {
  display: grid;
  gap: 0.55rem;
  padding: 0.75rem 0.9rem 0.9rem;
  border: 1px solid var(--line-3);
  background-color: var(--panel);
}

.outcome-head { align-items: baseline; }
.outcome-buttons { display: grid; grid-template-columns: 1.5fr 1fr; gap: 0.6rem; }

.outcome-btn {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  min-height: 58px;
  padding: 0.5rem 1rem;
  text-align: left;
}

.outcome-btn svg { width: 22px; height: 22px; flex-shrink: 0; }
.outcome-copy { display: flex; flex-direction: column; gap: 3px; min-width: 0; }

.report-form {
  display: grid;
  gap: 0.7rem;
  border-top: 1px dashed var(--line-2);
  padding-top: 0.7rem;
}

.report-fields {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
}

.report-victory {
  display: grid;
  justify-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0 0.15rem;
}

.victory-banner,
.failure-banner {
  font-family: var(--font-display);
  font-stretch: 125%;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.2em;
}

.victory-banner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  max-width: 100%;
  text-align: center;
  gap: 0.7rem;
  font-size: 1.15rem;
  color: var(--gold);
}

.failure-banner {
  font-size: 1.15rem;
  color: var(--red);
}

.report-failure {
  display: grid;
  justify-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0 0.15rem;
}

.wing {
  width: 2.4rem;
  height: 0.95rem;
  background: repeating-linear-gradient(115deg, var(--gold) 0 0.18rem, transparent 0.18rem 0.42rem);
  clip-path: polygon(0 50%, 22% 0, 100% 0, 100% 100%, 22% 100%);
}

.wing.flip { transform: scaleX(-1); }

.report-actions { align-items: center; }
.waiting { margin: 0; }

.icon-tip {
  display: inline-grid;
  place-items: center;
  width: 1.35rem;
  height: 1.35rem;
  padding: 0;
  border: 0;
  background: none;
  color: var(--muted);
  cursor: help;
  transition: color var(--dur-fast) var(--ease-out);
}

.icon-tip:hover,
.icon-tip:focus-visible {
  outline: none;
  color: var(--gold);
}

@media (max-width: 620px) {
  .status { grid-template-columns: 40px 1fr auto; }
  .front-cell { grid-column: 2 / 4; border-top: 1px solid var(--line-1); }
  .outcome-buttons { grid-template-columns: 1fr; }
}
</style>
