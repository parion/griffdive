<script setup lang="ts">
import { ITEMS_BY_ID } from '~~/shared/data/catalog'
import { itemImageUrl } from '~~/shared/data/images'
import { sortKitItems } from '~~/shared/data/ordering'
import type { Item } from '~~/shared/data/types'
import type { DiveState, ItemRef } from '~~/shared/engine/types'

const props = withDefaults(defineProps<{
  state: DiveState
  canControl?: boolean
  confirmed?: boolean
}>(), { canControl: true, confirmed: false })

const selected = defineModel<ItemRef | null>({ default: null })

interface Tile {
  item: Item
  image?: string
}

interface Kit {
  diverId: string
  name: string
  initial: string
  isHost: boolean
  items: Tile[]
}

// The squad's kits, one column per diver. The picker renders personal
// inventories only — the same source `FORFEIT_ITEM` validates against.
const kits = computed<Kit[]>(() => props.state.divers.map((diver) => {
  const items = sortKitItems(
    (props.state.personalInventories[diver.id] ?? [])
      .map(id => ITEMS_BY_ID.get(id))
      .filter((item): item is Item => item !== undefined),
  )
  return {
    diverId: diver.id,
    name: diver.name,
    initial: diver.name.trim().slice(0, 1).toUpperCase(),
    isHost: diver.isHost,
    items: items.map(item => ({ item, image: itemImageUrl(item) })),
  }
}))

function isSelected(diverId: string, itemId: string): boolean {
  return selected.value?.ownerId === diverId && selected.value?.itemId === itemId
}

function choose(diverId: string, itemId: string): void {
  if (!props.canControl) {
    return
  }
  selected.value = isSelected(diverId, itemId) ? null : { ownerId: diverId, itemId }
}

// The Confiscated stamp only lands on the surrendered tile once the host has
// held to confirm — before that the tile is a plain selection.
function gone(diverId: string, itemId: string): boolean {
  return props.confirmed && isSelected(diverId, itemId)
}
</script>

<template>
  <div
    role="radiogroup"
    aria-labelledby="surrender-h"
    class="sur-grid"
  >
    <div
      v-for="kit in kits"
      :key="kit.diverId"
      role="group"
      :aria-label="kit.name"
      class="sur-col"
    >
      <div class="sur-head">
        <span
          class="sur-av cut-sm disp"
          :class="{ host: kit.isHost }"
          aria-hidden="true"
        >{{ kit.initial }}</span>
        <span class="sur-name">{{ kit.name }}</span>
        <svg
          v-if="kit.isHost"
          class="sur-crown"
          viewBox="0 0 24 24"
          fill="currentColor"
          role="img"
          aria-label="Host"
        ><path d="M3 18h18v2H3zM4 16l2-9 4 4 2-6 2 6 4-4 2 9z" /></svg>
        <span class="sur-count">{{ selected?.ownerId === kit.diverId ? '1 / 1' : '0 / 1' }}</span>
      </div>

      <div class="sur-tiles">
        <button
          v-for="tile in kit.items"
          :key="tile.item.id"
          type="button"
          role="radio"
          class="sur-tile"
          :class="{ on: isSelected(kit.diverId, tile.item.id), stamped: gone(kit.diverId, tile.item.id) }"
          :disabled="!canControl"
          :aria-checked="isSelected(kit.diverId, tile.item.id)"
          :aria-label="`${tile.item.displayName}, tier ${tile.item.tier}, ${kit.name}`"
          @click="choose(kit.diverId, tile.item.id)"
        >
          <span class="sur-media">
            <img
              v-if="tile.image"
              :src="tile.image"
              alt=""
              loading="lazy"
              draggable="false"
            >
            <svg
              v-else
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              aria-hidden="true"
            >
              <rect
                x="4"
                y="4"
                width="16"
                height="16"
                stroke-dasharray="3 3"
              />
              <path d="M9 12h6" />
            </svg>
          </span>
          <span class="sur-item-name">{{ tile.item.displayName }}</span>
          <span
            class="tier-badge sm"
            :data-tier="tile.item.tier"
          >{{ tile.item.tier.toUpperCase() }}</span>
          <span
            v-if="gone(kit.diverId, tile.item.id)"
            class="sur-stamp disp"
          >Confiscated</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sur-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr));
  gap: var(--gap-grid);
}

.sur-col {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  min-width: 0;
}

.sur-head {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  min-height: 34px;
  padding-bottom: var(--sp-2);
  border-bottom: 1px solid var(--line-2);
}
.sur-av {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  background: var(--line-2);
  color: var(--text);
  font-size: 12px;
}
.sur-av.host { background: var(--gold); color: var(--on-gold); }
.sur-name {
  font-size: var(--fs-sm);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sur-crown {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  color: var(--gold);
}
.sur-count {
  margin-left: auto;
  font-size: var(--fs-cap);
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--muted);
  white-space: nowrap;
}

.sur-tiles {
  display: grid;
  gap: 5px var(--sp-2);
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
}

.sur-tile {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  height: 46px;
  padding: 3px var(--sp-3) 3px 3px;
  text-align: left;
  background: var(--panel);
  border: 1px solid var(--line-2);
  color: var(--text);
  cursor: pointer;
  transition: border-color var(--dur-fast), background-color var(--dur-fast);
}
.sur-tile:hover:not(:disabled) { border-color: var(--khaki); }
.sur-tile:disabled { cursor: default; }
.sur-tile.on { border-color: var(--red); background: color-mix(in srgb, var(--red) 10%, var(--panel)); }

.sur-media {
  display: grid;
  place-items: center;
  width: 48px;
  height: 40px;
  flex-shrink: 0;
  background: var(--ground);
  border-right: 1px solid var(--line-1);
  color: var(--ghost-ink);
}
.sur-media img {
  max-width: 34px;
  max-height: 32px;
  object-fit: contain;
  filter: brightness(0.92) contrast(1.06);
}

.sur-item-name {
  flex-grow: 1;
  min-width: 0;
  font-size: var(--fs-cap);
  font-weight: 700;
  letter-spacing: 0.05em;
  line-height: 1.15;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sur-tile .tier-badge { flex-shrink: 0; }

.sur-stamp {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 1;
  width: 124px;
  height: 24px;
  margin: -12px 0 0 -62px;
  display: grid;
  place-items: center;
  font-size: var(--fs-cap);
  background: var(--ground);
  border: 2px solid var(--red);
  color: var(--red);
  transform: rotate(-7deg);
  animation: stampIn 0.42s var(--ease-out) both;
}
</style>
