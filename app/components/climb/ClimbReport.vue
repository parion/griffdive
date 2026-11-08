<script setup lang="ts">
import { maxStarsFor } from '~~/shared/engine/config'
import { missionHaul } from '~~/shared/engine/rewards'
import { activeMisfortune, activeStrain, currentFront } from '~~/shared/engine/selectors'
import type { DiveState } from '~~/shared/engine/types'

// The report's numbers, kept as a slim strip across the climbs page: stars, the
// clock, the sample haul and the credits it paid, then the mission's front,
// directive and strain.
const props = defineProps<{
  state: DiveState
  phone?: boolean
}>()

const report = computed(() => props.state.lastReport)
const maxStars = computed(() => maxStarsFor(props.state.difficulty))
const stars = computed(() => report.value?.stars ?? 0)
const haul = computed(() => missionHaul(report.value))
const front = computed(() => currentFront(props.state))
const directive = computed(() => activeMisfortune(props.state))
const strain = computed(() => (props.state.strainAccepted ? activeStrain(props.state) : null))

const SAMPLES = [
  { key: 'common', label: 'Common', icon: '/images/svgs/Common_Sample_Icon.svg' },
  { key: 'rare', label: 'Rare', icon: '/images/svgs/Rare_Sample_Icon.svg' },
  { key: 'super', label: 'Super', icon: '/images/svgs/Super_Sample_Icon.svg' },
] as const
const samples = computed(() => SAMPLES
  .map(row => ({ ...row, count: report.value?.samples?.[row.key] ?? 0 }))
  .filter(row => row.count > 0))
</script>

<template>
  <section
    class="strip"
    :class="{ phone }"
    aria-label="Mission report"
  >
    <div class="cell stars-cell">
      <span class="cap">Mission report</span>
      <div
        class="stars"
        role="img"
        :aria-label="`${stars} of ${maxStars} stars`"
      >
        <IconStar
          v-for="i in maxStars"
          :key="i"
          class="star"
          :class="{ on: i <= stars }"
        />
      </div>
    </div>

    <dl class="cell facts">
      <div
        v-if="report?.timePct !== undefined"
        class="fact"
      >
        <dt>Time left</dt>
        <dd class="disp">
          {{ report.timePct }}<small>%</small>
        </dd>
      </div>
      <div
        v-for="row in samples"
        :key="row.key"
        class="fact"
      >
        <dt>
          <img
            :src="row.icon"
            alt=""
            width="14"
            height="14"
          >
          {{ row.label }}
        </dt>
        <dd class="disp">
          {{ row.count }}
        </dd>
      </div>
      <div
        v-if="samples.length === 0"
        class="fact"
      >
        <dt>Samples</dt>
        <dd class="disp none">
          None
        </dd>
      </div>
      <div
        v-if="haul > 0"
        class="fact credits"
      >
        <dt>Credits</dt>
        <dd>
          <CreditAmount
            class="disp"
            :value="haul"
            signed
          />
        </dd>
      </div>
    </dl>

    <ul class="cell recap">
      <li v-if="front">
        <span>Front</span>
        <b>{{ front.displayName }}</b>
      </li>
      <li v-if="directive">
        <span>Directive</span>
        <b :class="{ broke: state.misfortuneFailed || state.misfortuneBroken }">{{ directive.name }}</b>
      </li>
      <li v-if="strain">
        <span>Strain</span>
        <b>{{ strain.name }}</b>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.strip {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) minmax(180px, 260px);
  align-items: stretch;
  gap: 0;
  background: var(--rail);
  box-shadow: inset 0 0 0 1px var(--line-2);
}
.cell { display: flex; min-width: 0; padding: 14px 18px; }
.cell + .cell { border-left: 1px solid var(--line-2); }
.stars-cell { flex-direction: column; justify-content: center; gap: 8px; }
.stars { display: flex; gap: 4px; }
.star { width: 26px; height: 26px; color: var(--line-4); }
.star.on { fill: currentColor; color: var(--gold); filter: drop-shadow(0 0 8px rgba(255, 214, 66, 0.4)); }
.facts { flex-wrap: wrap; align-items: center; gap: 10px 28px; margin: 0; }
.fact { display: flex; flex-direction: column; gap: 2px; }
.fact dt { display: inline-flex; align-items: center; gap: 6px; color: var(--muted); font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; }
.fact dd { margin: 0; font-size: 22px; line-height: 1.1; }
.fact dd small { color: var(--muted); font-size: 12px; }
.credits dd { color: var(--gold); }
.recap { flex-direction: column; justify-content: center; gap: 4px; margin: 0; list-style: none; }
.recap li { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; font-size: 12px; }
.recap span { color: var(--muted); }
.recap b { min-width: 0; color: var(--text); font-weight: 700; text-align: right; }
.recap b.broke { color: var(--red); }

.fact dd.none { color: var(--dim); font-size: 16px; }

/* Phones (and narrow windows) stack the three cells as tight rows. */
.strip.phone { display: flex; flex-wrap: wrap; }
.phone .cell { flex: 1 1 100%; padding: 10px 14px; }
.phone .cell + .cell { border-left: 0; border-top: 1px solid var(--line-2); }
.phone .stars-cell { flex-direction: row; align-items: center; justify-content: space-between; }
.phone .facts { gap: 8px 22px; }
.phone .fact dd { font-size: 20px; }
.phone .recap { flex-direction: row; flex-wrap: wrap; gap: 2px 18px; }
.phone .recap li { justify-content: flex-start; gap: 6px; }
@media (max-width: 760px) {
  .strip { display: flex; flex-wrap: wrap; }
  .cell { flex: 1 1 100%; padding: 10px 14px; }
  .cell + .cell { border-left: 0; border-top: 1px solid var(--line-2); }
  .stars-cell { flex-direction: row; align-items: center; justify-content: space-between; }
  .recap { flex-direction: row; flex-wrap: wrap; gap: 2px 18px; }
  .recap li { justify-content: flex-start; gap: 6px; }
}
</style>
