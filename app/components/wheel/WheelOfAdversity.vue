<script setup lang="ts">
import { conditionRiskAt } from '~~/shared/engine/config'
import { deriveMisfortune, eligibleMisfortunes } from '~~/shared/engine/wheel'
import { WHEEL_SPIN_MS } from '~/utils/motion'

const props = withDefaults(defineProps<{
  difficulty: number
  seed: number | null
  canControl?: boolean
  spinning?: boolean
  // Every present diver's kit: directives someone can't field leave the wheel.
  inventories?: readonly (readonly string[])[]
}>(), { canControl: false, spinning: false, inventories: () => [] })

const emit = defineEmits<{ spin: [] }>()

const SIZE = 460
const R = 210
const BEZEL = 222
const CX = SIZE / 2
const CY = SIZE / 2

// The design draws every segment dark — risk rides a 6×6 pip at the outer rim,
// never the wedge fill, so a roll never spoils its own draw. The landed segment
// alone lights up gold and juts past the rim toward the pointer.
const SEG_DARK = ['#1B1E15', '#15170F']
const SEG_HIT = 'var(--gold)'
const HIT_REACH = 18

const segments = computed(() =>
  eligibleMisfortunes(props.inventories).map((misfortune) => {
    const risk = conditionRiskAt(misfortune.id, props.difficulty)
    const tone = risk >= 4 ? 'var(--red)' : risk === 3 ? 'var(--orange)' : 'var(--khaki)'
    return { id: misfortune.id, name: misfortune.name, risk, tone }
  }))

const step = computed(() => (segments.value.length ? 360 / segments.value.length : 360))

const drawn = computed(() =>
  props.seed === null ? null : deriveMisfortune(props.seed, props.inventories))
const drawnIndex = computed(() =>
  drawn.value ? segments.value.findIndex(segment => segment.id === drawn.value!.id) : -1)
const drawnRisk = computed(() =>
  drawn.value ? conditionRiskAt(drawn.value.id, props.difficulty) : 0)

function polar(radius: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180
  return [CX + radius * Math.cos(a), CY + radius * Math.sin(a)]
}

function slicePath(startDeg: number, endDeg: number, radius = R): string {
  const [x1, y1] = polar(radius, startDeg)
  const [x2, y2] = polar(radius, endDeg)
  const large = endDeg - startDeg > 180 ? 1 : 0
  return `M ${CX} ${CY} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`
}

const landed = computed(() => drawnIndex.value >= 0 && !spinning.value)
const hitPath = computed(() =>
  landed.value
    ? slicePath(drawnIndex.value * step.value - step.value / 2, drawnIndex.value * step.value + step.value / 2, R + HIT_REACH)
    : '')

function segmentFill(i: number): string {
  // The landed wedge only lifts once the spin settles — never while it turns,
  // or the wheel would spoil its own draw.
  return i === drawnIndex.value && !spinning.value ? SEG_HIT : SEG_DARK[i % 2]!
}

// Risk pips: one square per point of team risk, centred on each segment and
// stacked tangentially along the outer rim, so the wheel reads its own odds at
// a glance (matches the design and the legend).
const pips = computed(() =>
  segments.value.flatMap((segment, i) => {
    const a = ((i * step.value) * Math.PI) / 180
    const radius = R - 19
    const bx = CX + radius * Math.cos(a)
    const by = CY + radius * Math.sin(a)
    const tx = -Math.sin(a)
    const ty = Math.cos(a)
    return Array.from({ length: segment.risk }, (_, k) => {
      const off = (k - (segment.risk - 1) / 2) * 9
      const tone = i === drawnIndex.value && !spinning.value ? 'var(--on-gold)' : segment.tone
      return { key: `${segment.id}-${k}`, x: bx + off * tx - 3, y: by + off * ty - 3, tone }
    })
  }))

// The label overlay is HTML, not SVG, so it must scale with the wheel: sizes
// are expressed in `cqw` against the wheel box (the design's 460px coordinate
// system) and resolve against whatever width the wheel is given. Without this
// the labels overflow the smaller phone wheel.
const LABEL_WIDTH = 108
const LABEL_FONT_CAP = 11.5
const WHEEL_UNIT = SIZE
function wheelUnits(px: number): string {
  return `${((px / WHEEL_UNIT) * 100).toFixed(3)}cqw`
}
// Labels on the wheel's left half would read upside down at rest. Those swing
// round to start from the rim instead, so every label reads left to right
// with the wheel parked — and the landed one, at the pointer, never flips.
function flipped(i: number): boolean {
  const angle = (((i * step.value + rotation.value) % 360) + 360) % 360
  return angle > 90 && angle < 270
}
function labelTransform(i: number): string {
  const base = `rotate(${i * step.value}deg)`
  return flipped(i)
    ? `${base} translateX(calc(var(--label-x) + var(--label-w))) rotate(180deg)`
    : `${base} translateX(var(--label-x))`
}
function labelSize(name: string): string {
  return wheelUnits(Math.min(LABEL_FONT_CAP, 104 / (name.length * 0.66)))
}

const reduced = import.meta.client
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const rotation = ref(0)
const isSpinning = ref(false)
let spinTimer: ReturnType<typeof setTimeout> | undefined
onBeforeUnmount(() => clearTimeout(spinTimer))

// Spins are seeds: every client derives the same misfortune from the same
// integer and lands the pointer on its segment. The wheel only ever turns
// forward, so a reroll always reads as a fresh spin.
watch(
  () => props.seed,
  (seed) => {
    clearTimeout(spinTimer)
    if (seed === null) {
      rotation.value = 0
      isSpinning.value = false
      return
    }
    const index = segments.value.findIndex(segment => segment.id === deriveMisfortune(seed, props.inventories).id)
    if (index < 0) {
      return
    }
    const angle = step.value
    let target = 360 * 5 - index * angle
    while (target <= rotation.value + 360) {
      target += 360
    }
    rotation.value = target
    if (!reduced) {
      isSpinning.value = true
      spinTimer = setTimeout(() => {
        isSpinning.value = false
      }, WHEEL_SPIN_MS)
    }
  },
  { immediate: true },
)

const spinning = computed(() => isSpinning.value || props.spinning)
const hubText = computed(() =>
  props.seed === null ? 'Spin' : spinning.value ? '···' : '')
const hubSub = computed(() =>
  props.seed === null ? 'HOST' : spinning.value ? 'DRAWING' : `RISK ${drawnRisk.value}`)
// The accessible name keeps the plain "Spin" call-to-action the specs and E2E
// rely on; the visible hub text carries the design's HOST / TEAM RISK copy.
const hubLabel = computed(() => {
  if (props.seed === null) return 'Spin'
  if (spinning.value) return 'Spinning'
  return drawn.value ? `Landed on ${drawn.value.name}` : 'Drawn'
})
</script>

<template>
  <div class="wheel-col">
    <div class="wheel-wrap">
      <div
        class="halo"
        aria-hidden="true"
      />
      <div class="rotor-clip">
        <div
          class="rotor"
          :style="{ transform: `rotate(${rotation}deg)`, transitionDuration: `${WHEEL_SPIN_MS}ms` }"
        >
          <svg
            :width="SIZE"
            :height="SIZE"
            :viewBox="`0 0 ${SIZE} ${SIZE}`"
            role="img"
            :aria-label="`Wheel of Adversity, ${segments.length} directives`"
          >
            <circle
              :cx="CX"
              :cy="CY"
              :r="BEZEL + 6"
              fill="none"
              stroke="var(--gold)"
              stroke-opacity="0.35"
              stroke-width="1"
            />
            <circle
              class="bezel-ticks"
              :cx="CX"
              :cy="CY"
              :r="BEZEL"
              fill="none"
              stroke="var(--gold)"
              stroke-width="9"
              stroke-dasharray="1.6 5.38"
            />
            <circle
              :cx="CX"
              :cy="CY"
              :r="R"
              fill="var(--rail)"
              stroke="var(--line-4)"
              stroke-width="1"
            />
            <g
              v-for="(segment, i) in segments"
              :key="segment.id"
            >
              <path
                :d="slicePath(i * step - step / 2, i * step + step / 2)"
                :fill="segmentFill(i)"
                stroke="var(--line-2)"
                stroke-width="1"
              />
            </g>
            <path
              v-if="landed"
              class="hit-wedge"
              :d="hitPath"
              :fill="SEG_HIT"
            />
            <rect
              v-for="pip in pips"
              :key="pip.key"
              :x="pip.x"
              :y="pip.y"
              width="6"
              height="6"
              :fill="pip.tone"
            />
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
            :style="{ '--label-w': wheelUnits(LABEL_WIDTH), '--label-x': wheelUnits(80) }"
          >
            <span
              v-for="(segment, i) in segments"
              :key="segment.id"
              class="seg-label"
              :class="{ hit: i === drawnIndex && !spinning, flip: flipped(i) }"
              :style="{ transform: labelTransform(i), fontSize: labelSize(segment.name) }"
            >{{ segment.name }}</span>
          </div>
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
        :class="{ 'live': seed === null && canControl, 'cta-sweep': seed === null && canControl, 'drawing': spinning }"
        type="button"
        :disabled="seed !== null || !canControl"
        :aria-label="hubLabel"
        @click="emit('spin')"
      >
        <RiskPips
          v-if="seed !== null && !spinning && drawnRisk > 0"
          class="hub-skulls"
          :value="drawnRisk"
          :max="drawnRisk"
          tone="red"
        />
        <span
          v-else
          class="disp hub-word"
        >{{ hubText }}</span>
        <span class="hub-sub">{{ hubSub }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.wheel-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  width: 100%;
  min-width: 0;
}
.wheel-wrap {
  position: relative;
  width: var(--wheel-size, min(100%, 460px));
  aspect-ratio: 1;
  margin-inline: auto;
  flex-shrink: 0;
  container-type: size;
}
.halo {
  position: absolute;
  inset: -6cqw;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 214, 66, 0.09) 0%, transparent 64%);
  pointer-events: none;
}
/* A rotating square's corners sweep up to 21% past the wheel's box. Left
   unclipped they grow and shrink the scroll container every frame of a spin,
   so its scrollbars flicker; a static circle clips them (with room for the lit
   wedge's glow). */
.rotor-clip {
  position: absolute;
  inset: -4cqw;
  overflow: hidden;
  border-radius: 50%;
  pointer-events: none;
}
.rotor {
  position: absolute;
  inset: 4cqw;
  transition: transform cubic-bezier(0.12, 0.72, 0.1, 1);
  pointer-events: none;
}
.rotor svg { width: 100%; height: 100%; display: block; }

.labels { position: absolute; inset: 0; pointer-events: none; }
.seg-label {
  position: absolute;
  left: 50%;
  top: 50%;
  width: var(--label-w);
  margin-top: -1.522cqw;
  transform-origin: 0 50%;
  display: flex;
  align-items: center;
  font-weight: 700;
  letter-spacing: 0.06em;
  white-space: nowrap;
  color: var(--khaki);
  text-transform: uppercase;
}
.seg-label.flip { justify-content: flex-end; }
.seg-label.hit { color: var(--on-gold); }
.hit-wedge {
  filter: drop-shadow(0 0 14px rgba(255, 214, 66, 0.55));
  transform-origin: 50% 50%;
  animation: wedge-lit 0.5s var(--ease-impact) both;
}
@keyframes wedge-lit {
  0% { opacity: 0; transform: scale(0.94); }
  60% { opacity: 1; transform: scale(1.015); }
  100% { opacity: 1; transform: none; }
}

.pointer {
  position: absolute;
  right: -3.478cqw;
  top: 50%;
  width: 6.522cqw;
  height: 6.522cqw;
  margin-top: -3.261cqw;
  background: var(--gold);
  clip-path: polygon(0 50%, 100% 0, 100% 100%);
  filter: drop-shadow(0 0 8px rgba(255, 214, 66, 0.6));
  pointer-events: none;
}
.pointer-line {
  position: absolute;
  right: -6.522cqw;
  top: 50%;
  width: 5.217cqw;
  height: 2px;
  margin-top: -1px;
  background: var(--gold);
  pointer-events: none;
}

.hub {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 27.391cqw;
  height: 27.391cqw;
  margin: -13.696cqw 0 0 -13.696cqw;
  border-radius: 50%;
  border: 0;
  background: var(--panel);
  color: var(--gold);
  box-shadow: 0 0 0 1.304cqw var(--ground), 0 0 0 1.522cqw var(--gold);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: default;
  transition: background-color var(--dur-fast), color var(--dur-fast);
}
/* The call to action: the hub breathes and emits sonar rings. The rings live on
   pseudo-elements so the hub keeps its static gold bezel (an animated
   box-shadow would replace it). */
.hub.live {
  background: var(--gold);
  color: var(--on-gold);
  cursor: pointer;
  animation: hub-breathe 1.8s ease-in-out infinite;
}
.hub.live::before,
.hub.live::after {
  content: '';
  position: absolute;
  inset: -1.522cqw;
  border-radius: 50%;
  border: 2px solid var(--gold);
  opacity: 0;
  pointer-events: none;
  animation: hub-ring 2.4s ease-out infinite;
}
.hub.live::after { animation-delay: 1.2s; }
.hub.live:hover { filter: brightness(1.1); animation-play-state: paused; }
@keyframes hub-breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.06); }
}
@keyframes hub-ring {
  0% { transform: scale(1); opacity: 0.7; }
  100% { transform: scale(1.75); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .hub.live,
  .hub.live::before,
  .hub.live::after { animation: none; }
  .hub.live { box-shadow: 0 0 0 1.304cqw var(--ground), 0 0 0 1.522cqw var(--gold), 0 0 18px 2px rgba(255, 214, 66, 0.35); }
}
.hub-word { font-size: clamp(15px, 6.522cqw, 30px); }
.hub.live .hub-word { font-size: clamp(13px, 5.652cqw, 26px); }
.hub-skulls :deep(i) { width: clamp(12px, 5.2cqw, 26px); height: clamp(12px, 5.2cqw, 26px); }
.hub-sub { font-size: clamp(7px, 2.174cqw, 10px); font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; }

@media (max-width: 1020px) {
  .wheel-wrap { width: var(--wheel-size, min(100%, 320px)); }
}
</style>
