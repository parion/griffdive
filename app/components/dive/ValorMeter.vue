<script setup lang="ts">
import { ProgressRoot } from 'reka-ui'
import { VALOR_METER_MAX, baseTierFor } from '~~/shared/engine/config'
import { ceilingRange } from '~~/shared/engine/selectors'
import { valorOf } from '~~/shared/engine/rewards'
import type { RewardTier } from '~~/shared/engine/types'

const props = withDefaults(defineProps<{
  difficulty: number
  teamRisk: number
  pactRisk: number
  // The small squad-level term from the mission just reported; zero in the
  // pacts window (the previous report is cleared on advance).
  performance?: number
  // Locked: pacts are committed and the dive is live — the gauge reads the
  // diver's actual Valor and drops live as failed pacts void their risk.
  locked?: boolean
}>(), { performance: 0, locked: false })

const LADDER: readonly RewardTier[] = ['C', 'B', 'A', 'S', 'S+']

const valor = computed(() => valorOf(props.teamRisk, props.pactRisk, props.performance))
// The gauge is fixed at the meter top (11): Valor past it can't be shown, it
// "breaks" the gauge and banks as Luck that lifts the top-rung odds.
const scale = VALOR_METER_MAX
const overflow = computed(() => Math.max(0, valor.value - VALOR_METER_MAX))
const range = computed(() =>
  ceilingRange(props.difficulty, props.teamRisk, props.pactRisk, props.performance))

const ratio = computed(() => Math.min(1, valor.value / scale))
const clamped = computed(() => Math.min(valor.value, scale))

type CellSource = 'empty' | 'team' | 'pact' | 'performance'
interface ValorCell {
  key: number
  source: CellSource
  amount: number
}

// One cell per meter point, colored by the source that owns it. Team and pact
// risk are whole numbers, so only the trailing performance cell is ever
// partial — it fills its cell by the fractional share.
const cells = computed<ValorCell[]>(() => {
  const teamEnd = props.teamRisk
  const pactEnd = props.teamRisk + props.pactRisk
  return Array.from({ length: scale }, (_, index) => {
    const source: CellSource
      = index < teamEnd ? 'team' : index < pactEnd ? 'pact' : 'performance'
    const amount = Math.min(1, Math.max(0, valor.value - index))
    return { key: index, source: amount > 0 ? source : 'empty', amount }
  })
})

function cellClass(cell: ValorCell): (string | false)[] {
  return [
    cell.source !== 'empty' && `cell-${cell.source}`,
    cell.amount >= 1 && 'filled',
    cell.amount > 0 && cell.amount < 1 && 'partial',
  ]
}

function cellStyle(cell: ValorCell): { '--fill'?: string } {
  return cell.amount > 0 && cell.amount < 1
    ? { '--fill': `${cell.amount * 100}%` }
    : {}
}

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
const rungs = computed(() =>
  LADDER.slice(baseIndex.value).map((tier, offset) => {
    const index = baseIndex.value + offset
    return { tier, lit: index <= maxIndex.value, top: index === maxIndex.value }
  }),
)

const reaching = computed(() => range.value.max !== range.value.min)
const oddsPct = computed(() => Math.round(range.value.odds * 100))
const ceilingLabel = computed(() =>
  reaching.value
    ? `Base ceiling ${baseTier.value}, up to ${range.value.max} at about ${oddsPct.value}% odds`
    : `Base ceiling ${baseTier.value}, no Valor staked`,
)
</script>

<template>
  <section
    class="valor"
    :class="{ locked: props.locked }"
    :style="{ '--heat': ratio }"
  >
    <div class="valor-head">
      <AppTooltip content="Valor stacks the risk you chose: team risk, your pacts, and a small performance bonus. More Valor raises the reward-tier odds.">
        <span
          class="valor-title lbl"
          tabindex="0"
        >Valor</span>
      </AppTooltip>
      <span class="valor-value disp">{{ format(valor) }}</span>
      <span class="valor-scale">/ {{ format(scale) }}</span>
      <span
        v-if="props.locked"
        class="chip gold locked-chip"
      >Locked</span>
    </div>

    <ProgressRoot
      class="gauge"
      :model-value="clamped"
      :max="scale"
      :get-value-label="() => 'Valor'"
      :get-value-text="() => valueText"
    >
      <span
        v-for="cell in cells"
        :key="cell.key"
        class="cell"
        :class="cellClass(cell)"
        :style="cellStyle(cell)"
        aria-hidden="true"
      />
      <span
        class="tip"
        :style="{ left: `${ratio * 100}%` }"
        aria-hidden="true"
      />
    </ProgressRoot>

    <div class="valor-breakdown cap">
      <span
        v-if="props.teamRisk"
        class="tag team"
      >Team +{{ format(props.teamRisk) }}</span>
      <span
        v-if="props.pactRisk"
        class="tag pact"
      >Pacts +{{ format(props.pactRisk) }}</span>
      <span
        v-if="props.performance"
        class="tag performance"
      >Perf +{{ format(props.performance) }}</span>
      <span
        v-if="overflow > 0"
        class="tag overflow"
      >Meter broken · +{{ format(overflow) }} Luck</span>
      <span
        v-if="!valor"
        class="muted"
      >No Valor staked — a safe dive</span>
    </div>

    <AppTooltip content="Your reward ceiling is the best tier this Valor can roll — risk buys odds, never a guarantee.">
      <div
        class="ceiling"
        role="img"
        :aria-label="ceilingLabel"
        tabindex="0"
      >
        <span class="lbl">Ceiling</span>
        <span class="rungs">
          <template
            v-for="(rung, index) in rungs"
            :key="rung.tier"
          >
            <span
              v-if="index > 0"
              class="link"
              :class="{ lit: rung.lit }"
              aria-hidden="true"
            />
            <TierBadge
              :tier="rung.tier"
              size="sm"
              class="rung"
              :class="{ lit: rung.lit, top: rung.top }"
            />
          </template>
        </span>
        <span class="odds cap">
          <template v-if="reaching">~{{ oddsPct }}% · {{ range.max }}</template>
          <template v-else>guaranteed</template>
        </span>
      </div>
    </AppTooltip>

    <p
      v-if="!props.locked"
      class="hint muted cap"
    >
      Chosen risk buys odds, never a guarantee.
    </p>
  </section>
</template>

<style scoped>
.valor {
  --heat: 0;
  display: grid;
  gap: 0.5rem;
  padding: 0.75rem 0.85rem 0.85rem;
  border: 1px solid var(--line-2);
  background: var(--panel);
  transition: border-color var(--dur-med) var(--ease-out);
}

.valor.locked {
  border-color: color-mix(in srgb, var(--gold) 55%, var(--line-2));
}

.valor-head {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.valor-title {
  color: var(--gold);
}

.valor-value {
  font-size: 2rem;
  line-height: 0.9;
  color: color-mix(in srgb, var(--gold) calc(55% + var(--heat) * 45%), var(--text));
  text-shadow: 0 0 calc(var(--heat) * 16px) color-mix(in srgb, var(--red) calc(var(--heat) * 85%), transparent);
  transition: color var(--dur-med) var(--ease-out), text-shadow var(--dur-med) var(--ease-out);
}

.valor-scale {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--dim);
}

.locked-chip {
  margin-left: auto;
}

/* The gauge: an 11-cell meter whose cells stack team risk, pacts and
   performance; the tip glows brighter the more Valor is staked. Reka's
   ProgressRoot owns the accessible progressbar semantics — the cells and tip
   are purely visual. */
.gauge {
  position: relative;
  display: flex;
  gap: 3px;
  height: 1.1rem;
}

.cell {
  flex: 1 1 0;
  min-width: 0;
  background: var(--raised);
  border: 1px solid var(--line-2);
  transition: background-color var(--dur-med), border-color var(--dur-med);
}

.cell-team { --c: var(--gold); }
.cell-pact { --c: var(--red); }
.cell-performance { --c: var(--teal); }

.cell.filled {
  background: var(--c);
  border-color: color-mix(in srgb, var(--c) 60%, var(--line-2));
}

.cell.partial {
  background: linear-gradient(90deg, var(--c) 0 var(--fill), var(--raised) var(--fill));
  border-color: color-mix(in srgb, var(--c) 45%, var(--line-2));
}

.tip {
  position: absolute;
  top: 50%;
  translate: -50% -50%;
  width: 0.95rem;
  height: 0.95rem;
  border-radius: 50%;
  background: radial-gradient(circle, #fff6c8 0%, var(--gold) 42%, transparent 72%);
  opacity: var(--heat);
  pointer-events: none;
  animation: valor-burn 1.3s ease-in-out infinite;
  transition: left var(--dur-med) var(--ease-out), opacity var(--dur-med) var(--ease-out);
}

@keyframes valor-burn {
  0%, 100% { scale: 1; filter: brightness(1); }
  50% { scale: 1.4; filter: brightness(1.6); }
}

.valor-breakdown {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.tag {
  padding: 0 0.35rem;
  font-size: 10px;
  font-weight: 700;
  border: 1px solid currentColor;
}

.tag.team { color: var(--gold); background: color-mix(in srgb, var(--gold) 10%, transparent); }
.tag.pact { color: var(--red); background: color-mix(in srgb, var(--red) 10%, transparent); }
.tag.performance { color: var(--teal); background: color-mix(in srgb, var(--teal) 10%, transparent); }
.tag.overflow {
  color: var(--red);
  background: color-mix(in srgb, var(--red) 16%, transparent);
  animation: break-pulse 1.1s ease-in-out infinite;
}

@keyframes break-pulse {
  0%, 100% { opacity: 0.72; }
  50% { opacity: 1; }
}

.ceiling {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.rungs {
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
}

.rung {
  opacity: 0.32;
  filter: grayscale(1);
  transition: opacity var(--dur-med) var(--ease-out), filter var(--dur-med) var(--ease-out), scale var(--dur-med) var(--ease-snap);
}

.rung.lit { opacity: 1; filter: none; }
.rung.top { scale: 1.12; }

.link {
  width: 0.55rem;
  height: 2px;
  background: var(--line-2);
  transition: background var(--dur-med) var(--ease-out);
}

.link.lit { background: color-mix(in srgb, var(--gold) 70%, var(--line-2)); }

.odds {
  margin-left: auto;
  color: var(--khaki);
}

.hint { margin: 0; }
</style>
