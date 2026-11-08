<script setup lang="ts">
import { conditionRiskAt, directiveValorAt } from '~~/shared/engine/config'
import { tierZones } from '~~/shared/engine/rewards'
import {
  canRerollWheel,
  currentMisfortune,
  currentStrain,
  misfortuneDecision,
  misfortuneStrandedDivers,
  squadInventories,
  squadPenances,
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
const wheelOpen = ref(false)
watch(() => props.state.wheel?.seed, () => {
  wheelOpen.value = false
})
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
  !drawing.value
  && (props.state.phase === 'deal' || (decision.value.decided && strainCall.value.decided)))

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
    ? `With ${misfortune.value.name}`
    : 'Skipped · base odds'
})

// Pre-spin the odds line still shows the current team Valor; once the directive
// lands it previews the movement taking it would buy.
const showingPreview = computed(() => Boolean(props.state.wheel && misfortune.value && !held.value))
const rollZones = computed(() => (showingPreview.value ? previewZones.value : zones.value))
const rollDeltas = computed<Partial<Record<RewardTier, number>>>(() =>
  showingPreview.value ? deltas.value : {})

const rerollMisfortune = computed(() => canRerollWheel(props.state, 'misfortune'))
const rerollFront = computed(() => canRerollWheel(props.state, 'front'))
const rerollStrain = computed(() => canRerollWheel(props.state, 'strain'))

type WheelReroll = 'misfortune' | 'front' | 'strain'

const rerolls = computed(() => {
  if (!props.state.wheel) {
    return []
  }
  const result: { wheel: WheelReroll, name: string, availability: ReturnType<typeof canRerollWheel> }[] = [
    { wheel: 'misfortune', name: 'directive', availability: rerollMisfortune.value },
  ]
  if (props.state.missionInOperation === 1) {
    result.push({ wheel: 'front', name: 'front', availability: rerollFront.value })
    if (currentStrain(props.state) && !strainCall.value.decided) {
      result.push({ wheel: 'strain', name: 'strain', availability: rerollStrain.value })
    }
  }
  return result
})

const pendingReroll = ref<WheelReroll | null>(null)
const rerollConfirmOpen = ref(false)
watch(rerollConfirmOpen, (open) => {
  if (!open) {
    pendingReroll.value = null
  }
})
const pendingRerollName = computed(() => ({
  misfortune: 'directive',
  front: 'front',
  strain: 'strain',
}[pendingReroll.value ?? 'misfortune']))
const pendingRerollAvailability = computed(() =>
  pendingReroll.value ? canRerollWheel(props.state, pendingReroll.value) : null)
const rerollConfirmDescription = computed(() =>
  pendingRerollAvailability.value?.free
    ? `A free reroll is available for the ${pendingRerollName.value}.`
    : `Rerolling the ${pendingRerollName.value} spends 1 token. You have ${props.state.rerollTokens}.`)

function rerollLabel(option: { name: string, availability: ReturnType<typeof canRerollWheel> }): string {
  const price = option.availability.free
    ? 'free'
    : `${props.state.rerollTokens} token${props.state.rerollTokens === 1 ? '' : 's'}`
  return `Reroll ${option.name} · ${price}`
}

function requestReroll(wheel: WheelReroll): void {
  if (drawing.value) {
    return
  }
  const availability = canRerollWheel(props.state, wheel)
  if (!availability.allowed) {
    return
  }
  if (availability.free) {
    emit('reroll', wheel)
    return
  }
  pendingReroll.value = wheel
  rerollConfirmOpen.value = true
}

function confirmReroll(): void {
  const wheel = pendingReroll.value
  if (!wheel || drawing.value) {
    return
  }
  if (canRerollWheel(props.state, wheel).allowed) {
    emit('reroll', wheel)
  }
  rerollConfirmOpen.value = false
}
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
        <span class="cap">{{ held ? 'Spinning' : 'Directive' }}</span>
      </div>
      <h2 class="disp dc-name empty-title">
        {{ held ? 'Spinning…' : 'Ready to spin' }}
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
      <p class="risk-note">
        Risk shown is for this difficulty; higher difficulties raise risk and offer more pacts.
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
      v-if="canControl && state.wheel"
      class="rerolls"
      aria-label="Reroll options"
      role="group"
    >
      <button
        v-for="option in rerolls"
        :key="option.wheel"
        class="reroll"
        type="button"
        :disabled="drawing || !option.availability.allowed"
        :title="drawing ? 'Wait for the wheel reveal to finish' : option.availability.reason ?? undefined"
        @click="requestReroll(option.wheel)"
      >
        <IconDice class="reroll-icon" />
        {{ rerollLabel(option) }}
      </button>
    </div>

    <div
      v-if="canControl && state.wheel && misfortune && !drawing"
      class="wheel-result"
    >
      <div class="result-copy">
        <span class="cap">Directive drawn</span>
        <b class="disp result-name">{{ misfortune.name }}</b>
      </div>
      <RiskPips
        :value="directiveRisk"
        :max="directiveRisk"
        tone="red"
      />
      <button
        class="wheel-toggle"
        type="button"
        aria-controls="phone-wheel-reveal"
        :aria-expanded="wheelOpen"
        @click="wheelOpen = !wheelOpen"
      >
        {{ wheelOpen ? 'Hide wheel' : 'View wheel' }}
      </button>
    </div>

    <div
      v-if="canControl"
      v-show="!state.wheel || drawing || wheelOpen"
      id="phone-wheel-reveal"
      class="wheel-wrap"
    >
      <WheelOfAdversity
        :difficulty="state.difficulty"
        :seed="state.wheel?.seed ?? null"
        :result-id="state.wheel?.misfortuneId ?? null"
        :inventories="squadInventories(state)"
        :penance="squadPenances(state)"
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
        <p>You’ll swear your own pacts once the host deals them.</p>
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
          :title="drawing ? 'Wait for the wheel reveal to finish' : undefined"
          @click="emit('deal')"
        >
          <span class="disp">Deal the pacts</span>
        </button>
      </template>
    </PhoneActionBar>
    <PhoneActionBar v-else>
      <template #primary>
        <span class="bar-gate">Waiting on host</span>
      </template>
    </PhoneActionBar>

    <AppDialog
      v-model:open="rerollConfirmOpen"
      title="Spend a reroll token?"
      :description="rerollConfirmDescription"
      size="sm"
    >
      <template #footer>
        <div class="confirm-actions">
          <button
            class="btn ghost"
            type="button"
            @click="rerollConfirmOpen = false"
          >
            Keep this draw
          </button>
          <button
            class="btn primary"
            type="button"
            :disabled="drawing || !pendingRerollAvailability?.allowed"
            @click="confirmReroll"
          >
            {{ pendingRerollAvailability?.free ? 'Reroll for free' : 'Spend 1 token' }}
          </button>
        </div>
      </template>
    </AppDialog>
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
.risk-note { margin: -3px 0 0; color: var(--muted); font-size: 11px; line-height: 1.35; }
.dc-actions { display: flex; gap: 7px; }
.take,
.skip {
  flex: 1;
  min-height: 44px;
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
  min-height: 44px;
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
.dc-waiting {
  padding: 8px 10px;
  background: color-mix(in srgb, var(--teal) 8%, var(--panel));
  box-shadow: inset 2px 0 0 var(--teal);
  color: var(--khaki);
  font-size: var(--fs-body);
  line-height: 1.35;
}

.rerolls { display: flex; flex-wrap: wrap; gap: 3px 12px; justify-content: center; }
.reroll { display: inline-flex; align-items: center; gap: 6px; min-height: 40px; padding: 0 4px; border: 0; background: none; color: var(--muted); font: 600 12px var(--font-body); text-decoration: underline; text-decoration-color: var(--line-4); text-underline-offset: 3px; cursor: pointer; }
.reroll:hover:not(:disabled) { color: var(--gold); text-decoration-color: currentColor; }
.reroll:disabled { opacity: 0.4; cursor: not-allowed; text-decoration: none; }
.reroll-icon { width: 13px; height: 13px; }
.wheel-result { display: flex; align-items: center; gap: 9px; min-width: 0; padding: 9px 10px; background: var(--panel); box-shadow: inset 2px 0 0 var(--gold), inset 0 0 0 1px var(--line-3); }
.result-copy { display: flex; flex: 1; flex-direction: column; gap: 2px; min-width: 0; }
.result-name { overflow: hidden; color: var(--gold); font-size: 15px; text-overflow: ellipsis; white-space: nowrap; }
.wheel-toggle { min-height: 44px; padding: 0 10px; border: 1px solid var(--line-4); background: var(--rail); color: var(--khaki); font: 700 11px var(--font-body); letter-spacing: 0.08em; text-transform: uppercase; cursor: pointer; }
.wheel-toggle:hover { color: var(--gold); border-color: var(--gold); }
.wheel-wrap { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.phone-call :deep(.risk-legend) { display: none; }
.wheel-wrap :deep(.wheel) { max-width: 360px; }
.wait-note { display: flex; flex-direction: column; gap: 4px; }
.wait-note p { margin: 0; color: var(--muted); font-size: 12px; }
.confirm-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
</style>
