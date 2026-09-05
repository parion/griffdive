<script setup lang="ts">
import { itemImageUrl } from '~~/shared/data/images'
import type { Item } from '~~/shared/data/types'

const props = withDefaults(defineProps<{
  item: Item
  selected?: boolean
  disabled?: boolean
  compact?: boolean
  showcase?: boolean
  owners?: string[]
}>(), {
  compact: false,
  selected: false,
  disabled: false,
  showcase: false,
  owners: () => [],
})

defineEmits<{ select: [] }>()

const imageUrl = computed(() => itemImageUrl(props.item))

const ownerInitials = computed(() =>
  props.owners.map(name => name.trim().slice(0, 2).toUpperCase()))
</script>

<template>
  <button
    class="item-card"
    :class="{ selected, disabled, compact, showcase }"
    type="button"
    :data-category="item.category.toLowerCase()"
    :disabled="disabled"
    @click="$emit('select')"
  >
    <span
      v-if="showcase && imageUrl"
      class="item-media"
    >
      <img
        :src="imageUrl"
        alt=""
        loading="lazy"
        draggable="false"
      >
    </span>
    <span class="item-top">
      <img
        v-if="!showcase && imageUrl"
        class="item-icon"
        :src="imageUrl"
        alt=""
        loading="lazy"
        draggable="false"
      >
      <span
        class="tier-dot"
        :data-tier="item.tier"
      >{{ item.tier.toUpperCase() }}</span>
      <span class="item-name">{{ item.displayName }}</span>
    </span>
    <span
      v-if="item.antitank"
      class="item-meta"
    >
      <span class="chip warn">AT</span>
    </span>
    <span
      v-if="!compact && (item.passive || item.armorRating)"
      class="item-stats muted small"
    >
      <span v-if="item.armorRating">{{ item.armorRating }} armor · {{ item.speed }} spd · {{ item.stamina }} stam</span>
      <span v-if="item.passive">{{ item.passive }}</span>
    </span>
    <span
      v-if="!compact && item.tags.length"
      class="item-tags"
    >
      <span
        v-for="tag in item.tags"
        :key="tag"
        class="tag"
      >{{ tag }}</span>
    </span>
    <span
      v-if="showcase && owners.length > 1"
      class="item-owners"
    >
      <span
        v-for="(name, i) in owners"
        :key="i"
        class="owner-chip"
        :title="name"
      >{{ ownerInitials[i] }}</span>
    </span>
  </button>
</template>

<style scoped>
.item-card {
  --cat: transparent;
  display: grid;
  gap: 0.35rem;
  text-align: left;
  background:
    linear-gradient(165deg, color-mix(in srgb, var(--cat) 14%, transparent), transparent 62%),
    var(--bg-raised);
  border: 1px solid;
  border-color: color-mix(in srgb, var(--cat) 26%, var(--border));
  border-radius: 10px;
  padding: 0.65rem 0.75rem;
  color: var(--text);
  font: inherit;
  cursor: pointer;
  transition: border-color var(--dur-fast) ease, transform var(--dur-fast) var(--ease-out);
}

.item-card[data-category='supply'] { --cat: var(--cat-supply); }
.item-card[data-category='eagle'] { --cat: var(--cat-eagle); }
.item-card[data-category='orbital'] { --cat: var(--cat-orbital); }
.item-card[data-category='defense'] { --cat: var(--cat-defense); }
.item-card[data-category='armor'],
.item-card[data-category='armorpassive'] { --cat: var(--cat-armor); }
.item-card[data-category='booster'] { --cat: var(--cat-booster); }
.item-card[data-category='primary'] { --cat: var(--cat-primary); }
.item-card[data-category='secondary'],
.item-card[data-category='throwable'] { --cat: var(--cat-gear); }

.item-card.compact { padding: 0.4rem 0.55rem; }
.item-card:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--cat) 48%, var(--border));
  transform: translateY(-2px);
}
.item-card:active:not(:disabled) { transform: translateY(0) scale(0.98); }
.item-card.selected { border-color: var(--gold); outline: 1px solid var(--gold); }
.item-card.disabled { cursor: default; opacity: 0.9; }

.item-top { display: flex; align-items: center; gap: 0.5rem; }
.item-name { font-weight: 700; min-width: 0; overflow-wrap: anywhere; }

.item-icon {
  flex-shrink: 0;
  width: 2.25rem;
  height: 2.25rem;
  object-fit: contain;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.15rem;
}
.item-card.compact .item-icon { width: 1.75rem; height: 1.75rem; }

.tier-dot {
  display: inline-grid;
  place-items: center;
  min-width: 1.5rem;
  height: 1.5rem;
  border-radius: 5px;
  font-size: 0.7rem;
  font-weight: 700;
  border: 1px solid currentColor;
  flex-shrink: 0;
}

.item-meta { display: flex; gap: 0.35rem; flex-wrap: wrap; }
.item-tags { display: flex; gap: 0.3rem; flex-wrap: wrap; }

.tag {
  font-size: 0.65rem;
  color: var(--muted);
  border: 1px dashed var(--border);
  border-radius: 4px;
  padding: 0 0.35rem;
}

.item-card.showcase { padding: 0.5rem; gap: 0.45rem; }

.item-media {
  display: grid;
  place-items: center;
  aspect-ratio: 1;
  border-radius: 8px;
  background: color-mix(in srgb, var(--cat) 12%, var(--bg));
  border: 1px solid color-mix(in srgb, var(--cat) 20%, var(--border));
  overflow: hidden;
}
.item-media img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.item-card[data-category='primary'] .item-media,
.item-card[data-category='secondary'] .item-media {
  aspect-ratio: 5 / 3;
  padding: 0.35rem;
}
.item-card:not([data-category='primary']):not([data-category='secondary']) .item-media { padding: 0.75rem; }

.item-owners { display: flex; gap: 0.25rem; flex-wrap: wrap; }
.owner-chip {
  font-size: 0.6rem;
  font-weight: 700;
  color: var(--muted);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 0 0.3rem;
}
</style>
