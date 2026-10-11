<script setup lang="ts">
import { ITEMS_BY_ID } from '~~/shared/data/catalog'
import { itemImageUrl } from '~~/shared/data/images'
import type { Item } from '~~/shared/data/types'
import type { RewardOption } from '~~/shared/engine/rewards'
import type { DraftSummary } from '~~/shared/engine/selectors'

interface SquadDraft {
  id: string
  name: string
  summary: DraftSummary
}

const props = withDefaults(defineProps<{
  drafts: SquadDraft[]
  compact?: boolean
}>(), { compact: false })

interface Tile {
  key: string
  item: Item | null
  tier: string
  name: string
  banked: boolean
  banned: boolean
  faded: boolean
}

// A Cross pick shows the item it named; an open Cross is just the S+ slot.
function tileOf(option: RewardOption, summary: DraftSummary): Tile {
  const banked = summary.bankedOptionId === option.optionId
  const named = option.choice && banked && summary.bankedItemId
    ? ITEMS_BY_ID.get(summary.bankedItemId) ?? null
    : null
  const item = option.choice ? named : option.item
  const resolved = summary.status === 'banked' || summary.status === 'banned'
  return {
    key: option.optionId,
    item,
    tier: option.choice ? 'S+' : option.item.tier.toUpperCase(),
    name: option.choice ? (named ? `${named.displayName} via Liberty’s Cross` : 'Liberty’s Cross') : option.item.displayName,
    banked,
    banned: summary.bannedOptionIds.includes(option.optionId),
    faded: resolved && !banked,
  }
}

const cards = computed(() =>
  props.drafts.map(draft => ({
    ...draft,
    tiles: draft.summary.options.map(option => tileOf(option, draft.summary)),
    bankedItem: draft.summary.bankedItemId ? ITEMS_BY_ID.get(draft.summary.bankedItemId) ?? null : null,
  })))

function tileLabel(tile: Tile): string {
  const suffix = tile.banked ? ' — banked' : tile.banned ? ' — banned' : ''
  return `${tile.name}, ${tile.tier} tier${suffix}`
}

function statusLabel(card: typeof cards.value[number]): string {
  switch (card.summary.status) {
    case 'banked':
      return 'Banked'
    case 'banned':
      return 'Banned'
    case 'skipped':
      return 'Sat out'
    default:
      return 'Choosing'
  }
}
</script>

<template>
  <section
    class="squad-board"
    :class="{ compact }"
    aria-label="Squad drafts"
  >
    <span class="lbl board-lbl">Squad drafts</span>
    <div class="board-grid">
      <article
        v-for="(card, index) in cards"
        :key="card.id"
        class="squad-pick cut-sm"
        :class="{
          done: card.summary.status === 'banked',
          banned: card.summary.status === 'banned',
          skipped: card.summary.status === 'skipped',
        }"
        :style="{ '--i': index }"
        :aria-label="`${card.name}: ${statusLabel(card)}${card.bankedItem ? ` ${card.bankedItem.displayName}` : ''}`"
      >
        <header class="card-head">
          <span class="card-name">{{ card.name }}</span>
          <span
            v-if="card.summary.ceiling"
            class="tb card-ceiling"
            :data-tier="card.summary.ceiling"
            :aria-label="`Ceiling ${card.summary.ceiling}`"
          >{{ card.summary.ceiling }}</span>
          <span
            class="card-status"
            :class="card.summary.status"
          >
            <span
              v-if="card.summary.status === 'choosing'"
              class="pulse status-dot"
              aria-hidden="true"
            />
            {{ statusLabel(card) }}
          </span>
        </header>

        <ul
          v-if="card.tiles.length"
          class="tiles"
        >
          <li
            v-for="tile in card.tiles"
            :key="tile.key"
          >
            <AppTooltip :content="tileLabel(tile)">
              <span
                class="tile"
                :class="{ banked: tile.banked, banned: tile.banned, faded: tile.faded, cross: tile.tier === 'S+' }"
                :data-tier="tile.tier"
                role="img"
                tabindex="0"
                :aria-label="tileLabel(tile)"
              >
                <img
                  v-if="tile.item && itemImageUrl(tile.item)"
                  :src="itemImageUrl(tile.item)"
                  alt=""
                  loading="lazy"
                  draggable="false"
                >
                <span
                  v-else
                  class="disp tile-glyph"
                >{{ tile.tier }}</span>
                <span
                  class="tile-tier disp"
                  aria-hidden="true"
                >{{ tile.tier }}</span>
                <svg
                  v-if="tile.banned"
                  class="tile-ban"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.6"
                  aria-hidden="true"
                ><path d="M5 5l14 14M19 5L5 19" /></svg>
              </span>
            </AppTooltip>
          </li>
        </ul>
        <p
          v-else
          class="card-note"
        >
          Sat out this mission’s draft.
        </p>

        <p
          v-if="card.bankedItem"
          class="card-banked"
          :data-tier="card.tiles.find(tile => tile.banked)?.tier"
        >
          {{ card.bankedItem.displayName }}
        </p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.squad-board {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.board-lbl { font-size: 10px; }
.board-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 10px;
}
.compact .board-grid { grid-template-columns: 1fr; gap: 8px; }

.squad-pick {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  padding: 9px 10px 10px;
  border: 1px solid var(--line-2);
  background: var(--panel);
  animation: riseIn 0.42s var(--ease-out) calc(var(--i) * 90ms) both;
  transition: border-color var(--dur-med) var(--ease-out);
}
.squad-pick.done { border-color: color-mix(in srgb, var(--gold) 40%, var(--line-3)); }
.squad-pick.banned { border-color: color-mix(in srgb, var(--red) 45%, var(--line-3)); }
.squad-pick.skipped { opacity: 0.6; }

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
.card-ceiling {
  min-width: 22px;
  height: 18px;
  padding: 0 3px;
  font-size: 10px;
  border: 1px solid currentColor;
}
.card-status {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-left: auto;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  white-space: nowrap;
}
.card-status.choosing { color: var(--gold); }
.card-status.banked { color: var(--gold); }
.card-status.banned { color: var(--red); }
.status-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--gold); }

.tiles {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.tile {
  --t: currentColor;
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
.tile-tier {
  position: absolute;
  top: 1px;
  left: 2px;
  font-size: 8px;
  line-height: 1;
}
.tile.cross { background: color-mix(in srgb, var(--tier-splus) 10%, var(--ground)); }
.tile.faded { opacity: 0.32; filter: grayscale(0.8); }
.tile.banked {
  border-color: currentColor;
  box-shadow: 0 0 12px color-mix(in srgb, currentColor 40%, transparent);
  animation: tile-bank 0.5s var(--ease-out) both;
}
.tile.banned { opacity: 0.6; }
.tile-ban { position: absolute; inset: 6px; color: var(--red); }

.card-banked,
.card-note {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.card-note { color: var(--muted); font-weight: 400; text-transform: none; letter-spacing: 0; }

@keyframes tile-bank {
  0% { transform: scale(1.35); filter: brightness(2); }
  60% { transform: scale(0.94); }
  100% { transform: none; filter: none; }
}
</style>
