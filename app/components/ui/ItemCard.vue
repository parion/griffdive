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
  lead?: boolean
  reserve?: boolean
  out?: boolean
  note?: string
}>(), {
  compact: false,
  selected: false,
  disabled: false,
  showcase: false,
  owners: () => [],
  lead: false,
  reserve: false,
  out: false,
  note: '',
})

defineEmits<{ select: [] }>()

const imageUrl = computed(() => itemImageUrl(props.item))

const ownerInitials = computed(() =>
  props.owners.map(name => name.trim().slice(0, 2).toUpperCase()))
</script>

<template>
  <button
    class="item-card cut-sm"
    :class="{ selected, disabled, compact, showcase, lead, out }"
    type="button"
    :data-category="item.category.toLowerCase()"
    :style="reserve ? { borderStyle: 'dashed' } : undefined"
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
        class="tier-dot tb"
        :data-tier="item.tier"
      >{{ item.tier.toUpperCase() }}</span>
      <span class="item-name">{{ item.displayName }}</span>
    </span>
    <span class="item-cat odl">{{ item.category }}</span>
    <span
      v-if="lead || reserve || item.antitank"
      class="item-meta"
    >
      <span
        v-if="lead"
        class="tag lead"
      >Ceiling</span>
      <span
        v-if="reserve"
        class="tag reserve"
      >Reserve</span>
      <span
        v-if="item.antitank"
        class="tag at"
      >AT</span>
    </span>
    <span
      v-if="!compact && (item.passive || item.armorRating)"
      class="item-stats muted small"
    >
      <span v-if="item.armorRating">{{ item.armorRating }} armor · {{ item.speed }} spd · {{ item.stamina }} stam</span>
      <span v-if="item.passive">{{ item.passive }}</span>
    </span>
    <span
      v-if="note"
      class="item-note muted small"
    >{{ note }}</span>
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
  --cat: var(--cat-gear);
  position: relative;
  display: grid;
  gap: 0.3rem;
  text-align: left;
  background: var(--panel);
  border: 1px solid color-mix(in srgb, var(--cat) 30%, var(--line-2));
  padding: 0.55rem 0.65rem;
  color: var(--text);
  font: inherit;
  cursor: pointer;
  transition: border-color var(--dur-fast), filter var(--dur-fast), transform var(--dur-fast) var(--ease-out);
}
.item-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--cat);
  opacity: 0.7;
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

.item-card.compact { padding: 0.35rem 0.5rem; }
.item-card:hover:not(:disabled) {
  border-color: var(--cat);
  filter: brightness(1.08);
}
.item-card:active:not(:disabled) { transform: translateY(1px); }
.item-card.selected { border-color: var(--gold); }
.item-card.disabled { cursor: default; opacity: 0.85; }
.item-card.lead {
  border-color: var(--gold);
  animation: glow 2.6s ease-in-out infinite;
}
.item-card.out {
  border-color: var(--red);
  opacity: 0.6;
}
.item-card.out .item-media,
.item-card.out .item-icon { filter: grayscale(0.8); }

.item-top { display: flex; align-items: center; gap: 0.5rem; padding-left: 3px; }
.item-name { font-weight: 700; min-width: 0; overflow-wrap: break-word; }

.item-icon {
  flex-shrink: 0;
  width: 2.1rem;
  height: 2.1rem;
  object-fit: contain;
  background: var(--ground);
  border: 1px solid var(--line-2);
  padding: 0.15rem;
}
.item-card.compact .item-icon { width: 1.6rem; height: 1.6rem; }

.tier-dot {
  min-width: 1.4rem;
  height: 1.4rem;
  font-size: 0.72rem;
  border: 1px solid currentColor;
  flex-shrink: 0;
}

.item-cat { padding-left: 3px; }

.item-meta { display: flex; gap: 0.3rem; flex-wrap: wrap; padding-left: 3px; }

.tag {
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  border: 1px solid var(--line-4);
  padding: 0 0.35rem;
  color: var(--khaki);
}
.tag.lead { color: var(--gold); border-color: var(--gold); }
.tag.reserve { color: var(--khaki); border-style: dashed; }
.tag.at { color: var(--red); border-color: var(--red); }

.item-card.showcase { padding: 0.5rem; gap: 0.4rem; }

.item-media {
  display: grid;
  place-items: center;
  aspect-ratio: 1;
  background: var(--ground);
  border: 1px solid var(--line-2);
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
.item-card:not([data-category='primary']):not([data-category='secondary']) .item-media { padding: 0.7rem; }

.item-owners { display: flex; gap: 0.25rem; flex-wrap: wrap; }
.owner-chip {
  font-size: 0.6rem;
  font-weight: 700;
  color: var(--muted);
  border: 1px solid var(--line-2);
  padding: 0 0.3rem;
}
</style>
