<script setup lang="ts">
import { ProgressIndicator, ProgressRoot } from 'reka-ui'
import { baseTierFor } from '~~/shared/engine/config'
import { ceilingRange, maxValorFor } from '~~/shared/engine/selectors'
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
// The scale is the most Valor this difficulty can actually stack, so the gauge
// fills toward a real ceiling rather than an arbitrary max.
const scale = computed(() => Math.max(1, maxValorFor(props.difficulty)))
const range = computed(() =>
  ceilingRange(props.difficulty, props.teamRisk, props.pactRisk, props.performance))

const ratio = computed(() => Math.min(1, valor.value / scale.value))
const fill = computed(() => Math.max(0, valor.value))
// Segments are laid out inside the filled indicator, so their widths are
// shares of the current Valor (not of the full scale).
function share(value: number): string {
  return `${fill.value > 0 ? (value / fill.value) * 100 : 0}%`
}

const teamWidth = computed(() => share(props.teamRisk))
const pactWidth = computed(() => share(props.pactRisk))
const performanceWidth = computed(() => share(props.performance))
const pactLeft = computed(() => share(props.teamRisk))
const performanceLeft = computed(() => share(props.teamRisk + props.pactRisk))

function format(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

const valueText = computed(() => `${format(valor.value)} of ${format(scale.value)} Valor`)

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
      <span class="valor-title">Valor</span>
      <span class="valor-value">{{ format(valor) }}</span>
    </div>
    <ProgressRoot
      class="gauge"
      :model-value="valor"
      :max="scale"
      :get-value-label="() => 'Valor'"
      :get-value-text="() => valueText"
    >
      <ProgressIndicator
        class="fill"
        :style="{ width: `${ratio * 100}%` }"
      >
        <span
          class="seg team"
          :style="{ width: teamWidth }"
        />
        <span
          class="seg pact"
          :style="{ width: pactWidth, left: pactLeft }"
        />
        <span
          class="seg performance"
          :style="{ width: performanceWidth, left: performanceLeft }"
        />
      </ProgressIndicator>
      <span
        class="tip"
        :style="{ left: `${ratio * 100}%` }"
        aria-hidden="true"
      />
    </ProgressRoot>
    <div class="valor-breakdown small">
      <span
        v-if="props.teamRisk"
        class="tag team"
      >Team +{{ props.teamRisk }}</span>
      <span
        v-if="props.pactRisk"
        class="tag pact"
      >Pacts +{{ props.pactRisk }}</span>
      <span
        v-if="props.performance"
        class="tag performance"
      >Performance +{{ format(props.performance) }}</span>
      <span
        v-if="!valor"
        class="muted"
      >No Valor staked — a safe dive</span>
      <span
        v-if="props.locked"
        class="chip locked-chip"
      >Locked in</span>
    </div>
    <div
      class="ceiling"
      role="img"
      :aria-label="ceilingLabel"
    >
      <span class="rungs">
        <template
          v-for="(rung, index) in rungs"
          :key="rung.tier"
        >
          <span
            v-if="index > 0"
            class="link"
            :class="{ lit: rung.lit }"
          />
          <TierBadge
            :tier="rung.tier"
            size="sm"
            class="rung"
            :class="{ lit: rung.lit, top: rung.top }"
          />
        </template>
      </span>
      <span class="odds small">
        <template v-if="reaching">~{{ oddsPct }}% to reach {{ range.max }}</template>
        <template v-else>guaranteed</template>
      </span>
    </div>
    <p
      v-if="!props.locked"
      class="hint muted small"
    >
      Chosen risk buys odds, never a guarantee.
    </p>
  </section>
</template>

<style scoped>
.valor {
  --heat: 0;
  display: grid;
  gap: 0.45rem;
  padding: 0.7rem 0.85rem;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg);
}

.valor-head { display: flex; align-items: baseline; gap: 0.5rem; }
.valor-title {
  font-family: var(--font-display);
  font-stretch: 125%;
  font-weight: 800;
  font-size: 0.85rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--gold);
}
.valor-value {
  margin-left: auto;
  font-family: var(--font-display);
  font-stretch: 125%;
  font-weight: 800;
  font-size: 1.55rem;
  line-height: 1;
  color: color-mix(in srgb, var(--gold) calc(55% + var(--heat) * 45%), var(--text));
  text-shadow: 0 0 calc(var(--heat) * 16px) color-mix(in srgb, var(--red) calc(var(--heat) * 85%), transparent);
  transition:
    color var(--dur-med) var(--ease-out),
    text-shadow var(--dur-med) var(--ease-out);
}

/* The gauge: a stacked fill (team risk, pacts, performance) whose tip glows
   brighter and pulses harder the more Valor is staked — the Hades heat read.
   Reka's ProgressRoot owns the accessible progressbar semantics; the indicator
   and its segments are purely visual. */
.gauge {
  position: relative;
  height: 0.72rem;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: color-mix(in srgb, var(--bg) 70%, #000);
  overflow: hidden;
}
.fill {
  position: absolute;
  inset: 0 auto 0 0;
  transition: width var(--dur-med) var(--ease-out);
}
.seg {
  position: absolute;
  top: 0;
  bottom: 0;
  transition:
    width var(--dur-med) var(--ease-out),
    left var(--dur-med) var(--ease-out);
}
.seg.team { left: 0; background: linear-gradient(90deg, var(--gold), color-mix(in srgb, var(--gold) 60%, var(--red))); }
.seg.pact { background: linear-gradient(90deg, color-mix(in srgb, var(--red) 75%, var(--gold)), var(--red)); }
.seg.performance { background: linear-gradient(90deg, color-mix(in srgb, var(--teal) 70%, var(--gold)), var(--teal)); }
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
  transition:
    left var(--dur-med) var(--ease-out),
    opacity var(--dur-med) var(--ease-out);
}
@keyframes valor-burn {
  0%, 100% { scale: 1; filter: brightness(1); }
  50% { scale: 1.4; filter: brightness(1.6); }
}

.valor-breakdown { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.tag {
  padding: 0 0.35rem;
  border-radius: 4px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-size: 0.68rem;
}
.tag.team { color: var(--gold); background: color-mix(in srgb, var(--gold) 14%, transparent); }
.tag.pact { color: var(--red); background: color-mix(in srgb, var(--red) 14%, transparent); }
.tag.performance { color: var(--teal); background: color-mix(in srgb, var(--teal) 14%, transparent); }
.locked-chip { color: var(--muted); }

.ceiling { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.rungs { display: inline-flex; align-items: center; gap: 0.28rem; }
.rung {
  opacity: 0.32;
  filter: grayscale(1);
  transition:
    opacity var(--dur-med) var(--ease-out),
    filter var(--dur-med) var(--ease-out),
    scale var(--dur-med) var(--ease-snap);
}
.rung.lit { opacity: 1; filter: none; }
.rung.top { scale: 1.12; }
.link {
  width: 0.55rem;
  height: 2px;
  background: var(--border);
  transition: background var(--dur-med) var(--ease-out);
}
.link.lit { background: color-mix(in srgb, var(--gold) 70%, var(--border)); }
.odds { margin-left: auto; color: var(--khaki); }
.hint { margin: 0; }
</style>
