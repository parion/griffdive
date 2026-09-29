<script setup lang="ts">
import { baseTierFor } from '~~/shared/engine/config'
import { oddsToReach, valorOf } from '~~/shared/engine/rewards'
import type { RewardTier } from '~~/shared/engine/types'

const props = withDefaults(defineProps<{
  difficulty: number
  ceiling: RewardTier
  settled: boolean
  teamRisk: number
  pactRisk: number
  performance?: number
  rerolled?: boolean
}>(), { performance: 0, rerolled: false })

const LADDER: readonly RewardTier[] = ['C', 'B', 'A', 'S', 'S+']

const baseTier = computed(() => baseTierFor(props.difficulty))
const baseIndex = computed(() => LADDER.indexOf(baseTier.value))
const valor = computed(() => valorOf(props.teamRisk, props.pactRisk, props.performance))
const ceilingIndex = computed(() => Math.max(baseIndex.value, LADDER.indexOf(props.ceiling)))
// Four nodes at most, but always wide enough to land the marker on the ceiling
// node: a C base reaching S+ needs the fifth node or the marker runs off the
// track (the low-band, max-risk case).
const nodes = computed(() => {
  const end = Math.max(baseIndex.value + 4, ceilingIndex.value + 1)
  return LADDER.slice(baseIndex.value, end)
})
const markerIndex = computed(() => ceilingIndex.value - baseIndex.value)

interface NodeState {
  tier: RewardTier
  base: boolean
  ok: boolean
  miss: boolean
}

const nodeStates = computed<NodeState[]>(() =>
  nodes.value.map((tier, i) => {
    const abs = baseIndex.value + i
    return {
      tier,
      base: i === 0,
      ok: abs <= ceilingIndex.value,
      miss: abs === ceilingIndex.value + 1,
    }
  }))

interface LinkState {
  tier: RewardTier
  pct: number
  win: boolean
}

// Per-step chance is the marginal of the chain: reach(target) / reach(from).
// The engine owns the math (`oddsToReach`); this only divides it for display.
const linkStates = computed<LinkState[]>(() =>
  nodes.value.slice(1).map((tier, k) => {
    const from = nodes.value[k]!
    const start = oddsToReach(props.difficulty, valor.value, from) || 1
    const end = oddsToReach(props.difficulty, valor.value, tier)
    const abs = baseIndex.value + k + 1
    return {
      tier,
      pct: Math.round(Math.min(1, Math.max(0, end / start)) * 100),
      win: abs <= ceilingIndex.value,
    }
  }))

const trackLabel = computed(() => {
  if (!props.settled) {
    return `Rolling the ceiling from base tier ${baseTier.value}`
  }
  const stops = nodeStates.value.filter(node => node.ok).map(node => node.tier).join(' to ')
  return `Ceiling climbed ${baseTier.value} to ${stops}. Ceiling ${props.ceiling}.`
})

function format(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

function tierVar(tier: RewardTier): string {
  return tier === 'S+' ? 'var(--tier-splus)' : `var(--tier-${tier.toLowerCase()})`
}
</script>

<template>
  <section
    class="ceiling-panel"
    aria-label="Ceiling roll"
  >
    <header class="ceiling-head">
      <span class="lbl head-title">Ceiling roll</span>
      <span class="head-note">VALOR {{ format(valor) }} · CHANCE PER STEP</span>
      <span
        v-if="settled"
        class="stamp disp ceiling-stamp"
      >Ceiling · {{ ceiling }}</span>
      <span
        v-else
        class="lbl pulse climbing"
      >Climbing</span>
    </header>

    <div
      class="track"
      :style="{ '--span': `calc((100% - 64px) / ${Math.max(1, nodes.length - 1)})` }"
      role="img"
      :aria-label="trackLabel"
    >
      <span
        v-for="(node, i) in nodeStates"
        :key="node.tier"
        class="node"
        :class="{ base: node.base, ok: settled && node.ok, miss: settled && node.miss, pending: !settled || (!node.ok && !node.miss) }"
        :data-tier="node.tier"
        :style="{ 'left': `calc(${i} * var(--span) + 32px)`, '--tier': tierVar(node.tier) }"
      >
        <span class="node-tier disp">{{ node.tier }}</span>
        <span
          v-if="node.base"
          class="node-base"
        >BASE</span>
        <span
          v-if="settled && node.ok"
          class="node-mark"
          aria-hidden="true"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="3.4"
          ><path d="M5 12l5 5 9-10" /></svg>
        </span>
        <span
          v-else-if="settled && node.miss"
          class="node-mark miss"
          aria-hidden="true"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="3.6"
          ><path d="M6 6l12 12M18 6L6 18" /></svg>
        </span>
      </span>

      <span
        v-for="(link, i) in linkStates"
        :key="`${link.tier}-link`"
        class="link"
        :style="{ 'left': `calc(${i} * var(--span) + 64px)`, 'width': `calc(var(--span) - 64px)`, '--tier': tierVar(link.tier) }"
      >
        <span
          class="link-line"
          :class="{ tried: settled, win: link.win, miss: settled && !link.win }"
        />
        <span
          class="link-pct"
          :class="{ win: settled && link.win, miss: settled && !link.win }"
        >{{ link.pct }}%</span>
      </span>

      <span
        class="marker"
        aria-hidden="true"
        :style="{ left: `calc(${markerIndex} * var(--span) + 32px)` }"
      />
    </div>
  </section>
</template>

<style scoped>
.ceiling-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem 1.1rem 0.4rem;
  border: 1px solid var(--line-2);
  background: var(--panel);
}

.ceiling-head {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}
.head-title { color: var(--text); }
.head-note {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: var(--muted);
}
.ceiling-stamp {
  margin-left: auto;
  padding: 10px 18px;
  font-size: 26px;
  border: 3px solid var(--gold);
  color: var(--gold);
  background: color-mix(in srgb, var(--gold) 6%, transparent);
}
.climbing { margin-left: auto; color: var(--khaki); }

.track {
  position: relative;
  width: 100%;
  max-width: 514px;
  height: 84px;
  flex-shrink: 0;
}

.node {
  position: absolute;
  top: 0;
  width: 64px;
  height: 64px;
  margin-left: -32px;
  display: grid;
  place-items: center;
  border: 2px solid var(--line-4);
  background: transparent;
  color: var(--dim);
  transition: border-color var(--dur-med) var(--ease-out), background-color var(--dur-med) var(--ease-out), color var(--dur-med) var(--ease-out);
}
.node-tier { font-size: 1.5rem; }
.node.ok {
  border-color: var(--tier, var(--gold));
  background: color-mix(in srgb, var(--tier, var(--gold)) 14%, transparent);
  color: var(--tier, var(--gold));
  animation: flipIn 0.4s var(--ease-out) both;
}
.node.miss {
  border-style: dashed;
  border-color: var(--red);
  color: var(--dim);
  animation: shake 0.42s ease both;
}
.node.base { border-style: solid; }

.node-base {
  position: absolute;
  bottom: -1px;
  left: 50%;
  transform: translate(-50%, 50%);
  padding: 1px 5px;
  background: var(--panel);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: var(--tier, var(--teal));
}
.node-mark {
  position: absolute;
  top: -9px;
  right: -9px;
  width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  background: var(--tier, var(--gold));
  color: var(--on-gold);
}
.node-mark.miss { background: var(--red); }

.link {
  position: absolute;
  top: 31px;
  height: 2px;
}
.link-line {
  display: block;
  width: 0;
  height: 2px;
  background: var(--line-3);
  transition: width 0.32s ease-out, background-color var(--dur-med) var(--ease-out);
}
.link-line.tried { width: 100%; }
.link-line.tried.miss { width: 46%; background: var(--red); }
.link-line.win { background: var(--tier, var(--gold)); }

.link-pct {
  position: absolute;
  left: 50%;
  top: -12px;
  transform: translateX(-50%);
  padding: 4px 7px;
  background: var(--panel);
  border: 1px solid var(--line-2);
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  color: var(--muted);
  white-space: nowrap;
  transition: color 0.2s, border-color 0.2s;
}
.link-pct.win { color: var(--tier, var(--gold)); border-color: var(--tier, var(--gold)); }
.link-pct.miss { color: var(--red); border-color: var(--red); }

.marker {
  position: absolute;
  top: 72px;
  width: 0;
  display: flex;
  justify-content: center;
  transition: left 0.42s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.marker::before {
  content: '';
  width: 16px;
  height: 11px;
  margin-left: -8px;
  background: var(--gold);
  clip-path: polygon(50% 0, 100% 100%, 0 100%);
  filter: drop-shadow(0 0 6px color-mix(in srgb, var(--gold) 70%, transparent));
}
</style>
