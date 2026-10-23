<script setup lang="ts">
import type { RevealCue } from '~/utils/rewardReveal'

// Presentation only: the card inside is live from the first frame; this
// wrapper just stages its entrance. `instant` skips it (a reload onto a
// resolved draft); `muted` stops the ambient glow once the card is passed over.
const props = withDefaults(defineProps<{
  cue: RevealCue
  instant?: boolean
  muted?: boolean
}>(), { instant: false, muted: false })

const style = computed(() => ({
  '--delay': `${props.cue.start}ms`,
  '--impact': `${props.cue.impact}ms`,
}))
</script>

<template>
  <div
    class="reveal"
    :class="{ instant, muted }"
    :data-tier="cue.tier"
    :style="style"
  >
    <slot />
    <span
      v-if="!instant"
      class="reveal-fx"
      aria-hidden="true"
    >
      <span class="reveal-flash" />
      <span class="reveal-sheen" />
    </span>
    <template v-if="!instant && (cue.tier === 'A' || cue.tier === 'S')">
      <span
        class="reveal-ring"
        aria-hidden="true"
      />
      <span
        v-if="cue.tier === 'S'"
        class="reveal-ring late"
        aria-hidden="true"
      />
      <span
        v-if="cue.tier === 'S'"
        class="reveal-charge"
        aria-hidden="true"
      />
    </template>
    <span
      v-if="!instant && cue.tier === 'S+'"
      class="reveal-beam"
      aria-hidden="true"
    />
  </div>
</template>

<style scoped>
.reveal {
  --tier: var(--tier-c);
  /* Hosts with cut corners set --reveal-cut so the overlays and the S+ open
     resolve onto the card's own silhouette. */
  --reveal-shape: polygon(var(--reveal-cut, 0px) 0, 100% 0, 100% calc(100% - var(--reveal-cut, 0px)), calc(100% - var(--reveal-cut, 0px)) 100%, 0 100%, 0 var(--reveal-cut, 0px));
  --ease-unfurl: cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  display: grid;
  min-width: 0;
}
.reveal[data-tier='B'] { --tier: var(--tier-b); }
.reveal[data-tier='A'] { --tier: var(--tier-a); }
.reveal[data-tier='S'] { --tier: var(--tier-s); }
.reveal[data-tier='S+'] { --tier: var(--tier-splus); }

/* Entrances fill backwards only, so once a card lands its own hover, selected
   and faded states own transform, filter and opacity again. */
.reveal[data-tier='C'] { animation: deal 0.45s var(--ease-out) var(--delay) backwards; }
.reveal[data-tier='B'] { animation: rise 0.6s var(--ease-impact) var(--delay) backwards; }
.reveal[data-tier='A'] { animation: drop 0.6s var(--delay) backwards; }
.reveal[data-tier='S'] {
  animation:
    slam 1s var(--delay) backwards,
    jolt 0.36s ease-out var(--impact) backwards,
    glow 3.6s ease-in-out calc(var(--impact) + 1.2s) infinite;
}
.reveal[data-tier='S+'] { animation: cross-breathe 5s ease-in-out calc(var(--delay) + 2.6s) infinite; }
/* The open rides the card, not the slot, so the beam stays visible above it. */
.reveal[data-tier='S+'] > :slotted(*) { animation: cross-open 1.2s var(--ease-unfurl) calc(var(--delay) + 0.5s) backwards; }
.reveal.muted[data-tier='S'] { animation: slam 1s var(--delay) backwards, jolt 0.36s ease-out var(--impact) backwards; }
.reveal.muted[data-tier='S+'] { animation: none; }
.reveal.instant[data-tier],
.reveal.instant[data-tier] > :slotted(*) { animation: none; }

/* Overlay layers follow the card's cut so light never spills past a corner. */
.reveal-fx {
  position: absolute;
  inset: 0;
  z-index: 3;
  overflow: hidden;
  pointer-events: none;
  clip-path: var(--reveal-shape);
}
.reveal-flash {
  position: absolute;
  inset: -20%;
  opacity: 0;
  background: radial-gradient(closest-side, color-mix(in srgb, var(--tier) 70%, white), color-mix(in srgb, var(--tier) 30%, transparent) 55%, transparent);
  mix-blend-mode: screen;
}
.reveal-sheen {
  position: absolute;
  inset: 0;
  opacity: 0;
  background: linear-gradient(100deg, transparent 35%, color-mix(in srgb, var(--tier) 40%, white) 50%, transparent 65%);
  mix-blend-mode: screen;
}
.reveal[data-tier='B'] .reveal-flash { animation: flash 0.45s ease-out var(--impact); --flash: 0.35; }
.reveal[data-tier='A'] .reveal-flash { animation: flash 0.6s ease-out var(--impact); --flash: 0.6; }
.reveal[data-tier='S'] .reveal-flash { animation: flash 0.9s ease-out var(--impact); --flash: 0.95; }
.reveal[data-tier='S+'] .reveal-flash { animation: flash 1.6s ease-in-out calc(var(--delay) + 0.9s); --flash: 0.55; }
.reveal[data-tier='A'] .reveal-sheen { animation: sheen 0.9s var(--ease-out) calc(var(--impact) + 0.1s); }
.reveal[data-tier='S'] .reveal-sheen { animation: sheen 1.1s var(--ease-out) calc(var(--impact) + 0.15s); }
.reveal[data-tier='S+'] .reveal-sheen { animation: sheen 2.2s var(--ease-out) calc(var(--delay) + 2.2s); }

/* Shockwave off the impact: one ring for A, a double for S. */
.reveal-ring {
  position: absolute;
  inset: 0;
  z-index: 2;
  opacity: 0;
  pointer-events: none;
  box-shadow: 0 0 0 2px var(--tier), 0 0 24px color-mix(in srgb, var(--tier) 60%, transparent);
  animation: ring 0.7s var(--ease-out) var(--impact);
  --ring: 1.08;
}
.reveal[data-tier='S'] .reveal-ring { animation-duration: 0.9s; --ring: 1.16; }
.reveal[data-tier='S'] .reveal-ring.late { animation-delay: calc(var(--impact) + 0.16s); --ring: 1.26; }

/* S winds up: the empty slot flickers in tier light before the card slams in. */
.reveal-charge {
  position: absolute;
  inset: 0;
  z-index: 1;
  opacity: 0;
  pointer-events: none;
  border: 1px solid var(--tier);
  background: repeating-linear-gradient(135deg, color-mix(in srgb, var(--tier) 14%, transparent) 0 6px, transparent 6px 14px);
  box-shadow: 0 0 22px color-mix(in srgb, var(--tier) 40%, transparent), inset 0 0 30px color-mix(in srgb, var(--tier) 25%, transparent);
  clip-path: var(--reveal-shape);
  animation: charge 0.72s linear var(--delay);
}

/* Liberty's Cross: a line of light draws across, then the card opens from it. */
.reveal-beam {
  position: absolute;
  left: 4%;
  right: 4%;
  top: 50%;
  z-index: 4;
  height: 2px;
  margin-top: -1px;
  opacity: 0;
  pointer-events: none;
  background: linear-gradient(90deg, transparent, var(--tier-s) 18%, var(--tier-splus) 82%, transparent);
  box-shadow: 0 0 18px 2px color-mix(in srgb, var(--tier-splus) 45%, transparent);
  animation: beam 1.6s var(--ease-snap) var(--delay);
}

@keyframes deal {
  from { opacity: 0; translate: 0 24px; }
}
@keyframes rise {
  from { opacity: 0; translate: 0 34px; scale: 0.92; }
}
@keyframes drop {
  0% { opacity: 0; translate: 0 -40px; scale: 1.1; animation-timing-function: cubic-bezier(0.55, 0, 0.9, 0.45); }
  70% { opacity: 1; translate: 0 4px; scale: 0.98; animation-timing-function: var(--ease-out); }
  100% { opacity: 1; translate: 0 0; scale: 1; }
}
@keyframes slam {
  0%, 55% { opacity: 0; scale: 1.45; filter: brightness(3) blur(10px); animation-timing-function: cubic-bezier(0.7, 0, 1, 0.5); }
  70% { opacity: 1; scale: 0.96; filter: brightness(1.9) blur(0); animation-timing-function: var(--ease-out); }
  85% { scale: 1.015; filter: brightness(1.2); }
  100% { opacity: 1; scale: 1; filter: none; }
}
@keyframes jolt {
  0% { translate: 0 0; }
  20% { translate: -5px 2px; }
  45% { translate: 4px -2px; }
  70% { translate: -2px 1px; }
  100% { translate: 0 0; }
}
@keyframes glow {
  0%, 100% { filter: drop-shadow(0 0 4px color-mix(in srgb, var(--tier) 25%, transparent)); }
  50% { filter: drop-shadow(0 0 16px color-mix(in srgb, var(--tier) 50%, transparent)); }
}
@keyframes flash {
  0% { opacity: 0; scale: 0.6; }
  18% { opacity: var(--flash, 0.6); scale: 1; }
  100% { opacity: 0; scale: 1.2; }
}
@keyframes sheen {
  from { opacity: 1; translate: -110% 0; }
  to { opacity: 1; translate: 110% 0; }
}
@keyframes ring {
  from { opacity: 1; scale: 1; }
  to { opacity: 0; scale: var(--ring, 1.1); }
}
@keyframes charge {
  0% { opacity: 0; }
  12% { opacity: 0.9; }
  20% { opacity: 0.25; }
  32% { opacity: 1; }
  40% { opacity: 0.4; }
  60%, 80% { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes cross-open {
  from {
    clip-path: polygon(var(--reveal-cut, 0px) 50%, 100% 50%, 100% 50%, calc(100% - var(--reveal-cut, 0px)) 50%, 0 50%, 0 50%);
    opacity: 0.4;
  }
  to {
    clip-path: var(--reveal-shape);
    opacity: 1;
  }
}
@keyframes cross-breathe {
  0%, 100% { filter: drop-shadow(0 0 4px color-mix(in srgb, var(--tier-splus) 25%, transparent)); }
  50% { filter: drop-shadow(0 0 16px color-mix(in srgb, var(--tier-splus) 45%, transparent)); }
}
@keyframes beam {
  0% { transform: scaleX(0); opacity: 0; }
  25% { opacity: 1; }
  55% { transform: scaleX(1); opacity: 1; }
  100% { transform: scaleX(1); opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .reveal-fx,
  .reveal-ring,
  .reveal-charge,
  .reveal-beam { display: none; }
}
</style>
