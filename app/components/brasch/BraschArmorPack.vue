<script setup lang="ts">
import type { Item } from '~~/shared/data/types'
import type { ArmorPackOffer } from '~~/shared/engine/selectors'
import type { ArmorPackDeal } from '~~/shared/engine/types'

// The Armor Pack is a card in the shop row, not a banner under it: three mini
// card backs fanned like the reveal's hand, a sealed product among the named
// items. Kept deliberately quiet — the mark, the passives count, the next
// price, and (once opened) a count and a replay.
const props = defineProps<{
  offer: ArmorPackOffer
  packs: ArmorPackDeal[]
  lastPull: Item[]
  verdict: { allowed: boolean, reason: string | null }
}>()

const emit = defineEmits<{ buy: [], view: [] }>()

const complete = computed(() => props.offer.available === 0)
const nextNumber = computed(() => props.packs.length + 1)
const sChance = computed(() => Math.round(props.offer.sChance * 100))
const hasPull = computed(() => props.packs.length > 0 && props.lastPull.length > 0)
const packName = computed(() =>
  complete.value ? 'Collection complete' : `${props.offer.size} armor passive${props.offer.size === 1 ? '' : 's'}`)
</script>

<template>
  <article
    class="pack-card"
    :class="{ complete }"
    aria-label="Brasch's Armor Pack"
  >
    <div class="pack-head">
      <span class="pack-kind">Armor Pack</span>
      <span
        v-if="!complete"
        class="pack-odds"
      >S {{ sChance }}%</span>
    </div>

    <div class="pack-stage">
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
    </div>

    <span class="pack-name">{{ packName }}</span>

    <button
      v-if="!complete"
      class="pack-tag"
      type="button"
      :disabled="!verdict.allowed"
      :title="verdict.reason ?? undefined"
      :aria-label="`Open Armor Pack ${nextNumber} for ${offer.price} credits`"
      @click="emit('buy')"
    >
      <span
        class="pack-hole"
        aria-hidden="true"
      />
      <span class="pack-word">Open</span>
      <CreditAmount
        class="pack-price"
        :value="offer.price"
      />
    </button>
    <span
      v-else
      class="pack-tag spent"
    >Complete</span>
  </article>
</template>

<style scoped>
.pack-card {
  position: relative;
  display: flex;
  flex: 0 0 clamp(170px, 16vw, 210px);
  flex-direction: column;
  gap: 7px;
  min-width: 0;
  padding: 0 2px 10px;
}
.pack-card::before {
  content: '';
  position: absolute;
  inset: -6px -6px 0;
  z-index: -1;
  border: 1px solid color-mix(in srgb, var(--gold) 24%, transparent);
  background:
    repeating-linear-gradient(135deg, color-mix(in srgb, var(--gold) 4%, transparent) 0 8px, transparent 8px 18px);
  clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
  opacity: 0.8;
}

.pack-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  min-height: 18px;
  padding-bottom: 5px;
  border-bottom: 1px solid color-mix(in srgb, var(--gold) 35%, var(--line-2));
}
.pack-kind {
  color: var(--gold);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}
.pack-odds {
  color: var(--khaki);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.06em;
}

/* The three card backs are the product. They fan like the reveal's hand, clean
   and small: the Griffdive mark does the branding, no label copy. */
.pack-stage {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  background:
    radial-gradient(ellipse 62% 58% at 50% 54%, color-mix(in srgb, var(--gold) 16%, transparent), transparent 74%),
    linear-gradient(180deg, color-mix(in srgb, var(--gold) 5%, transparent), transparent 70%);
}
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
  z-index: 4;
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
  z-index: 4;
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

.pack-name {
  min-width: 0;
  min-height: 2.3em;
  overflow: hidden;
  color: var(--text);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.15;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.pack-tag {
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
  background: linear-gradient(100deg, color-mix(in srgb, var(--gold) 30%, var(--panel)), color-mix(in srgb, var(--gold) 12%, var(--panel)));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--gold) 55%, var(--line-3));
  color: var(--gold);
  font: 700 10px var(--font-body);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  cursor: pointer;
  clip-path: polygon(0 0, 100% 0, 100% 100%, 10px 100%, 0 calc(100% - 8px));
  transition: filter var(--dur-fast), translate var(--dur-fast) var(--ease-out);
}
.pack-tag:hover:not(:disabled) { filter: brightness(1.12); translate: 0 -1px; }
.pack-tag:disabled {
  background: transparent;
  box-shadow: inset 0 0 0 1px var(--line-3);
  color: var(--muted);
  cursor: not-allowed;
}
.pack-tag.spent {
  justify-content: center;
  background: transparent;
  box-shadow: inset 0 0 0 1px var(--line-3);
  color: var(--dim);
  font-size: 9px;
}
.pack-hole {
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
.pack-price { font-size: 12px; }

@media (max-width: 720px) {
  .pack-card {
    flex: 1 1 auto;
    display: grid;
    grid-template-columns: 92px minmax(0, 1fr);
    grid-template-rows: auto auto auto;
    align-items: center;
    gap: 4px 14px;
    padding: 10px 12px 12px;
    border: 1px solid color-mix(in srgb, var(--gold) 32%, var(--line-3));
    background:
      repeating-linear-gradient(135deg, color-mix(in srgb, var(--gold) 4%, transparent) 0 8px, transparent 8px 18px),
      color-mix(in srgb, var(--gold) 3%, var(--rail));
    clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
  }
  .pack-card::before { display: none; }
  .pack-head { grid-column: 1 / -1; }
  .pack-stage {
    grid-row: 2 / 4;
    width: 92px;
    aspect-ratio: 1;
  }
  .pack-name { min-height: 0; align-self: end; }
  .pack-tag { margin-top: 4px; }
}
</style>
