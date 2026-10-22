<script setup lang="ts">
import { conditionRiskAt, directiveValorAt, STRAIN_RISK } from '~~/shared/engine/config'
import { frontById } from '~~/shared/engine/wheel'
import { tierZones } from '~~/shared/engine/rewards'
import {
  canRerollWheel,
  currentFront,
  currentMisfortune,
  currentStrain,
  misfortuneDecision,
  misfortuneStrandedDivers,
  strainDecision,
  teamRiskOf,
} from '~~/shared/engine/selectors'
import type { DiverState, DiveState, MajorOrderSelection, RewardTier } from '~~/shared/engine/types'

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
  setMajorOrder: [order: MajorOrderSelection | null]
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
const strain = computed(() => currentStrain(props.state))
const decision = computed(() => misfortuneDecision(props.state))
const strainCall = computed(() => strainDecision(props.state))
const hostName = computed(() =>
  props.state.divers.find(diver => diver.id === props.state.hostId)?.name ?? 'The host')

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
const moOpen = ref(false)

const cardNote = computed(() => {
  if (!misfortune.value) {
    return ''
  }
  if (props.state.misfortuneAccepted) {
    return `${misfortune.value.name}'s share`
  }
  return `If accepted · ${misfortune.value.name}`
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

    <div class="call-grid">
      <div class="wheel-side">
        <WheelOfMisfortune
          :difficulty="state.difficulty"
          :seed="state.wheel?.seed ?? null"
          :can-control="canControl"
          @spin="emit('spin')"
        />

        <button
          v-if="!state.frontId && !state.majorOrder && canControl"
          class="mo-open"
          type="button"
          @click="moOpen = true"
        >
          <span class="cap">Major Order</span>
          <span>Pin a front for this operation</span>
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
        <div
          v-else-if="front && !drawing"
          class="front-pin"
        >
          <span class="cap">Front locked</span>
          <b>{{ front.displayName }}</b>
          <span v-if="strain && state.strainAccepted">· {{ strain.name }}</span>
        </div>
        <div
          v-else-if="state.majorOrder"
          class="front-pin"
        >
          <span class="cap">Major Order pinned</span>
          <b>{{ pinnedFronts.map(entry => entry.displayName).join(' · ') }}</b>
          <span v-if="strain && state.strainAccepted">· {{ strain.name }}</span>
        </div>
      </div>

      <div class="decision-side">
        <template v-if="state.wheel && misfortune && !drawing">
          <article
            class="directive-card"
            :class="{ accepted: state.misfortuneAccepted, decided: decision.decided }"
          >
            <div class="dc-top">
              <span class="cap">Directive</span>
              <RiskPips
                :value="directiveRisk"
                :max="5"
                tone="gold"
              />
            </div>
            <h2 class="disp dc-name">
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
                class="take"
                type="button"
                :disabled="acceptBlocked"
                :title="acceptBlocked ? strandedReason : undefined"
                @click="take"
              >
                Take it
              </button>
              <button
                class="skip"
                type="button"
                @click="skip"
              >
                Skip
              </button>
            </div>
            <div
              v-else-if="decision.decided"
              class="dc-verdict"
              :class="state.misfortuneAccepted ? 'taken' : 'skipped'"
            >
              {{ state.misfortuneAccepted ? 'Taken' : 'Skipped' }}
              <button
                v-if="canControl && state.phase === 'decision'"
                class="switch"
                type="button"
                @click="emit('decide', !state.misfortuneAccepted)"
              >
                Switch
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

          <article
            v-if="strain"
            class="strain-card"
            :class="{ accepted: state.strainAccepted, decided: strainCall.decided }"
          >
            <div class="dc-top">
              <span class="cap">Strain · whole operation</span>
              <RiskPips
                :value="strainRisk"
                :max="5"
                tone="orange"
              />
            </div>
            <h2 class="disp strain-name">
              {{ strain.name }}
            </h2>
            <p class="dc-rule">
              {{ strain.blurb }}
            </p>
            <div
              v-if="!strainCall.decided && canControl"
              class="dc-actions"
            >
              <button
                class="take"
                type="button"
                @click="takeStrain"
              >
                Take
              </button>
              <button
                class="skip"
                type="button"
                @click="skipStrain"
              >
                Skip
              </button>
            </div>
            <div
              v-else-if="strainCall.decided"
              class="dc-verdict"
              :class="state.strainAccepted ? 'taken' : 'skipped'"
            >
              {{ state.strainAccepted ? 'Taken' : 'Skipped' }}
              <button
                v-if="canControl && state.phase === 'strain'"
                class="switch"
                type="button"
                @click="emit('decideStrain', !state.strainAccepted)"
              >
                Switch
              </button>
            </div>
            <div
              v-else
              class="dc-waiting"
            >
              Waiting on the host…
            </div>
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

        <div
          v-else
          class="empty-call"
        >
          <span class="cap">{{ drawing ? 'Drawing' : 'No directive yet' }}</span>
          <p class="disp empty-title">
            {{ drawing ? 'The wheel turns…' : 'Spin the wheel' }}
          </p>
          <p class="empty-copy">
            The wheel draws this mission’s directive. Every rule is on it at every difficulty —
            altitude only changes what the risk buys.
          </p>
        </div>
      </div>
    </div>

    <AppDialog
      v-model:open="moOpen"
      title="Major Order"
      description="Pin the operation's front to the live war order, or pick one manually."
      size="md"
    >
      <MajorOrderPicker
        :state="state"
        :can-control="canControl"
        @select="(order) => { emit('setMajorOrder', order); moOpen = false }"
      />
    </AppDialog>
  </section>
</template>

<style scoped>
.call {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
}
.call-head { display: flex; flex-direction: column; gap: 7px; }
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
.call-title { font-size: clamp(38px, 4.6vw, 58px); }
.call-sub { margin: 0; color: var(--muted); font-size: 14px; }

.call-grid {
  display: grid;
  grid-template-columns: minmax(340px, 1.1fr) minmax(320px, 0.9fr);
  gap: clamp(20px, 3vw, 44px);
  align-items: center;
}
.wheel-side { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.wheel-side :deep(.wheel) { width: 100%; }
.mo-open {
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 38px;
  padding: 0 10px;
  border: 0;
  background: var(--rail);
  box-shadow: inset 0 0 0 1px var(--line-2);
  color: var(--khaki);
  font: 600 11px var(--font-body);
  letter-spacing: 0.06em;
  text-align: left;
  cursor: pointer;
}
.mo-open .cap { margin-right: auto; color: var(--gold); }
.mo-open:hover { color: var(--text); box-shadow: inset 0 0 0 1px var(--line-5); }
.front-pin {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-height: 34px;
  padding: 0 10px;
  color: var(--khaki);
  font-size: 12px;
  box-shadow: inset 0 0 0 1px var(--line-2);
}
.front-pin b { color: var(--red); }
.decision-side { display: flex; flex-direction: column; gap: 12px; min-width: 0; }

.directive-card,
.strain-card {
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 15px 17px;
  background:
    radial-gradient(ellipse 80% 80% at 20% 0%, rgba(255, 214, 66, 0.11), transparent 70%),
    var(--panel);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--gold) 45%, var(--line-3));
  clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
}
.directive-card.accepted {
  box-shadow: inset 0 0 0 2px var(--gold), 0 0 24px rgba(255, 214, 66, 0.12);
}
.strain-card {
  background:
    radial-gradient(ellipse 80% 80% at 20% 0%, rgba(255, 159, 67, 0.1), transparent 70%),
    var(--panel);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--orange) 45%, var(--line-3));
}
.strain-card.accepted { box-shadow: inset 0 0 0 2px var(--orange); }
.dc-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.dc-name { font-size: clamp(30px, 3.6vw, 48px); color: var(--gold); }
.strain-name { font-size: 26px; color: var(--orange); }
.dc-rule { margin: 0; color: var(--khaki); font-size: 13px; line-height: 1.4; }
.dc-actions { display: flex; gap: 8px; padding-top: 4px; }
.take,
.skip {
  flex: 1;
  min-height: 42px;
  border: 0;
  font: 800 12px var(--font-body);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
}
.take {
  background: var(--gold);
  color: var(--on-gold);
  box-shadow: inset 0 -2px 0 rgba(110, 80, 0, 0.35);
}
.take:disabled { opacity: 0.4; cursor: not-allowed; }
.skip {
  background: var(--rail);
  color: var(--khaki);
  box-shadow: inset 0 0 0 1px var(--line-4);
}
.skip:hover { color: var(--text); }
.dc-verdict {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 32px;
  padding: 0 9px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.dc-verdict.taken { color: var(--on-gold); background: var(--gold); }
.dc-verdict.skipped { color: var(--muted); background: var(--rail); box-shadow: inset 0 0 0 1px var(--line-3); }
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
.dc-block { margin: 0; color: var(--red); font-size: 11px; }

.deal-row { display: flex; flex-direction: column; gap: 8px; }
.cta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  width: 100%;
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
.cta:disabled { opacity: 0.4; cursor: not-allowed; }
.rerolls { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; }
.reroll {
  min-height: 30px;
  border: 0;
  background: none;
  color: var(--muted);
  font: 600 11px var(--font-body);
  letter-spacing: 0.06em;
  cursor: pointer;
}
.reroll:hover:not(:disabled) { color: var(--gold); }
.reroll:disabled { opacity: 0.35; cursor: not-allowed; }
.waiting { color: var(--muted); font-size: 12px; text-align: center; }
.empty-call {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 18px;
  background: var(--panel);
  box-shadow: inset 0 0 0 1px var(--line-2);
}
.empty-title { font-size: 28px; color: var(--gold); }
.empty-copy { margin: 0; color: var(--muted); font-size: 13px; }

@media (max-width: 900px) {
  .call-grid { grid-template-columns: minmax(0, 1fr); }
  .call-title { font-size: 38px; }
  .wheel-side { order: 2; }
  .decision-side { order: 1; }
  .wheel-side :deep(.wheel) { max-width: 460px; margin: 0 auto; }
}
</style>
