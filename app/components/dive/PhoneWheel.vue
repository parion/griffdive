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
import type { DiveState, MajorOrderSelection, RewardTier } from '~~/shared/engine/types'

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
  setMajorOrder: [order: MajorOrderSelection | null]
  reroll: [wheel: 'misfortune' | 'front' | 'strain']
  openKit: []
}>()

const misfortune = computed(() => currentMisfortune(props.state))
const strain = computed(() => currentStrain(props.state))
const front = computed(() => currentFront(props.state))
// Only the host's phone shows the wheel; squadmates have no spin to wait out.
const drawing = useSpinReveal(() => props.state.wheel?.seed)
const held = computed(() => drawing.value && props.canControl)
const pinnedFronts = computed(() =>
  (props.state.majorOrder?.fronts ?? [])
    .map(id => frontById(id))
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null))
const decision = computed(() => misfortuneDecision(props.state))
const strainCall = computed(() => strainDecision(props.state))
const hostName = computed(() =>
  props.state.divers.find(diver => diver.id === props.state.hostId)?.name ?? 'The host')

const directiveRisk = computed(() =>
  misfortune.value ? conditionRiskAt(misfortune.value.id, props.state.difficulty) : 0)
const strainRisk = computed(() =>
  strain.value ? STRAIN_RISK[strain.value.id] ?? 0 : 0)
const stranded = computed(() => misfortuneStrandedDivers(props.state))
const acceptBlocked = computed(() => stranded.value.length > 0)
const strandedReason = computed(() =>
  stranded.value.length
    ? `${stranded.value.map(diver => diver.name).join(', ')} can’t field this rule.`
    : '')
const canDeal = computed(() =>
  props.state.phase === 'deal' || (decision.value.decided && strainCall.value.decided))
const moOpen = ref(false)

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
  if (!misfortune.value) {
    return ''
  }
  return props.state.misfortuneAccepted
    ? `Accepted · ${misfortune.value.name}`
    : `If accepted · ${misfortune.value.name}`
})

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
      v-if="state.wheel && misfortune && !held"
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
        v-else
        class="dc-verdict"
        :class="state.misfortuneAccepted ? 'taken' : 'skipped'"
      >
        {{ state.misfortuneAccepted ? 'Taken' : 'Skipped' }}
      </div>
      <p
        v-if="acceptBlocked && !decision.decided"
        class="dc-block"
      >
        {{ strandedReason }}
      </p>
    </div>

    <div
      v-if="strain && state.wheel && !held"
      class="strain"
      :class="{ accepted: state.strainAccepted }"
    >
      <div class="dc-top">
        <span class="cap">Strain · whole operation</span>
        <RiskPips
          :value="strainRisk"
          :max="strainRisk"
          tone="orange"
        />
      </div>
      <h2
        class="disp strain-name"
        :style="fitWord(strain.name)"
      >
        {{ strain.name }}
      </h2>
      <div
        v-if="!strainCall.decided && canControl"
        class="dc-actions"
      >
        <button
          class="take"
          type="button"
          @click="emit('decideStrain', true)"
        >
          Take
        </button>
        <button
          class="skip"
          type="button"
          @click="emit('decideStrain', false)"
        >
          Skip
        </button>
      </div>
      <div
        v-else
        class="dc-verdict"
        :class="state.strainAccepted ? 'taken' : 'skipped'"
      >
        {{ state.strainAccepted ? 'Taken' : 'Skipped' }}
      </div>
    </div>

    <ValorRoll
      v-if="state.wheel && misfortune && !held"
      :zones="previewZones"
      :deltas="deltas"
      :note="rollNote"
      compact
    />

    <div
      v-if="canControl"
      class="wheel-wrap"
    >
      <WheelOfMisfortune
        :difficulty="state.difficulty"
        :seed="state.wheel?.seed ?? null"
        :can-control="canControl"
        @spin="emit('spin')"
      />
      <button
        v-if="!state.frontId && !state.majorOrder"
        class="mo-open"
        type="button"
        @click="moOpen = true"
      >
        Major Order · pin a front
      </button>
      <div
        v-else-if="front && !held"
        class="front-pin"
      >
        Front locked · <b>{{ front.displayName }}</b>
      </div>
      <div
        v-else-if="state.majorOrder"
        class="front-pin"
      >
        Major Order · <b>{{ pinnedFronts.map(entry => entry.displayName).join(' · ') }}</b>
      </div>
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

.directive,
.strain {
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
.strain {
  background:
    radial-gradient(ellipse 80% 80% at 20% 0%, rgba(255, 159, 67, 0.1), transparent 70%),
    var(--panel);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--orange) 45%, var(--line-3));
}
.directive.accepted { box-shadow: inset 0 0 0 2px var(--gold); }
.strain.accepted { box-shadow: inset 0 0 0 2px var(--orange); }
.dc-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.dc-name { font-size: min(30px, 100cqi / var(--fit-len, 1)); color: var(--gold); }
.strain-name { font-size: min(22px, 100cqi / var(--fit-len, 1)); color: var(--orange); }
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
.dc-verdict {
  min-height: 28px;
  display: flex;
  align-items: center;
  padding: 0 8px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.dc-verdict.taken { background: var(--gold); color: var(--on-gold); }
.dc-verdict.skipped { background: var(--rail); color: var(--muted); }
.dc-block { margin: 0; color: var(--red); font-size: 10px; }

.wheel-wrap { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.phone-call :deep(.risk-legend) { display: none; }
.wheel-wrap :deep(.wheel) { max-width: 360px; }
.mo-open {
  min-height: 34px;
  padding: 0 10px;
  border: 0;
  background: var(--rail);
  box-shadow: inset 0 0 0 1px var(--line-2);
  color: var(--khaki);
  font: 600 10px var(--font-body);
  letter-spacing: 0.06em;
}
.front-pin { color: var(--muted); font-size: 11px; }
.front-pin b { color: var(--red); }
.wait-note { display: flex; flex-direction: column; gap: 4px; }
.wait-note p { margin: 0; color: var(--muted); font-size: 12px; }
</style>
