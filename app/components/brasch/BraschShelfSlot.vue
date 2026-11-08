<script setup lang="ts">
import { itemImageUrl } from '~~/shared/data/images'
import { itemPrice } from '~~/shared/engine/rewards'
import type { BargainShelfSlot } from '~~/shared/engine/selectors'

// One peg on Brasch's shelf. The art is the product and the card shell supplies
// the header, price and buy target; this component only chooses the art and the
// engine's status for that slot.
const props = defineProps<{
  entry: BargainShelfSlot
  verdict: { allowed: boolean, reason: string | null }
}>()

const emit = defineEmits<{ buy: [] }>()

const item = computed(() => props.entry.item)
const price = computed(() => (item.value ? itemPrice(item.value) : null))
const accent = computed(() => item.value?.tier ?? 'c')
const name = computed(() => item.value?.displayName ?? 'No stock')
const kindLabel = computed(() => (props.entry.kind === 'stratagem' ? 'Stratagem' : categoryLabel(props.entry.kind)))
const buyAriaLabel = computed(() => item.value && price.value !== null
  ? `Buy ${item.value.displayName}, ${item.value.tier.toUpperCase()} tier, for ${price.value} credits`
  : undefined)
</script>

<template>
  <BraschBargainCard
    class="slot"
    :kind="kindLabel"
    :name="name"
    :price="price"
    :status="entry.status"
    :accent="accent"
    :disabled="!verdict.allowed"
    :reason="verdict.reason"
    :buy-aria-label="buyAriaLabel"
    @buy="emit('buy')"
  >
    <template #stage>
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
    </template>

    <template #overlay>
      <span
        v-if="item"
        class="slot-tier-hint"
        aria-hidden="true"
      >{{ item.tier.toUpperCase() }} tier</span>
    </template>
  </BraschBargainCard>
</template>

<style scoped>
.slot-art {
  position: relative;
  width: 82%;
  height: 82%;
  object-fit: contain;
  filter: drop-shadow(0 12px 18px rgba(0, 0, 0, 0.55));
  transition: scale var(--dur-med) var(--ease-out), filter var(--dur-med);
}
.slot.actionable:hover .slot-art {
  scale: 1.06;
  filter: drop-shadow(0 14px 22px rgba(0, 0, 0, 0.6)) brightness(1.06);
}
.slot.bought .slot-art { filter: grayscale(0.35) brightness(0.72); }
.slot.locked .slot-art,
.slot.heldBack .slot-art {
  filter: grayscale(1) brightness(0.55);
  opacity: 0.55;
}
.slot-none {
  color: var(--ghost-ink);
  font-size: 28px;
}
.slot-tier-hint {
  position: absolute;
  inset: auto 6px 6px auto;
  z-index: 6;
  padding: 2px 5px;
  border-left: 1px solid color-mix(in srgb, var(--accent) 55%, transparent);
  background: color-mix(in srgb, var(--ground) 82%, transparent);
  color: var(--khaki);
  font-size: 9px;
  letter-spacing: 0.08em;
  opacity: 0;
  pointer-events: none;
  translate: 0 3px;
  transition: opacity var(--dur-fast), translate var(--dur-fast) var(--ease-out);
}
.slot.actionable:hover .slot-tier-hint,
.slot:focus-within .slot-tier-hint {
  opacity: 1;
  translate: 0 0;
}
.slot.empty .slot-stage { opacity: 0.4; }

@media (prefers-reduced-motion: reduce) {
  .slot-art,
  .slot-tier-hint { transition: none; }
  .slot.actionable:hover .slot-art { scale: none; }
}
</style>
