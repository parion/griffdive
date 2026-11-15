<script setup lang="ts">
import { debriefReady } from '~~/shared/engine/selectors'
import type { DiverState, DiveState } from '~~/shared/engine/types'

// The debrief: the beat between the report and the roll. HD2's stats screen is
// up, so the squad settles everything it proves together — Squad Honors, then
// any rule marked broke — before the host deals the draft. Every mark here is
// final once DEAL_REWARDS lands, because the offer derives from them.
const props = defineProps<{
  state: DiveState
  self: DiverState | null
  selfId: string | null
  canControl: boolean
  phone?: boolean
}>()

const emit = defineEmits<{
  failPact: [playerId: string, pactId: string]
  failDirective: []
  spinBonus: []
  awardBonus: [playerIds: string[]]
  deal: []
}>()

const ready = computed(() => debriefReady(props.state))
const hostName = computed(() =>
  upperName(props.state.divers.find(diver => diver.id === props.state.hostId)?.name) ?? 'the host')
const ctaLabel = computed(() => {
  if (ready.value) {
    return 'Roll the loot'
  }
  return props.state.bonusSeed === null ? 'Rolling Squad Honors' : 'Name the Squad Honors winner'
})
</script>

<template>
  <section
    class="debrief"
    :class="{ phone }"
    aria-labelledby="debrief-h"
  >
    <header class="hero">
      <span class="kicker">Debrief</span>
      <h1
        id="debrief-h"
        class="disp title"
      >
        Read the stats screen
      </h1>
      <p class="lede">
        Settle honors and broken rules together. The loot rolls once the host calls it.
      </p>
    </header>

    <ClimbReport
      :state="state"
      :phone="phone"
    />

    <div class="check">
      <DebriefHonors
        :state="state"
        :is-host="canControl"
        @spin-bonus="emit('spinBonus')"
        @award-bonus="emit('awardBonus', $event)"
      />
      <DebriefStats
        :state="state"
        :self-id="selfId"
        :is-host="canControl"
        @fail-pact="(playerId, pactId) => emit('failPact', playerId, pactId)"
        @fail-directive="emit('failDirective')"
      />
    </div>

    <ClimbFoot
      :label="ctaLabel"
      :can-control="canControl"
      :waiting="`Waiting on ${hostName} to roll the loot`"
      :locked="!ready"
      :phone="phone"
      @go="emit('deal')"
    />
  </section>
</template>

<style scoped>
.debrief {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
}
.debrief > * { width: 100%; }
.hero { display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; }
.kicker {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--teal);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.24em;
  text-transform: uppercase;
}
.kicker::before,
.kicker::after {
  content: '';
  width: 22px;
  height: 2px;
  background: currentColor;
  box-shadow: 0 0 8px currentColor;
}
.title {
  margin: 0;
  font-size: clamp(34px, 4vw, 52px);
  text-shadow: 0 0 36px rgba(74, 215, 200, 0.16);
  animation: riseIn 0.45s var(--ease-out) both;
}
.lede { margin: 0; color: var(--muted); font-size: var(--fs-sm); }
.check {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  background: color-mix(in srgb, var(--rail) 88%, transparent);
  box-shadow: inset 0 0 0 1px var(--line-2);
  animation: deal-in 0.55s var(--ease-out) 0.15s both;
}
.check > * { flex-shrink: 0; }
.phone .check { padding: 12px; }
.phone .hero { align-items: flex-start; text-align: left; }
.phone .kicker::after { display: none; }
.phone .title { font-size: 34px; }
</style>
