<script setup lang="ts">
import { FRONTS } from '~~/shared/data/fronts'
import { MISFORTUNE_RISK } from '~~/shared/engine/config'
import { canRerollWheel, currentFront, currentMisfortune } from '~~/shared/engine/selectors'
import { eligibleMisfortunes } from '~~/shared/engine/wheel'
import type { DiveState } from '~~/shared/engine/types'
import { riseIn } from '~/utils/motion'

const props = withDefaults(defineProps<{ state: DiveState, canControl?: boolean }>(), { canControl: true })
const emit = defineEmits<{ spin: [], decide: [accepted: boolean], reroll: [wheel: 'misfortune' | 'front'] }>()

const rerollInfo = computed(() => canRerollWheel(props.state))
const misfortune = computed(() => currentMisfortune(props.state))
const front = computed(() => currentFront(props.state))
const teamRisk = computed(() =>
  props.state.wheel ? (MISFORTUNE_RISK[props.state.wheel.misfortuneId] ?? 0) : 0,
)
// The team decision is free until anyone locks pacts (same window as rerolls).
const decidable = computed(() =>
  props.state.phase === 'pacts'
  && props.state.wheel !== null
  && !props.state.divers.some(diver => diver.pactsLocked),
)

const misfortuneNames = computed(() =>
  eligibleMisfortunes(props.state.difficulty).map(entry => entry.name),
)
const frontNames = computed(() => FRONTS.map(entry => entry.displayName))

const misfortuneReeling = ref(false)
const frontReeling = ref(false)

// A wheel that already exists when this panel mounts (mid-operation remount,
// reconnect, loaded save) has already been revealed — only a seed arriving
// while mounted (fresh spin, reroll) plays the reel.
const reelSeed = ref<number | null>(null)
watch(() => props.state.wheel?.seed ?? null, (value) => {
  if (value !== null) {
    reelSeed.value = value
  }
})
</script>

<template>
  <section class="panel">
    <template v-if="!state.wheel">
      <h2>Wheel of Misfortune</h2>
      <p class="muted">
        The spin draws a misfortune and the enemy front. Accept the misfortune to
        share its risk squad-wide — chosen risk raises everyone's luck. Decline
        for a safe dive.
      </p>
      <div class="row">
        <button
          class="btn primary attn"
          type="button"
          :disabled="!canControl"
          @click="$emit('spin')"
        >
          Spin
        </button>
        <p
          v-if="!canControl"
          class="muted small"
        >
          Waiting for the host to spin…
        </p>
      </div>
    </template>
    <template v-else>
      <div class="wheel-result">
        <Motion
          as="div"
          class="wheel-card"
          :class="{ reeling: misfortuneReeling, declined: !state.misfortuneAccepted }"
          v-bind="riseIn(0)"
        >
          <span class="label muted small">Misfortune · {{ state.misfortuneAccepted ? 'in effect — team-wide' : 'drawn — not accepted' }}</span>
          <strong class="misfortune-name">
            <ReelText
              :final="misfortune?.name ?? ''"
              :candidates="misfortuneNames"
              :reel-id="reelSeed"
              @reeling="misfortuneReeling = $event"
            />
          </strong>
          <p>{{ misfortune?.rule }}</p>
          <span class="row small muted">Team risk <RiskPips :value="teamRisk" /><span v-if="!state.misfortuneAccepted">(if accepted)</span></span>
        </Motion>
        <Motion
          as="div"
          class="wheel-card"
          :class="{ reeling: frontReeling }"
          v-bind="riseIn(1)"
        >
          <span class="label muted small">Front</span>
          <strong class="misfortune-name">
            <ReelText
              :final="front?.displayName ?? ''"
              :candidates="frontNames"
              :reel-id="reelSeed"
              :start-delay="150"
              @reeling="frontReeling = $event"
            />
          </strong>
          <p class="muted small">
            Tracks completed (misfortune × front) combos.
          </p>
          <button
            v-if="rerollInfo.allowed && canControl"
            class="btn tiny ghost"
            type="button"
            @click="$emit('reroll', 'front')"
          >
            Reroll front
          </button>
        </Motion>
      </div>
      <div class="row">
        <template v-if="decidable && canControl">
          <button
            class="btn primary"
            type="button"
            :disabled="state.misfortuneAccepted"
            @click="emit('decide', true)"
          >
            {{ state.misfortuneAccepted ? 'Misfortune accepted' : 'Accept misfortune' }}
          </button>
          <button
            class="btn ghost"
            type="button"
            :disabled="!state.misfortuneAccepted"
            @click="emit('decide', false)"
          >
            {{ state.misfortuneAccepted ? 'Decline' : 'Declined — safe dive' }}
          </button>
        </template>
        <span
          v-else-if="state.wheel"
          class="muted small"
        >{{ state.misfortuneAccepted ? 'Misfortune in effect for the operation.' : 'No team misfortune — safe dive.' }}</span>
      </div>
      <div class="row">
        <button
          v-if="rerollInfo.allowed && canControl"
          class="btn ghost"
          type="button"
          @click="$emit('reroll', 'misfortune')"
        >
          Reroll misfortune
          <span class="muted small">
            ({{ rerollInfo.free ? 'free — combo completed' : `spends token · ${state.rerollTokens} left` }})
          </span>
        </button>
        <span
          v-else-if="rerollInfo.reason && canControl"
          class="muted small"
        >{{ rerollInfo.reason }}</span>
        <span class="muted small">Reroll tokens: {{ state.rerollTokens }}</span>
      </div>
    </template>
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
.misfortune-name { font-size: 1.1rem; color: var(--gold); }
.wheel-card.declined .misfortune-name { color: var(--muted); }

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
