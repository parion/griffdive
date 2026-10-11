<script setup lang="ts">
import { VALOR_METER_MAX, baseTierFor } from '~~/shared/engine/config'
import { ceilingRange } from '~~/shared/engine/selectors'
import { oddsToReach, valorOf } from '~~/shared/engine/rewards'
import type { RewardTier } from '~~/shared/engine/types'
import { valorSegments } from '~/utils/valor'

const props = withDefaults(defineProps<{
  difficulty: number
  teamRisk: number
  pactRisk: number
  locked?: boolean
  diverName?: string
  pendingText?: string
  // The team-risk split, when the caller has it: the design's legend reads
  // Misfortune / Strain / Pacts rather than one "Team" row.
  misfortuneRisk?: number
  strainRisk?: number
  majorOrderRisk?: number
  // The run-long mode's flat Valor (SEAF Support Package / Super Penance) and
  // its label, when the caller has the split.
  modeRisk?: number
  modeLabel?: string
}>(), {
  locked: false,
  diverName: '',
  pendingText: '',
  misfortuneRisk: undefined,
  strainRisk: undefined,
  majorOrderRisk: undefined,
  modeRisk: undefined,
  modeLabel: undefined,
})

const LADDER: readonly RewardTier[] = ['C', 'B', 'A', 'S', 'S+']

const valor = computed(() => valorOf(props.teamRisk, props.pactRisk))
const scale = VALOR_METER_MAX
const overflow = computed(() => Math.max(0, valor.value - VALOR_METER_MAX))
const range = computed(() =>
  ceilingRange(props.difficulty, props.teamRisk, props.pactRisk))

const segments = computed(() => valorSegments(props))

interface ValorCell {
  key: number
  color: string | null
  amount: number
}

// One cell per meter point, filled from the bottom in legend order so the
// gauge stacks the sources legibly.
const cells = computed<ValorCell[]>(() => {
  const bounds: { end: number, color: string }[] = []
  let end = 0
  for (const segment of segments.value) {
    end += segment.value
    bounds.push({ end, color: segment.color })
  }
  const bottomUp = Array.from({ length: scale }, (_, index): ValorCell => {
    const amount = Math.min(1, Math.max(0, valor.value - index))
    const color = bounds.find(bound => index < bound.end)?.color ?? null
    return { key: index, color: amount > 0 ? color : null, amount }
  })
  return bottomUp.reverse()
})

function format(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

const valueText = computed(() =>
  overflow.value > 0
    ? `${format(valor.value)} Valor — meter broken, +${format(overflow.value)} Luck`
    : `${format(valor.value)} of ${format(scale)} Valor`)

const baseTier = computed(() => baseTierFor(props.difficulty))
const baseIndex = computed(() => LADDER.indexOf(baseTier.value))
const maxIndex = computed(() => LADDER.indexOf(range.value.max))

// Top-down S+ → C, matching the design's odds ladder.
const rungs = computed(() => LADDER.map((tier, index) => {
  const reachable = index > baseIndex.value
  const odds = reachable ? oddsToReach(props.difficulty, valor.value, tier) : 1
  return {
    tier,
    below: index < baseIndex.value,
    isBase: index === baseIndex.value,
    lit: index >= baseIndex.value && index <= maxIndex.value,
    pct: reachable ? Math.round(odds * 100) : 100,
    odds,
  }
}).reverse())

const legend = computed(() => {
  const rows: { id: string, name: string, value: number, color: string }[] = segments.value
    .filter(segment => segment.always || segment.value > 0)
  if (overflow.value > 0) {
    rows.push({ id: 'luck', name: 'Luck', value: overflow.value, color: 'var(--purple)' })
  }
  return rows
})
</script>

<template>
  <section class="valor-rail">
    <div class="head">
      <span class="lbl title">Valor<span v-if="diverName"> · {{ diverName }}</span></span>
      <span
        v-if="pendingText"
        class="hazard-soft pending"
      >{{ pendingText }}</span>
      <span
        v-else-if="locked"
        class="chip gold locked"
      >Locked</span>
    </div>

    <div class="big">
      <ValorFigure
        class="disp value"
        :value="format(valor)"
      />
      <span class="scale">/ {{ format(scale) }}</span>
      <span
        v-if="overflow > 0"
        class="luck-chip"
      >+{{ format(overflow) }} Luck</span>
    </div>

    <div class="grid">
      <div
        role="progressbar"
        aria-label="Valor"
        aria-valuemin="0"
        :aria-valuemax="scale"
        :aria-valuenow="valor"
        :aria-valuetext="valueText"
        class="cells"
      >
        <span
          v-for="cell in cells"
          :key="cell.key"
          class="cell"
          :class="{ on: cell.color, partial: cell.amount > 0 && cell.amount < 1 }"
          :style="cell.color ? { '--seg': cell.color, '--fill': `${cell.amount * 100}%` } : undefined"
        />
      </div>

      <div class="odds">
        <span class="lbl odds-h">Ceiling odds</span>
        <div
          v-for="r in rungs"
          :key="r.tier"
          class="rung"
          :class="{ below: r.below, lit: r.lit }"
        >
          <div class="rung-row">
            <TierBadge
              :tier="r.tier"
              size="sm"
              class="rung-t"
            />
            <span class="rung-pct">{{ r.below ? 'FLOOR' : r.isBase ? 'BASE' : `${r.pct}%` }}</span>
          </div>
          <div class="rung-bar">
            <i :style="{ width: r.below ? '0%' : `${Math.max(2, r.odds * 100)}%` }" />
          </div>
        </div>
      </div>
    </div>

    <div class="legend">
      <div
        v-for="l in legend"
        :key="l.id"
        class="legend-row"
        :class="{ zero: l.value <= 0 }"
      >
        <span
          class="swatch"
          :style="{ background: l.color }"
          aria-hidden="true"
        />
        <span>{{ l.name }}</span>
        <span class="legend-v">{{ format(l.value) }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.valor-rail { display: flex; flex-direction: column; gap: 14px; }

.head { display: flex; align-items: center; justify-content: space-between; gap: 8px; height: 20px; }
.title { font-size: 10px; color: var(--muted); }
.pending {
  padding: 3px 7px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: var(--gold);
  white-space: nowrap;
  text-transform: uppercase;
}
.locked { font-size: 9px; }

.big { display: flex; align-items: baseline; gap: 6px; }
.value { font-size: clamp(2.4rem, 5vw, 3.6rem); color: var(--gold); line-height: 1; }
.scale { font-size: 14px; font-weight: 700; color: var(--ghost-ink); }
.luck-chip {
  margin-left: auto;
  padding: 2px 6px;
  border: 1px solid var(--purple);
  color: var(--purple);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.grid { display: grid; grid-template-columns: 44px 1fr; gap: 16px; }
.cells {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 3px;
  border: 1px solid var(--line-2);
  height: 100%;
}
.cell { height: 25px; background: var(--ground); border: 1px solid var(--line-1); }
.cell.on { background: var(--seg); border-color: var(--seg); }
.cell.partial {
  background: linear-gradient(to top, var(--seg) var(--fill, 50%), var(--ground) var(--fill, 50%));
}

.odds { display: flex; flex-direction: column; gap: 8px; }
.odds-h { font-size: 10px; }
.rung { display: flex; flex-direction: column; gap: 4px; opacity: 0.55; }
.rung.lit { opacity: 1; }
.rung.below { opacity: 0.3; }
.rung-row { display: flex; align-items: center; gap: 10px; }
.rung-t {
  min-width: 34px;
  height: 26px;
  font-size: 13px;
  background: var(--ground);
}
.rung-pct { margin-left: auto; font-size: 15px; font-weight: 700; color: var(--text); }
.rung.below .rung-pct { color: var(--line-5); }
.rung-bar { height: 4px; background: var(--raised); }
.rung-bar i { display: block; height: 4px; background: currentColor; transition: width 0.5s var(--ease-out); }

.legend {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding-top: 12px;
  border-top: 1px solid var(--line-1);
}
.legend-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--khaki);
}
.legend-v { margin-left: auto; color: var(--text); }
.swatch { width: 10px; height: 10px; flex-shrink: 0; }
</style>
