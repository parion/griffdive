<script setup lang="ts">
import { missionsPerOperation } from '~~/shared/engine/config'
import {
  activeMisfortune,
  activeStrain,
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
const opLength = computed(() => missionsPerOperation(props.state.difficulty))
const directiveFailed = computed(() => props.state.misfortuneFailed)
const confirmFail = ref(false)

const ownPacts = computed(() =>
  (props.self?.pactIds ?? []).map(id => ({ id, failed: props.self?.failedPactIds.includes(id) ?? false })))

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

// The report stays on screen after filing: the phase change unmounts it. Closing
// it here first would flash the field screen for a frame before the next beat.
function submit(payload: MissionReport): void {
  emit('report', payload)
}

function cancelReport(): void {
  reportMode.value = 'none'
}

watch(reportMode, mode => emit('reporting', mode !== 'none'), { immediate: true })
</script>

<template>
  <section
    v-if="reportMode === 'none'"
    class="phone-field"
  >
    <header class="head">
      <span class="kick">On mission</span>
      <h1 class="disp title">
        Hold the line
      </h1>
      <p class="lede">
        Play the mission in Helldivers 2. If something breaks, mark it here.
      </p>
    </header>

    <article
      class="directive"
      :class="{ broken: directiveFailed }"
    >
      <div class="dc-top">
        <span class="cap">Squad directive</span>
        <span
          class="status"
          :class="directiveFailed ? 'red' : 'teal'"
        >{{ directiveFailed ? 'Broken' : 'Active' }}</span>
      </div>
      <h2
        class="disp dc-name"
        :style="fitWord(misfortune?.name ?? 'Safe dive')"
      >
        {{ misfortune?.name ?? 'Safe dive' }}
      </h2>
      <p class="dc-rule">
        <ConditionRule
          v-if="misfortune"
          :condition="misfortune"
        />
        <template v-else>
          No directive this mission.
        </template>
      </p>
      <div class="dc-foot">
        <span>{{ directiveFailed ? 'Broken · everyone loses a loot option' : 'Boosting everyone’s loot' }}</span>
        <button
          v-if="canControl && misfortune && !directiveFailed"
          class="mark"
          :class="{ armed: confirmFail }"
          type="button"
          @click="toggleFail"
        >
          {{ confirmFail ? 'Confirm?' : 'Mark broken' }}
        </button>
      </div>
    </article>

    <div
      v-if="strain && state.strainAccepted"
      class="strain-line"
    >
      <b>{{ strain.name }}</b>
      <span>strain · whole operation</span>
    </div>

    <PactLedger
      class="sworn"
      :state="state"
      :self-id="selfId"
      :is-host="isHost"
      @fail="(diverId, pactId) => emit('fail', diverId, pactId)"
    />

    <div
      v-if="isHost"
      class="host-note"
    >
      <span class="cap">Host calls the result</span>
      <p>Extracted or failed, then file the report.</p>
    </div>

    <PhoneActionBar v-if="canControl">
      <template #secondary>
        <button
          class="bar-alt red"
          type="button"
          @click="reportMode = 'failure'"
        >
          Mission failed
        </button>
      </template>
      <template #primary>
        <button
          class="bar-cta cta-sweep"
          type="button"
          @click="reportMode = 'success'"
        >
          <span class="disp">Extracted</span>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.4"
            aria-hidden="true"
          ><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>
      </template>
    </PhoneActionBar>
    <PhoneActionBar v-else>
      <template #secondary>
        <button
          v-if="ownPacts.some(pact => !pact.failed)"
          class="bar-alt"
          :class="{ armed: armedPact !== null }"
          type="button"
          @click="markPact(selfId ?? '', ownPacts.find(pact => !pact.failed)?.id ?? '')"
        >
          {{ armedPact ? 'Confirm?' : 'I broke it' }}
        </button>
      </template>
      <template #primary>
        <span class="bar-gate">Waiting on host</span>
      </template>
    </PhoneActionBar>
  </section>

  <MissionReport
    v-else
    :state="state"
    :self-id="selfId"
    :self="self"
    :outcome="reportMode"
    :op-length="opLength"
    phone
    @submit="submit"
    @cancel="cancelReport"
    @spin-bonus="emit('spinBonus', $event)"
  />
</template>

<style scoped>
.phone-field { display: flex; flex: 1 0 auto; flex-direction: column; gap: 11px; min-width: 0; }
.head { display: flex; flex-direction: column; gap: 5px; }
.kick {
  color: var(--teal);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}
.title { font-size: 34px; }
.lede { margin: 0; color: var(--muted); font-size: 12px; line-height: 1.4; }

.directive {
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 12px 13px;
  background:
    radial-gradient(ellipse 80% 80% at 20% 0%, rgba(255, 214, 66, 0.11), transparent 70%),
    var(--panel);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--gold) 45%, var(--line-3));
  clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
}
.directive.broken { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--red) 50%, var(--line-3)); }
.dc-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.status { padding: 2px 7px; font-size: 9px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
.status.teal { background: var(--teal); color: var(--on-gold); }
.status.red { color: var(--red); box-shadow: inset 0 0 0 1px var(--red); }
.dc-name { font-size: min(30px, 100cqi / var(--fit-len, 1)); color: var(--gold); }
.broken .dc-name { color: var(--red); }
.dc-rule { margin: 0; color: var(--khaki); font-size: 12px; }
.dc-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-top: 7px;
  border-top: 1px solid var(--line-2);
  color: var(--muted);
  font-size: 10px;
}
.mark {
  min-height: 28px;
  padding: 0 7px;
  border: 0;
  background: transparent;
  box-shadow: inset 0 0 0 1px var(--line-4);
  color: var(--khaki);
  font: 700 9px var(--font-body);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.mark.armed { color: var(--red); box-shadow: inset 0 0 0 1px var(--red); }
.strain-line { display: flex; align-items: center; gap: 7px; color: var(--orange); font-size: 11px; }
.strain-line span { color: var(--muted); font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase; }
.sworn { --ledger-pad: 12px; }
.host-note { display: flex; flex-direction: column; gap: 3px; }
.host-note p { margin: 0; color: var(--muted); font-size: 11px; }
</style>
