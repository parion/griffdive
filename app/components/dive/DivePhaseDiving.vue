<script setup lang="ts">
import { factionImageUrl, strainImageUrl } from '~~/shared/data/images'
import { MAJOR_ORDER_RISK, MISFORTUNE_RISK, OPTIONS_LOST_PER_FAILED_PACT, STRAIN_RISK, missionsPerOperation } from '~~/shared/engine/config'
import { difficultyName } from '~~/shared/engine/progression'
import { activeMisfortune, activeStrain, currentFront, teamRiskOf } from '~~/shared/engine/selectors'
import type { DiverState, DiveState, MissionReport } from '~~/shared/engine/types'

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
}>()

const misfortune = computed(() => activeMisfortune(props.state))
const front = computed(() => currentFront(props.state))
const strain = computed(() => activeStrain(props.state))
const teamRisk = computed(() => teamRiskOf(props.state))
const opLength = computed(() => missionsPerOperation(props.state.difficulty))

// Per-source risk chips for the locked status strip (total stays teamRiskOf).
const misfortuneRisk = computed(() =>
  props.state.misfortuneAccepted ? MISFORTUNE_RISK[misfortune.value?.id ?? ''] ?? 0 : 0)
const strainRisk = computed(() =>
  props.state.strainAccepted ? STRAIN_RISK[strain.value?.id ?? ''] ?? 0 : 0)
const majorOrderRisk = computed(() => (props.state.majorOrder?.live ? MAJOR_ORDER_RISK : 0))

const frontImage = computed(() => (front.value ? factionImageUrl(front.value.id) : undefined))
const strainImage = computed(() => (strain.value ? strainImageUrl(strain.value.id) : undefined))
const deployedCount = computed(() => props.state.divers.length)

// Voided pacts: broken in the field, their risk stops counting and each costs a
// reward option. The mission card and the rail both read this.
const voidedPacts = computed(() =>
  props.state.divers.reduce((sum, diver) => sum + diver.failedPactIds.length, 0))
const anyVoid = computed(() => voidedPacts.value > 0)
const lostOptions = computed(() => voidedPacts.value * OPTIONS_LOST_PER_FAILED_PACT)

// The entry ceremony: a hellpod drop + impact shake, played once on arrival.
// Reduced motion skips it entirely.
const reduced = import.meta.client
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const entering = ref(!reduced)
let enterTimer: ReturnType<typeof setTimeout> | undefined
onMounted(() => {
  if (entering.value) {
    enterTimer = setTimeout(() => {
      entering.value = false
    }, 1750)
  }
})
onBeforeUnmount(() => clearTimeout(enterTimer))
const streaks = [
  { left: 452, h: 180, dur: 0.34, delay: 0 },
  { left: 487, h: 150, dur: 0.3, delay: 0.06 },
  { left: 404, h: 120, dur: 0.38, delay: 0.1 },
  { left: 538, h: 130, dur: 0.36, delay: 0.02 },
  { left: 330, h: 90, dur: 0.42, delay: 0.14 },
  { left: 612, h: 100, dur: 0.4, delay: 0.08 },
  { left: 430, h: 200, dur: 0.28, delay: 0.18 },
  { left: 512, h: 210, dur: 0.27, delay: 0.16 },
]

// The report is its own screen (spec 08): the host's outcome call swaps the
// briefing for the report layout, and MissionReport owns its local fields so a
// landed report never leaks the last mission's performance into the next.
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
</script>

<template>
  <section
    v-if="reportMode === 'none'"
    class="panel briefing"
    :class="{ 'enter-shake': entering }"
  >
    <div
      v-if="entering"
      class="drop-ov"
      aria-hidden="true"
    >
      <span
        v-for="(s, i) in streaks"
        :key="i"
        class="drop-streak"
        :style="{ left: `${s.left}px`, height: `${s.h}px`, animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s` }"
      />
      <span class="drop-flash" />
      <span class="drop-scorch" />
      <div class="drop-pod">
        <span class="drop-trail" />
        <svg
          width="60"
          height="120"
          viewBox="0 0 60 120"
        >
          <path
            d="M16 22 L4 10 L4 36 L16 42 Z M44 22 L56 10 L56 36 L44 42 Z"
            fill="var(--line-2)"
            stroke="var(--khaki)"
            stroke-width="1.5"
          />
          <path
            d="M16 6 H44 V86 L30 116 L16 86 Z"
            fill="var(--raised)"
            stroke="var(--text)"
            stroke-width="1.5"
          />
          <rect
            x="16"
            y="46"
            width="28"
            height="7"
            fill="var(--gold)"
          />
          <path
            d="M19 92 L30 113 L41 92 Z"
            fill="var(--orange)"
          />
        </svg>
      </div>
    </div>

    <h2 class="sec-h briefing-head">
      <span
        class="lamp teal pulse"
        aria-hidden="true"
      />
      <span class="lbl gold">Briefing · in the field</span>
      <span class="cap muted">report when the squad is out</span>
    </h2>

    <section
      class="mission-card"
      aria-label="Mission"
    >
      <div class="mc-pod grid-bg">
        <svg
          class="mc-pod-svg"
          width="30"
          height="60"
          viewBox="0 0 60 120"
          aria-hidden="true"
        >
          <path
            d="M16 22 L4 10 L4 36 L16 42 Z M44 22 L56 10 L56 36 L44 42 Z"
            fill="var(--line-2)"
            stroke="var(--khaki)"
            stroke-width="3"
          />
          <path
            d="M16 6 H44 V86 L30 116 L16 86 Z"
            fill="var(--raised)"
            stroke="var(--text)"
            stroke-width="3"
          />
          <rect
            x="16"
            y="46"
            width="28"
            height="7"
            fill="var(--gold)"
          />
        </svg>
        <span
          class="mc-live pulse"
          aria-hidden="true"
        />
        <span class="mc-deployed disp"><span
          class="mc-deployed-dot"
          aria-hidden="true"
        />DEPLOYED</span>
        <span class="mc-ground">{{ deployedCount }}/4 ON THE GROUND</span>
      </div>
      <div class="mc-body">
        <div class="mc-line">
          <span class="lbl">Mission {{ state.missionInOperation }}/{{ opLength }} · {{ difficultyName(state.difficulty) }}</span>
          <span
            v-if="majorOrderRisk"
            class="mc-mo"
          >MO +{{ majorOrderRisk }}</span>
          <span
            class="mc-pips"
            role="img"
            :aria-label="`Mission ${state.missionInOperation} of ${opLength} in progress`"
          >
            <i
              v-for="i in opLength"
              :key="i"
              :class="{ on: i === state.missionInOperation }"
            />
          </span>
        </div>
        <div class="mc-vs">
          <img
            v-if="frontImage"
            :src="frontImage"
            alt=""
            width="44"
            height="44"
          >
          <span class="lbl mc-vs-label">VS</span>
          <span
            class="disp mc-front"
            :style="front ? { color: front.accent } : undefined"
          >{{ front?.displayName ?? 'Unknown front' }}</span>
        </div>
        <div
          v-if="strain && state.strainAccepted"
          class="mc-strain"
        >
          <img
            v-if="strainImage"
            :src="strainImage"
            alt=""
            width="20"
            height="20"
          >
          <span class="mc-strain-name">{{ strain.name }}</span>
          <span class="mc-strain-risk">+{{ strainRisk }}</span>
          <span class="mc-strain-note">STRAIN · ALL {{ opLength }} MISSIONS</span>
        </div>
      </div>
      <div class="mc-rule">
        <div class="mc-rule-inner">
          <div class="mc-rule-head">
            <span class="mc-rule-tag">TEAM RULE</span>
            <span class="mc-check">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.9"
                aria-hidden="true"
              ><path d="M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13.5 17.5l2.5 2.5 5-5.5" /></svg>
              LOADOUT CHECK
            </span>
          </div>
          <span class="disp mc-rule-name">{{ misfortune?.name ?? 'Safe dive' }}</span>
          <div class="mc-rule-risk">
            <RiskPips
              :value="misfortuneRisk"
              :max="5"
            />
            <span class="mc-rule-val">+{{ misfortuneRisk }}</span>
          </div>
        </div>
      </div>
    </section>

    <div
      v-if="anyVoid"
      class="anyvoid hazard-soft-red rise"
      role="status"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--red)"
        stroke-width="2"
        aria-hidden="true"
      ><path d="M6 3h12v14l-6 4-6-4zM3 3l18 18" /></svg>
      <div class="anyvoid-copy">
        <span class="anyvoid-line">{{ voidedPacts }} pact{{ voidedPacts === 1 ? '' : 's' }} voided · risk stopped counting</span>
        <span class="anyvoid-opt">{{ lostOptions }} reward option{{ lostOptions === 1 ? '' : 's' }} lost · team risk {{ teamRisk }} stands</span>
      </div>
    </div>

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
  />
</template>

<style scoped>
.briefing {
  position: relative;
  overflow: hidden;
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

/* Entry ceremony: a hellpod drop + impact shake, once on arrival. */
.enter-shake { animation: shake 0.34s 0.8s both; }
.drop-ov {
  position: absolute;
  inset: 0;
  z-index: 5;
  overflow: hidden;
  pointer-events: none;
  animation: fadeOut 0.2s 1.6s both;
}
.drop-streak {
  position: absolute;
  top: 0;
  width: 1px;
  background: linear-gradient(180deg, transparent, var(--gold));
  animation-name: streak;
  animation-fill-mode: both;
}
.drop-flash {
  position: absolute;
  left: 50%;
  top: 40%;
  width: 40rem;
  height: 15rem;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(255, 240, 190, 0.85), rgba(255, 214, 66, 0.22) 45%, transparent);
  animation: flashOut 0.55s 0.8s both;
}
.drop-scorch {
  position: absolute;
  left: 50%;
  top: 45%;
  width: 10rem;
  height: 2rem;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: rgba(255, 159, 67, 0.22);
  border: 1px solid rgba(255, 159, 67, 0.65);
  animation: scorch 0.75s 0.8s both;
}
.drop-pod {
  position: absolute;
  left: 50%;
  top: 28%;
  width: 60px;
  height: 120px;
  margin-left: -30px;
  animation: podDrop 1.6s both;
}
.drop-trail {
  position: absolute;
  left: 21px;
  bottom: 116px;
  width: 18px;
  height: 280px;
  background: linear-gradient(0deg, rgba(255, 159, 67, 0.9), rgba(255, 214, 66, 0.28) 30%, transparent);
  animation: fadeOut 1.6s both;
}

/* Mission card (spec 07): pod · front · team rule. */
.mission-card {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: 136px minmax(0, 1fr) 290px;
  min-height: 136px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--red) 10%, transparent), var(--panel) 52%);
  border: 1px solid color-mix(in srgb, var(--red) 45%, transparent);
}
.mc-pod {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  padding-bottom: 11px;
  background-color: var(--ground);
  border-right: 1px solid color-mix(in srgb, var(--red) 30%, transparent);
}
.mc-pod-svg { position: absolute; left: 50%; top: 18px; margin-left: -15px; }
.mc-live { position: absolute; left: 50%; top: 12px; width: 6px; height: 6px; margin-left: 5px; background: var(--teal); }
.mc-deployed { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; letter-spacing: 0.2em; color: var(--teal); animation: stampFlat 0.35s 1.55s both; }
.mc-deployed-dot { width: 7px; height: 7px; background: var(--teal); }
.mc-ground { font-size: 10px; font-weight: 700; letter-spacing: 0.12em; color: var(--muted); }
.mc-body { display: flex; flex-direction: column; justify-content: center; gap: 10px; padding: 0 1.4rem; min-width: 0; }
.mc-line { display: flex; align-items: center; gap: 0.75rem; }
.mc-mo { font-size: 10px; font-weight: 700; letter-spacing: 0.14em; color: var(--teal); }
.mc-pips { display: flex; gap: 4px; }
.mc-pips i { width: 20px; height: 6px; border: 1px solid var(--line-5); }
.mc-pips i.on { background: var(--gold); border-color: var(--gold); animation: pulse 1.6s ease-in-out infinite; }
.mc-vs { display: flex; align-items: center; gap: 0.75rem; }
.mc-vs img { width: 44px; height: 44px; object-fit: contain; }
.mc-vs-label { font-size: 0.8rem; letter-spacing: 0.22em; color: var(--muted); }
.mc-front { font-size: 2rem; }
.mc-strain { display: flex; align-items: center; gap: 0.6rem; }
.mc-strain img { width: 20px; height: 20px; object-fit: contain; }
.mc-strain-name { font-size: 0.75rem; font-weight: 700; letter-spacing: 0.14em; }
.mc-strain-risk { font-size: 0.8rem; font-weight: 700; color: var(--orange); }
.mc-strain-note { font-size: 10px; font-weight: 700; letter-spacing: 0.16em; color: var(--muted); }
.mc-rule { padding: 12px; border-left: 1px dashed color-mix(in srgb, var(--red) 30%, transparent); }
.mc-rule-inner { height: 100%; display: flex; flex-direction: column; justify-content: space-between; gap: 0.5rem; padding: 0.6rem 0.9rem; background: var(--rail); border: 1px solid var(--line-5); }
.mc-rule-head { display: flex; align-items: center; justify-content: space-between; }
.mc-rule-tag { padding: 0.2rem 0.45rem; background: var(--gold); color: var(--on-gold); font-size: 10px; font-weight: 700; letter-spacing: 0.18em; }
.mc-check { display: flex; align-items: center; gap: 0.35rem; font-size: 10px; font-weight: 700; letter-spacing: 0.14em; color: var(--khaki); }
.mc-rule-name { font-size: 1.4rem; color: var(--gold); }
.mc-rule-risk { display: flex; align-items: center; gap: 0.6rem; }
.mc-rule-val { font-size: 0.8rem; font-weight: 700; letter-spacing: 0.1em; color: var(--red); }

/* anyVoid summary (spec 07): broken pacts and their cost. */
.anyvoid { display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 0.75rem; border: 1px solid color-mix(in srgb, var(--red) 55%, transparent); }
.anyvoid-copy { display: flex; flex-direction: column; gap: 0.2rem; }
.anyvoid-line { font-size: 0.75rem; font-weight: 700; letter-spacing: 0.12em; color: var(--red); }
.anyvoid-opt { font-size: 11px; font-weight: 700; letter-spacing: 0.12em; color: var(--text); }

@media (max-width: 1020px) {
  .mission-card { grid-template-columns: 100px minmax(0, 1fr); }
  .mc-rule { grid-column: 1 / -1; border-left: 0; border-top: 1px dashed color-mix(in srgb, var(--red) 30%, transparent); }
}
</style>
