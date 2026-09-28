<script setup lang="ts">
import { MISFORTUNE_RISK } from '~~/shared/engine/config'
import { deriveMisfortune, eligibleMisfortunes } from '~~/shared/engine/wheel'

const props = withDefaults(defineProps<{
  difficulty: number
  seed: number | null
  canControl?: boolean
  spinning?: boolean
}>(), { canControl: false, spinning: false })

const emit = defineEmits<{ spin: [] }>()

const SIZE = 460
const R = 226
const CX = SIZE / 2
const CY = SIZE / 2

const segments = computed(() =>
  eligibleMisfortunes(props.difficulty).map((misfortune) => {
    const risk = Math.min(5, Math.max(1, MISFORTUNE_RISK[misfortune.id] ?? 1))
    const tone = risk >= 4 ? 'var(--red)' : risk === 3 ? 'var(--orange)' : 'var(--khaki)'
    return { id: misfortune.id, name: misfortune.name, risk, tone }
  }))

const step = computed(() => (segments.value.length ? 360 / segments.value.length : 360))

function polar(radius: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180
  return [CX + radius * Math.cos(a), CY + radius * Math.sin(a)]
}

function slicePath(startDeg: number, endDeg: number): string {
  const [x1, y1] = polar(R, startDeg)
  const [x2, y2] = polar(R, endDeg)
  const large = endDeg - startDeg > 180 ? 1 : 0
  return `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`
}

const rotation = ref(0)

// Spins are seeds: every client derives the same misfortune from the same
// integer and lands the pointer on its segment. The wheel only ever turns
// forward, so a reroll always reads as a fresh spin.
watch(
  () => props.seed,
  (seed) => {
    if (seed === null) {
      rotation.value = 0
      return
    }
    const drawn = deriveMisfortune(seed, props.difficulty)
    const index = segments.value.findIndex(segment => segment.id === drawn.id)
    if (index < 0) {
      return
    }
    const angle = step.value
    let target = 360 * 5 - index * angle
    while (target <= rotation.value + 360) {
      target += 360
    }
    rotation.value = target
  },
  { immediate: true },
)

const hubLabel = computed(() => {
  if (props.spinning) return 'Drawing'
  if (props.seed === null) return props.canControl ? 'Spin' : 'Waiting'
  return 'Drawn'
})
</script>

<template>
  <div class="wheel-wrap">
    <div
      class="halo"
      aria-hidden="true"
    />
    <div
      class="rotor"
      :style="{ transform: `rotate(${rotation}deg)` }"
    >
      <svg
        :width="SIZE"
        :height="SIZE"
        :viewBox="`0 0 ${SIZE} ${SIZE}`"
        role="img"
        :aria-label="`Wheel of Misfortune, ${segments.length} misfortunes`"
      >
        <circle
          :cx="CX"
          :cy="CY"
          :r="R"
          fill="var(--rail)"
          stroke="var(--line-4)"
          stroke-width="1"
        />
        <circle
          :cx="CX"
          :cy="CY"
          :r="R - 12"
          fill="none"
          stroke="var(--line-2)"
          stroke-width="14"
          stroke-dasharray="2 20.4"
        />
        <g
          v-for="(segment, i) in segments"
          :key="segment.id"
        >
          <path
            :d="slicePath(i * step - step / 2, i * step + step / 2)"
            :fill="segment.tone"
            fill-opacity="0.14"
            :stroke="segment.tone"
            stroke-width="1"
          />
        </g>
        <circle
          :cx="CX"
          :cy="CY"
          :r="72"
          fill="var(--ground)"
          stroke="var(--line-4)"
          stroke-width="1"
        />
      </svg>
      <div
        class="labels"
        aria-hidden="true"
      >
        <span
          v-for="(segment, i) in segments"
          :key="segment.id"
          class="seg-label"
          :style="{ transform: `rotate(${i * step}deg) translateX(78px)` }"
        >{{ segment.name }}</span>
      </div>
    </div>

    <div
      class="pointer"
      aria-hidden="true"
    />
    <div
      class="pointer-line"
      aria-hidden="true"
    />

    <button
      class="hub"
      :class="{ live: seed === null && canControl, drawing: spinning }"
      type="button"
      :disabled="seed !== null || !canControl"
      :aria-label="seed === null ? 'Spin' : 'Wheel drawn'"
      @click="emit('spin')"
    >
      <span class="disp hub-word">{{ hubLabel }}</span>
      <span class="hub-sub">{{ seed === null ? 'Draw the wheel' : 'Result locked' }}</span>
    </button>
  </div>
</template>

<style scoped>
.wheel-wrap {
  position: relative;
  width: min(100%, 460px);
  aspect-ratio: 1;
  margin-inline: auto;
  flex-shrink: 0;
}
.halo {
  position: absolute;
  inset: -18px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 214, 66, 0.07) 0%, transparent 62%);
}
.rotor {
  position: absolute;
  inset: 0;
  transition: transform 2.8s cubic-bezier(0.12, 0.72, 0.1, 1);
}
.rotor svg { width: 100%; height: 100%; display: block; }

.labels { position: absolute; inset: 0; }
.seg-label {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 122px;
  margin-top: -7px;
  transform-origin: 0 50%;
  display: flex;
  align-items: center;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  white-space: nowrap;
  color: var(--khaki);
  text-transform: uppercase;
}

.pointer {
  position: absolute;
  right: -16px;
  top: 50%;
  width: 30px;
  height: 30px;
  margin-top: -15px;
  background: var(--gold);
  clip-path: polygon(0 50%, 100% 0, 100% 100%);
  filter: drop-shadow(0 0 8px rgba(255, 214, 66, 0.6));
}
.pointer-line {
  position: absolute;
  right: -30px;
  top: 50%;
  width: 24px;
  height: 2px;
  background: var(--gold);
}

.hub {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 126px;
  height: 126px;
  margin: -63px 0 0 -63px;
  border-radius: 50%;
  border: 0;
  background: var(--raised);
  color: var(--muted);
  box-shadow: 0 0 0 6px var(--ground), 0 0 0 7px var(--line-4);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: default;
  transition: background-color var(--dur-fast), color var(--dur-fast);
}
.hub.live {
  background: var(--gold);
  color: var(--on-gold);
  cursor: pointer;
  animation: glow 2.6s ease-in-out infinite;
}
.hub.live:hover { filter: brightness(1.1); }
.hub.drawing { background: var(--gold); color: var(--on-gold); }
.hub-word { font-size: 24px; }
.hub-sub { font-size: 9px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; }

@media (max-width: 1020px) {
  .wheel-wrap { width: min(100%, 320px); }
  .seg-label { font-size: 9px; }
}
</style>
