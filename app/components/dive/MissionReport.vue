<script setup lang="ts">
import {
  MAX_OPTIONS,
  SAMPLE_VALOR_CAP,
  SAMPLE_VALOR_WEIGHTS,
  STARS_TO_OPTIONS,
  TIME_VALOR_MAX,
  bonusIntervalFor,
  maxStarsFor,
  sampleAvailability,
} from '~~/shared/engine/config'
import { catchUpOpsBehind, difficultyName } from '~~/shared/engine/progression'
import { performanceValor, optionsForDiver } from '~~/shared/engine/rewards'
import {
  currentFront,
  diverCeiling,
  pactRiskOf,
  teamRiskOf,
} from '~~/shared/engine/selectors'
import type { DiverState, DiveState, MissionOutcome, MissionReport, SampleCounts } from '~~/shared/engine/types'

const props = defineProps<{
  state: DiveState
  selfId: string | null
  self: DiverState | null
  outcome: MissionOutcome
  opLength: number
}>()

const emit = defineEmits<{
  submit: [payload: MissionReport]
  cancel: []
}>()

const maxStars = computed(() => maxStarsFor(props.state.difficulty))
const sampleMax = computed(() => sampleAvailability(props.state.difficulty))
const front = computed(() => currentFront(props.state))

const stars = ref(maxStars.value)
const timePct = ref(0)
const samples = ref<SampleCounts>({ common: 0, rare: 0, super: 0 })

watch(maxStars, (value) => {
  stars.value = value
})

const report = computed<MissionReport>(() => ({
  outcome: props.outcome,
  stars: props.outcome === 'success' ? stars.value : 0,
  timePct: timePct.value,
  samples: props.outcome === 'success' ? { ...samples.value } : undefined,
}))

const performance = computed(() => performanceValor(props.outcome === 'success' ? report.value : null))
const performanceText = computed(() => performance.value <= 0 ? '0' : `+${performance.value.toFixed(2)}`)

const timeFrac = computed(() => Math.min(1, Math.max(0, timePct.value / 100)))
const timeNote = computed(() =>
  `${(timeFrac.value * TIME_VALOR_MAX).toFixed(3)} / .${Math.round(TIME_VALOR_MAX * 1000).toString().padStart(3, '0')}`)

// Sample contribution to the performance cap, per rarity — the tri-color bar.
const sampleFractions = computed(() => {
  const raw = [
    Math.max(0, samples.value.common) * SAMPLE_VALOR_WEIGHTS.common,
    Math.max(0, samples.value.rare) * SAMPLE_VALOR_WEIGHTS.rare,
    Math.max(0, samples.value.super) * SAMPLE_VALOR_WEIGHTS.super,
  ]
  const total = raw.reduce((sum, n) => sum + n, 0)
  return {
    total,
    common: total > 0 ? raw[0]! / total : 0,
    rare: total > 0 ? raw[1]! / total : 0,
    super: total > 0 ? raw[2]! / total : 0,
  }
})
const sampleCapFrac = computed(() => Math.min(1, sampleFractions.value.total / SAMPLE_VALOR_CAP))
// The design surfaces the raw valor contribution against its cap, not a label.
const sampleNote = computed(() => {
  const cap = `.${Math.round(SAMPLE_VALOR_CAP * 1000).toString().padStart(3, '0')}`
  const capped = sampleFractions.value.total > SAMPLE_VALOR_CAP ? ' CAPPED' : ''
  return `${sampleFractions.value.total.toFixed(3)} / ${cap}${capped}`
})

const opNumber = computed(() =>
  catchUpOpsBehind(props.state.difficulty, props.state.settings?.variant ?? 'standard') + 1)

const ceiling = computed(() => (props.self ? diverCeiling(props.state, props.self) : 'C'))
const optionCount = computed(() =>
  optionsForDiver(stars.value, ceiling.value, props.self?.failedPactIds.length ?? 0))

// The diver's locked Valor floor: shared team risk plus their own pact risk
// (failed pacts already voided by the selector).
const valorBase = computed(() =>
  teamRiskOf(props.state) + (props.self ? pactRiskOf(props.self, props.state.difficulty) : 0))
const valorWithPerf = computed(() => valorBase.value + performance.value)
const valorDelta = computed(() => {
  const delta = valorWithPerf.value - valorBase.value
  return delta <= 0 ? '' : `+${delta.toFixed(2)}`
})

const frontLabel = computed(() => front.value?.displayName ?? 'Unknown front')
const honorsEligible = computed(() =>
  props.outcome === 'success'
  && stars.value === maxStars.value
  && props.state.missionIndex % bonusIntervalFor(props.state.divers.length) === 0)

const sampleRows = computed(() => [
  { key: 'common' as const, label: 'Common', tone: 'common' as const, icon: '/images/svgs/Common_Sample_Icon.svg', max: sampleMax.value.common },
  { key: 'rare' as const, label: 'Rare', tone: 'rare' as const, icon: '/images/svgs/Rare_Sample_Icon.svg', max: sampleMax.value.rare },
  { key: 'super' as const, label: 'Super', tone: 'super' as const, icon: '/images/svgs/Super_Sample_Icon.svg', max: sampleMax.value.super },
].filter(row => row.max > 0).map(row => ({
  ...row,
  value: (samples.value[row.key] * SAMPLE_VALOR_WEIGHTS[row.key]).toFixed(3),
})))

// The design's reward table is a stars→options distribution, not the tier
// ladder (the ceiling already lives on the Valor rail).
const rewardTable = computed(() => Array.from({ length: maxStars.value }, (_, i) => {
  const k = i + 1
  return { stars: k, options: STARS_TO_OPTIONS[k] ?? 1, current: k === stars.value }
}))

function submit(): void {
  emit('submit', report.value)
}
</script>

<template>
  <section class="report">
    <header
      class="report-banner"
      :class="outcome"
    >
      <span
        class="banner-flash"
        aria-hidden="true"
      />
      <div class="banner-row">
        <span
          class="hazard banner-bar barL"
          aria-hidden="true"
        />
        <h1 class="disp banner-title">
          {{ outcome === 'success' ? 'Mission complete' : 'Mission failed' }}
        </h1>
        <span
          class="hazard banner-bar barR"
          aria-hidden="true"
        />
      </div>
      <div class="banner-bread">
        <span>OP {{ opNumber }} · MISSION {{ state.missionInOperation }}/{{ opLength }}</span>
        <span class="sep">/</span>
        <span>{{ state.difficulty }} · {{ difficultyName(state.difficulty).toUpperCase() }}</span>
        <span class="sep">/</span>
        <span :style="front ? { color: front.accent } : undefined">{{ frontLabel }}</span>
        <span class="sep">/</span>
        <span
          v-if="outcome === 'success'"
          class="teal-line"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.4"
            aria-hidden="true"
          >
            <path d="M12 20V8M7 13l5-5 5 5M4 4h16" />
          </svg>
          OBJECTIVES + EXTRACTION
        </span>
        <span
          v-else
          class="red-line"
        >NO EXTRACTION · OPERATION REPEATS</span>
      </div>
    </header>

    <div
      v-if="outcome === 'success'"
      class="report-grid"
    >
      <div class="report-left">
        <section
          class="rcard"
          aria-label="Stars"
        >
          <div class="rcard-head">
            <span class="lbl">Stars</span>
            <span class="rcard-note">MAX {{ maxStars }} AT {{ difficultyName(state.difficulty).toUpperCase() }}</span>
          </div>
          <div class="stars-row">
            <StarRating
              v-model="stars"
              :length="maxStars"
              size="lg"
            />
            <div class="stars-readout">
              <span class="disp stars-num">{{ stars }}</span>
              <span class="disp stars-max">/{{ maxStars }}</span>
            </div>
          </div>
          <div
            class="honors-strip"
            :class="honorsEligible ? 'on' : 'off'"
            role="status"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <path d="M8 2l4 6 4-6M12 22a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13z" />
            </svg>
            <span>{{ honorsEligible ? 'FULL STARS · SQUAD HONORS UNLOCKED' : 'SQUAD HONORS · NEED FULL STARS' }}</span>
            <span class="honors-token">
              <span
                v-if="honorsEligible"
                class="hex on"
                aria-hidden="true"
              />
              {{ honorsEligible ? '+1 TOKEN' : 'NO TOKEN' }}
            </span>
          </div>
        </section>

        <section
          class="rcard samples-card"
          aria-label="Samples"
        >
          <div class="rcard-head">
            <span class="lbl">Samples</span>
            <span class="rcard-note teal-note">{{ sampleNote }}</span>
          </div>
          <div class="sample-grid">
            <SampleCanister
              v-for="row in sampleRows"
              :key="row.key"
              v-model="samples[row.key]"
              :max="row.max"
              :tone="row.tone"
              :label="row.label"
              :icon="row.icon"
              :value="row.value"
            />
          </div>
        </section>

        <section
          class="rcard"
          aria-label="Time remaining"
        >
          <SegmentedBar
            v-model="timePct"
            :max="100"
            label="Time remaining"
            aria-label="Time remaining percent"
            :note="timeNote"
          />
        </section>
      </div>

      <aside class="report-right">
        <section
          class="rcard reward-preview"
          aria-label="Reward draft preview"
        >
          <div class="rcard-head">
            <span class="lbl">Reward draft</span>
            <span class="rcard-note">EACH DIVER</span>
          </div>
          <div class="opt-row">
            <span class="opt-stars">
              <span class="disp">{{ stars }}</span>
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.4"
              aria-hidden="true"
              class="opt-arrow"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
            <span class="disp opt-num">{{ optionCount }}</span>
            <span class="opt-label">REWARD<br>OPTIONS</span>
          </div>
          <div
            class="crates"
            aria-hidden="true"
          >
            <span
              v-for="i in MAX_OPTIONS"
              :key="i"
              class="crate"
              :class="{ on: i <= optionCount }"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
              >
                <path d="M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10" />
              </svg>
            </span>
          </div>
          <div
            class="stars-table"
            aria-hidden="true"
          >
            <div
              v-for="row in rewardTable"
              :key="row.stars"
              class="stars-col"
              :class="{ current: row.current }"
            >
              <div class="stars-blocks">
                <span
                  v-for="j in MAX_OPTIONS"
                  :key="j"
                  :class="{ on: j <= row.options }"
                />
              </div>
              <span class="stars-label">{{ row.stars }}★</span>
            </div>
          </div>
        </section>

        <section
          class="rcard perf-card"
          aria-label="Performance"
        >
          <div class="rcard-head">
            <span class="lbl teal-note">Performance</span>
            <span class="rcard-note">SQUAD-WIDE</span>
          </div>
          <div
            class="disp perf-value"
            aria-live="polite"
          >
            {{ performanceText }}
          </div>
          <div class="perf-bar">
            <div class="perf-bar-head">
              <span>TIME</span>
              <span>{{ Math.round(timeFrac * 100) }}%</span>
            </div>
            <div class="perf-track">
              <span
                class="perf-fill teal"
                :style="{ width: `${timeFrac * 100}%` }"
              />
            </div>
          </div>
          <div class="perf-bar">
            <div class="perf-bar-head">
              <span>SAMPLES</span>
              <span>{{ Math.round(sampleCapFrac * 100) }}%</span>
            </div>
            <div class="perf-track tri">
              <span
                class="perf-fill common"
                :style="{ width: `${sampleFractions.common * sampleCapFrac * 100}%` }"
              />
              <span
                class="perf-fill rare"
                :style="{ width: `${sampleFractions.rare * sampleCapFrac * 100}%` }"
              />
              <span
                class="perf-fill super"
                :style="{ width: `${sampleFractions.super * sampleCapFrac * 100}%` }"
              />
            </div>
          </div>
          <div class="perf-valor">
            <span class="lbl">Valor</span>
            <span class="perf-valor-nums">
              <span class="disp v-base">{{ valorBase }}</span>
              <span class="disp v-arrow">→</span>
              <span class="disp v-final">{{ valorWithPerf.toFixed(1) }}</span>
              <span
                v-if="valorDelta"
                class="disp v-delta"
              >{{ valorDelta }}</span>
            </span>
          </div>
        </section>

        <button
          class="btn primary cut file-cta"
          type="button"
          @click="submit"
        >
          <span class="file-copy">
            <span class="disp">File report</span>
            <span class="file-sub">MISSION COMPLETE · {{ stars }}/{{ maxStars }} STARS</span>
          </span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.4"
            aria-hidden="true"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
        <button
          class="btn ghost tiny cancel"
          type="button"
          @click="emit('cancel')"
        >
          Cancel
        </button>
      </aside>
    </div>

    <div
      v-else
      class="report-failure"
    >
      <p class="failure-note">
        No stars · the operation repeats at this difficulty, and the squad
        forfeits one item.
      </p>
      <div class="row report-actions">
        <button
          class="btn danger cut"
          type="button"
          @click="submit"
        >
          File failure
        </button>
        <button
          class="btn ghost tiny"
          type="button"
          @click="emit('cancel')"
        >
          Cancel
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.report { display: flex; flex-direction: column; gap: 16px; min-height: 0; }

/* ---- Banner ---- */
.report-banner {
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
  min-height: 112px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
  padding: 0 24px;
  background: var(--panel);
  border: 1px solid var(--line-4);
}
.report-banner.failure { border-color: color-mix(in srgb, var(--red) 55%, var(--line-4)); }
.banner-flash {
  position: absolute;
  inset: 0;
  background: var(--gold);
  pointer-events: none;
  animation: flashIn 0.6s 0.18s ease-out both;
}
.report-banner.failure .banner-flash { background: var(--red); }
.banner-row {
  display: flex;
  align-items: center;
  gap: 22px;
  position: relative;
}
.banner-bar {
  flex-grow: 1;
  height: 18px;
  display: block;
}
.banner-bar.barL {
  transform-origin: right;
  animation: barL 0.45s 0.22s var(--ease-out) both;
}
.banner-bar.barR {
  transform-origin: left;
  animation: barL 0.45s 0.22s var(--ease-out) both;
}
.banner-title {
  margin: 0;
  font-size: clamp(28px, 3.4vw, 44px);
  white-space: nowrap;
  color: var(--gold);
  animation: slam 0.5s var(--ease-out) both;
}
.report-banner.failure .banner-title { color: var(--red); }
.banner-bread {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: var(--khaki);
}
.banner-bread .sep { color: var(--line-4); }
.teal-line { display: inline-flex; align-items: center; gap: 6px; color: var(--teal); }
.teal-line svg { width: 13px; height: 13px; }
.red-line { color: var(--red); }

/* ---- Grid ---- */
.report-grid {
  flex-grow: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 16px;
}
.report-left { display: flex; flex-direction: column; gap: 16px; min-height: 0; }
.report-right { display: flex; flex-direction: column; gap: 16px; min-height: 0; }

.rcard {
  padding: 14px 18px;
  background: var(--panel);
  border: 1px solid var(--line-3);
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.samples-card { flex-grow: 1; }
.rcard-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
}
.rcard-note { font-size: 10px; font-weight: 700; letter-spacing: 0.16em; color: var(--muted); }
.teal-note { color: var(--teal); }

/* Stars */
.stars-row { display: flex; align-items: center; gap: 18px; }
.stars-readout { margin-left: auto; display: flex; align-items: baseline; gap: 4px; }
.stars-num { font-size: 3.4rem; color: var(--gold); line-height: 1; }
.stars-max { font-size: 1.4rem; color: var(--dim); }
.honors-strip {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 38px;
  padding: 0 12px;
  border: 1px solid var(--gold);
  color: var(--gold);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
}
.honors-strip svg { width: 18px; height: 18px; flex-shrink: 0; }
.honors-strip.off { border: 1px dashed var(--line-4); color: var(--muted); }
.honors-token { margin-left: auto; display: inline-flex; align-items: center; gap: 6px; color: var(--text); }
.honors-strip.off .honors-token { color: var(--muted); }
.hex {
  width: 9px;
  height: 11px;
  clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
  background: var(--gold);
}
.hex:not(.on) { background: var(--line-2); }

/* Samples */
.sample-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  align-items: center;
}

/* Reward preview */
.opt-row { display: flex; align-items: center; gap: 10px; }
.opt-stars { display: flex; align-items: center; gap: 4px; }
.opt-stars .disp { font-size: 1.7rem; color: var(--gold); }
.opt-stars svg { width: 20px; height: 20px; color: var(--gold); }
.opt-arrow { width: 18px; height: 18px; color: var(--muted); margin-left: 2px; }
.opt-num { font-size: 1.7rem; color: var(--text); }
.opt-label { font-size: 11px; font-weight: 700; letter-spacing: 0.14em; line-height: 1.25; color: var(--khaki); }
.crates { display: flex; gap: 8px; }
.crate {
  flex-grow: 1;
  flex-basis: 0;
  height: 44px;
  display: grid;
  place-items: center;
  border: 1px dashed var(--line-3);
  background: var(--rail);
  color: var(--ghost-ink);
}
.crate.on { border-style: solid; border-color: var(--gold); background: color-mix(in srgb, var(--gold) 6%, var(--rail)); color: var(--gold); }
.crate svg { width: 26px; height: 26px; }
.stars-table {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  padding-top: 10px;
  border-top: 1px dashed var(--line-2);
}
.stars-col { flex-grow: 1; flex-basis: 0; display: flex; flex-direction: column; align-items: center; gap: 5px; }
.stars-blocks { display: flex; flex-direction: column-reverse; gap: 2px; width: 100%; }
.stars-blocks span { height: 6px; background: var(--raised); }
.stars-col:not(.current) .stars-blocks span.on { background: var(--line-5); }
.stars-col.current .stars-blocks span.on { background: var(--gold); }
.stars-label { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; color: var(--muted); }
.stars-col.current .stars-label { color: var(--gold); }

/* Performance */
.perf-card { flex-grow: 1; }
.perf-value { font-size: 3rem; color: var(--teal); line-height: 1; }
.perf-bar { display: flex; flex-direction: column; gap: 5px; }
.perf-bar-head {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: var(--khaki);
}
.perf-track { height: 6px; background: var(--raised); display: flex; }
.perf-fill { display: block; height: 6px; }
.perf-fill.teal { background: var(--teal); }
.perf-fill.common { background: var(--sample-common); }
.perf-fill.rare { background: var(--sample-rare); }
.perf-fill.super { background: var(--sample-super); }
.perf-track.tri { gap: 1px; }
.perf-valor {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--line-2);
}
.perf-valor-nums { display: flex; align-items: baseline; gap: 8px; }
.v-base { font-size: 1.4rem; color: var(--gold); }
.v-arrow { color: var(--muted); }
.v-final { font-size: 1.4rem; color: var(--teal); }
.v-delta { font-size: 1rem; color: var(--teal); }

.file-cta {
  flex-shrink: 0;
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 22px;
}
.file-copy { display: flex; flex-direction: column; gap: 4px; text-align: left; }
.file-copy .disp { font-size: 1.2rem; }
.file-sub { font-size: 10px; font-weight: 700; letter-spacing: 0.2em; }
.file-cta svg { width: 22px; height: 22px; }
.cancel { align-self: flex-end; }

.report-failure { display: flex; flex-direction: column; gap: 12px; }
.failure-note { margin: 0; color: var(--muted); }
.report-actions { align-items: center; }

@media (max-width: 1020px) {
  .report-grid { grid-template-columns: minmax(0, 1fr); }
  .sample-grid { grid-template-columns: minmax(0, 1fr); }
}
</style>
