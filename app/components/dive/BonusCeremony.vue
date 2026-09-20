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
  award: [playerId: string]
  claim: []
}>()

// The contest is a deterministic derivation of the mission's offer seed, so
// every client reels to the same stat. The host resolves the winner by reading
// HD2's end screen; the app never captures the stats.
const contest = computed(() => bonusFor(props.state))
const statLabels = BONUS_STATS.map(stat => stat.label)
const winner = computed(() =>
  props.state.divers.find(diver => diver.id === props.state.bonusWinnerId) ?? null)
const isWinner = computed(() =>
  props.state.bonusWinnerId !== null && props.state.bonusWinnerId === props.selfId)
</script>

<template>
  <section class="panel bonus">
    <h2 class="bonus-title">
      <WaitingLight
        v-if="contest && !state.bonusWinnerId"
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
      <span class="muted small">Who has the</span>
      <strong class="slot-label">
        <ReelText
          :final="contest?.label ?? '—'"
          :candidates="statLabels"
          :reel-id="state.offerSeed"
        />
      </strong>
    </Motion>

    <template v-if="!winner">
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
          v-for="diver in state.divers"
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

    <template v-else>
      <p class="winner-line">
        <strong>{{ winner.name }}</strong> takes the honors.
      </p>
      <button
        v-if="isWinner && !state.bonusTokenClaimed"
        class="btn primary"
        type="button"
        @click="emit('claim')"
      >
        Claim a reward token
      </button>
      <p
        v-else-if="state.bonusTokenClaimed"
        class="muted small"
      >
        Reward token banked.
      </p>
      <p
        v-else
        class="muted small"
      >
        Waiting on {{ winner.name }} to claim…
      </p>
    </template>
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
.award-row { flex-wrap: wrap; }
.winner-line { margin: 0.25rem 0; }
</style>
