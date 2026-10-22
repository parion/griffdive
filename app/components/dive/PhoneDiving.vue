<script setup lang="ts">
import { conditionRiskAt, missionsPerOperation } from '~~/shared/engine/config'
import { pactName } from '~~/shared/data/pacts'
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
  openKit: []
}>()

const misfortune = computed(() => activeMisfortune(props.state))
const strain = computed(() => activeStrain(props.state))
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

const ownPacts = computed(() =>
  pactsByDiver.value.find(entry => entry.id === props.selfId)?.pacts ?? [])

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
      <span class="kick">In the field</span>
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
        >{{ directiveFailed ? 'Broken' : 'Holding' }}</span>
      </div>
      <h2 class="disp dc-name">
        {{ misfortune?.name ?? 'Safe dive' }}
      </h2>
      <p class="dc-rule">
        {{ misfortune?.rule ?? 'No team rule was accepted this mission.' }}
      </p>
      <div class="dc-foot">
        <span>{{ directiveFailed ? 'Risk voided' : 'Raising everyone’s loot' }}</span>
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
          class="none"
        >No pacts</span>
        <span
          v-for="pact in diver.pacts"
          :key="pact.id"
          class="pact-chip"
          :class="{ failed: pact.failed }"
        >
          <RiskPips
            :value="pact.risk"
            :max="pact.risk"
            tone="red"
          />
          <span>{{ pact.name }}</span>
          <button
            v-if="!pact.failed && canMark(diver.id)"
            class="mark-pact"
            :class="{ armed: armedPact === `${diver.id}:${pact.id}` }"
            type="button"
            @click="markPact(diver.id, pact.id)"
          >
            {{ armedPact === `${diver.id}:${pact.id}` ? 'Confirm?' : 'I broke it' }}
          </button>
          <span
            v-else-if="pact.failed"
            class="void"
          >Void</span>
        </span>
      </div>
    </section>

    <KitSnapshot
      v-if="!isHost"
      :state="state"
      :self-id="selfId"
      @open="emit('openKit')"
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
          type="button"
          @click="markPact(selfId ?? '', ownPacts.find(pact => !pact.failed)?.id ?? '')"
        >
          I broke it
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
.phone-field { display: flex; flex-direction: column; gap: 11px; min-width: 0; }
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
.dc-name { font-size: 30px; color: var(--gold); }
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
.mark,
.mark-pact {
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
.mark.armed,
.mark-pact.armed { color: var(--red); box-shadow: inset 0 0 0 1px var(--red); }
.strain-line { display: flex; align-items: center; gap: 7px; color: var(--orange); font-size: 11px; }
.strain-line span { color: var(--muted); font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase; }
.sworn { display: flex; flex-direction: column; gap: 6px; }
.sworn-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 9px;
  min-height: 34px;
  padding: 4px 8px;
  background: var(--panel);
  box-shadow: inset 0 0 0 1px var(--line-2);
}
.sworn-name { display: flex; align-items: baseline; gap: 5px; min-width: 62px; }
.sworn-name b { font-size: 11px; }
.sworn-name i { color: var(--gold); font-size: 8px; font-style: normal; letter-spacing: 0.08em; text-transform: uppercase; }
.none { color: var(--dim); font-size: 11px; }
.pact-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 26px;
  padding: 1px 5px 1px 6px;
  background: var(--ground);
  box-shadow: inset 0 0 0 1px var(--line-3);
  font-size: 10px;
}
.pact-chip.failed { opacity: 0.55; }
.pact-chip :deep(.pips i) { width: 11px; height: 11px; }
.void { color: var(--red); font-size: 8px; font-weight: 800; text-transform: uppercase; }
.host-note { display: flex; flex-direction: column; gap: 3px; }
.host-note p { margin: 0; color: var(--muted); font-size: 11px; }
</style>
