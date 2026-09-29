<script setup lang="ts">
import { MAJOR_ORDER_RISK, STRAIN_RISK, conditionRiskAt, maxStarsFor } from '~~/shared/engine/config'
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
}>()

const misfortune = computed(() => activeMisfortune(props.state))
const front = computed(() => currentFront(props.state))
const frontImage = computed(() => (front.value ? factionImageUrl(front.value.id) : undefined))
const strain = computed(() => activeStrain(props.state))
const teamRisk = computed(() => teamRiskOf(props.state))
const baseValor = computed(() => teamRisk.value + (props.self ? pactRiskOf(props.self, props.state.difficulty) : 0))

const misfortuneRisk = computed(() =>
  props.state.misfortuneAccepted
    ? conditionRiskAt(misfortune.value?.id ?? '', props.state.difficulty)
    : 0)
const strainRisk = computed(() =>
  props.state.strainAccepted ? STRAIN_RISK[strain.value?.id ?? ''] ?? 0 : 0)
const majorOrderRisk = computed(() => (props.state.majorOrder?.live ? MAJOR_ORDER_RISK : 0))

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
    :base-valor="baseValor"
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
            <span class="lbl">Misfortune</span>
            <span
              v-if="misfortune"
              class="risk-chip red"
              role="img"
              :aria-label="`Team risk ${misfortuneRisk} of 5`"
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

      <PactBriefing
        :divers="state.divers"
        :self-id="selfId"
        :is-host="isHost"
        :difficulty="state.difficulty"
        @fail="(playerId, pactId) => emit('fail', playerId, pactId)"
      />

      <template v-if="canControl && mode === 'none'">
        <div class="outcome ticks">
          <span class="lbl">Outcome · host calls it</span>
          <div class="outcome-buttons">
            <button
              class="btn primary cut outcome-btn"
              type="button"
              @click="open('success')"
            >
              <span class="disp">Mission complete</span>
              <span class="sub">file the report</span>
            </button>
            <button
              class="btn danger cut outcome-btn"
              type="button"
              @click="open('failure')"
            >
              <span class="disp">Mission failed</span>
              <span class="sub">forfeit 1 · retry op</span>
            </button>
          </div>
        </div>
      </template>
      <p
        v-else-if="!canControl"
        class="waiting"
      >
        Waiting for the host to report the mission result.
      </p>

      <div
        v-if="mode === 'failure'"
        class="failure"
      >
        <span class="disp failure-title">Mission failed</span>
        <span class="failure-sub">No stars · the operation repeats · forfeit one item</span>
        <div class="failure-actions">
          <button
            class="btn danger cut confirm"
            type="button"
            @click="submit"
          >
            <span class="disp">Confirm failure</span>
          </button>
          <button
            class="ghost cancel"
            type="button"
            @click="mode = 'none'"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.phone-diving { display: flex; flex-direction: column; min-height: 100%; }
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

.outcome {
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 12px;
  border: 1px solid var(--line-3);
  background-color: var(--panel);
}
.outcome-buttons { display: flex; flex-direction: column; gap: 8px; }
.outcome-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  min-height: 58px;
  padding: 8px 16px;
  text-align: left;
}
.outcome-btn .disp { font-size: 17px; }
.outcome-btn .sub { font-size: 9px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; opacity: 0.8; }

.waiting {
  margin: 0;
  padding: 16px 12px;
  text-align: center;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}

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
.failure-actions { display: flex; gap: 8px; margin-top: 4px; }
.confirm { flex: 1 1 auto; height: 54px; }
.cancel { width: 96px; height: 54px; flex-shrink: 0; color: var(--khaki); }
</style>
