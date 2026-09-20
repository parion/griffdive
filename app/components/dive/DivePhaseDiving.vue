<script setup lang="ts">
import { maxStarsFor, sampleAvailability } from '~~/shared/engine/config'
import { performanceValor } from '~~/shared/engine/rewards'
import { activeMisfortune, currentFront, pactRiskOf, teamRiskOf } from '~~/shared/engine/selectors'
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
const selfPactRisk = computed(() => (props.self ? pactRiskOf(props.self) : 0))
const teamRisk = computed(() => teamRiskOf(props.state))

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
      :divers="state.divers"
      :self-id="selfId"
      :is-host="isHost"
      @fail="(playerId, pactId) => emit('fail', playerId, pactId)"
    />
    <ValorMeter
      :difficulty="state.difficulty"
      :team-risk="teamRisk"
      :pact-risk="selfPactRisk"
      :performance="performancePreview"
      locked
    />
    <div
      v-if="canControl && reportMode === 'none'"
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
      v-else-if="!canControl"
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
        class="report-victory"
      >
        <span class="victory-banner">
          <span
            class="wing"
            aria-hidden="true"
          />
          Mission Completed
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
        <span class="muted small">of {{ maxStars }} at this difficulty</span>
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
      <div class="row">
        <button
          class="btn primary"
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
.report-victory {
  display: grid;
  justify-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0 0.15rem;
}
.victory-banner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  max-width: 100%;
  text-align: center;
  gap: 0.7rem;
  font-family: var(--font-display);
  font-stretch: 125%;
  font-weight: 800;
  font-size: 1.15rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--gold);
}
.wing {
  width: 2.4rem;
  height: 0.95rem;
  background: repeating-linear-gradient(
    115deg,
    var(--gold) 0 0.18rem,
    transparent 0.18rem 0.42rem
  );
  clip-path: polygon(0 50%, 22% 0, 100% 0, 100% 100%, 22% 100%);
}
.wing.flip { transform: scaleX(-1); }
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
</style>
