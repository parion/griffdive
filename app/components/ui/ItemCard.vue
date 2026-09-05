<script setup lang="ts">
import { itemImageUrl } from '~~/shared/data/images'
import type { Item } from '~~/shared/data/types'

const props = withDefaults(defineProps<{
  item: Item
  selected?: boolean
  disabled?: boolean
  compact?: boolean
}>(), { compact: false, selected: false, disabled: false })

defineEmits<{ select: [] }>()

const imageUrl = computed(() => itemImageUrl(props.item))
</script>

<template>
  <button
    class="item-card"
    :class="{ selected, disabled, compact }"
    type="button"
    :data-category="item.category.toLowerCase()"
    :disabled="disabled"
    @click="$emit('select')"
  >
    <span class="item-top">
      <img
        v-if="imageUrl"
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
}

.item-name { font-weight: 700; }
.item-meta { display: flex; gap: 0.35rem; flex-wrap: wrap; }
.item-tags { display: flex; gap: 0.3rem; flex-wrap: wrap; }

.tag {
  font-size: 0.65rem;
  color: var(--muted);
  border: 1px dashed var(--border);
  border-radius: 4px;
  padding: 0 0.35rem;
}
</style>
