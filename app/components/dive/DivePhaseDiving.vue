<script setup lang="ts">
import { missionsPerOperation } from '~~/shared/engine/config'
import { strainImageUrl } from '~~/shared/data/images'
import { tierZones } from '~~/shared/engine/rewards'
import {
  activeMisfortune,
  activeStrain,
  pactRiskOf,
  teamRiskOf,
} from '~~/shared/engine/selectors'
import type { DiverState, DiveState, MissionOutcome, MissionReport } from '~~/shared/engine/types'

const props = defineProps<{
  state: DiveState
  selfId: string | null
  self: DiverState | null
  canControl: boolean
  isHost: boolean
}>()

const emit = defineEmits<{
  report: [payload: MissionReport]
  fail: [playerId: string, pactId: string]
  failDirective: []
  reporting: [open: boolean]
  spinBonus: [payload: { stars: number, outcome: MissionOutcome }]
}>()

const misfortune = computed(() => activeMisfortune(props.state))
const strain = computed(() => activeStrain(props.state))
const strainImage = computed(() => (strain.value ? strainImageUrl(strain.value.id) : undefined))
const opLength = computed(() => missionsPerOperation(props.state.difficulty))

const directiveFailed = computed(() => props.state.misfortuneFailed)
const confirmFail = ref(false)

const lockedValor = computed(() =>
  teamRiskOf(props.state) + (props.self ? pactRiskOf(props.self, props.state.difficulty) : 0))
const zones = computed(() => tierZones(props.state.difficulty, lockedValor.value))

function toggleFail(): void {
  if (!confirmFail.value) {
    confirmFail.value = true
    return
  }
  confirmFail.value = false
  emit('failDirective')
}

const reportMode = ref<'none' | 'success' | 'failure'>('none')

// The report stays on screen after filing: the phase change unmounts it. Closing
// it here first would flash the field screen for a frame before the next beat.
function submit(payload: MissionReport): void {
  emit('report', payload)
}

function openReport(mode: 'success' | 'failure'): void {
  reportMode.value = mode
}

function cancelReport(): void {
  reportMode.value = 'none'
}

watch(reportMode, mode => emit('reporting', mode !== 'none'), { immediate: true })
</script>

<template>
  <section
    v-if="reportMode === 'none'"
    class="field"
  >
    <header class="field-head">
      <span class="kick">In the field</span>
      <h1 class="disp field-title">
        Hold the line
      </h1>
      <p class="field-sub">
        Play the mission in Helldivers 2. If something breaks, mark it here.
      </p>
    </header>

    <div class="field-grid">
      <div class="field-main">
        <article
          class="directive-card"
          :class="{ broken: directiveFailed, safe: !misfortune }"
        >
          <div class="directive-top">
            <span class="cap">Squad directive</span>
            <span
              class="status"
              :class="directiveFailed ? 'red' : 'teal'"
            >{{ directiveFailed ? 'Broken' : 'Holding' }}</span>
          </div>
          <h2
            class="disp directive-name"
            :style="fitWord(misfortune?.name ?? 'Safe dive')"
          >
            {{ misfortune?.name ?? 'Safe dive' }}
          </h2>
          <p class="directive-rule">
            <ConditionRule
              v-if="misfortune"
              :condition="misfortune"
            />
            <template v-else>
              No team rule was accepted this mission.
            </template>
          </p>
          <ConditionKeywords
            v-if="misfortune"
            :keywords="misfortune.keywords"
          />
          <div class="directive-foot">
            <span
              v-if="directiveFailed"
              class="void"
            >Risk voided · every diver loses a loot option</span>
            <span
              v-else-if="misfortune"
              class="gain"
            >Raising everyone’s loot</span>
            <span
              v-else
              class="gain"
            >The squad carries only its pacts</span>
            <button
              v-if="canControl && misfortune && !directiveFailed"
              class="mark"
              :class="{ armed: confirmFail }"
              type="button"
              @click="toggleFail"
            >
              {{ confirmFail ? 'Confirm — void it?' : 'Mark broken' }}
            </button>
          </div>
        </article>

        <div
          v-if="strain && state.strainAccepted"
          class="strain-line"
        >
          <img
            v-if="strainImage"
            :src="strainImage"
            alt=""
            width="20"
            height="20"
          >
          <b>{{ strain.name }}</b>
          <span>strain · whole operation</span>
        </div>
      </div>

      <PactLedger
        class="sworn"
        :state="state"
        :self-id="selfId"
        :is-host="isHost"
        @fail="(diverId, pactId) => emit('fail', diverId, pactId)"
      />

      <ValorRoll
        v-if="isHost && misfortune"
        class="field-roll"
        :zones="zones"
        label="Your Valor roll"
        locked
        compact
      />

      <div
        v-if="canControl"
        class="outcomes"
      >
        <button
          class="fail"
          type="button"
          @click="openReport('failure')"
        >
          Mission failed
        </button>
        <button
          class="cta cut cta-sweep"
          type="button"
          @click="openReport('success')"
        >
          Extracted
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
      <div
        v-else
        class="waiting"
      >
        <span class="cap">Host reports after extraction</span>
      </div>
    </div>
  </section>

  <MissionReport
    v-if="reportMode !== 'none'"
    :state="state"
    :self-id="selfId"
    :self="self"
    :outcome="reportMode"
    :op-length="opLength"
    @submit="submit"
    @cancel="cancelReport"
    @spin-bonus="emit('spinBonus', $event)"
  />
</template>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: 22px;
  width: 100%;
  max-width: 680px;
  margin: 0 auto;
}
.field-head { display: flex; flex-direction: column; gap: 8px; }
.kick {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--teal);
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
.field-title { font-size: clamp(38px, 4.4vw, 60px); }
.field-sub { margin: 0; color: var(--muted); font-size: 14px; }

.field-grid {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.field-main { display: flex; flex-direction: column; gap: 12px; min-width: 0; }

.directive-card {
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 22px 24px 18px;
  background:
    radial-gradient(ellipse 80% 80% at 20% 0%, rgba(74, 215, 200, 0.1), transparent 70%),
    var(--panel);
  box-shadow: inset 0 0 0 2px var(--teal), 0 0 30px rgba(74, 215, 200, 0.12);
  clip-path: polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px);
}
.directive-card.safe { box-shadow: inset 0 0 0 1px var(--line-3); background: var(--panel); }
.directive-card.broken {
  background:
    radial-gradient(ellipse 70% 70% at 20% 0%, rgba(255, 75, 62, 0.1), transparent 70%),
    var(--panel);
  box-shadow: inset 0 0 0 2px var(--red), 0 0 30px rgba(255, 75, 62, 0.12);
}
.directive-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.status {
  padding: 4px 8px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.status.teal { color: var(--on-gold); background: var(--teal); box-shadow: 0 0 12px rgba(74, 215, 200, 0.4); }
.status.red { color: var(--red); background: var(--ground); box-shadow: inset 0 0 0 1px var(--red); }
.directive-name {
  font-size: min(clamp(32px, 3.6vw, 48px), 100cqi / var(--fit-len, 1));
  line-height: 0.95;
  color: var(--gold);
  text-shadow: 0 0 26px rgba(255, 214, 66, 0.25);
}
.broken .directive-name { color: var(--red); text-decoration: line-through; text-decoration-thickness: 3px; text-shadow: none; }
.directive-rule { margin: 0; color: var(--khaki); font-size: 15px; }
.directive-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 8px;
}
.gain { color: var(--muted); font-size: 12px; }
.void { color: var(--red); font-size: 12px; }
.mark {
  min-height: 34px;
  padding: 0 12px;
  border: 0;
  background: transparent;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--red) 55%, var(--line-3));
  color: var(--red);
  font: 700 10px var(--font-body);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background-color var(--dur-fast), box-shadow var(--dur-fast);
}
.mark:hover,
.mark.armed { box-shadow: inset 0 0 0 1px var(--red); background: rgba(255, 75, 62, 0.1); }
.mark.armed { animation: shake 0.3s ease-out; }

.strain-line {
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 30px;
  padding: 0 4px;
  color: var(--text);
  font-size: 13px;
}
.strain-line img { object-fit: contain; }
.strain-line span { color: var(--muted); font-size: 12px; }

.outcomes {
  display: flex;
  align-items: stretch;
  justify-content: flex-end;
  gap: 14px;
}
.fail {
  min-height: 60px;
  padding: 0 22px;
  border: 1px solid var(--red);
  background: transparent;
  color: var(--red);
  font: 800 14px var(--font-display);
  font-stretch: 125%;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%);
}
.fail:hover { background: rgba(255, 75, 62, 0.1); }
.cta {
  display: inline-flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 14px;
  min-height: 60px;
  padding: 0 24px;
  border: 0;
  background: linear-gradient(180deg, #ffe57a 0%, var(--gold) 45%, #f0bf1a 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6), inset 0 -3px 0 rgba(110, 80, 0, 0.35), 0 0 34px rgba(255, 214, 66, 0.22);
  color: var(--on-gold);
  font: 800 19px var(--font-display);
  font-stretch: 125%;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
}
.cta:hover { filter: brightness(1.06); }

.waiting { display: flex; align-items: center; min-height: 48px; }

@media (max-width: 860px) {
  .field-title { font-size: 38px; }
}
@media (max-width: 520px) {
  .outcomes { flex-direction: column-reverse; }
}
</style>
