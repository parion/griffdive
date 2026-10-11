<script setup lang="ts">
import { MAJOR_ORDER_RISK, STRAIN_RISK, conditionRiskAt, directiveValorAt, maxStarsFor } from '~~/shared/engine/config'
import { activeMisfortune, activeStrain, currentFront, pactRiskOf, teamRiskOf } from '~~/shared/engine/selectors'
import { factionImageUrl } from '~~/shared/data/images'
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
  failDirective: []
}>()

const misfortune = computed(() => activeMisfortune(props.state))
const front = computed(() => currentFront(props.state))
const frontImage = computed(() => (front.value ? factionImageUrl(front.value.id) : undefined))
const strain = computed(() => activeStrain(props.state))
const teamRisk = computed(() => teamRiskOf(props.state))
const pactRisk = computed(() =>
  props.self ? pactRiskOf(props.self, props.state.difficulty) : 0)

const misfortuneRisk = computed(() =>
  props.state.misfortuneAccepted
    ? conditionRiskAt(misfortune.value?.id ?? '', props.state.difficulty)
    : 0)
const strainRisk = computed(() =>
  props.state.strainAccepted ? STRAIN_RISK[strain.value?.id ?? ''] ?? 0 : 0)
const majorOrderRisk = computed(() => (props.state.majorOrder?.live ? MAJOR_ORDER_RISK : 0))

// A broken team directive voids its shared Valor entirely.
const directiveFailed = computed(() => props.state.misfortuneFailed)
const directiveValor = computed(() =>
  props.state.misfortuneAccepted && !props.state.misfortuneFailed
    ? directiveValorAt(misfortune.value?.id ?? '', props.state.difficulty, props.state.divers.length)
    : 0)
const confirmFail = ref(false)
function toggleFail(): void {
  if (!confirmFail.value) {
    confirmFail.value = true
    return
  }
  confirmFail.value = false
  emit('failDirective')
}

const mode = ref<'none' | 'success' | 'failure'>('none')
const stars = ref(1)
const time = ref(0)
const samples = ref<SampleCounts>({ common: 0, rare: 0, super: 0 })

const maxStars = computed(() => maxStarsFor(props.state.difficulty))

function reset(): void {
  stars.value = maxStars.value
  time.value = 0
  samples.value = { common: 0, rare: 0, super: 0 }
}

function open(next: 'success' | 'failure'): void {
  mode.value = next
  reset()
}

function submit(): void {
  // Keep the report mounted until the phase actually flips (a room round-trip
  // is async), so the in-field screen never flashes between report and rewards.
  emit('report', mode.value === 'success'
    ? { outcome: 'success', stars: stars.value, timePct: time.value, samples: { ...samples.value } }
    : { outcome: 'failure', stars: 0, timePct: 0 })
}
</script>

<template>
  <PhoneReport
    v-if="mode === 'success'"
    v-model:stars="stars"
    v-model:time="time"
    v-model:samples="samples"
    :state="state"
    :sample-bank="self?.sampleBank ?? 0"
    @submit="submit"
    @cancel="mode = 'none'"
  />

  <div
    v-else
    class="phone-diving"
  >
    <div class="scroll">
      <section
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
            aria-hidden="true"
          ><rect
            x="6"
            y="11"
            width="12"
            height="9"
          /><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" /></svg>
        </span>
        <div class="status-stack">
          <div class="status-line">
            <span class="lbl">Directive</span>
            <span
              v-if="misfortune"
              class="risk-chip red"
              role="img"
              :aria-label="`Directive risk ${misfortuneRisk} of 5`"
            ><b>{{ misfortuneRisk }}</b><i /></span>
            <span class="status-name">{{ misfortune?.name ?? 'Safe dive' }}</span>
          </div>
          <div class="status-line">
            <span class="lbl">Front</span>
            <img
              v-if="frontImage"
              :src="frontImage"
              :alt="front?.displayName ?? ''"
              class="status-front"
            >
            <span class="status-name">{{ strain?.name ?? front?.displayName ?? 'Unknown' }}</span>
            <span
              v-if="strainRisk"
              class="disp status-val orange"
            >+{{ strainRisk }}</span>
            <span
              v-else-if="majorOrderRisk"
              class="disp status-val teal"
            >MO +{{ majorOrderRisk }}</span>
          </div>
        </div>
        <div
          class="status-total"
          role="img"
          :aria-label="`Team risk ${teamRisk}`"
        >
          <span class="lbl">Team</span>
          <span class="disp total-n">{{ teamRisk }}</span>
        </div>
      </section>

      <div
        v-if="directiveFailed"
        class="directive-failed"
        role="status"
      >
        <span>SQUAD DIRECTIVE FAILED · RISK VOIDED · −1 OPTION</span>
      </div>
      <div
        v-else-if="canControl && state.misfortuneAccepted"
        class="directive-fail"
      >
        <span class="lbl">Directive · {{ misfortune?.name }} · +{{ directiveValor }} Valor</span>
        <button
          class="btn danger tiny"
          type="button"
          :aria-label="confirmFail ? 'Confirm the directive is broken — this cannot be undone' : 'Mark the squad directive failed'"
          @click="toggleFail"
        >
          {{ confirmFail ? 'Confirm — void it?' : 'Mark failed' }}
        </button>
      </div>

      <PactBriefing
        :divers="state.divers"
        :self-id="selfId"
        :is-host="isHost"
        :difficulty="state.difficulty"
        @fail="(playerId, pactId) => emit('fail', playerId, pactId)"
      />

      <div
        v-if="mode === 'failure'"
        class="failure"
      >
        <span class="disp failure-title">Mission failed</span>
        <span class="failure-sub">No stars · the operation repeats · forfeit one item</span>
      </div>
    </div>

    <PhoneActionBar>
      <template #detail>
        <PhoneValor
          :difficulty="state.difficulty"
          :team-risk="teamRisk"
          :pact-risk="pactRisk"
          locked
        />
      </template>

      <template
        v-if="canControl && mode === 'failure'"
        #secondary
      >
        <button
          class="bar-alt"
          type="button"
          @click="mode = 'none'"
        >
          Cancel
        </button>
      </template>
      <template
        v-else-if="canControl"
        #secondary
      >
        <button
          class="bar-alt red"
          type="button"
          @click="open('failure')"
        >
          Mission failed
        </button>
      </template>

      <template #primary>
        <button
          v-if="canControl && mode === 'failure'"
          class="bar-cta red"
          type="button"
          @click="submit"
        >
          <span class="disp">Confirm failure</span>
        </button>
        <button
          v-else-if="canControl"
          class="bar-cta cta-sweep"
          type="button"
          @click="open('success')"
        >
          <span class="disp">Mission complete</span>
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.4"
            aria-hidden="true"
          ><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>
        <div
          v-else
          class="bar-gate"
          role="status"
        >
          <span
            class="hazard-soft bar-gate-edge"
            aria-hidden="true"
          />
          <span class="disp bar-gate-word">Mission report</span>
          <span class="bar-gate-meta">Waiting for the host</span>
        </div>
      </template>
    </PhoneActionBar>
  </div>
</template>

<style scoped>
.phone-diving { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }
.scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 16px 14px;
}

.status {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
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
.status-icon svg { width: 18px; height: 18px; background: var(--rail); padding: 2px; box-sizing: content-box; }
.status-stack {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  min-width: 0;
  padding: 8px 12px;
}
.status-line { display: flex; align-items: center; gap: 6px; min-width: 0; }
.status-front { width: 18px; height: 18px; object-fit: contain; flex-shrink: 0; }
.risk-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  padding: 1px 5px;
  border: 1px solid currentColor;
}
.risk-chip b { font-size: 12px; font-weight: 700; line-height: 1; }
.risk-chip i { width: 7px; height: 7px; background: currentColor; }
.risk-chip.red { color: var(--red); }
.risk-chip.orange { color: var(--orange); }
.status-name {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.status-sep { color: var(--line-4); }
.status-val { font-size: 14px; white-space: nowrap; }
.gold { color: var(--gold); }
.orange { color: var(--orange); }
.teal { color: var(--teal); }
.status-total {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 0 14px;
  background: var(--panel);
}
.total-n { font-size: 26px; color: var(--text); }

.directive-failed {
  padding: 8px 10px;
  border: 1px solid var(--red);
  background: color-mix(in srgb, var(--red) 10%, var(--panel));
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--red);
}
.directive-fail {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border: 1px dashed color-mix(in srgb, var(--red) 45%, var(--line-3));
}
.directive-fail .lbl { color: var(--muted); }

.failure {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
  border: 1px solid var(--red);
  background: color-mix(in srgb, var(--red) 8%, var(--panel));
}
.failure-title { font-size: 22px; color: var(--red); }
.failure-sub { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--khaki); }
</style>
