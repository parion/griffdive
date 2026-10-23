<script setup lang="ts">
import { conditionRiskAt, directiveValorAt, STRAIN_RISK } from '~~/shared/engine/config'
import { strainImageUrl } from '~~/shared/data/images'
import { frontById } from '~~/shared/engine/wheel'
import { tierZones } from '~~/shared/engine/rewards'
import {
  canRerollWheel,
  currentFront,
  currentMisfortune,
  currentStrain,
  majorOrderPlanetsForFront,
  misfortuneDecision,
  misfortuneStrandedDivers,
  strainDecision,
  teamRiskOf,
} from '~~/shared/engine/selectors'
import type { DiverState, DiveState, RewardTier } from '~~/shared/engine/types'

const props = defineProps<{
  state: DiveState
  selfId: string | null
  self: DiverState | null
  canControl: boolean
}>()

const emit = defineEmits<{
  spin: []
  decide: [accepted: boolean]
  decideStrain: [accepted: boolean]
  deal: []
  reroll: [wheel: 'misfortune' | 'front' | 'strain']
}>()

const misfortune = computed(() => currentMisfortune(props.state))
const drawing = useSpinReveal(() => props.state.wheel?.seed)
const front = computed(() => currentFront(props.state))
// A pinned Major Order shows before the first spin, when the wheel has not
// derived a front yet.
const pinnedFronts = computed(() =>
  (props.state.majorOrder?.fronts ?? [])
    .map(id => frontById(id))
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null))
const frontPlanetsLabel = computed(() =>
  majorOrderPlanetsForFront(props.state).map(planet => planet.name).join(' / '))
const strain = computed(() => currentStrain(props.state))
const strainImage = computed(() => (strain.value ? strainImageUrl(strain.value.id) : undefined))
const decision = computed(() => misfortuneDecision(props.state))
const strainCall = computed(() => strainDecision(props.state))
const hostName = computed(() =>
  props.state.divers.find(diver => diver.id === props.state.hostId)?.name ?? 'The host')
// The front/major-order line belongs with the directive it was drawn with.
// While the wheel turns, hold the plan that was pinned before this draw.
const frontLine = computed(() => {
  if (front.value && !drawing.value) {
    return {
      cap: 'Front locked',
      name: front.value.displayName,
      planet: frontPlanetsLabel.value,
      strain: strain.value && props.state.strainAccepted ? strain.value.name : '',
    }
  }
  if (props.state.majorOrder && pinnedFronts.value.length) {
    return {
      cap: props.state.majorOrder.live ? 'Major Order pinned' : 'Faction locked',
      name: pinnedFronts.value.map(entry => entry.displayName).join(' · '),
      planet: '',
      strain: strain.value && props.state.strainAccepted ? strain.value.name : '',
    }
  }
  return null
})

const directiveRisk = computed(() =>
  misfortune.value ? conditionRiskAt(misfortune.value.id, props.state.difficulty) : 0)
const directiveShare = computed(() =>
  misfortune.value
    ? directiveValorAt(misfortune.value.id, props.state.difficulty, props.state.divers.length)
    : 0)
const strainRisk = computed(() =>
  strain.value ? STRAIN_RISK[strain.value.id] ?? 0 : 0)

const stranded = computed(() => misfortuneStrandedDivers(props.state))
const acceptBlocked = computed(() => stranded.value.length > 0)
const strandedReason = computed(() =>
  stranded.value.length
    ? `${stranded.value.map(diver => diver.name).join(', ')} can’t field this rule.`
    : '')

const callValor = computed(() => teamRiskOf(props.state))
const zones = computed(() => tierZones(props.state.difficulty, callValor.value))
const previewValor = computed(() => {
  if (decision.value.decided) {
    return callValor.value
  }
  return callValor.value + (props.state.misfortuneAccepted ? 0 : directiveShare.value)
})
const previewZones = computed(() => tierZones(props.state.difficulty, previewValor.value))
const deltas = computed<Partial<Record<RewardTier, number>>>(() => {
  const result: Partial<Record<RewardTier, number>> = {}
  for (const zone of zones.value) {
    const before = previewZones.value.find(entry => entry.tier === zone.tier)
    if (!before) {
      continue
    }
    const delta = (before.chance - zone.chance) * 100
    if (Math.abs(delta) >= 0.5) {
      result[zone.tier] = delta
    }
  }
  return result
})

const canDeal = computed(() =>
  props.state.phase === 'deal'
  || (decision.value.decided && strainCall.value.decided))
const waitingForStrain = computed(() =>
  decision.value.decided && !strainCall.value.decided)

const rerollMisfortune = computed(() => canRerollWheel(props.state, 'misfortune'))
const rerollFront = computed(() => canRerollWheel(props.state, 'front'))
const rerollStrain = computed(() => canRerollWheel(props.state, 'strain'))

const cardNote = computed(() => {
  if (drawing.value || !misfortune.value) {
    return 'Base odds'
  }
  if (!decision.value.decided) {
    return `If taken · ${misfortune.value.name}`
  }
  return props.state.misfortuneAccepted ? `${misfortune.value.name}'s share` : 'Skipped · base odds'
})

function take(): void {
  if (!acceptBlocked.value) {
    emit('decide', true)
  }
}
function skip(): void {
  emit('decide', false)
}
function takeStrain(): void {
  emit('decideStrain', true)
}
function skipStrain(): void {
  emit('decideStrain', false)
}
function deal(): void {
  emit('deal')
}
function reroll(wheel: 'misfortune' | 'front' | 'strain'): void {
  emit('reroll', wheel)
}
</script>

<template>
  <section class="call">
    <div class="wheel-side">
      <WheelOfMisfortune
        :difficulty="state.difficulty"
        :seed="state.wheel?.seed ?? null"
        :can-control="canControl"
        @spin="emit('spin')"
      />
    </div>

    <div class="decision-side">
      <header class="call-head">
        <span
          class="kick"
          :class="{ standby: !canControl }"
        >{{ canControl ? 'Your move' : 'Stand by' }}</span>
        <h1 class="disp call-title">
          {{ canControl ? 'Make the squad’s call' : `${hostName} is making the call` }}
        </h1>
        <p class="call-sub">
          {{ canControl
            ? 'Talk it over on voice. Everyone carries what you take.'
            : 'The host spins the wheel and locks the squad’s call. You weigh in on voice.' }}
        </p>
      </header>

      <template v-if="state.wheel && misfortune && !drawing">
        <article
          class="directive-card rise"
          :class="{ accepted: state.misfortuneAccepted, decided: decision.decided }"
        >
          <span
            class="corner tl"
            aria-hidden="true"
          />
          <span
            class="corner br"
            aria-hidden="true"
          />
          <div class="dc-top">
            <span class="cap">Directive</span>
            <RiskPips
              :value="directiveRisk"
              :max="directiveRisk"
              tone="red"
            />
          </div>
          <h2
            class="disp dc-name"
            :style="fitWord(misfortune.name)"
          >
            {{ misfortune.name }}
          </h2>
          <p class="dc-rule">
            {{ misfortune.rule }}.
          </p>

          <div
            v-if="!decision.decided && canControl"
            class="dc-actions"
          >
            <button
              class="take cut-sm"
              type="button"
              :disabled="acceptBlocked"
              :title="acceptBlocked ? strandedReason : undefined"
              @click="take"
            >
              Take it
            </button>
            <button
              class="skip cut-sm"
              type="button"
              @click="skip"
            >
              Skip
            </button>
          </div>
          <div
            v-else-if="decision.decided"
            class="dc-verdict stamp-in"
            :class="state.misfortuneAccepted ? 'taken' : 'skipped'"
          >
            {{ state.misfortuneAccepted ? 'Taken' : 'Skipped' }}
            <button
              v-if="canControl"
              class="switch"
              type="button"
              @click="emit('decide', !state.misfortuneAccepted)"
            >
              Switch to {{ state.misfortuneAccepted ? 'skip' : 'take' }}
            </button>
          </div>
          <div
            v-else
            class="dc-waiting"
          >
            Waiting on the host…
          </div>
          <p
            v-if="acceptBlocked && !decision.decided"
            class="dc-block"
          >
            {{ strandedReason }}
          </p>
        </article>

        <div
          v-if="frontLine"
          class="front-pin"
        >
          <span class="cap">{{ frontLine.cap }}</span>
          <b>{{ frontLine.name }}</b>
          <span
            v-if="frontLine.planet"
            class="front-planet"
          >· {{ frontLine.planet }}</span>
          <span
            v-if="frontLine.strain"
            class="front-strain"
          >· {{ frontLine.strain }}</span>
        </div>

        <article
          v-if="strain"
          class="strain-card rise"
          :class="{ accepted: state.strainAccepted, decided: strainCall.decided }"
        >
          <span class="strain-icon">
            <img
              v-if="strainImage"
              :src="strainImage"
              alt=""
              draggable="false"
            >
            <svg
              v-else
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linejoin="round"
              aria-hidden="true"
            ><path d="m12 2.8 2.7 6.1 6.5.6-4.9 4.3 1.5 6.4L12 16.9l-5.8 3.3 1.5-6.4-4.9-4.3 6.5-.6z" /></svg>
          </span>
          <span class="strain-copy">
            <span class="cap strain-cap">
              Strain · whole operation
              <RiskPips
                :value="strainRisk"
                :max="strainRisk"
                tone="orange"
              />
            </span>
            <b
              class="disp strain-name"
              :style="fitWord(strain.name)"
            >{{ strain.name }}</b>
            <span class="strain-blurb">{{ strain.blurb }}</span>
          </span>
          <span
            v-if="!strainCall.decided && canControl"
            class="strain-actions"
          >
            <button
              class="take mini"
              type="button"
              @click="takeStrain"
            >
              Take
            </button>
            <button
              class="skip mini"
              type="button"
              @click="skipStrain"
            >
              Skip
            </button>
          </span>
          <span
            v-else-if="strainCall.decided"
            class="strain-verdict stamp-in"
            :class="state.strainAccepted ? 'taken' : 'skipped'"
          >
            {{ state.strainAccepted ? 'Taken' : 'Skipped' }}
            <button
              v-if="canControl && state.missionInOperation === 1"
              class="switch"
              type="button"
              @click="emit('decideStrain', !state.strainAccepted)"
            >
              Switch to {{ state.strainAccepted ? 'skip' : 'take' }}
            </button>
          </span>
          <span
            v-else
            class="dc-waiting"
          >Waiting…</span>
        </article>

        <ValorRoll
          :zones="previewZones"
          :deltas="deltas"
          :note="cardNote"
          compact
        />

        <div
          v-if="canControl"
          class="deal-row"
        >
          <button
            class="cta cut cta-sweep"
            :class="{ live: canDeal }"
            type="button"
            :disabled="!canDeal"
            @click="deal"
          >
            Deal the pacts
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
          <div class="rerolls">
            <button
              class="reroll"
              type="button"
              :disabled="!rerollMisfortune.allowed"
              :title="rerollMisfortune.reason ?? undefined"
              @click="reroll('misfortune')"
            >
              <IconDice class="reroll-icon" />
              Reroll directive{{ rerollMisfortune.allowed ? ' · 1 token' : '' }}
            </button>
            <button
              v-if="state.missionInOperation === 1"
              class="reroll"
              type="button"
              :disabled="!rerollFront.allowed"
              :title="rerollFront.reason ?? undefined"
              @click="reroll('front')"
            >
              <IconDice class="reroll-icon" />
              Reroll front
            </button>
            <button
              v-if="strain && state.missionInOperation === 1 && !strainCall.decided"
              class="reroll"
              type="button"
              :disabled="!rerollStrain.allowed"
              :title="rerollStrain.reason ?? undefined"
              @click="reroll('strain')"
            >
              <IconDice class="reroll-icon" />
              Reroll strain
            </button>
          </div>
        </div>
        <p
          v-else
          class="waiting"
        >
          {{ waitingForStrain ? 'Waiting on the strain call…' : 'Waiting for the host to deal the pacts…' }}
        </p>
      </template>

      <template v-else>
        <article class="directive-card empty-call">
          <div class="dc-top">
            <span class="cap">{{ drawing ? 'Drawing' : 'Directive' }}</span>
          </div>
          <p class="disp empty-title">
            {{ drawing ? 'The wheel turns…' : canControl ? 'Awaiting the draw' : 'Waiting on the spin' }}
          </p>
          <p class="empty-copy">
            The wheel draws this mission’s directive. Every rule is on it at every difficulty —
            altitude only changes what the risk buys.
          </p>
        </article>

        <div
          v-if="frontLine"
          class="front-pin"
        >
          <span class="cap">{{ frontLine.cap }}</span>
          <b>{{ frontLine.name }}</b>
          <span
            v-if="frontLine.planet"
            class="front-planet"
          >· {{ frontLine.planet }}</span>
          <span
            v-if="frontLine.strain"
            class="front-strain"
          >· {{ frontLine.strain }}</span>
        </div>

        <ValorRoll
          :zones="zones"
          note="Base odds"
          compact
        />

        <div
          v-if="canControl"
          class="deal-row"
        >
          <button
            class="cta cut"
            :class="{ 'live': !drawing, 'cta-sweep': !drawing }"
            type="button"
            :disabled="drawing"
            @click="emit('spin')"
          >
            {{ drawing ? 'The wheel turns…' : 'Spin the wheel' }}
            <IconRefresh
              class="cta-icon"
              aria-hidden="true"
            />
          </button>
        </div>
      </template>
    </div>
  </section>
</template>

<style scoped>
.call {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(360px, 470px);
  gap: clamp(24px, 4vw, 64px);
  align-items: start;
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
}
.call-head { display: flex; flex-direction: column; gap: 8px; }
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
.kick.standby { color: var(--teal); }
.call-title { font-size: clamp(28px, 2.7vw, 40px); line-height: 0.98; }
.call-sub { margin: 0; color: var(--muted); font-size: 14px; }

/* The wheel is the beat's lit object: it takes the stage height, not a fixed
   box, so tall desktops get a big wheel and short laptops keep the CTA in view. */
.wheel-side {
  --wheel-size: min(100%, clamp(300px, calc(100dvh - 300px), 620px));
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 0;
}
.front-pin {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 8px;
  min-height: 20px;
  padding: 0 2px;
  color: var(--khaki);
  font-size: 12px;
}
.front-pin .cap { color: var(--muted); }
.front-pin b { color: var(--red); }
.front-planet { color: var(--gold); font-weight: 700; }
.front-strain { color: var(--orange); }
.decision-side { display: flex; flex-direction: column; gap: 12px; min-width: 0; }

.directive-card {
  position: relative;
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 18px 22px 20px;
  background:
    radial-gradient(ellipse 85% 90% at 15% 0%, rgba(255, 214, 66, 0.13), transparent 70%),
    var(--panel);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--gold) 40%, var(--line-3));
}
.directive-card.accepted {
  box-shadow: inset 0 0 0 2px var(--gold), 0 0 32px rgba(255, 214, 66, 0.16);
}
.directive-card.decided:not(.accepted) .dc-name { color: var(--khaki); text-shadow: none; }
/* Registration corners: the directive is the one card the squad signs for. */
.corner {
  position: absolute;
  width: 16px;
  height: 16px;
  border: 2px solid var(--gold);
  pointer-events: none;
}
.corner.tl { top: -1px; right: -1px; border-left: 0; border-bottom: 0; }
.corner.br { bottom: -1px; left: -1px; border-right: 0; border-top: 0; }
.dc-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.dc-top :deep(.pips i) { width: 18px; height: 18px; }
.dc-name {
  font-size: min(clamp(28px, 2.9vw, 42px), 100cqi / var(--fit-len, 1));
  line-height: 0.95;
  color: var(--gold);
  text-shadow: 0 0 28px rgba(255, 214, 66, 0.25);
}
.dc-rule { margin: 0; color: var(--khaki); font-size: 15px; line-height: 1.4; }
.dc-actions { display: flex; gap: 8px; padding-top: 6px; }
.take,
.skip {
  flex: 1;
  min-height: 46px;
  border: 0;
  font: 800 13px var(--font-body);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
  transition: filter var(--dur-fast), color var(--dur-fast), box-shadow var(--dur-fast);
}
.take {
  background: var(--gold);
  color: var(--on-gold);
  box-shadow: inset 0 -2px 0 rgba(110, 80, 0, 0.35);
}
.take:hover:not(:disabled) { filter: brightness(1.08); }
.take:disabled { opacity: 0.4; cursor: not-allowed; }
.skip {
  background: var(--rail);
  color: var(--khaki);
  box-shadow: inset 0 0 0 1px var(--line-4);
}
.skip:hover { color: var(--text); box-shadow: inset 0 0 0 1px var(--line-5); }
.dc-verdict,
.strain-verdict {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 34px;
  padding: 0 10px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.dc-verdict.taken,
.strain-verdict.taken { color: var(--on-gold); background: var(--gold); }
.dc-verdict.skipped,
.strain-verdict.skipped { color: var(--muted); background: var(--rail); box-shadow: inset 0 0 0 1px var(--line-3); }
.stamp-in { animation: stampFlat 0.32s var(--ease-out) both; }
.switch {
  min-height: 24px;
  border: 0;
  background: none;
  color: inherit;
  font: 700 9px var(--font-body);
  letter-spacing: 0.1em;
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}
.dc-waiting { color: var(--dim); font-size: 12px; }
.dc-block { margin: 0; color: var(--red); font-size: 12px; }

.strain-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 10px 10px 10px 14px;
  background: linear-gradient(90deg, rgba(255, 159, 67, 0.08), var(--panel) 55%);
  box-shadow: inset 0 0 0 1px var(--line-3);
  clip-path: polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%);
  animation-delay: 80ms;
}
.strain-card.accepted { box-shadow: inset 0 0 0 1px var(--orange), 0 0 18px rgba(255, 159, 67, 0.1); }
.strain-icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  color: var(--red);
}
.strain-icon img { width: 100%; height: 100%; object-fit: contain; }
.strain-copy { container-type: inline-size; display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.strain-cap { display: inline-flex; align-items: center; gap: 8px; color: var(--muted); }
.strain-cap :deep(.pips i) { width: 12px; height: 12px; }
.strain-name { font-size: min(18px, 100cqi / var(--fit-len, 1)); line-height: 1.05; color: var(--text); }
.strain-blurb {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.35;
}
.strain-actions { display: flex; gap: 4px; }
.take.mini,
.skip.mini { flex: none; min-height: 38px; padding: 0 12px; font-size: 11px; }
.strain-verdict { min-height: 30px; font-size: 10px; }

.deal-row { display: flex; flex-direction: column; gap: 10px; padding-top: 4px; }
.cta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  width: 100%;
  min-height: 60px;
  padding: 0 24px;
  border: 0;
  background: linear-gradient(180deg, #ffe57a 0%, var(--gold) 45%, #f0bf1a 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6), inset 0 -3px 0 rgba(110, 80, 0, 0.35);
  color: var(--on-gold);
  font: 800 18px var(--font-display);
  font-stretch: 125%;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  transition: filter var(--dur-fast), box-shadow var(--dur-med);
}
.cta.live {
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.6),
    inset 0 -3px 0 rgba(110, 80, 0, 0.35),
    0 0 34px rgba(255, 214, 66, 0.28);
}
.cta:hover:not(:disabled) { filter: brightness(1.06); }
.cta:disabled {
  background: var(--raised);
  color: var(--dim);
  box-shadow: inset 0 0 0 1px var(--line-3);
  cursor: not-allowed;
}
.rerolls { display: flex; flex-wrap: wrap; gap: 6px 20px; justify-content: center; }
.reroll {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 30px;
  border: 0;
  background: none;
  color: var(--muted);
  font: 600 12px var(--font-body);
  letter-spacing: 0.04em;
  text-decoration: underline;
  text-decoration-color: var(--line-4);
  text-underline-offset: 3px;
  cursor: pointer;
}
.reroll-icon { width: 14px; height: 14px; }
.reroll:hover:not(:disabled) { color: var(--gold); text-decoration-color: currentColor; }
.reroll:disabled { opacity: 0.35; cursor: not-allowed; text-decoration: none; }
.waiting { color: var(--muted); font-size: 13px; text-align: center; }
/* The pre-spin card reserves the settled card's footprint so the front line,
   odds strip and CTA never jump when the directive lands. */
.empty-call {
  justify-content: center;
  min-height: 202px;
}
.empty-title { margin: 0; color: var(--gold); font-size: 28px; line-height: 0.98; }
.empty-copy { margin: 0; max-width: 44ch; color: var(--muted); font-size: 13px; line-height: 1.45; }
.cta-icon { width: 20px; height: 20px; }

/* Short desktops: shed the explainer line before the CTA leaves the fold. */
@media (min-width: 901px) and (max-height: 860px) {
  .call-sub { display: none; }
  .wheel-side { --wheel-size: min(100%, clamp(280px, calc(100dvh - 260px), 620px)); }
}

@media (max-width: 900px) {
  .call { grid-template-columns: minmax(0, 1fr); }
  .wheel-side { order: 2; --wheel-size: min(100%, 460px); }
  .decision-side { order: 1; }
}
</style>
