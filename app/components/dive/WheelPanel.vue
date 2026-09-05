<script setup lang="ts">
import { FRONTS } from '~~/shared/data/fronts'
import { MISFORTUNE_RISK } from '~~/shared/engine/config'
import {
  canRerollWheel,
  currentFront,
  currentMisfortune,
  misfortuneDecision,
} from '~~/shared/engine/selectors'
import { eligibleMisfortunes } from '~~/shared/engine/wheel'
import type { DiveState } from '~~/shared/engine/types'
import { riseIn } from '~/utils/motion'

const props = withDefaults(defineProps<{ state: DiveState, canControl?: boolean }>(), { canControl: true })
defineEmits<{ spin: [], decide: [accepted: boolean], reroll: [wheel: 'misfortune' | 'front'] }>()

// The card shows the drawn misfortune — the squad decides on what it can see.
// (activeMisfortune is the accepted-only variant, used by briefing/pacts.)
const misfortune = computed(() => currentMisfortune(props.state))
const front = computed(() => currentFront(props.state))
const misfortuneReroll = computed(() => canRerollWheel(props.state, 'misfortune'))
const frontReroll = computed(() => canRerollWheel(props.state, 'front'))
const teamRisk = computed(() =>
  props.state.wheel ? (MISFORTUNE_RISK[props.state.wheel.misfortuneId] ?? 0) : 0,
)

// The decision window closes once anyone locks pacts — team risk is shared,
// so the accept/opt-out call is frozen at that point.
const decision = computed(() => misfortuneDecision(props.state))
const decisionOpen = computed(() =>
  props.state.phase === 'pacts'
  && props.state.wheel !== null
  && !props.state.divers.some(diver => diver.pactsLocked))

const misfortuneNames = computed(() =>
  eligibleMisfortunes(props.state.difficulty).map(entry => entry.name),
)
const frontNames = computed(() => FRONTS.map(entry => entry.displayName))

const misfortuneReeling = ref(false)
const frontReeling = ref(false)

// Reels replay only on live changes — a spin or reroll re-seeds them, while a
// page load mid-phase settles straight onto the stored result.
const misfortuneReelId = ref<number | null>(null)
watch(() => props.state.wheel?.seed ?? null, (seed) => {
  if (seed !== null) {
    misfortuneReelId.value = seed
  }
})

const frontReelId = ref<string | null>(null)
let frontTick = 0
watch(() => props.state.frontId, (id, prev) => {
  if (id === null || misfortuneReelId.value === null) {
    return
  }
  if (prev !== undefined) {
    frontTick++
  }
  frontReelId.value = `${misfortuneReelId.value}:${frontTick}`
})

const cardTone = computed(() =>
  decision.value.decided
    ? decision.value.accepted ? 'locked' : 'safe'
    : decisionOpen.value ? 'pending' : 'safe')

const stamp = computed(() => {
  if (decision.value.decided) {
    return decision.value.accepted
      ? { text: 'Locked in — team-wide', tone: 'locked' }
      : { text: 'Opted out — safe dive', tone: 'safe' }
  }
  if (decisionOpen.value) {
    return { text: props.canControl ? 'Decision pending' : 'Awaiting host', tone: 'pending' }
  }
  return { text: 'Undecided — safe dive', tone: 'safe' }
})

function rerollLabel(
  info: { allowed: boolean, free: boolean, reason: string | null },
  wheel: 'misfortune' | 'front',
): string {
  if (!info.allowed) {
    return info.reason ?? `Reroll ${wheel}`
  }
  return info.free
    ? `Reroll ${wheel} — free: combo already completed`
    : `Reroll ${wheel} — spends a reroll token (${props.state.rerollTokens} left)`
}
</script>

<template>
  <section class="panel">
    <h2>Wheel of Misfortune</h2>
    <div class="wheel-result">
      <Motion
        as="div"
        class="wheel-card misfortune"
        :class="[state.wheel ? cardTone : 'pending', { reeling: misfortuneReeling }]"
        v-bind="riseIn(0)"
      >
        <span class="card-head">
          <span class="muted small">Misfortune</span>
          <span
            v-if="state.wheel"
            class="head-tools"
          >
            <button
              v-if="canControl && decisionOpen"
              class="reroll-dice"
              type="button"
              :disabled="!misfortuneReroll.allowed || misfortuneReeling"
              :aria-label="rerollLabel(misfortuneReroll, 'misfortune')"
              :title="rerollLabel(misfortuneReroll, 'misfortune')"
              @click="$emit('reroll', 'misfortune')"
            ><IconDice /></button>
            <span
              class="chip decision-stamp"
              :class="stamp.tone"
            >{{ stamp.text }}</span>
          </span>
        </span>
        <template v-if="state.wheel">
          <strong class="misfortune-name">
            <ReelText
              :final="misfortune?.name ?? ''"
              :candidates="misfortuneNames"
              :reel-id="misfortuneReelId"
              @reeling="misfortuneReeling = $event"
            />
          </strong>
          <p>{{ misfortune?.rule }}</p>
          <span class="row small muted">Team risk <RiskPips :value="teamRisk" /></span>
          <div
            v-if="!decision.decided && canControl"
            class="row decision-actions"
          >
            <button
              class="btn primary"
              type="button"
              :disabled="misfortuneReeling"
              @click="$emit('decide', true)"
            >
              Lock it in
            </button>
            <button
              class="btn ghost"
              type="button"
              :disabled="misfortuneReeling"
              @click="$emit('decide', false)"
            >
              Opt out
            </button>
          </div>
          <button
            v-else-if="decision.decided && canControl"
            class="btn tiny ghost"
            type="button"
            @click="$emit('decide', !decision.accepted)"
          >
            {{ decision.accepted ? 'Switch — opt out' : 'Switch — lock it in' }}
          </button>
          <p
            v-else-if="!decision.decided && !canControl"
            class="muted small"
          >
            The host decides before pacts lock.
          </p>
        </template>
        <button
          v-else
          class="spin-overlay"
          type="button"
          :disabled="!canControl"
          @click="$emit('spin')"
        >
          <strong>Spin</strong>
        </button>
      </Motion>
      <Motion
        as="div"
        class="wheel-card"
        :class="{ reeling: frontReeling }"
        v-bind="riseIn(1)"
      >
        <span class="card-head">
          <span class="muted small">Front</span>
          <span
            v-if="state.wheel && canControl"
            class="head-tools"
          >
            <button
              class="reroll-dice"
              type="button"
              :disabled="!frontReroll.allowed || frontReeling"
              :aria-label="rerollLabel(frontReroll, 'front')"
              :title="rerollLabel(frontReroll, 'front')"
              @click="$emit('reroll', 'front')"
            ><IconDice /></button>
          </span>
        </span>
        <template v-if="state.wheel">
          <strong class="misfortune-name">
            <ReelText
              :final="front?.displayName ?? ''"
              :candidates="frontNames"
              :reel-id="frontReelId"
              :start-delay="150"
              @reeling="frontReeling = $event"
            />
          </strong>
          <p class="muted small">
            Tracks completed (misfortune × front) combos. The front locks in for
            the whole operation.
          </p>
        </template>
        <template v-else-if="state.frontId">
          <strong class="misfortune-name">{{ front?.displayName }}</strong>
          <p class="muted small">
            Fixed for the whole operation.
          </p>
        </template>
        <p
          v-else
          class="front-pending muted small"
        >
          Drawn with the first spin
        </p>
      </Motion>
    </div>
    <div class="row">
      <span
        v-if="!state.wheel && !canControl"
        class="muted small"
      >Waiting for the host to spin…</span>
      <span class="muted small">Reroll tokens: {{ state.rerollTokens }}</span>
    </div>
  </section>
</template>

<style scoped>
.wheel-result { display: grid; gap: 0.6rem; grid-template-columns: 1fr; }
.wheel-card {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.75rem;
  display: grid;
  gap: 0.3rem;
  background: var(--bg);
}
.misfortune { position: relative; overflow: hidden; }
.misfortune-name { font-size: 1.1rem; color: var(--gold); }

.wheel-card.misfortune.pending {
  border-style: dashed;
  border-color: color-mix(in srgb, var(--gold) 50%, var(--border));
}
.wheel-card.misfortune.pending::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(100deg, transparent 22%, color-mix(in srgb, var(--gold) 9%, transparent) 50%, transparent 78%);
  animation: decision-sweep 3.2s ease-in-out infinite;
  pointer-events: none;
}
@keyframes decision-sweep {
  0% { transform: translateX(-130%); }
  55%, 100% { transform: translateX(130%); }
}
.wheel-card.misfortune.locked {
  border-color: color-mix(in srgb, var(--red) 50%, var(--border));
  background:
    linear-gradient(165deg, color-mix(in srgb, var(--red) 10%, transparent), transparent 55%),
    var(--bg);
}
.wheel-card.misfortune.safe { opacity: 0.82; }
.wheel-card.misfortune.safe .misfortune-name { color: var(--muted); }

/* Pre-spin the misfortune card is face down: the card itself is the button. */
.spin-overlay {
  display: grid;
  place-content: center;
  min-height: 7.5rem;
  width: 100%;
  padding: 0;
  background: transparent;
  border: none;
  color: var(--gold);
  font: inherit;
  cursor: pointer;
  animation: spin-pulse 1.6s ease-in-out infinite;
}
.spin-overlay strong {
  font-family: var(--font-display);
  font-stretch: 125%;
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.spin-overlay:hover:not(:disabled) strong {
  text-shadow: 0 0 18px color-mix(in srgb, var(--gold) 65%, transparent);
}
.spin-overlay:disabled { cursor: default; opacity: 0.55; animation: none; }
@keyframes spin-pulse {
  0%, 100% { text-shadow: 0 0 0 color-mix(in srgb, var(--gold) 40%, transparent); }
  50% { text-shadow: 0 0 18px color-mix(in srgb, var(--gold) 55%, transparent); }
}

.front-pending {
  display: grid;
  place-content: center;
  min-height: 4rem;
  border: 1px dashed var(--border);
  border-radius: 8px;
}

.card-head { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
.head-tools { display: inline-flex; align-items: center; gap: 0.45rem; }

.reroll-dice {
  display: inline-grid;
  place-items: center;
  padding: 0;
  width: 1.7rem;
  height: 1.7rem;
  flex-shrink: 0;
  background: none;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--khaki);
  cursor: pointer;
  transition: border-color var(--dur-fast) ease, color var(--dur-fast) ease;
}
.reroll-dice svg { width: 1.05rem; height: 1.05rem; }
.reroll-dice:hover:not(:disabled) { border-color: var(--gold); color: var(--gold); }
.reroll-dice:disabled { opacity: 0.4; cursor: not-allowed; }

.decision-stamp.pending { color: var(--gold); border-color: color-mix(in srgb, var(--gold) 60%, transparent); }
.decision-stamp.locked { color: var(--red); border-color: var(--red); }
.decision-stamp.safe { color: var(--muted); }

/* While a reel is spinning, the card's static content steps aside for it. */
.wheel-card.reeling p,
.wheel-card.reeling .row:not(:first-child),
.wheel-card.reeling .btn {
  opacity: 0.2;
  transition: opacity 0.2s ease-in;
}
.wheel-card p,
.wheel-card .row,
.wheel-card .btn {
  transition: opacity 0.35s var(--ease-out);
}

@media (min-width: 640px) {
  .wheel-result { grid-template-columns: 1fr 1fr; }
}
</style>
