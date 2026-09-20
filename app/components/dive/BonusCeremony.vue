<script setup lang="ts">
import { BONUS_STATS } from '~~/shared/engine/config'
import { bonusFor } from '~~/shared/engine/selectors'
import type { DiveState, DiverState } from '~~/shared/engine/types'
import { riseIn } from '~/utils/motion'

const props = withDefaults(defineProps<{
  state: DiveState
  selfId: string | null
  self: DiverState | null
  canControl?: boolean
}>(), { canControl: true })

const emit = defineEmits<{
  spin: []
  award: [playerId: string]
}>()

// The contest is a host-spun seed like the Wheel — nothing is revealed until
// the spin lands. The host resolves the winner by reading HD2's end screen;
// the app never captures the stats, and awarding banks the token immediately.
const contest = computed(() => bonusFor(props.state))
const spun = computed(() => props.state.bonusSeed !== null)
const statLabels = BONUS_STATS.map(stat => stat.label)
const winner = computed(() =>
  props.state.divers.find(diver => diver.id === props.state.bonusWinnerId) ?? null)
// A diver seated mid-mission sat the draft out, so they have no stats to win
// with — only the divers who dove are award candidates.
const candidates = computed(() =>
  props.state.divers.filter(diver => !diver.skipsCurrentDraft))
</script>

<template>
  <section class="panel bonus">
    <h2 class="bonus-title">
      <WaitingLight
        v-if="!state.bonusWinnerId"
        label="Waiting on the host's award"
      />
      Squad Honors
    </h2>
    <p class="muted small">
      One random stat from the mission's end screen. The host reads the squad's
      stats and names who won it — that diver banks a reward token.
    </p>

    <Motion
      as="div"
      class="slot"
      :class="{ settled: !!state.bonusWinnerId }"
      v-bind="riseIn(0)"
    >
      <template v-if="spun">
        <span class="muted small">Who has the</span>
        <strong class="slot-label">
          <ReelText
            :final="contest?.label ?? '—'"
            :candidates="statLabels"
            :reel-id="state.bonusSeed"
          />
        </strong>
      </template>
      <button
        v-else
        class="spin-overlay"
        type="button"
        :disabled="!canControl"
        @click="emit('spin')"
      >
        <strong>Spin</strong>
      </button>
    </Motion>

    <template v-if="!spun">
      <p
        v-if="canControl"
        class="muted small"
      >
        Spin to draw the honors contest.
      </p>
      <p
        v-else
        class="muted small"
      >
        Waiting for the host to spin…
      </p>
    </template>

    <template v-else-if="!winner">
      <p
        v-if="canControl"
        class="muted small"
      >
        Award the honors to the diver who won the stat:
      </p>
      <p
        v-else
        class="muted small"
      >
        The host is choosing who won…
      </p>
      <div class="row award-row">
        <button
          v-for="diver in candidates"
          :key="diver.id"
          class="btn ghost"
          type="button"
          :disabled="!canControl"
          @click="emit('award', diver.id)"
        >
          {{ diver.name }}
        </button>
      </div>
    </template>

    <p
      v-else
      class="winner-line"
    >
      <strong>{{ winner.name }}</strong> takes the honors and banks a reward token.
    </p>
  </section>
</template>

<style scoped>
.bonus-title { display: flex; align-items: center; gap: 0.45rem; }
.slot {
  display: grid;
  gap: 0.15rem;
  place-items: center;
  padding: 0.9rem 0.75rem;
  margin: 0.5rem 0;
  border: 1px dashed color-mix(in srgb, var(--gold) 50%, var(--border));
  border-radius: 8px;
  background:
    linear-gradient(165deg, color-mix(in srgb, var(--gold) 9%, transparent), transparent 60%),
    var(--bg);
  text-align: center;
}
.slot.settled { border-style: solid; }
.slot-label {
  font-family: var(--font-display);
  font-stretch: 125%;
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--gold);
}
.spin-overlay {
  display: grid;
  place-content: center;
  min-height: 3.5rem;
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
.award-row { flex-wrap: wrap; }
.winner-line { margin: 0.25rem 0; }
</style>
