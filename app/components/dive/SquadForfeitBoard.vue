<script setup lang="ts">
import { itemImageUrl } from '~~/shared/data/images'
import type { Item } from '~~/shared/data/types'

interface SquadForfeit {
  id: string
  name: string
  offer: Item[]
  removedId: string | null
}

// The squad's forfeits in the draft board's grammar: each diver's dealt items
// as icon tiles, the removed one struck red once they choose.
const props = defineProps<{ divers: SquadForfeit[] }>()

const cards = computed(() => props.divers.map(diver => ({
  ...diver,
  tiles: diver.offer.map(item => ({
    item,
    tier: item.tier.toUpperCase(),
    removed: diver.removedId === item.id,
    faded: diver.removedId !== null && diver.removedId !== item.id,
  })),
  status: diver.removedId ? 'Removed' : diver.offer.length > 0 ? 'Choosing' : 'Nothing to remove',
})))

function label(card: typeof cards.value[number], tile: typeof cards.value[number]['tiles'][number]): string {
  return `${tile.item.displayName}, ${tile.tier} tier${tile.removed ? ' — removed' : ''}`
}
</script>

<template>
  <section
    class="squad-board"
    aria-label="Squad forfeits"
  >
    <span class="lbl board-lbl">Squad forfeits</span>
    <div class="board-grid">
      <article
        v-for="(card, index) in cards"
        :key="card.id"
        class="squad-pick"
        :class="{ done: card.removedId !== null }"
        :style="{ '--i': index }"
        :aria-label="`${card.name}: ${card.status}`"
      >
        <header class="card-head">
          <span class="card-name">{{ card.name }}</span>
          <span class="card-status">{{ card.status }}</span>
        </header>
        <ul
          v-if="card.tiles.length"
          class="tiles"
        >
          <li
            v-for="tile in card.tiles"
            :key="tile.item.id"
          >
            <AppTooltip :content="label(card, tile)">
              <span
                class="tile"
                :class="{ removed: tile.removed, faded: tile.faded }"
                :data-tier="tile.tier"
                role="img"
                tabindex="0"
                :aria-label="label(card, tile)"
              >
                <img
                  v-if="itemImageUrl(tile.item)"
                  :src="itemImageUrl(tile.item)"
                  alt=""
                  loading="lazy"
                  draggable="false"
                >
                <span
                  v-else
                  class="disp tile-glyph"
                >{{ tile.tier }}</span>
              </span>
            </AppTooltip>
          </li>
        </ul>
      </article>
    </div>
  </section>
</template>

<style scoped>
.squad-board { display: flex; flex-direction: column; gap: 6px; }
.board-lbl { font-size: 10px; }
.board-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 10px;
}
.squad-pick {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  animation: riseIn 0.42s var(--ease-out) calc(var(--i) * 90ms) both;
}
.card-head { display: flex; align-items: center; gap: 7px; min-width: 0; }
.card-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text);
}
.card-status {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--dim);
}
.done .card-status { color: var(--red); }

.tiles { display: flex; flex-wrap: wrap; gap: 6px; margin: 0; padding: 0; list-style: none; }
.tile {
  position: relative;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px solid var(--line-2);
  border-bottom: 2px solid currentColor;
  background: var(--ground);
  transition: opacity var(--dur-med) var(--ease-out), filter var(--dur-med) var(--ease-out), border-color var(--dur-med);
}
.tile img { width: 34px; height: 34px; object-fit: contain; pointer-events: none; }
.tile-glyph { font-size: 0.8rem; }
.tile.faded { opacity: 0.32; filter: grayscale(0.8); }
.tile.removed {
  color: var(--red);
  border-color: var(--red);
  background: color-mix(in srgb, var(--red) 14%, var(--ground));
  box-shadow: 0 0 12px color-mix(in srgb, var(--red) 40%, transparent);
  animation: tile-remove 0.5s var(--ease-out) both;
}

@keyframes tile-remove {
  0% { transform: scale(1.35); filter: brightness(2); }
  60% { transform: scale(0.94); }
  100% { transform: none; filter: none; }
}
</style>
