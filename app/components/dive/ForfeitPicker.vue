<script setup lang="ts">
import { itemImageUrl } from '~~/shared/data/images'
import type { Item } from '~~/shared/data/types'

// One diver's forfeit offer: the handful of their own items the engine dealt
// them after a failed mission. They choose the one they lose.
const props = withDefaults(defineProps<{
  items: Item[]
  label: string
  disabled?: boolean
  confirmed?: boolean
}>(), { disabled: false, confirmed: false })

const selected = defineModel<string | null>({ default: null })

const tiles = computed(() => props.items.map(item => ({ item, image: itemImageUrl(item) })))

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
      v-for="tile in tiles"
      :key="tile.item.id"
      type="button"
      role="radio"
      class="sur-tile"
      :class="{ on: selected === tile.item.id, stamped: gone(tile.item.id) }"
      :disabled="disabled"
      :aria-checked="selected === tile.item.id"
      :aria-label="`${tile.item.displayName}, tier ${tile.item.tier}`"
      @click="choose(tile.item.id)"
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
        v-if="gone(tile.item.id)"
        class="sur-stamp disp"
      >Confiscated</span>
    </button>
  </div>
</template>

<style scoped>
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
