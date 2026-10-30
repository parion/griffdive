<script setup lang="ts">
import {
  bonusFor,
  bonusIneligibilityReason,
  bonusWinners,
  honorsDue,
} from '~~/shared/engine/selectors'
import type { DiveState } from '~~/shared/engine/types'
import { HONORS_AUTO_ROLL_MS } from '~/utils/motion'

// Squad Honors on the climbs page: the stat is rolled by the host's client a
// beat after the page lands, then the host names whoever leads it on HD2's
// stats screen. The engine owns eligibility; this only presents the ceremony.
const props = defineProps<{
  state: DiveState
  isHost: boolean
}>()

const emit = defineEmits<{
  spinBonus: []
  awardBonus: [playerIds: string[]]
}>()

const due = computed(() => honorsDue(props.state))
const stat = computed(() => bonusFor(props.state))
const winners = computed(() => bonusWinners(props.state))
const awarded = computed(() => winners.value.length > 0)
const rolled = computed(() => props.state.bonusSeed !== null)
const needsRoll = computed(() => due.value && !rolled.value)
const reason = computed(() => bonusIneligibilityReason(props.state) ?? 'Not this mission.')
const hostName = computed(() =>
  upperName(props.state.divers.find(diver => diver.id === props.state.hostId)?.name) ?? 'The host')
const reelLanded = ref(false)
watch(rolled, (value) => {
  if (!value) {
    reelLanded.value = false
  }
})

let rollTimer: ReturnType<typeof setTimeout> | undefined
const reduced = import.meta.client
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches
watch(
  () => props.isHost && needsRoll.value,
  (rollNow) => {
    clearTimeout(rollTimer)
    if (rollNow) {
      rollTimer = setTimeout(() => emit('spinBonus'), reduced ? 250 : HONORS_AUTO_ROLL_MS)
    }
  },
  { immediate: true },
)
onBeforeUnmount(() => clearTimeout(rollTimer))

const picking = ref<string[]>([])
const canAward = computed(() =>
  props.isHost && rolled.value && !awarded.value && reelLanded.value)
const seated = computed(() => props.state.divers.filter(diver => !diver.away))

function togglePick(diverId: string): void {
  picking.value = picking.value.includes(diverId)
    ? picking.value.filter(id => id !== diverId)
    : [...picking.value, diverId]
}

function award(): void {
  if (picking.value.length === 0) {
    return
  }
  emit('awardBonus', picking.value)
  picking.value = []
}
</script>

<template>
  <section
    class="honors"
    :class="{ live: due || awarded }"
    aria-label="Squad Honors"
  >
    <div class="honors-id">
      <span
        class="hex"
        aria-hidden="true"
      >1</span>
      <span class="honors-copy">
        <span class="disp">Squad Honors</span>
        <span class="tiny">
          {{ awarded ? 'Token banked' : !due ? 'Not this mission' : needsRoll ? 'Rolling the stat…' : reelLanded ? 'Read the stats screen' : 'Stat drawn' }}
        </span>
      </span>
      <button
        v-if="isHost && needsRoll"
        class="roll"
        type="button"
        @click="emit('spinBonus')"
      >
        Roll now
      </button>
    </div>

    <div
      v-if="due || awarded"
      class="reel-slot"
    >
      <HonorsReel
        :stat="stat"
        @landed="reelLanded = true"
      />
    </div>
    <p
      v-else
      class="off"
    >
      {{ reason }}
    </p>

    <div
      v-if="canAward"
      class="pick"
    >
      <p class="pick-note">
        Whoever leads <b>{{ stat?.label }}</b> on the stats screen takes the token. Ties share it.
      </p>
      <div class="pick-row">
        <button
          v-for="diver in seated"
          :key="diver.id"
          class="winner"
          type="button"
          :aria-pressed="picking.includes(diver.id)"
          :aria-label="`Award Squad Honors token to ${diver.name}`"
          @click="togglePick(diver.id)"
        >
          {{ upperName(diver.name) }}
        </button>
        <button
          class="award"
          type="button"
          :disabled="picking.length === 0"
          @click="award"
        >
          Award{{ picking.length > 1 ? ` ${picking.length}` : '' }}
        </button>
      </div>
    </div>
    <p
      v-else-if="rolled && !awarded && reelLanded"
      class="pick-note"
    >
      {{ hostName }} is naming the winner from the stats screen.
    </p>
    <p
      v-else-if="awarded"
      class="pick-note done"
    >
      {{ winners.map(diver => upperName(diver.name)).join(' · ') }} banked a reward token.
    </p>
  </section>
</template>

<style scoped>
.honors {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  background: var(--raised);
  box-shadow: inset 0 0 0 1px var(--line-3);
}
.honors > * { flex-shrink: 0; }
.honors.live { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--gold) 45%, var(--line-3)); }
.honors-id { display: flex; align-items: center; gap: 12px; }
.hex {
  display: grid;
  place-items: center;
  width: 34px;
  height: 38px;
  background: var(--gold);
  color: var(--on-gold);
  font: 800 16px var(--font-display);
  clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
}
.honors-copy { display: flex; flex-direction: column; gap: 2px; }
.honors-copy .disp { font-size: 18px; }
.tiny { color: var(--muted); font-size: 11px; }
.off { margin: 0; color: var(--muted); font-size: var(--fs-sm); }
/* The reel is built for a flex row; a plain block slot keeps its 3-row height. */
.reel-slot { display: block; }
.pick { display: flex; flex-direction: column; gap: 8px; }
.pick-note { margin: 0; color: var(--muted); font-size: var(--fs-sm); }
.pick-note b { color: var(--gold); }
.pick-note.done { color: var(--teal); }
.pick-row { display: flex; flex-wrap: wrap; gap: 8px; }
.winner,
.roll,
.award {
  min-height: 40px;
  padding: 0 14px;
  border: 0;
  background: transparent;
  color: var(--khaki);
  font: 700 12px var(--font-body);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  box-shadow: inset 0 0 0 1px var(--line-4);
}
.winner[aria-pressed='true'] { background: color-mix(in srgb, var(--gold) 18%, transparent); color: var(--gold); box-shadow: inset 0 0 0 1px var(--gold); }
.roll { min-height: 30px; margin-left: auto; padding: 0 10px; font-size: 10px; }
.award { background: var(--gold); color: var(--on-gold); box-shadow: none; }
.award:disabled { background: var(--raised); color: var(--dim); box-shadow: inset 0 0 0 1px var(--line-3); cursor: not-allowed; }
</style>
