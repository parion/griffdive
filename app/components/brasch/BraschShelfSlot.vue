<script setup lang="ts">
import { itemImageUrl } from '~~/shared/data/images'
import type { Item } from '~~/shared/data/types'
import { itemPrice } from '~~/shared/engine/rewards'
import type { BargainShelfSlot } from '~~/shared/engine/selectors'
import type { RewardTier } from '~~/shared/engine/types'

// One peg on Brasch's shelf. The art is the product, a tier spotlight sells the
// rarity, and the price hangs off it like a requisition tag. No card frame:
// the shelf itself (in BraschBargains) draws the line everything stands on.
const props = defineProps<{
  entry: BargainShelfSlot
  verdict: { allowed: boolean, reason: string | null }
}>()

const emit = defineEmits<{ buy: [] }>()

const item = computed(() => props.entry.item)
const price = computed(() => (item.value ? itemPrice(item.value) : 0))
const tier = computed(() => (item.value ? tierOf(item.value) : 'C'))
const name = computed(() => item.value?.displayName ?? 'No stock')
const kindLabel = computed(() => (props.entry.kind === 'stratagem' ? 'Stratagem' : categoryLabel(props.entry.kind)))

function tierOf(value: Item): RewardTier {
  return value.tier.toUpperCase() as RewardTier
}
</script>

<template>
  <li
    class="slot"
    :class="[entry.status, { empty: !item }]"
    :data-tier="tier"
  >
    <div class="slot-head">
      <span class="slot-kind">{{ kindLabel }}</span>
      <ItemTierBadge
        v-if="item"
        :tier="tier"
        size="sm"
      />
    </div>

    <div class="slot-stage">
      <span
        class="slot-glow"
        aria-hidden="true"
      />
      <img
        v-if="item && itemImageUrl(item)"
        class="slot-art"
        :src="itemImageUrl(item)"
        alt=""
        loading="lazy"
        draggable="false"
      >
      <span
        v-else-if="!item"
        class="slot-none"
        aria-hidden="true"
      >—</span>

      <span
        v-if="entry.status === 'bought'"
        class="slot-stamp disp"
        role="img"
        aria-label="Requisitioned"
      >Taken</span>
    </div>

    <span class="slot-name">{{ name }}</span>

    <button
      v-if="item && entry.status === 'open'"
      class="slot-tag"
      type="button"
      :disabled="!verdict.allowed"
      :title="verdict.reason ?? undefined"
      :aria-label="`Buy ${name} for ${price} credits`"
      @click="emit('buy')"
    >
      <span
        class="tag-hole"
        aria-hidden="true"
      />
      <span class="tag-word">Buy</span>
      <CreditAmount
        class="tag-price"
        :value="price"
      />
    </button>

    <span
      v-else-if="entry.status === 'bought'"
      class="slot-tag spent"
      aria-hidden="true"
    >
      <span class="tag-hole" />
      <span class="tag-word">Taken</span>
    </span>

    <span
      v-else-if="entry.status === 'locked' || entry.status === 'heldBack'"
      class="slot-veil"
    >
      <IconLock />
      {{ entry.status === 'locked' ? 'Next mission' : 'Next operation' }}
    </span>

    <span
      v-else-if="!item"
      class="slot-empty"
    >No stock</span>
  </li>
</template>

<style scoped>
.slot {
  --tier: var(--tier-c);
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
  padding: 0 2px 10px;
}
.slot[data-tier='B'] { --tier: var(--tier-b); }
.slot[data-tier='A'] { --tier: var(--tier-a); }
.slot[data-tier='S'] { --tier: var(--tier-s); }

.slot-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  min-height: 18px;
  padding-bottom: 5px;
  border-bottom: 1px solid color-mix(in srgb, var(--tier) 35%, var(--line-2));
}
.slot-kind {
  color: var(--muted);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

/* The product floats over its own tier spotlight. There is no frame: the art,
   the wash and the shelf plank do the boxing. */
.slot-stage {
  position: relative;
  display: grid;
  place-items: center;
  aspect-ratio: 1;
  overflow: hidden;
  background:
    radial-gradient(ellipse 62% 58% at 50% 54%, color-mix(in srgb, var(--tier) 16%, transparent), transparent 74%),
    linear-gradient(180deg, color-mix(in srgb, var(--tier) 4%, transparent), transparent 70%);
}
.slot-glow {
  position: absolute;
  left: 50%;
  bottom: 4%;
  width: 72%;
  height: 26%;
  translate: -50% 0;
  border-radius: 50%;
  background: color-mix(in srgb, var(--tier) 16%, transparent);
  filter: blur(12px);
}
.slot-art {
  position: relative;
  width: 82%;
  height: 82%;
  object-fit: contain;
  filter: drop-shadow(0 12px 18px rgba(0, 0, 0, 0.55));
  transition: scale var(--dur-med) var(--ease-out), filter var(--dur-med);
}
.slot:hover .slot-art { scale: 1.05; filter: drop-shadow(0 14px 22px rgba(0, 0, 0, 0.6)) brightness(1.06); }
.slot-none {
  color: var(--ghost-ink);
  font-size: 28px;
}

.slot-name {
  min-width: 0;
  min-height: 2.3em;
  overflow: hidden;
  color: var(--text);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.15;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

/* A punched requisition tag. The hole is a real notch so the tag reads as
   something hanging off the product, not another button in a grid. */
.slot-tag {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  min-height: 34px;
  margin-top: auto;
  padding: 0 10px 0 16px;
  border: 0;
  background: linear-gradient(100deg, color-mix(in srgb, var(--gold) 22%, var(--panel)), color-mix(in srgb, var(--gold) 10%, var(--panel)));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--gold) 42%, var(--line-3));
  color: var(--gold);
  font: 700 10px var(--font-body);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  cursor: pointer;
  clip-path: polygon(0 0, 100% 0, 100% 100%, 10px 100%, 0 calc(100% - 8px));
  transition: filter var(--dur-fast), translate var(--dur-fast) var(--ease-out);
}
.slot-tag:hover:not(:disabled) { filter: brightness(1.12); translate: 0 -1px; }
.slot-tag:disabled {
  background: transparent;
  box-shadow: inset 0 0 0 1px var(--line-3);
  color: var(--muted);
  cursor: not-allowed;
}
.tag-hole {
  position: absolute;
  left: 5px;
  top: 50%;
  width: 4px;
  height: 4px;
  translate: 0 -50%;
  border-radius: 50%;
  background: var(--ground);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--gold) 60%, var(--line-3));
}
.tag-price { font-size: 12px; }
.slot-tag.spent {
  justify-content: center;
  background: transparent;
  box-shadow: inset 0 0 0 1px var(--line-3);
  color: var(--dim);
}
.slot-tag.spent .tag-hole { display: none; }

.slot-stamp {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 2;
  translate: -50% -50%;
  padding: 3px 9px;
  border: 2px solid var(--gold);
  color: var(--gold);
  font-size: 15px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  rotate: -9deg;
  opacity: 0.9;
  text-shadow: 0 0 12px color-mix(in srgb, var(--gold) 45%, transparent);
  animation: stamp-in 0.32s var(--ease-impact) both;
}
.slot.bought .slot-art { filter: grayscale(0.35) brightness(0.72); }

.slot-veil {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-height: 34px;
  margin-top: auto;
  border: 1px dashed var(--line-3);
  color: var(--dim);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.slot-veil :deep(svg) { width: 12px; height: 12px; }
.slot-empty {
  display: grid;
  place-items: center;
  min-height: 34px;
  margin-top: auto;
  color: var(--dim);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.slot.empty .slot-stage { opacity: 0.4; }

@keyframes stamp-in {
  0% { opacity: 0; scale: 2.2; rotate: -18deg; }
  70% { opacity: 1; scale: 0.94; }
  100% { opacity: 0.9; scale: 1; rotate: -9deg; }
}

@media (prefers-reduced-motion: reduce) {
  .slot-art { transition: none; }
  .slot-stamp { animation: none; }
}

@media (max-width: 620px) {
  .slot { gap: 5px; padding-bottom: 8px; }
  .slot-stage { aspect-ratio: 4 / 3; }
  .slot-name { min-height: 0; font-size: 12px; }
  .slot-tag { min-height: 32px; }
}
</style>
