<script setup lang="ts">
import { CEILING_LEAD, CEILING_STEP } from '~/utils/motion'
import { baseTierFor } from '~~/shared/engine/config'
import { oddsToReach, valorOf } from '~~/shared/engine/rewards'
import type { RewardTier } from '~~/shared/engine/types'

const props = withDefaults(defineProps<{
  difficulty: number
  ceiling: RewardTier
  teamRisk: number
  pactRisk: number
  // Skip the climb (a resolved draft, a reload): land on the ceiling at once.
  instant?: boolean
  // Bumped on every redraw so a reroll replays the climb.
  replayKey?: number
}>(), { instant: false, replayKey: 0 })

const LADDER: readonly RewardTier[] = ['C', 'B', 'A', 'S', 'S+']

const baseIndex = computed(() => LADDER.indexOf(baseTierFor(props.difficulty)))
const valor = computed(() => valorOf(props.teamRisk, props.pactRisk))
const ceilingIndex = computed(() => Math.max(baseIndex.value, LADDER.indexOf(props.ceiling)))
// Four nodes at most, but always wide enough to land on the ceiling node: a C
// base reaching S+ needs the fifth (the low-band, max-risk case).
const nodes = computed(() => {
  const end = Math.max(baseIndex.value + 4, ceilingIndex.value + 1)
  return LADDER.slice(baseIndex.value, end)
})
const target = computed(() => ceilingIndex.value - baseIndex.value)

// Per-step chance is the marginal of the chain: reach(target) / reach(from).
// The engine owns the math (`oddsToReach`); this only divides it for display.
const stepPcts = computed(() =>
  nodes.value.slice(1).map((tier, k) => {
    const start = oddsToReach(props.difficulty, valor.value, nodes.value[k]!) || 1
    const end = oddsToReach(props.difficulty, valor.value, tier)
    return Math.round(Math.min(1, Math.max(0, end / start)) * 100)
  }))

// Presentation only: the bar climbs one tier per beat up to the ceiling the
// engine already rolled, then the failed step stalls red.
const reached = ref(0)
const done = ref(false)
let timers: ReturnType<typeof setTimeout>[] = []

function clearTimers(): void {
  timers.forEach(clearTimeout)
  timers = []
}

function climb(): void {
  clearTimers()
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (props.instant || reduced) {
    reached.value = target.value
    done.value = true
    return
  }
  reached.value = 0
  done.value = false
  for (let step = 1; step <= target.value; step++) {
    timers.push(setTimeout(() => {
      reached.value = step
    }, CEILING_LEAD + step * CEILING_STEP))
  }
  timers.push(setTimeout(() => {
    done.value = true
  }, CEILING_LEAD + (target.value + 1) * CEILING_STEP))
}

onMounted(climb)
watch(() => [props.replayKey, props.ceiling], climb)
onBeforeUnmount(clearTimers)

function tierVar(tier: RewardTier): string {
  return tier === 'S+' ? 'var(--tier-splus)' : `var(--tier-${tier.toLowerCase()})`
}

function format(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

const trackLabel = computed(() => {
  const climbed = nodes.value.slice(0, target.value + 1).join(' to ')
  return `Ceiling roll at Valor ${format(valor.value)}: climbed ${climbed}. Ceiling ${props.ceiling}.`
})
</script>

<template>
  <div
    class="ceiling-track"
    :class="{ done }"
    role="img"
    :aria-label="trackLabel"
  >
    <template
      v-for="(tier, i) in nodes"
      :key="tier"
    >
      <span
        v-if="i > 0"
        class="link"
        :class="{
          win: i <= reached,
          miss: done && i === target + 1,
          idle: done && i > target + 1,
        }"
        :style="{ '--tier': tierVar(tier) }"
        aria-hidden="true"
      >
        <span class="link-fill" />
        <span class="link-pct">{{ stepPcts[i - 1] }}%</span>
      </span>
      <span
        class="node"
        :class="{
          base: i === 0,
          lit: i <= reached,
          head: i === reached,
          ceiling: done && i === target,
          miss: done && i === target + 1,
        }"
        :style="{ '--tier': tierVar(tier) }"
        aria-hidden="true"
      >
        <span class="disp node-tier">{{ tier }}</span>
      </span>
    </template>
  </div>
</template>

<style scoped>
.ceiling-track {
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 400px;
  padding-top: 16px;
}

.node {
  position: relative;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 2px solid var(--line-4);
  color: var(--dim);
  transition: border-color var(--dur-fast) var(--ease-out), background-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
}
.node-tier { font-size: 0.85rem; }
.node.lit {
  border-color: var(--tier);
  background: color-mix(in srgb, var(--tier) 16%, transparent);
  color: var(--tier);
  animation: node-pop 0.32s var(--ease-snap) both;
}
.node.base.lit { animation: none; }
/* The caret rides whichever node the bar has reached. */
.node.head::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -11px;
  width: 10px;
  height: 7px;
  margin-left: -5px;
  background: var(--tier);
  clip-path: polygon(50% 0, 100% 100%, 0 100%);
}
.node.ceiling {
  background: var(--tier);
  color: var(--on-gold);
  animation: node-land 0.5s var(--ease-snap) both, ceiling-glow 3.2s ease-in-out 0.5s infinite;
}
.node.miss {
  border-style: dashed;
  border-color: var(--red);
  animation: shake 0.42s ease both;
}

.link {
  position: relative;
  flex: 1 1 0;
  min-width: 14px;
  height: 4px;
  background: var(--line-2);
}
.link-fill {
  position: absolute;
  inset: 0;
  background: var(--tier);
  box-shadow: 0 0 8px color-mix(in srgb, var(--tier) 60%, transparent);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.36s cubic-bezier(0.45, 0, 0.2, 1);
}
.link.win .link-fill { transform: scaleX(1); }
.link.miss .link-fill {
  background: var(--red);
  box-shadow: none;
  transform: scaleX(0.42);
}
.link.idle { opacity: 0.5; }

.link-pct {
  position: absolute;
  left: 50%;
  bottom: 9px;
  transform: translateX(-50%);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1;
  color: var(--muted);
  white-space: nowrap;
  transition: color var(--dur-fast);
}
.link.win .link-pct { color: var(--tier); }
.link.miss .link-pct { color: var(--red); }

@keyframes node-pop {
  0% { transform: scale(0.82); filter: brightness(1.8); }
  60% { transform: scale(1.12); }
  100% { transform: none; filter: none; }
}
@keyframes node-land {
  0% { transform: scale(1.35); filter: brightness(2); }
  100% { transform: none; filter: none; }
}
@keyframes ceiling-glow {
  0%, 100% { box-shadow: 0 0 0 0 transparent; }
  50% { box-shadow: 0 0 14px 1px color-mix(in srgb, var(--tier) 55%, transparent); }
}
</style>
