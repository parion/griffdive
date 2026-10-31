<script setup lang="ts">
import type { Item } from '~~/shared/data/types'
import type { ArmorPackOffer } from '~~/shared/engine/selectors'
import type { ArmorPackDeal } from '~~/shared/engine/types'

// The Armor Pack is the last card on the shelf, not a banner under it: three
// mini card backs fanned like the reveal's hand, sealed stock among the named
// items. It shares BraschBargainCard's header, price and hit target; the count
// and replay controls are the only extras.
const props = defineProps<{
  offer: ArmorPackOffer
  packs: ArmorPackDeal[]
  lastPull: Item[]
  verdict: { allowed: boolean, reason: string | null }
}>()

const emit = defineEmits<{ buy: [], view: [] }>()

const complete = computed(() => props.offer.available === 0)
const nextNumber = computed(() => props.packs.length + 1)
const hasPull = computed(() => props.packs.length > 0 && props.lastPull.length > 0)
const packName = computed(() =>
  complete.value ? 'Collection complete' : `${props.offer.size} armor passive${props.offer.size === 1 ? '' : 's'}`)
</script>

<template>
  <BraschBargainCard
    class="pack-card"
    :class="{ complete }"
    kind="Armor Pack"
    :name="packName"
    :price="complete ? null : offer.price"
    :status="complete ? 'complete' : 'open'"
    accent="gold"
    :disabled="!verdict.allowed"
    :reason="verdict.reason"
    :purchases="packs.length"
    :buy-aria-label="`Open Armor Pack ${nextNumber} for ${offer.price} credits`"
    buy-label="Open"
    aria-label="Brasch's Armor Pack"
    @buy="emit('buy')"
  >
    <template #stage>
      <span
        class="mini one"
        aria-hidden="true"
      ><AppBrandMark :size="20" /></span>
      <span
        class="mini two"
        aria-hidden="true"
      ><AppBrandMark :size="20" /></span>
      <span
        class="mini three"
        aria-hidden="true"
      ><AppBrandMark :size="20" /></span>
    </template>

    <template #overlay>
      <span
        v-if="packs.length"
        class="pack-count disp"
        role="img"
        :aria-label="`${packs.length} pack${packs.length === 1 ? '' : 's'} opened`"
      >{{ packs.length }}</span>
      <button
        v-if="hasPull"
        class="pack-replay"
        type="button"
        title="View pull"
        aria-label="View the newest Armor Pack pull"
        @click="emit('view')"
      >
        <IconRefresh />
      </button>
    </template>
  </BraschBargainCard>
</template>

<style scoped>
/* Side stock keeps a brighter foil wrap than the named items. */
.pack-card::before {
  border-color: color-mix(in srgb, var(--gold) 44%, transparent);
  background:
    repeating-linear-gradient(135deg, color-mix(in srgb, var(--gold) 7%, transparent) 0 8px, transparent 8px 18px),
    color-mix(in srgb, var(--gold) 3%, var(--rail));
}

/* The three card backs are the product. They fan like the reveal's hand, clean
   and small: the Griffdive mark does the branding, no label copy. */
.mini {
  position: absolute;
  left: 50%;
  top: 52%;
  display: grid;
  place-items: center;
  width: 40%;
  aspect-ratio: 5 / 7;
  border: 1px solid color-mix(in srgb, var(--gold) 60%, var(--line-3));
  background:
    repeating-linear-gradient(135deg, color-mix(in srgb, var(--gold) 9%, transparent) 0 5px, transparent 5px 12px),
    radial-gradient(ellipse 70% 55% at 50% 45%, color-mix(in srgb, var(--gold) 16%, transparent), transparent 70%),
    linear-gradient(160deg, #2b2918, #0a0b08 65%);
  color: var(--gold);
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.5);
  translate: -50% -50%;
  transition: rotate var(--dur-med) var(--ease-out), translate var(--dur-med) var(--ease-out);
}
.mini::after {
  content: '';
  position: absolute;
  inset: 5px;
  border: 1px solid color-mix(in srgb, var(--gold) 22%, transparent);
}
.mini :deep(svg) {
  width: 58%;
  height: auto;
  filter: drop-shadow(0 0 7px color-mix(in srgb, var(--gold) 45%, transparent));
}
.mini.one { z-index: 1; rotate: -15deg; translate: -72% -50%; }
.mini.two { z-index: 3; translate: -50% -54%; }
.mini.three { z-index: 2; rotate: 15deg; translate: -28% -50%; }
.pack-card.actionable:hover .mini.one { rotate: -19deg; translate: -74% -50%; }
.pack-card.actionable:hover .mini.two { translate: -50% -58%; }
.pack-card.actionable:hover .mini.three { rotate: 19deg; translate: -26% -50%; }
.pack-card.complete .mini {
  border-color: var(--line-3);
  color: var(--muted);
  filter: grayscale(1);
  opacity: 0.55;
}

.pack-count {
  position: absolute;
  right: 4px;
  top: 6px;
  z-index: 6;
  display: grid;
  place-items: center;
  min-width: 22px;
  height: 22px;
  padding: 0 4px;
  border: 1px solid var(--gold);
  background: var(--ground);
  color: var(--gold);
  font-size: 13px;
  line-height: 1;
  box-shadow: 0 0 14px color-mix(in srgb, var(--gold) 25%, transparent);
}
.pack-replay {
  position: absolute;
  left: 4px;
  top: 6px;
  z-index: 6;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border: 1px solid color-mix(in srgb, var(--gold) 40%, var(--line-3));
  background: color-mix(in srgb, var(--ground) 80%, transparent);
  color: var(--khaki);
  cursor: pointer;
}
.pack-replay:hover { color: var(--gold); border-color: var(--gold); }
.pack-replay :deep(svg) { width: 12px; height: 12px; }

@media (prefers-reduced-motion: reduce) {
  .mini { transition: none; }
  .pack-card.actionable:hover .mini.one,
  .pack-card.actionable:hover .mini.two,
  .pack-card.actionable:hover .mini.three {
    rotate: initial;
    translate: initial;
  }
  .pack-card.actionable:hover .mini.one { rotate: -15deg; translate: -72% -50%; }
  .pack-card.actionable:hover .mini.two { translate: -50% -54%; }
  .pack-card.actionable:hover .mini.three { rotate: 15deg; translate: -28% -50%; }
}
</style>
