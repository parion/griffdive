<script setup lang="ts">
import { conditionRiskAt, missionsPerOperation } from '~~/shared/engine/config'
import { pactName } from '~~/shared/data/pacts'
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
  openKit: []
}>()

const misfortune = computed(() => activeMisfortune(props.state))
const strain = computed(() => activeStrain(props.state))
const strainImage = computed(() => (strain.value ? strainImageUrl(strain.value.id) : undefined))
const opLength = computed(() => missionsPerOperation(props.state.difficulty))

const directiveFailed = computed(() => props.state.misfortuneFailed)
const confirmFail = ref(false)

const pactsByDiver = computed(() =>
  props.state.divers.map(diver => ({
    id: diver.id,
    name: diver.name,
    isHost: diver.id === props.state.hostId,
    pacts: diver.pactIds.map(id => ({
      id,
      name: pactName(id),
      risk: conditionRiskAt(id, props.state.difficulty),
      failed: diver.failedPactIds.includes(id),
    })),
  })))

const lockedValor = computed(() =>
  teamRiskOf(props.state) + (props.self ? pactRiskOf(props.self, props.state.difficulty) : 0))
const zones = computed(() => tierZones(props.state.difficulty, lockedValor.value))

const armedPact = ref<string | null>(null)

function canMark(diverId: string): boolean {
  return props.selfId === diverId || props.isHost
}

function markPact(diverId: string, pactId: string): void {
  if (!canMark(diverId)) {
    return
  }
  const key = `${diverId}:${pactId}`
  if (armedPact.value !== key) {
    armedPact.value = key
    return
  }
  armedPact.value = null
  emit('fail', diverId, pactId)
}

function toggleFail(): void {
  if (!confirmFail.value) {
    confirmFail.value = true
    return
  }
  confirmFail.value = false
  emit('failDirective')
}

const reportMode = ref<'none' | 'success' | 'failure'>('none')

function submit(payload: MissionReport): void {
  emit('report', payload)
  reportMode.value = 'none'
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
          :class="{ broken: directiveFailed }"
        >
          <div class="directive-top">
            <span class="cap">Squad directive</span>
            <span
              class="status"
              :class="directiveFailed ? 'red' : 'teal'"
            >{{ directiveFailed ? 'Broken' : 'Holding' }}</span>
          </div>
          <h2 class="disp directive-name">
            {{ misfortune?.name ?? 'Safe dive' }}
          </h2>
          <p class="directive-rule">
            {{ misfortune?.rule ?? 'No team rule was accepted this mission.' }}
          </p>
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

        <section class="sworn">
          <span class="cap">Pacts sworn</span>
          <div
            v-for="diver in pactsByDiver"
            :key="diver.id"
            class="sworn-row"
          >
            <span class="sworn-name">
              <b>{{ diver.name }}</b>
              <i v-if="diver.isHost">Host</i>
            </span>
            <span
              v-if="diver.pacts.length === 0"
              class="no-pacts"
            >No pacts</span>
            <span
              v-for="pact in diver.pacts"
              :key="pact.id"
              class="pact-chip"
              :class="{ failed: pact.failed }"
            >
              <RiskPips
                :value="pact.risk"
                :max="5"
                tone="red"
              />
              <span class="pact-name">{{ pact.name }}</span>
              <span
                v-if="pact.failed"
                class="pact-void"
              >Void</span>
              <button
                v-else-if="canMark(diver.id)"
                class="mark-pact"
                :class="{ armed: armedPact === `${diver.id}:${pact.id}` }"
                type="button"
                @click="markPact(diver.id, pact.id)"
              >
                {{ armedPact === `${diver.id}:${pact.id}` ? 'Confirm?' : 'Mark broken' }}
              </button>
            </span>
          </div>
        </section>

        <ValorRoll
          v-if="isHost && misfortune"
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
          <button
            class="ghost-cta"
            type="button"
            @click="emit('openKit')"
          >
            Open full kit
          </button>
        </div>
      </div>

      <aside
        v-if="!isHost"
        class="kit-pane"
      >
        <KitSnapshot
          :state="state"
          :self-id="selfId"
          @open="emit('openKit')"
        />
      </aside>
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
  gap: 16px;
  width: 100%;
  max-width: 1040px;
  margin: 0 auto;
}
.field-head { display: flex; flex-direction: column; gap: 7px; }
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
.field-title { font-size: clamp(38px, 4.4vw, 56px); }
.field-sub { margin: 0; color: var(--muted); font-size: 14px; }

.field-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 18px;
}
.field-grid:has(.kit-pane) {
  grid-template-columns: minmax(0, 1.15fr) minmax(260px, 0.85fr);
}
.field-main { display: flex; flex-direction: column; gap: 14px; min-width: 0; }

.directive-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px 20px;
  background:
    radial-gradient(ellipse 70% 70% at 20% 0%, rgba(255, 214, 66, 0.1), transparent 70%),
    var(--panel);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--gold) 40%, var(--line-3));
  clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
}
.directive-card.broken {
  background:
    radial-gradient(ellipse 70% 70% at 20% 0%, rgba(255, 75, 62, 0.1), transparent 70%),
    var(--panel);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--red) 45%, var(--line-3));
}
.directive-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.status {
  padding: 3px 8px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.status.teal { color: var(--on-gold); background: var(--teal); }
.status.red { color: var(--red); background: var(--ground); box-shadow: inset 0 0 0 1px var(--red); }
.directive-name { font-size: clamp(32px, 4vw, 52px); color: var(--gold); }
.broken .directive-name { color: var(--red); text-decoration: line-through; text-decoration-thickness: 2px; }
.directive-rule { margin: 0; color: var(--khaki); font-size: 14px; }
.directive-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--line-2);
}
.gain { color: var(--muted); font-size: 12px; }
.void { color: var(--red); font-size: 12px; }
.mark,
.mark-pact {
  min-height: 32px;
  padding: 0 10px;
  border: 0;
  background: transparent;
  box-shadow: inset 0 0 0 1px var(--line-4);
  color: var(--khaki);
  font: 700 10px var(--font-body);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
}
.mark:hover,
.mark-pact:hover { color: var(--red); box-shadow: inset 0 0 0 1px var(--red); }
.mark.armed,
.mark-pact.armed { color: var(--red); box-shadow: inset 0 0 0 1px var(--red); background: rgba(255, 75, 62, 0.08); }

.strain-line {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  padding: 0 10px;
  color: var(--orange);
  font-size: 12px;
  letter-spacing: 0.05em;
}
.strain-line span { color: var(--muted); text-transform: uppercase; font-size: 10px; letter-spacing: 0.1em; }

.sworn { display: flex; flex-direction: column; gap: 7px; }
.sworn-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px 12px;
  min-height: 38px;
  padding: 5px 10px;
  background: var(--panel);
  box-shadow: inset 0 0 0 1px var(--line-2);
}
.sworn-name { display: flex; align-items: baseline; gap: 6px; min-width: 80px; }
.sworn-name b { font-size: 13px; }
.sworn-name i {
  color: var(--gold);
  font-size: 9px;
  font-style: normal;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.no-pacts { color: var(--dim); font-size: 12px; }
.pact-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 30px;
  padding: 2px 6px 2px 8px;
  background: var(--ground);
  box-shadow: inset 0 0 0 1px var(--line-3);
}
.pact-chip.failed { opacity: 0.55; box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--red) 50%, var(--line-3)); }
.pact-chip :deep(.pips i) { width: 13px; height: 13px; }
.pact-name { color: var(--text); font-size: 12px; font-weight: 600; }
.pact-void { color: var(--red); font-size: 9px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
.mark-pact { min-height: 24px; padding: 0 7px; font-size: 9px; }

.outcomes {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 14px;
  padding-top: 4px;
}
.fail {
  min-height: 56px;
  padding: 0 20px;
  border: 1px solid var(--red);
  background: transparent;
  color: var(--red);
  font: 800 13px var(--font-display);
  font-stretch: 125%;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
}
.fail:hover { background: rgba(255, 75, 62, 0.08); }
.cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  min-width: 260px;
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

.waiting {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding-top: 4px;
}
.ghost-cta {
  min-height: 48px;
  padding: 0 18px;
  border: 0;
  background: var(--panel);
  box-shadow: inset 0 0 0 1px var(--line-3);
  color: var(--text);
  font: 700 12px var(--font-body);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
}
.kit-pane {
  padding: 16px;
  background: var(--rail);
  box-shadow: inset 0 0 0 1px var(--line-2);
  align-self: start;
}

@media (max-width: 860px) {
  .field-grid:has(.kit-pane) { grid-template-columns: minmax(0, 1fr); }
  .field-title { font-size: 38px; }
  .outcomes { justify-content: stretch; }
  .cta { flex: 1; min-width: 0; }
  .waiting { flex-direction: column; align-items: stretch; }
}
</style>
