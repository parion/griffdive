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
.slot.empty .slot-stage { opacity: 0.4; }

@media (prefers-reduced-motion: reduce) {
  .slot-art { transition: none; }
  .slot.actionable:hover .slot-art { scale: none; }
}
</style>
