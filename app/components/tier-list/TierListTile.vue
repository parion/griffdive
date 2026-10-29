<script setup lang="ts">
import { itemImageUrl } from '~~/shared/data/images'
import type { Item, Tier } from '~~/shared/data/types'
import type { KitArt } from '~/utils/kit'

// One item on the Tier Maker board: its art in a lit square, edged in its
// tier, tinted by its category. A moved item carries a gold notch; `landed`
// plays the drop (S tier adds the sheen). The parent owns all input.
const props = withDefaults(defineProps<{
  item: Item
  defaultTier: Tier
  art: KitArt
  accent: string
  selected?: boolean
  dimmed?: boolean
  landed?: boolean
  pressing?: boolean
  lifted?: boolean
  ghost?: boolean
}>(), { selected: false, dimmed: false, landed: false, pressing: false, lifted: false, ghost: false })

const image = computed(() => itemImageUrl(props.item))
const moved = computed(() => props.item.tier !== props.defaultTier)
const initials = computed(() => props.item.displayName
  .split(/[\s-]+/)
  .map(word => word[0])
  .join('')
  .slice(0, 3)
  .toUpperCase())
</script>

<template>
  <span
    class="tm-tile"
    :class="[`art-${art}`, `t-${item.tier}`, { moved, selected, dimmed, landed, pressing, lifted, ghost }]"
    :style="{ '--tier': `var(--tier-${item.tier})`, '--accent': accent }"
  >
    <span
      class="tm-well"
      aria-hidden="true"
    >
      <img
        v-if="image"
        class="tm-art"
        :src="image"
        alt=""
        loading="lazy"
        decoding="async"
        draggable="false"
      >
      <span
        v-else
        class="tm-initials disp"
      >{{ initials }}</span>
    </span>
    <span
      class="tm-caption"
      aria-hidden="true"
    >{{ item.displayName }}</span>
    <span
      v-if="moved"
      class="tm-notch"
      aria-hidden="true"
    />
    <span
      v-if="landed"
      class="tm-land"
      aria-hidden="true"
    />
  </span>
</template>

<style scoped>
.tm-tile {
  position: relative;
  display: block;
  width: var(--tile, 64px);
  aspect-ratio: 1;
  overflow: hidden;
  container: tm-tile / inline-size;
  background:
    radial-gradient(circle at 50% 42%, color-mix(in srgb, var(--accent) 26%, transparent), transparent 68%),
    linear-gradient(180deg, color-mix(in srgb, var(--accent) 10%, var(--raised)), var(--ground));
  box-shadow: inset 0 0 0 1px var(--line-2), inset 0 -3px 0 var(--tier);
  clip-path: polygon(0 0, calc(100% - 7px) 0, 100% 7px, 100% 100%, 0 100%);
  transition:
    transform var(--dur-fast) var(--ease-out),
    box-shadow var(--dur-fast),
    opacity var(--dur-med),
    filter var(--dur-med);
}

.tm-well { position: absolute; inset: 0; display: grid; place-items: center; }
.tm-art {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
  -webkit-user-drag: none;
}
.art-gear .tm-art {
  padding: 10% 6%;
  filter: drop-shadow(0 4px 5px rgba(0, 0, 0, 0.7)) brightness(1.15) contrast(1.06);
}
.art-icon .tm-art { padding: 15%; filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.55)); }
.tm-initials { font-size: calc(var(--tile, 64px) * 0.28); color: var(--accent); letter-spacing: 0.02em; }

/* Names show once a tile is large enough to read one. */
.tm-caption {
  position: absolute;
  inset: auto 0 3px;
  display: none;
  padding: 10px 4px 1px;
  overflow: hidden;
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  line-height: 1.1;
  text-align: center;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
  color: var(--text);
  background: linear-gradient(180deg, transparent, rgba(8, 9, 6, 0.88) 55%);
}
@container tm-tile (min-width: 70px) {
  .tm-caption { display: block; }
  .art-gear .tm-art { padding-bottom: 22%; }
  .art-icon .tm-art { padding-bottom: 24%; }
}

.tm-notch {
  position: absolute;
  top: 0;
  right: 0;
  width: 14px;
  height: 14px;
  background: var(--gold);
  clip-path: polygon(0 0, 100% 100%, 100% 0);
  transform: translate(-1px, 1px);
}

@media (hover: hover) {
  .tm-tile:hover { transform: translateY(-2px); box-shadow: inset 0 0 0 1px var(--line-4), inset 0 -3px 0 var(--tier); }
}
.tm-tile.selected {
  box-shadow: inset 0 0 0 2px var(--gold), inset 0 -3px 0 var(--tier), inset 0 0 14px rgba(255, 214, 66, 0.3);
  transform: translateY(-2px);
}
.tm-tile.dimmed { opacity: 0.18; filter: grayscale(0.9); }
.tm-tile.pressing { animation: tm-press 220ms var(--ease-out) forwards; }
.tm-tile.lifted { opacity: 0.25; filter: grayscale(1); transform: scale(0.9); }

/* The held copy under the finger: unclipped so its shadow can lift it. */
.tm-tile.ghost {
  clip-path: none;
  box-shadow:
    inset 0 0 0 2px var(--tier),
    0 18px 34px rgba(0, 0, 0, 0.7),
    0 0 26px color-mix(in srgb, var(--tier) 45%, transparent);
}

/* Every drop slams in; the tier colour rings out from it. */
.tm-tile.landed { animation: tm-slam 420ms var(--ease-impact) both; }
.tm-land {
  position: absolute;
  inset: 0;
  pointer-events: none;
  box-shadow: inset 0 0 0 2px var(--tier);
  animation: tm-ring 620ms var(--ease-out) both;
}
/* S tier earns the sheen: a gold glint sweeps the art, two stars wink in
   the corners, then the tile glows. */
.tm-tile.landed.t-s { animation: tm-slam 420ms var(--ease-impact) both, tm-glow 1.4s var(--ease-out) 120ms both; }
.tm-tile.landed.t-s .tm-land {
  box-shadow: none;
  background: linear-gradient(105deg, transparent 20%, rgba(255, 246, 200, 0.25) 38%, rgba(255, 248, 210, 0.95) 50%, rgba(255, 246, 200, 0.25) 62%, transparent 80%);
  mix-blend-mode: screen;
  transform: translateX(-120%) skewX(-12deg);
  animation: tm-sheen 760ms var(--ease-out) 160ms both;
}
.tm-tile.landed.t-s::before,
.tm-tile.landed.t-s::after {
  content: '';
  position: absolute;
  z-index: 2;
  width: 14px;
  height: 14px;
  background: var(--gold-bright);
  clip-path: polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%);
  filter: drop-shadow(0 0 4px var(--gold));
  pointer-events: none;
  animation: tm-wink 700ms var(--ease-out) 420ms both;
}
.tm-tile.landed.t-s::before { top: 6px; left: 6px; }
.tm-tile.landed.t-s::after { right: 7px; bottom: 9px; width: 10px; height: 10px; animation-delay: 560ms; }

@keyframes tm-press {
  to { transform: scale(0.92); box-shadow: inset 0 0 0 2px var(--tier), inset 0 -3px 0 var(--tier); }
}
@keyframes tm-slam {
  0% { transform: scale(1.32); filter: brightness(1.8); }
  55% { transform: scale(0.94); filter: brightness(1.2); }
  100% { transform: scale(1); filter: none; }
}
@keyframes tm-ring {
  0% { opacity: 0.9; box-shadow: inset 0 0 0 calc(var(--tile, 64px) / 2) color-mix(in srgb, var(--tier) 55%, transparent); }
  100% { opacity: 0; box-shadow: inset 0 0 0 2px var(--tier); }
}
@keyframes tm-sheen {
  0% { transform: translateX(-120%) skewX(-12deg); }
  100% { transform: translateX(120%) skewX(-12deg); }
}
@keyframes tm-wink {
  0% { opacity: 0; transform: scale(0) rotate(0deg); }
  45% { opacity: 1; transform: scale(1.2) rotate(45deg); }
  100% { opacity: 0; transform: scale(0.4) rotate(90deg); }
}
@keyframes tm-glow {
  0% { box-shadow: inset 0 0 0 2px var(--gold), inset 0 -3px 0 var(--tier), inset 0 0 0 rgba(255, 214, 66, 0); }
  35% { box-shadow: inset 0 0 0 2px var(--gold-bright), inset 0 -3px 0 var(--tier), inset 0 0 22px rgba(255, 214, 66, 0.7); }
  100% { box-shadow: inset 0 0 0 1px var(--line-2), inset 0 -3px 0 var(--tier), inset 0 0 0 rgba(255, 214, 66, 0); }
}
</style>
