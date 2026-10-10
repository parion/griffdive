<script setup lang="ts">
// Liberty's Cross crest: a winged four-point cross inside the Wheel's rim, drawn in
// the same swept-blade language as the brand mark. Presentation only — every
// motion keys off the inherited `--delay` so the band owns the timeline.
defineProps<{ instant?: boolean }>()

const gid = useId()

const ARM_LEFT = 'M0 -10 L-8 -10 L-12 -46 L0 -68 Z'
const ARM_RIGHT = 'M0 -10 L8 -10 L12 -46 L0 -68 Z'
const DIAG = 'M0 -12 L-5 -12 L-7 -34 L0 -46 L7 -34 L5 -12 Z'
const WING = [
  'M40 -14 L146 -72 L128 -46 L40 2 Z',
  'M40 4 L128 -34 L113 -12 L40 20 Z',
  'M40 22 L108 -6 L96 16 L40 38 Z',
  'M40 40 L86 20 L76 38 L40 54 Z',
]
const STAR = 'M0 -8 L1.94 -2.67 L7.61 -2.47 L3.14 1.02 L4.7 6.47 L0 3.3 L-4.7 6.47 L-3.14 1.02 L-7.61 -2.47 L-1.94 -2.67 Z'
const SPARK = 'M0 -5 L1.4 -1.4 L5 0 L1.4 1.4 L0 5 L-1.4 1.4 L-5 0 L-1.4 -1.4 Z'
const SPARKS: [number, number][] = [[-132, -78], [132, -78], [-84, -92], [84, -92]]
</script>

<template>
  <svg
    class="emblem"
    :class="{ instant }"
    viewBox="-150 -100 300 200"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <linearGradient
        :id="`${gid}-arm`"
        gradientUnits="userSpaceOnUse"
        x1="0"
        y1="-68"
        x2="0"
        y2="-10"
      >
        <stop
          offset="0"
          style="stop-color: var(--tier-s)"
        />
        <stop
          offset="1"
          style="stop-color: var(--tier-splus)"
        />
      </linearGradient>
      <linearGradient
        :id="`${gid}-rim`"
        x1="0"
        y1="0"
        x2="1"
        y2="1"
      >
        <stop
          offset="0"
          style="stop-color: var(--tier-s)"
        />
        <stop
          offset="1"
          style="stop-color: var(--tier-splus)"
        />
      </linearGradient>
      <radialGradient :id="`${gid}-disc`">
        <stop
          offset="0"
          style="stop-color: var(--tier-splus); stop-opacity: 0.22"
        />
        <stop
          offset="1"
          style="stop-color: var(--ground); stop-opacity: 0.95"
        />
      </radialGradient>
    </defs>

    <g
      v-for="side in [1, -1]"
      :key="side"
      :transform="`scale(${side} 1)`"
    >
      <path
        v-for="(blade, i) in WING"
        :key="blade"
        class="blade"
        :style="{ '--i': i }"
        :d="blade"
        :fill="`url(#${gid}-rim)`"
      />
    </g>

    <circle
      class="ticks"
      r="92"
      fill="none"
      stroke="var(--khaki)"
      stroke-width="3"
      stroke-dasharray="2 6.029"
    />
    <circle
      r="76"
      fill="var(--ground)"
    />
    <circle
      r="76"
      :fill="`url(#${gid}-disc)`"
    />
    <circle
      class="rim"
      r="78"
      pathLength="1"
      fill="none"
      :stroke="`url(#${gid}-rim)`"
      stroke-width="2.5"
    />
    <circle
      class="inner"
      r="66"
      fill="none"
      stroke="var(--tier-s)"
      stroke-width="1"
      stroke-dasharray="3 5"
    />

    <g class="cross">
      <g
        v-for="angle in [45, 135, 225, 315]"
        :key="angle"
        :transform="`rotate(${angle})`"
        :fill="`url(#${gid}-arm)`"
        opacity="0.55"
      >
        <path :d="DIAG" />
      </g>
      <g
        v-for="angle in [0, 90, 180, 270]"
        :key="angle"
        :transform="`rotate(${angle})`"
      >
        <path
          :d="ARM_LEFT"
          :fill="`url(#${gid}-arm)`"
        />
        <path
          :d="ARM_RIGHT"
          :fill="`url(#${gid}-arm)`"
          fill-opacity="0.72"
        />
      </g>
    </g>

    <circle
      r="16"
      fill="var(--ground)"
      stroke="var(--tier-s)"
      stroke-width="1.5"
    />
    <path
      class="star"
      :d="STAR"
      transform="scale(1.45)"
      fill="var(--tier-s)"
    />

    <path
      v-for="([x, y], i) in SPARKS"
      :key="i"
      class="spark"
      :style="{ '--i': i }"
      :d="SPARK"
      :transform="`translate(${x} ${y})`"
      fill="var(--tier-s)"
    />
  </svg>
</template>

<style scoped>
.emblem { display: block; width: 100%; height: 100%; overflow: visible; }

/* Wings extend outward one feather at a time, then the rim is drawn, then the
   cross and star resolve inside it. All gated on the band's --delay. */
.blade {
  transform-origin: 40px 0;
  animation: blade-out 1.1s var(--ease-out) calc(var(--delay, 0ms) + 1.15s + var(--i) * 110ms) both;
}
.ticks {
  animation: spinSlow 90s linear infinite, fade-in 1.6s ease-out calc(var(--delay, 0ms) + 1s) both;
}
.rim {
  stroke-dasharray: 1;
  animation: rim-draw 1.6s cubic-bezier(0.65, 0, 0.35, 1) calc(var(--delay, 0ms) + 0.95s) both;
}
.inner {
  animation: spinSlow 140s linear infinite reverse, fade-in 1.4s ease-out calc(var(--delay, 0ms) + 1.5s) both;
}
.cross {
  animation: fade-in 1.2s ease-out calc(var(--delay, 0ms) + 1.45s) both;
}
.star {
  transform-box: fill-box;
  transform-origin: center;
  animation: star-in 1s var(--ease-out) calc(var(--delay, 0ms) + 1.9s) both, star-breathe 4.5s ease-in-out calc(var(--delay, 0ms) + 3s) infinite;
}
.spark {
  transform-box: fill-box;
  transform-origin: center;
  animation: twinkle 3.8s ease-in-out calc(var(--delay, 0ms) + 2.2s + var(--i) * 0.7s) infinite backwards;
}

.instant .blade,
.instant .rim,
.instant .cross { animation: none; }
.instant .ticks { animation: spinSlow 90s linear infinite; }
.instant .inner { animation: spinSlow 140s linear infinite reverse; }
.instant .star { animation: star-breathe 4.5s ease-in-out infinite; }

@keyframes blade-out {
  from { opacity: 0; transform: scaleX(0.25); }
  to { opacity: 0.92; transform: none; }
}
@keyframes rim-draw {
  from { stroke-dashoffset: 1; opacity: 0.4; }
  to { stroke-dashoffset: 0; opacity: 1; }
}
@keyframes fade-in { from { opacity: 0; } }
@keyframes star-in {
  from { opacity: 0; transform: scale(0.4) rotate(-30deg); }
  to { opacity: 1; transform: none; }
}
@keyframes star-breathe {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.72; }
}
@keyframes twinkle {
  0%, 100% { opacity: 0.15; transform: scale(0.6); }
  50% { opacity: 0.9; transform: scale(1); }
}
</style>
