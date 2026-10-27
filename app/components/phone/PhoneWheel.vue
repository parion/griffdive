<script setup lang="ts">
import { conditionRiskAt, directiveValorAt } from '~~/shared/engine/config'
import { tierZones } from '~~/shared/engine/rewards'
import {
  canRerollWheel,
  currentMisfortune,
  misfortuneDecision,
  misfortuneStrandedDivers,
  strainDecision,
  teamRiskOf,
} from '~~/shared/engine/selectors'
import type { DiveState, RewardTier } from '~~/shared/engine/types'

const props = defineProps<{
  state: DiveState
  selfId: string | null
  canControl: boolean
}>()

const emit = defineEmits<{
  spin: []
  decide: [accepted: boolean]
  decideStrain: [accepted: boolean]
  deal: []
  reroll: [wheel: 'misfortune' | 'front' | 'strain']
  openKit: []
}>()

const misfortune = computed(() => currentMisfortune(props.state))
// Only the host's phone shows the wheel; squadmates have no spin to wait out.
const drawing = useSpinReveal(() => props.state.wheel?.seed)
const held = computed(() => drawing.value && props.canControl)
const decision = computed(() => misfortuneDecision(props.state))
const strainCall = computed(() => strainDecision(props.state))
const hostName = computed(() =>
  upperName(props.state.divers.find(diver => diver.id === props.state.hostId)?.name) ?? 'The host')

const directiveRisk = computed(() =>
  misfortune.value ? conditionRiskAt(misfortune.value.id, props.state.difficulty) : 0)
const stranded = computed(() => misfortuneStrandedDivers(props.state))
const acceptBlocked = computed(() => stranded.value.length > 0)
const strandedReason = computed(() =>
  stranded.value.length
    ? `${stranded.value.map(diver => upperName(diver.name)).join(', ')} can’t field this rule.`
    : '')
const canDeal = computed(() =>
  props.state.phase === 'deal' || (decision.value.decided && strainCall.value.decided))

const callValor = computed(() => teamRiskOf(props.state))
const directiveShare = computed(() =>
  misfortune.value
    ? directiveValorAt(misfortune.value.id, props.state.difficulty, props.state.divers.length)
    : 0)
const previewValor = computed(() => {
  if (decision.value.decided) {
    return callValor.value
  }
  return callValor.value + (props.state.misfortuneAccepted ? 0 : directiveShare.value)
})
const zones = computed(() => tierZones(props.state.difficulty, callValor.value))
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
const rollNote = computed(() => {
  if (!misfortune.value || held.value) {
    return 'Base odds'
  }
  if (!decision.value.decided) {
    return `If taken · ${misfortune.value.name}`
  }
  return props.state.misfortuneAccepted
    ? `${misfortune.value.name}'s share`
    : 'Skipped · base odds'
})

// Pre-spin the odds line still shows the current team Valor; once the directive
// lands it previews the movement taking it would buy.
const showingPreview = computed(() => Boolean(props.state.wheel && misfortune.value && !held.value))
const rollZones = computed(() => (showingPreview.value ? previewZones.value : zones.value))
const rollDeltas = computed<Partial<Record<RewardTier, number>>>(() =>
  showingPreview.value ? deltas.value : {})

const rerollMisfortune = computed(() => canRerollWheel(props.state, 'misfortune'))
</script>

<template>
  <section class="phone-call">
    <header class="call-head">
      <span class="kick">{{ canControl ? 'Your move' : 'Stand by' }}</span>
      <h1 class="disp call-title">
        {{ canControl ? 'Make the squad’s call' : `${hostName} is making the call` }}
      </h1>
      <p class="call-sub">
        {{ canControl
          ? 'Talk it over on voice. Everyone carries what you take.'
          : 'The host spins the wheel and locks the squad’s call.' }}
      </p>
    </header>

    <div
      v-if="!state.wheel || held"
      class="directive empty"
    >
      <div class="dc-top">
        <span class="cap">{{ held ? 'Drawing' : 'Directive' }}</span>
      </div>
      <h2 class="disp dc-name empty-title">
        {{ held ? 'The wheel turns…' : 'Awaiting the draw' }}
      </h2>
      <p class="dc-rule">
        The wheel draws this mission’s directive. Every rule is on it at every difficulty.
      </p>
    </div>

    <div
      v-else-if="misfortune"
      class="directive"
      :class="{ accepted: state.misfortuneAccepted }"
    >
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
        <ConditionRule :condition="misfortune" />.
      </p>
      <div
        v-if="!decision.decided && canControl"
        class="dc-actions"
      >
        <button
          class="take"
          type="button"
          :disabled="acceptBlocked"
          @click="emit('decide', true)"
        >
          Take it
        </button>
        <button
          class="skip"
          type="button"
          @click="emit('decide', false)"
        >
          Skip
        </button>
      </div>
      <div
        v-else-if="decision.decided"
        class="dc-verdict pick-toggle"
        :class="state.misfortuneAccepted ? 'taken' : 'skipped'"
        role="group"
        aria-label="Directive call"
      >
        <template v-if="canControl">
          <button
            class="pick-choice"
            type="button"
            :class="{ on: state.misfortuneAccepted }"
            :aria-pressed="state.misfortuneAccepted"
            @click="emit('decide', true)"
          >
            Taken
          </button>
          <button
            class="pick-choice"
            type="button"
            :class="{ on: !state.misfortuneAccepted }"
            :aria-pressed="!state.misfortuneAccepted"
            @click="emit('decide', false)"
          >
            Skipped
          </button>
        </template>
        <span
          v-else
          class="pick-static"
        >{{ state.misfortuneAccepted ? 'Taken' : 'Skipped' }}</span>
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
    </div>

    <FrontBrief
      :state="state"
      :can-control="canControl"
      :drawing="held"
      compact
      @decide-strain="emit('decideStrain', $event)"
    />

    <ValorRoll
      :zones="rollZones"
      :deltas="rollDeltas"
      :note="rollNote"
      compact
    />

    <div
      v-if="canControl"
      class="wheel-wrap"
    >
      <WheelOfAdversity
        :difficulty="state.difficulty"
        :seed="state.wheel?.seed ?? null"
        :can-control="canControl"
        @spin="emit('spin')"
      />
    </div>

    <template v-if="!canControl">
      <div
        v-if="state.wheel && misfortune"
        class="wait-note"
      >
        <span class="cap">Next</span>
        <p>You’ll swear your own pacts when the host deals the hand.</p>
      </div>
      <KitSnapshot
        :state="state"
        :self-id="selfId"
        @open="emit('openKit')"
      />
    </template>

    <PhoneActionBar v-if="canControl">
      <template #primary>
        <button
          v-if="!state.wheel"
          class="bar-cta cta-sweep"
          type="button"
          @click="emit('spin')"
        >
          <span class="disp">Spin the wheel</span>
        </button>
        <button
          v-else
          class="bar-cta cta-sweep"
          type="button"
          :disabled="!canDeal"
          @click="emit('deal')"
        >
          <span class="disp">Deal the pacts</span>
        </button>
      </template>
      <template #secondary>
        <button
          v-if="state.wheel"
          class="bar-alt"
          type="button"
          :disabled="!rerollMisfortune.allowed"
          :title="rerollMisfortune.reason ?? undefined"
          @click="emit('reroll', 'misfortune')"
        >
          Reroll
        </button>
      </template>
    </PhoneActionBar>
    <PhoneActionBar v-else>
      <template #primary>
        <span class="bar-gate">Waiting on host</span>
      </template>
    </PhoneActionBar>
  </section>
</template>

<style scoped>
.phone-call {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}
.call-head { display: flex; flex-direction: column; gap: 5px; }
.kick {
  color: var(--gold);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}
.call-title { font-size: 34px; }
.call-sub { margin: 0; color: var(--muted); font-size: 12px; }

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
.directive.accepted { box-shadow: inset 0 0 0 2px var(--gold); }
.directive.empty {
  justify-content: center;
  min-height: 142px;
  background:
    repeating-linear-gradient(-45deg, rgba(255, 214, 66, 0.025) 0 10px, transparent 10px 20px),
    var(--panel);
}
.empty-title { font-size: 26px; line-height: 0.98; }
.dc-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.dc-name { font-size: min(30px, 100cqi / var(--fit-len, 1)); color: var(--gold); }
.dc-rule { margin: 0; color: var(--khaki); font-size: 12px; }
.dc-actions { display: flex; gap: 7px; }
.take,
.skip {
  flex: 1;
  min-height: 38px;
  border: 0;
  font: 800 11px var(--font-body);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.take { background: var(--gold); color: var(--on-gold); }
.take:disabled { opacity: 0.4; }
.skip { background: var(--rail); color: var(--khaki); box-shadow: inset 0 0 0 1px var(--line-4); }
.pick-toggle {
  display: flex;
  gap: 3px;
  padding: 3px;
  background: var(--rail);
  box-shadow: inset 0 0 0 1px var(--line-3);
}
.pick-choice,
.pick-static {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0 10px;
  border: 0;
  font: 800 11px var(--font-body);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.pick-choice {
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  transition: background-color var(--dur-fast), color var(--dur-fast), box-shadow var(--dur-fast);
}
.pick-choice:hover:not(:disabled) {
  background: color-mix(in srgb, var(--gold) 10%, transparent);
  color: var(--text);
}
.pick-toggle.taken .pick-choice.on {
  background: var(--gold);
  color: var(--on-gold);
  box-shadow: inset 0 -2px 0 rgba(110, 80, 0, 0.28);
}
.pick-toggle.skipped .pick-choice.on {
  background: var(--raised);
  color: var(--text);
  box-shadow: inset 0 0 0 1px var(--line-4);
}
.pick-toggle.taken .pick-static { background: var(--gold); color: var(--on-gold); }
.pick-toggle.skipped .pick-static { background: var(--raised); color: var(--muted); }
.dc-block { margin: 0; color: var(--red); font-size: 10px; }
.dc-waiting { color: var(--dim); font-size: 11px; }

.wheel-wrap { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.phone-call :deep(.risk-legend) { display: none; }
.wheel-wrap :deep(.wheel) { max-width: 360px; }
.wait-note { display: flex; flex-direction: column; gap: 4px; }
.wait-note p { margin: 0; color: var(--muted); font-size: 12px; }
</style>
