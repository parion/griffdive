<script setup lang="ts">
import { itemImageUrl } from '~~/shared/data/images'
import type { Item } from '~~/shared/data/types'
import type { KitArt } from '~/utils/kit'

// One item on the Tier Maker board: its art in a lit square, edged in its
// tier, tinted by its category, with its name beneath when `named`. An item
// moved since the last save carries a gold notch; one the list hasn't rated
// yet is flagged new; `landed` plays the drop (S tier adds the sheen). The
// parent owns all input.
const props = withDefaults(defineProps<{
  item: Item
  art: KitArt
  accent: string
  changed?: boolean
  unrated?: boolean
  named?: boolean
  selected?: boolean
  dimmed?: boolean
  landed?: boolean
  pressing?: boolean
  lifted?: boolean
  ghost?: boolean
}>(), { changed: false, unrated: false, named: false, selected: false, dimmed: false, landed: false, pressing: false, lifted: false, ghost: false })

const image = computed(() => itemImageUrl(props.item))
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
    :class="[`art-${art}`, `t-${item.tier}`, { changed, unrated, named, selected, dimmed, landed, pressing, lifted, ghost }]"
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
      v-if="named"
      class="tm-caption"
      aria-hidden="true"
    >{{ item.displayName }}</span>
    <span
      v-if="changed"
      class="tm-notch"
      aria-hidden="true"
    />
    <span
      v-if="unrated"
      class="tm-new"
      aria-hidden="true"
    >New</span>
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
  display: flex;
  flex-direction: column;
  width: var(--tile-w, var(--tile, 64px));
  overflow: hidden;
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

.tm-well { position: relative; display: grid; place-items: center; width: 100%; aspect-ratio: 1; }
.tm-art {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
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

/* The name strip under the art: two short lines, scaled to the tile. */
.tm-caption {
  display: -webkit-box;
  height: calc(2 * 1.12em);
  margin: 0 3px 6px;
  overflow: hidden;
  font-size: clamp(9px, calc(var(--tile, 64px) * 0.16), 12px);
  font-weight: 600;
  line-height: 1.12;
  text-align: center;
  overflow-wrap: break-word;
  hyphens: auto;
  color: var(--khaki);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}
.tm-tile.selected .tm-caption { color: var(--text); }

/* Not rated by this list yet: plays at its catalog tier until placed. */
.tm-tile.unrated { box-shadow: inset 0 0 0 1px var(--gold), inset 0 -3px 0 var(--tier); }
.tm-new {
  position: absolute;
  top: 3px;
  left: 3px;
  padding: 1px 3px;
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.1em;
  line-height: 1.2;
  text-transform: uppercase;
  color: var(--on-gold);
  background: var(--gold);
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
