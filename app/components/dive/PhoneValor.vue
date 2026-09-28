<script setup lang="ts">
import { VALOR_METER_MAX, baseTierFor } from '~~/shared/engine/config'
import { oddsToReach, valorOf } from '~~/shared/engine/rewards'
import { ceilingRange } from '~~/shared/engine/selectors'
import type { RewardTier } from '~~/shared/engine/types'

// The phone bottom sheet's compact Valor readout: the 11-cell gauge plus the
// tier-odds chips, sized for a 390px column. Same engine inputs as ValorMeter.
const props = withDefaults(defineProps<{
  difficulty: number
  teamRisk: number
  pactRisk: number
  performance?: number
  pendingText?: string
  locked?: boolean
}>(), { performance: 0, pendingText: '', locked: false })

const LADDER: readonly RewardTier[] = ['C', 'B', 'A', 'S', 'S+']

const valor = computed(() => valorOf(props.teamRisk, props.pactRisk, props.performance))
const scale = VALOR_METER_MAX
const overflow = computed(() => Math.max(0, valor.value - scale))
const range = computed(() =>
  ceilingRange(props.difficulty, props.teamRisk, props.pactRisk, props.performance))

type Source = 'empty' | 'team' | 'pact' | 'performance'
const SOURCE_COLOR: Readonly<Record<Source, string>> = {
  empty: 'var(--ground)',
  team: 'var(--gold)',
  pact: 'var(--orange)',
  performance: 'var(--teal)',
}
const cells = computed<{ key: number, source: Source, amount: number }[]>(() => {
  const teamEnd = props.teamRisk
  const pactEnd = props.teamRisk + props.pactRisk
  const bottomUp = Array.from({ length: scale }, (_, index) => {
    const amount = Math.min(1, Math.max(0, valor.value - index))
    const source: Source = amount <= 0
      ? 'empty'
      : index < teamEnd ? 'team' : index < pactEnd ? 'pact' : 'performance'
    return { key: index, source, amount }
  })
  return bottomUp.reverse()
})

// The chips carry the earned base rung plus every previewed step to the ceiling.
const baseIndex = computed(() => LADDER.indexOf(baseTierFor(props.difficulty)))
const maxIndex = computed(() => LADDER.indexOf(range.value.max))
const chips = computed(() => LADDER
  .map((tier, index) => ({ tier, index }))
  .filter(entry => entry.index >= baseIndex.value && entry.index <= maxIndex.value)
  .map(entry => ({
    tier: entry.tier,
    base: entry.index === baseIndex.value,
    top: entry.index === maxIndex.value && entry.index > baseIndex.value,
    pct: entry.index <= baseIndex.value ? 100 : Math.round(oddsToReach(props.difficulty, valor.value, entry.tier) * 100),
  })))

function format(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}
</script>

<template>
  <div class="phone-valor">
    <div class="head">
      <span class="lbl vlabel">Valor</span>
      <span class="disp value">{{ format(valor) }}</span>
      <span class="scale">/ {{ scale }}</span>
      <span
        v-if="overflow > 0"
        class="luck"
      >+{{ format(overflow) }} Luck</span>
      <span
        v-if="pendingText"
        class="pending"
      >{{ pendingText }}</span>
      <span
        v-else-if="locked"
        class="locked"
      >Locked</span>
    </div>

    <div
      class="cells"
      role="progressbar"
      aria-label="Valor"
      aria-valuemin="0"
      :aria-valuemax="scale"
      :aria-valuenow="valor"
      :aria-valuetext="`${format(valor)} of ${scale} Valor`"
    >
      <span
        v-for="cell in cells"
        :key="cell.key"
        class="cell"
        :class="[cell.source, { partial: cell.amount > 0 && cell.amount < 1 }]"
        :style="{ '--cell-color': SOURCE_COLOR[cell.source], '--fill': `${Math.round(cell.amount * 100)}%` }"
      />
    </div>

    <div
      v-if="chips.length"
      class="chips"
      role="list"
      aria-label="Ceiling odds"
    >
      <span
        v-for="c in chips"
        :key="c.tier"
        class="chip"
        :class="{ base: c.base, top: c.top }"
        role="listitem"
        :aria-label="`${c.tier}${c.base ? ', base tier' : ''}: ${c.pct} percent`"
      >
        <b class="disp">{{ c.tier }}</b>
        <i>{{ c.base ? 'BASE' : `${c.pct}%` }}</i>
      </span>
    </div>
  </div>
</template>

<style scoped>
.phone-valor { display: flex; flex-direction: column; gap: 7px; }

.head { display: flex; align-items: baseline; gap: 6px; min-width: 0; }
.vlabel { color: var(--gold); }
.value { font-size: 22px; color: var(--gold); line-height: 1; }
.scale { font-size: 11px; font-weight: 700; color: var(--dim); }
.luck {
  margin-left: 4px;
  padding: 2px 6px;
  border: 1px solid var(--purple);
  color: var(--purple);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
}
.pending,
.locked {
  margin-left: auto;
  padding: 3px 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  white-space: nowrap;
}
.pending { color: var(--gold); background-image: repeating-linear-gradient(-45deg, rgba(255, 214, 66, 0.28) 0 4px, transparent 4px 8px); }
.locked { color: var(--gold); border: 1px solid var(--gold); }

.cells { display: flex; gap: 3px; }
.cell {
  flex: 1 1 0;
  height: 10px;
  background: var(--ground);
  border: 1px solid var(--line-1);
}
.cell.team { background: var(--gold); border-color: var(--gold); }
.cell.pact { background: var(--orange); border-color: var(--orange); }
.cell.performance { background: var(--teal); border-color: var(--teal); }
.cell.partial {
  background: linear-gradient(to top, var(--cell-color) var(--fill, 50%), var(--ground) var(--fill, 50%));
  border-color: var(--cell-color);
}

.chips { display: flex; gap: 5px; }
.chip {
  flex: 1 1 0;
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  height: 24px;
  padding: 0 6px;
  border: 1px solid var(--line-2);
  background: var(--ground);
}
.chip b {
  display: inline-grid;
  place-items: center;
  min-width: 20px;
  height: 20px;
  font-size: 11px;
  color: var(--muted);
}
.chip i {
  margin-left: auto;
  font-style: normal;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--dim);
  white-space: nowrap;
}
.chip.base b { color: var(--text); }
.chip.top { border-color: var(--gold); }
.chip.top b,
.chip.top i { color: var(--gold); }
</style>
