<!-- The Helldiver salute as a line sketch: helmeted diver, fist raised, the
     torso running off the bottom edge. Outlines take currentColor; each part is
     filled with --salute-cut (the surface behind it) so nearer parts occlude
     the lines behind them. The arm is a tube: a wide stroke with a narrower
     surface-coloured stroke laid over it. -->
<template>
  <svg
    viewBox="0 0 64 64"
    aria-hidden="true"
  >
    <path
      class="part"
      d="M10 70V57c0-8.6 6-14 14.5-15.2l6-.9h13l6 .9C58 43 64 48.4 64 57v13z"
    />
    <path
      class="line"
      d="M31 41.2l2.2 3.6h7.6l2.2-3.6M29.5 52h15M50.5 44c3 2.2 5 5.6 5.6 9.6"
    />
    <circle
      class="part"
      cx="37"
      cy="52"
      r="2"
    />
    <path
      class="tube-edge"
      d="M27 47 13.5 55.5 12 30"
    />
    <path
      class="tube-core"
      d="M27 47 13.5 55.5 12 30"
    />
    <path
      class="line"
      d="M8.4 36.5h7.4M8.6 40.2h7"
    />
    <path
      class="part"
      d="M19.5 47.5c1.2-4.6 4.8-7.6 9.6-8.2 2.7 2.2 3.9 5.6 3.4 9.3-4.4 1.3-9 .8-13-1.1z"
    />
    <rect
      class="part"
      x="5.5"
      y="12.5"
      width="13.5"
      height="16.5"
      rx="3.8"
    />
    <path
      class="line"
      d="M8.5 17.6h7.6M8.5 21.6h7.6"
    />
    <path
      class="part"
      d="M27 29.5v-9C27 13 31.5 8 37 8s10 5 10 12.5v9l-2.6 6.6-3.6 2.9h-7.6l-3.6-2.9z"
    />
    <path
      class="visor"
      d="M28.7 19.6h16.6l-1.3 5.4H30z"
    />
    <path
      class="line"
      d="M27 19.6h20M34.6 9v4.6M39.4 9v4.6M33.6 34h6.8M30.2 27.8l2.1 3.4M43.8 27.8l-2.1 3.4"
    />
  </svg>
</template>

<style scoped>
svg {
  display: block;
  width: 4rem;
  height: 4rem;
  overflow: hidden;
  --salute-cut-color: var(--salute-cut, var(--ground));
}
.part,
.visor,
.line,
.tube-edge,
.tube-core {
  stroke-linecap: round;
  stroke-linejoin: round;
}
.part { fill: var(--salute-cut-color); stroke: currentColor; stroke-width: 1.6; }
.visor { fill: color-mix(in srgb, currentColor 22%, transparent); stroke: currentColor; stroke-width: 1.6; }
.line { fill: none; stroke: currentColor; stroke-width: 1.3; }
.tube-edge { fill: none; stroke: currentColor; stroke-width: 10.2; }
.tube-core { fill: none; stroke: var(--salute-cut-color); stroke-width: 7; }
</style>
