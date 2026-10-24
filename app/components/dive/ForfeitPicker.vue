<script setup lang="ts">
import { itemImageUrl } from '~~/shared/data/images'
import type { Item } from '~~/shared/data/types'
import { categoryLabel } from '~/utils/itemCategory'

// One diver's forfeit offer: the handful of their own items the engine dealt
// them after a failed mission. They choose the one they lose.
const props = withDefaults(defineProps<{
  items: Item[]
  label: string
  disabled?: boolean
  confirmed?: boolean
}>(), { disabled: false, confirmed: false })

const selected = defineModel<string | null>({ default: null })

const tiles = computed(() => props.items.map(item => ({
  item,
  image: itemImageUrl(item),
  tier: item.tier.toUpperCase(),
})))

function choose(itemId: string): void {
  if (props.disabled) {
    return
  }
  selected.value = selected.value === itemId ? null : itemId
}

// The Confiscated stamp only lands on the surrendered tile once the diver has
// held to confirm — before that the tile is a plain selection.
function gone(itemId: string): boolean {
  return props.confirmed && selected.value === itemId
}
</script>

<template>
  <div
    role="radiogroup"
    :aria-label="label"
    class="sur-tiles"
  >
    <button
      v-for="(tile, index) in tiles"
      :key="tile.item.id"
      type="button"
      role="radio"
      class="sur-tile"
      :class="{ on: selected === tile.item.id, stamped: gone(tile.item.id), faded: confirmed && selected !== tile.item.id }"
      :style="{ animationDelay: `${index * 60}ms` }"
      :data-tier="tile.tier"
      :disabled="disabled"
      :aria-checked="selected === tile.item.id"
      :aria-label="`${tile.item.displayName}, tier ${tile.item.tier}`"
      @click="choose(tile.item.id)"
    >
      <span class="sur-top">
        <span class="sur-cat">{{ categoryLabel(tile.item.category) }}</span>
        <span class="sur-tier disp">{{ tile.tier }}</span>
      </span>

      <span
        class="sur-media"
        aria-hidden="true"
      >
        <img
          v-if="tile.image"
          :src="tile.image"
          alt=""
          loading="lazy"
          draggable="false"
        >
      </span>

      <span class="sur-foot">
        <span
          class="sur-item-name disp"
          :style="fitWord(tile.item.displayName)"
        >{{ tile.item.displayName }}</span>
        <span
          class="sur-mark"
          :class="{ empty: selected !== tile.item.id }"
        >{{ gone(tile.item.id) ? 'Removed ✓' : selected === tile.item.id ? 'Marked for removal' : 'Select' }}</span>
      </span>

      <span
        v-if="gone(tile.item.id)"
        class="sur-stamp disp"
      >Confiscated</span>
    </button>
  </div>
</template>

<style scoped>
.sur-tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 240px));
  justify-content: center;
  gap: var(--gap-grid);
  align-items: stretch;
}

.sur-tile {
  --edge: var(--line-3);
  --tier: var(--tier-c);
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  min-width: 0;
  padding: var(--sp-4);
  border: 1px solid var(--edge);
  background: linear-gradient(180deg, color-mix(in srgb, var(--tier) 10%, var(--panel)), var(--panel) 55%);
  color: var(--text);
  text-align: left;
  font: inherit;
  cursor: pointer;
  animation: riseIn 0.45s var(--ease-out) backwards;
  clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px);
  transition: transform var(--dur-med) var(--ease-out), filter var(--dur-med), box-shadow var(--dur-med), opacity var(--dur-med);
}
.sur-tile[data-tier='C'] { --tier: var(--tier-c); }
.sur-tile[data-tier='B'] { --tier: var(--tier-b); }
.sur-tile[data-tier='A'] { --tier: var(--tier-a); }
.sur-tile[data-tier='S'] { --tier: var(--tier-s); }
.sur-tile[data-tier='S+'] { --tier: var(--tier-splus); }
.sur-tile:disabled { cursor: default; }
.sur-tile:hover:not(:disabled):not(.on) { transform: translateY(-4px); filter: brightness(1.08); }
.sur-tile.on {
  --edge: var(--red);
  transform: translateY(-6px);
  background: linear-gradient(180deg, color-mix(in srgb, var(--red) 16%, var(--panel)), var(--panel) 70%);
  box-shadow: inset 0 0 0 2px var(--red), 0 0 30px color-mix(in srgb, var(--red) 30%, transparent);
}
.sur-tile.faded { opacity: 0.38; filter: saturate(0.4); }

.sur-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sp-2);
  min-height: 28px;
}
.sur-cat {
  min-width: 0;
  color: var(--muted);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sur-tier {
  color: var(--tier);
  font-size: 34px;
  line-height: 0.8;
  text-shadow: 0 0 18px color-mix(in srgb, var(--tier) 45%, transparent);
}

/* The art is the card, same letterboxed well as the loot draft. */
.sur-media {
  position: relative;
  display: block;
  aspect-ratio: 4 / 3;
  border: 1px solid var(--line-2);
  background:
    radial-gradient(ellipse 70% 70% at 50% 55%, color-mix(in srgb, var(--tier) 14%, transparent), transparent 75%),
    linear-gradient(rgba(184, 176, 141, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(184, 176, 141, 0.04) 1px, transparent 1px),
    var(--ground);
  background-size: 100% 100%, 22px 22px, 22px 22px, auto;
  overflow: hidden;
}
.sur-media img {
  position: absolute;
  inset: 9%;
  width: 82%;
  height: 82%;
  object-fit: contain;
  filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.55));
  transition: transform var(--dur-med) var(--ease-out), filter var(--dur-med);
}
.sur-tile:hover:not(:disabled) .sur-media img { transform: scale(1.05); }
.sur-tile.on .sur-media { border-color: color-mix(in srgb, var(--red) 60%, var(--line-2)); }
.sur-tile.on .sur-media img { filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.55)) grayscale(0.6) brightness(0.8); }

.sur-foot {
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-top: auto;
}
.sur-item-name {
  font-size: min(15px, 100cqi / var(--fit-len, 1));
  line-height: 1.1;
  color: var(--khaki);
}
.sur-tile.on .sur-item-name { color: var(--text); }
.sur-mark {
  color: var(--red);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.sur-mark.empty { color: var(--dim); }

.sur-stamp {
  position: absolute;
  left: 0;
  right: 0;
  top: 38%;
  z-index: 1;
  width: max-content;
  padding: 6px 14px;
  margin: 0 auto;
  font-size: var(--fs-body);
  background: var(--ground);
  border: 3px solid var(--red);
  color: var(--red);
  white-space: nowrap;
  transform: rotate(-7deg);
  animation: stampIn 0.42s var(--ease-out) both;
}

@media (max-width: 720px) {
  .sur-tiles { grid-template-columns: minmax(0, 1fr); gap: var(--sp-3); }
  .sur-tile {
    display: grid;
    grid-template-columns: 104px minmax(0, 1fr);
    grid-template-rows: auto 1fr;
    column-gap: var(--sp-4);
    row-gap: var(--sp-2);
  }
  .sur-tile.on { transform: none; }
  .sur-media { grid-row: 1 / 3; aspect-ratio: 1; }
  .sur-top, .sur-foot { grid-column: 2; }
  .sur-stamp { top: 40%; left: 30%; right: 0; }
}
</style>
