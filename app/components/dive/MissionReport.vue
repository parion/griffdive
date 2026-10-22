<script setup lang="ts">
import {
  SAMPLE_CREDITS,
  bonusIntervalFor,
  maxStarsFor,
  sampleAvailability,
} from '~~/shared/engine/config'
import { catchUpOpsBehind, difficultyName } from '~~/shared/engine/progression'
import { missionHaul, optionsForDiver, timeHaulMultiplier } from '~~/shared/engine/rewards'
import {
  bonusEligibleFor,
  bonusFor,
  bonusWinners,
  currentFront,
  squadSize,
} from '~~/shared/engine/selectors'
import type { DiverState, DiveState, MissionOutcome, MissionReport, SampleCounts } from '~~/shared/engine/types'

const props = withDefaults(defineProps<{
  state: DiveState
  selfId: string | null
  self: DiverState | null
  outcome: MissionOutcome
  opLength: number
  // On phones the report's primary actions pin to the shell's action bar so
  // the long form never buries them below the fold.
  phone?: boolean
}>(), { phone: false })

const emit = defineEmits<{
  submit: [payload: MissionReport]
  cancel: []
  spinBonus: [payload: { stars: number, outcome: MissionOutcome }]
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

const haul = computed(() => missionHaul(props.outcome === 'success' ? report.value : null))
const timeMultiplier = computed(() => timeHaulMultiplier(timePct.value))
const timeFrac = computed(() => Math.min(1, Math.max(0, timePct.value / 100)))

const sampleRows = computed(() => [
  { key: 'common' as const, label: 'Common', tone: 'common' as const, icon: '/images/svgs/Common_Sample_Icon.svg', max: sampleMax.value.common },
  { key: 'rare' as const, label: 'Rare', tone: 'rare' as const, icon: '/images/svgs/Rare_Sample_Icon.svg', max: sampleMax.value.rare },
  { key: 'super' as const, label: 'Super', tone: 'super' as const, icon: '/images/svgs/Super_Sample_Icon.svg', max: sampleMax.value.super },
].filter(row => row.max > 0).map(row => ({
  ...row,
  value: `${samples.value[row.key] * SAMPLE_CREDITS[row.key]} cr`,
})))

const opNumber = computed(() =>
  catchUpOpsBehind(props.state.difficulty, props.state.settings?.variant ?? 'medium') + 1)

const optionCount = computed(() =>
  optionsForDiver(stars.value, props.self?.failedPactIds.length ?? 0))

const honorsEligible = computed(() =>
  props.outcome === 'success'
  && bonusEligibleFor(
    props.outcome,
    stars.value,
    props.state.difficulty,
    props.state.missionIndex,
    squadSize(props.state),
  ))

const honors = computed(() => bonusFor(props.state))
const winners = computed(() => bonusWinners(props.state))
const honorsAwarded = computed(() => props.state.bonusWinnerIds.length > 0)
const honorsReason = computed(() => {
  if (props.outcome !== 'success') {
    return 'No honors on a failed mission.'
  }
  if (stars.value < maxStars.value) {
    return 'Squad Honors need a full-star clear.'
  }
  const interval = bonusIntervalFor(squadSize(props.state))
  return `Honors are due every ${interval} mission${interval === 1 ? '' : 's'} for a squad of ${squadSize(props.state)}.`
})

const timeCells = Array.from({ length: 20 }, (_, index) => (index + 1) * 5)

function setTime(value: number): void {
  timePct.value = Math.min(100, Math.max(0, value))
}

function submit(): void {
  emit('submit', report.value)
}

function spin(): void {
  if (!honorsEligible.value || honors.value) {
    return
  }
  emit('spinBonus', { stars: stars.value, outcome: props.outcome })
}
</script>

<template>
  <section class="report">
    <header class="report-head">
      <span
        class="kick"
        :class="{ red: outcome === 'failure' }"
      >{{ outcome === 'success' ? 'Extraction confirmed' : 'No extraction' }}</span>
      <h1 class="disp report-title">
        {{ outcome === 'success' ? 'Mission report' : 'Mission failed' }}
      </h1>
      <p class="report-sub">
        {{ outcome === 'success'
          ? 'Copy the numbers off the end-of-mission screen.'
          : 'The operation repeats at the same difficulty. Every diver owes one earned item.' }}
      </p>
    </header>

    <template v-if="outcome === 'success'">
      <div class="report-grid">
        <section
          class="card stars-card"
          aria-label="Mission stars"
        >
          <span class="cap">Mission stars</span>
          <StarRating
            v-model="stars"
            :length="maxStars"
            size="lg"
          />
          <span
            v-if="stars === maxStars"
            class="full-tag"
          >Full-star clear</span>
          <span
            v-else
            class="full-tag off"
          >{{ maxStars - stars }} star{{ maxStars - stars === 1 ? '' : 's' }} missed</span>
          <div class="stars-foot">
            <span>Each diver drafts</span>
            <b class="disp">{{ optionCount }}</b>
            <span>loot option{{ optionCount === 1 ? '' : 's' }}</span>
          </div>
        </section>

        <section
          class="card haul-card"
          aria-label="Credits haul"
        >
          <div class="card-head">
            <span class="cap">Credits haul</span>
            <span class="tiny">Samples × time = credits</span>
          </div>

          <div class="samples">
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

          <div class="time-block">
            <div class="time-head">
              <span class="cap teal-text">Time remaining</span>
              <span class="disp time-value">{{ timePct }}<small>%</small></span>
            </div>
            <div class="time-row">
              <button
                class="step"
                type="button"
                aria-label="Less time remaining"
                @click="setTime(timePct - 5)"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.4"
                  aria-hidden="true"
                >
                  <path d="M5 12h14" />
                </svg>
              </button>
              <div
                class="time-cells"
                role="group"
                aria-label="Time remaining percent"
              >
                <button
                  v-for="cell in timeCells"
                  :key="cell"
                  class="time-cell"
                  :class="{ on: cell <= timePct }"
                  type="button"
                  :aria-label="`Set time remaining to ${cell} percent`"
                  :aria-pressed="cell <= timePct && (cell === timePct || cell + 5 > timePct)"
                  @click="setTime(cell)"
                />
              </div>
              <button
                class="step"
                type="button"
                aria-label="More time remaining"
                @click="setTime(timePct + 5)"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.4"
                  aria-hidden="true"
                >
                  <path d="M5 12h14M12 5v14" />
                </svg>
              </button>
            </div>
            <div class="time-foot">
              <span class="mult">× {{ timeMultiplier.toFixed(2) }}</span>
              <span class="tiny">{{ timeFrac === 1 ? 'Full clock' : `${Math.round(timeFrac * 100)}% of the clock` }}</span>
            </div>
          </div>

          <div class="haul-total">
            <span>Every diver banks the same haul</span>
            <span class="haul-value disp">
              =
              <IconCredit />
              +{{ haul }}
            </span>
          </div>
        </section>
      </div>

      <section
        class="honors-card"
        :class="{ live: honorsEligible, done: honorsAwarded }"
        aria-label="Squad Honors"
      >
        <div class="honors-id">
          <span
            class="honors-hex"
            aria-hidden="true"
          >1</span>
          <span class="honors-copy">
            <span class="disp">Squad Honors</span>
            <span class="tiny">
              {{ honorsEligible ? 'Spin now so the squad knows what to chase' : honorsReason }}
            </span>
          </span>
        </div>

        <button
          v-if="honorsEligible && !honors"
          class="honors-spin"
          type="button"
          @click="spin"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            aria-hidden="true"
          >
            <rect
              x="3.5"
              y="3.5"
              width="17"
              height="17"
              rx="4.5"
            />
            <g
              fill="currentColor"
              stroke="none"
            >
              <circle
                cx="8.3"
                cy="8.3"
                r="1.5"
              />
              <circle
                cx="15.7"
                cy="8.3"
                r="1.5"
              />
              <circle
                cx="12"
                cy="12"
                r="1.5"
              />
              <circle
                cx="8.3"
                cy="15.7"
                r="1.5"
              />
              <circle
                cx="15.7"
                cy="15.7"
                r="1.5"
              />
            </g>
          </svg>
          Spin the stat
        </button>

        <span
          v-else-if="honors"
          class="honors-stat"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            aria-hidden="true"
          >
            <path d="M13 2 4 14h6l-1 8 9-12h-6z" />
          </svg>
          <b class="disp">{{ honors.label }}</b>
        </span>

        <span
          v-if="honors"
          class="honors-note"
        >
          <template v-if="honorsAwarded">
            {{ winners.length === 1 ? winners[0]!.name : `${winners.length} divers tied` }} banked the token.
          </template>
          <template v-else-if="squadSize(state) === 1">
            Token banked.
          </template>
          <template v-else>
            Award the token from the squad bar.
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <path d="M12 4v16M5 13l7 7 7-7" />
            </svg>
          </template>
        </span>
      </section>
    </template>

    <section
      v-else
      class="card fail-card"
      aria-label="Mission failure"
    >
      <span class="cap red-text">Operation repeats</span>
      <p class="fail-copy">
        No stars, no loot, no haul. The squad restarts the operation at
        <b>{{ difficultyName(state.difficulty) }}</b>. Each diver who dove owes one earned item.
      </p>
      <div class="fail-line">
        <span>Op {{ opNumber }} · Mission {{ state.missionInOperation }}/{{ opLength }}</span>
        <span v-if="front">· {{ front.displayName }}</span>
      </div>
    </section>

    <div
      v-if="!phone"
      class="report-actions"
    >
      <button
        class="back"
        type="button"
        @click="emit('cancel')"
      >
        Back to the field
      </button>
      <button
        class="cta cut cta-sweep"
        type="button"
        @click="submit"
      >
        {{ outcome === 'success' ? 'File report' : 'File failure' }}
        <svg
          width="22"
          height="14"
          viewBox="0 0 22 14"
          aria-hidden="true"
        >
          <path
            d="M0 0h5l7 7-7 7H0l7-7zM10 0h5l7 7-7 7h-5l7-7z"
            fill="currentColor"
          />
        </svg>
      </button>
    </div>

    <PhoneActionBar v-else>
      <template #secondary>
        <button
          class="bar-alt"
          type="button"
          @click="emit('cancel')"
        >
          Back
        </button>
      </template>
      <template #primary>
        <button
          class="bar-cta cta-sweep"
          type="button"
          @click="submit"
        >
          <span class="disp">{{ outcome === 'success' ? 'File report' : 'File failure' }}</span>
        </button>
      </template>
    </PhoneActionBar>
  </section>
</template>

<style scoped>
.report {
  display: flex;
  flex-direction: column;
  gap: clamp(14px, 2vh, 22px);
  width: 100%;
  max-width: 1080px;
  margin: 0 auto;
}
.report-head { display: flex; flex-direction: column; gap: 7px; }
.kick {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--gold);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.24em;
  text-transform: uppercase;
}
.kick::before {
  content: '';
  width: 22px;
  height: 2px;
  background: currentColor;
  box-shadow: 0 0 8px currentColor;
}
.kick.red { color: var(--red); }
.report-title { font-size: clamp(38px, 4.6vw, 58px); }
.report-sub { margin: 0; color: var(--muted); font-size: 14px; }

.report-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.35fr);
  gap: 18px;
  align-items: stretch;
}
.card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px 22px;
  background: var(--panel);
  box-shadow: inset 0 0 0 1px var(--line-3);
  clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
  min-width: 0;
}
.stars-card {
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 16px;
  background:
    radial-gradient(ellipse 70% 60% at 50% 42%, rgba(255, 214, 66, 0.14), transparent 70%),
    var(--panel);
}
.stars-card :deep(.star) {
  border: 0;
  background: transparent;
  width: 4.6rem;
  height: 4.6rem;
}
.stars-card :deep(.star-glyph) { width: 3.3rem; height: 3.3rem; }
.full-tag {
  display: inline-flex;
  padding: 4px 9px;
  background: var(--gold);
  color: var(--on-gold);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.full-tag.off { background: var(--line-3); color: var(--muted); }
.stars-foot {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 9px;
  width: 100%;
  padding-top: 13px;
  border-top: 1px solid var(--line-2);
  color: var(--khaki);
  font-size: 14px;
}
.stars-foot b { color: var(--gold); font-size: 34px; line-height: 1; text-shadow: 0 0 18px rgba(255, 214, 66, 0.45); }

.card-head { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; }
.tiny { color: var(--dim); font-size: 11px; letter-spacing: 0.04em; }
.teal-text { color: var(--teal); }
.red-text { color: var(--red); }

.samples {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 22px;
  align-items: flex-end;
}
.samples :deep(.canister) { flex: 1 1 150px; }
.time-block { display: flex; flex-direction: column; gap: 8px; }
.time-head { display: flex; justify-content: space-between; align-items: baseline; }
.time-value { color: var(--teal); font-size: 20px; }
.time-value small { font-size: 11px; color: var(--muted); margin-left: 2px; }
.time-row { display: flex; align-items: center; gap: 8px; }
.step {
  display: grid;
  place-items: center;
  width: 32px;
  height: 38px;
  flex: none;
  border: 0;
  background: var(--rail);
  box-shadow: inset 0 0 0 1px var(--line-3);
  color: var(--khaki);
  cursor: pointer;
}
.step:hover { color: var(--text); box-shadow: inset 0 0 0 1px var(--line-5); }
.time-cells {
  display: flex;
  gap: 3px;
  flex: 1;
  height: 38px;
  min-width: 0;
}
.time-cell {
  flex: 1;
  min-width: 0;
  padding: 0;
  border: 0;
  background: var(--rail);
  box-shadow: inset 0 0 0 1px var(--line-2);
  cursor: pointer;
}
.time-cell.on {
  background: color-mix(in srgb, var(--teal) 38%, var(--rail));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--teal) 55%, var(--line-2));
}
.time-foot { display: flex; align-items: baseline; gap: 12px; }
.mult { color: var(--teal); font: 800 22px var(--font-display); font-stretch: 125%; }
.haul-total {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 12px;
  border-top: 2px solid var(--line-4);
  color: var(--khaki);
  font-size: 13px;
}
.haul-value {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--gold);
  font-size: 32px;
  text-shadow: 0 0 18px rgba(255, 214, 66, 0.45);
}
.haul-value :deep(.credit-mark) { width: 24px; height: 24px; }

.honors-card {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px 22px;
  padding: 15px 20px;
  background: linear-gradient(90deg, rgba(255, 214, 66, 0.09), var(--panel) 45%);
  box-shadow: inset 0 0 0 1px var(--line-3);
  clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
}
.honors-card.live { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--gold) 45%, var(--line-3)); }
.honors-card.done { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--teal) 45%, var(--line-3)); }
.honors-id { display: flex; align-items: center; gap: 12px; }
.honors-hex {
  display: grid;
  place-items: center;
  width: 34px;
  height: 38px;
  flex: none;
  background: linear-gradient(180deg, #ffe57a, var(--gold) 50%, #e0b000);
  color: var(--on-gold);
  font: 800 16px var(--font-display);
  font-stretch: 125%;
  clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
}
.honors-copy { display: flex; flex-direction: column; gap: 2px; }
.honors-copy .disp { font-size: 18px; }
.honors-spin {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  min-height: 46px;
  padding: 0 16px;
  border: 0;
  background: var(--gold);
  color: var(--on-gold);
  font: 800 13px var(--font-body);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
}
.honors-stat {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  min-height: 46px;
  padding: 0 14px;
  background: var(--ground);
  box-shadow: inset 0 0 0 1px var(--gold), 0 0 18px rgba(255, 214, 66, 0.22);
  color: var(--gold);
}
.honors-stat .disp { font-size: 18px; }
.honors-note {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-left: auto;
  color: var(--khaki);
  font-size: 13px;
}

.fail-card { max-width: 720px; }
.fail-copy { margin: 0; color: var(--khaki); font-size: 15px; line-height: 1.5; }
.fail-line { color: var(--dim); font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; }

.report-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 18px;
  padding-top: 4px;
}
.back {
  min-height: 44px;
  border: 0;
  background: none;
  color: var(--muted);
  font: 500 14px var(--font-body);
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-color: var(--line-4);
  cursor: pointer;
}
.back:hover { color: var(--text); }
.cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  min-width: 300px;
  min-height: 58px;
  padding: 0 24px;
  border: 0;
  background: linear-gradient(180deg, #ffe57a 0%, var(--gold) 45%, #f0bf1a 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6), inset 0 -3px 0 rgba(110, 80, 0, 0.35);
  color: var(--on-gold);
  font: 800 17px var(--font-display);
  font-stretch: 125%;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
}

@media (max-width: 800px) {
  .report-grid { grid-template-columns: minmax(0, 1fr); }
  /* 20 time faces become seven-column rows instead of an 8px-tall sliver. */
  .time-cells {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    grid-auto-rows: 30px;
    height: auto;
    gap: 3px;
  }
  .time-cell { min-height: 30px; }
  .step { height: auto; align-self: stretch; }
  .stars-card { padding: 16px; }
  .stars-card :deep(.star) { width: 3.5rem; height: 3.5rem; }
  .stars-card :deep(.star-glyph) { width: 2.5rem; height: 2.5rem; }
  .report-actions { justify-content: stretch; }
  .cta { flex: 1; min-width: 0; }
  .honors-note { margin-left: 0; }
}
</style>
