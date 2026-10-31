<script setup lang="ts">
interface Props {
  kind: string
  name: string
  status: 'open' | 'bought' | 'locked' | 'heldBack' | 'empty' | 'complete'
  price?: number | null
  accent?: 'c' | 'b' | 'a' | 's' | 'gold'
  disabled?: boolean
  reason?: string | null
  buyLabel?: string
  buyAriaLabel?: string
  purchases?: number
}

// One product on Brasch's shelf. Every card — named stock or the Armor Pack —
// shares this shell: kind and price in the header, a stage for the product, the
// name under it. The whole card is the buy target; status is rendered as-is.
const props = withDefaults(defineProps<Props>(), {
  price: null,
  accent: 'gold',
  disabled: false,
  reason: null,
  buyLabel: 'Buy',
  purchases: 0,
})

const emit = defineEmits<{ buy: [] }>()

const canBuy = computed(() => props.status === 'open' && props.price !== null && !props.disabled)
const statusWord = computed(() => {
  switch (props.status) {
    case 'bought': return 'Taken'
    case 'locked': return 'Next mission'
    case 'heldBack': return 'Next operation'
    case 'empty': return 'No stock'
    default: return ''
  }
})
const showVeil = computed(() =>
  props.status !== 'open' && props.status !== 'complete' && props.status !== 'empty')

// A keyed flash restarts the strike animation for every purchase: shelf cards
// flip to bought, the Armor Pack bumps its count. No timers, no extra state.
const flashKey = ref(0)
watch(() => props.status, (next, previous) => {
  if (next === 'bought' && previous !== 'bought') {
    flashKey.value += 1
  }
})
watch(() => props.purchases, (next, previous) => {
  if (next > previous) {
    flashKey.value += 1
  }
})
</script>

<template>
  <li
    class="bargain-card"
    :class="[status, { actionable: canBuy }]"
    :data-accent="accent"
  >
    <button
      v-if="status === 'open' && price !== null"
      class="card-hit"
      type="button"
      :disabled="!canBuy"
      :title="reason ?? undefined"
      :aria-label="buyAriaLabel ?? `${buyLabel} ${name} for ${price} credits`"
      @click="emit('buy')"
    />

    <header class="card-head">
      <span class="card-kind">{{ kind }}</span>
      <CreditAmount
        v-if="price !== null"
        class="card-price disp"
        :value="price"
      />
    </header>

    <div class="card-stage">
      <span
        class="card-glow"
        aria-hidden="true"
      />
      <slot name="stage" />

      <span
        v-if="showVeil"
        class="card-veil"
        :class="{ stamp: status === 'bought', notice: status === 'locked' || status === 'heldBack' }"
      >
        <IconClock v-if="status === 'locked' || status === 'heldBack'" />
        {{ statusWord }}
      </span>

      <slot name="overlay" />
    </div>

    <span class="card-name">{{ name }}</span>

    <span
      v-if="flashKey"
      :key="flashKey"
      class="card-flash"
      aria-hidden="true"
    />
  </li>
</template>

<style scoped>
.bargain-card {
  --accent: var(--gold);
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
  padding: 0 2px 10px;
  transition: translate var(--dur-med) var(--ease-out);
}
.bargain-card[data-accent='c'] { --accent: var(--tier-c); }
.bargain-card[data-accent='b'] { --accent: var(--tier-b); }
.bargain-card[data-accent='a'] { --accent: var(--tier-a); }
.bargain-card[data-accent='s'] { --accent: var(--tier-s); }

/* The foil wrap is the card frame: clipped corners, a faint diagonal weave and
   the accent tint. It doubles as the hit area's outline. */
.bargain-card::before {
  content: '';
  position: absolute;
  inset: -6px -6px 0;
  z-index: -1;
  border: 1px solid color-mix(in srgb, var(--accent) 26%, transparent);
  background:
    repeating-linear-gradient(135deg, color-mix(in srgb, var(--accent) 5%, transparent) 0 8px, transparent 8px 18px),
    color-mix(in srgb, var(--accent) 2%, var(--rail));
  clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
  transition: border-color var(--dur-med), background-color var(--dur-med);
}
.bargain-card.actionable:hover { translate: 0 -4px; }
.bargain-card.actionable:hover::before {
  border-color: color-mix(in srgb, var(--accent) 62%, var(--line-3));
  background:
    repeating-linear-gradient(135deg, color-mix(in srgb, var(--accent) 9%, transparent) 0 8px, transparent 8px 18px),
    color-mix(in srgb, var(--accent) 5%, var(--rail));
}
.bargain-card.actionable:active { translate: 0 -1px; scale: 0.99; }

/* The buy target is the card itself. It sits over the whole card, so the art,
   header and name are all clickable; the tab focus ring lands on the frame. */
.card-hit {
  position: absolute;
  inset: -6px -6px 0;
  z-index: 4;
  border: 0;
  background: transparent;
  cursor: pointer;
}
.card-hit:disabled { cursor: not-allowed; }
.card-hit:focus-visible { outline-offset: 2px; }

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 24px;
  padding-bottom: 5px;
  border-bottom: 1px solid color-mix(in srgb, var(--accent) 35%, var(--line-2));
}
.card-kind {
  min-width: 0;
  overflow: hidden;
  color: var(--muted);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}
.card-price {
  flex-shrink: 0;
  color: var(--gold);
  font-size: clamp(17px, 1.5vw, 21px);
  line-height: 1;
  text-shadow: 0 0 14px color-mix(in srgb, var(--gold) 25%, transparent);
  transition: color var(--dur-fast), scale var(--dur-fast) var(--ease-out), text-shadow var(--dur-fast);
}
.bargain-card.actionable:hover .card-price {
  color: var(--gold-bright);
  scale: 1.05;
  text-shadow: 0 0 18px color-mix(in srgb, var(--gold) 50%, transparent);
}
.bargain-card.bought .card-price,
.bargain-card.locked .card-price,
.bargain-card.heldBack .card-price {
  color: var(--dim);
  opacity: 0.55;
  text-shadow: none;
}

/* Locked stock keeps its place but reads as disabled: a dashed grey wrap, a
   neutral stage and dimmed copy, with the notice stamped across the art. */
.bargain-card.locked::before,
.bargain-card.heldBack::before {
  border-color: color-mix(in srgb, var(--line-4) 65%, transparent);
  border-style: dashed;
  background:
    repeating-linear-gradient(135deg, color-mix(in srgb, var(--line-3) 12%, transparent) 0 8px, transparent 8px 18px),
    color-mix(in srgb, var(--line-1) 30%, var(--rail));
}
.bargain-card.locked .card-head,
.bargain-card.heldBack .card-head {
  border-bottom-color: var(--line-2);
}
.bargain-card.locked .card-kind,
.bargain-card.heldBack .card-kind,
.bargain-card.locked .card-name,
.bargain-card.heldBack .card-name {
  color: var(--dim);
}
.bargain-card.locked .card-stage,
.bargain-card.heldBack .card-stage {
  background:
    radial-gradient(ellipse 62% 58% at 50% 54%, color-mix(in srgb, var(--line-3) 12%, transparent), transparent 74%),
    linear-gradient(180deg, color-mix(in srgb, var(--line-2) 18%, transparent), transparent 70%);
}

/* The product floats over its own accent spotlight; the frame does the boxing. */
.card-stage {
  position: relative;
  display: grid;
  place-items: center;
  aspect-ratio: 1;
  overflow: hidden;
  background:
    radial-gradient(ellipse 62% 58% at 50% 54%, color-mix(in srgb, var(--accent) 14%, transparent), transparent 74%),
    linear-gradient(180deg, color-mix(in srgb, var(--accent) 4%, transparent), transparent 70%);
  transition: box-shadow var(--dur-med);
}
.bargain-card.actionable:hover .card-stage {
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 32%, transparent);
}
.card-glow {
  position: absolute;
  left: 50%;
  bottom: 4%;
  width: 72%;
  height: 26%;
  translate: -50% 0;
  border-radius: 50%;
  background: color-mix(in srgb, var(--accent) 16%, transparent);
  filter: blur(12px);
  opacity: 0.7;
  transition: opacity var(--dur-med), scale var(--dur-med) var(--ease-out);
}
.bargain-card.actionable:hover .card-glow {
  opacity: 1;
  scale: 1.12;
}

.card-name {
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

.card-veil {
  position: absolute;
  inset: auto 0 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 18px 4px 6px;
  background: linear-gradient(180deg, transparent, color-mix(in srgb, var(--ground) 84%, transparent) 42%);
  color: var(--dim);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  pointer-events: none;
}
.card-veil :deep(svg) { width: 12px; height: 12px; }

/* A tilted grey notice, not a bottom strip: the clock and the next-mission
   reason sit across the product like a "closed" placard. */
.card-veil.notice {
  inset: 50% auto auto 50%;
  translate: -50% -50%;
  padding: 4px 10px;
  border: 2px solid color-mix(in srgb, var(--dim) 65%, transparent);
  background: color-mix(in srgb, var(--ground) 58%, transparent);
  color: var(--dim);
  font-family: var(--font-display);
  font-size: 12px;
  font-stretch: 125%;
  font-weight: 800;
  letter-spacing: 0.12em;
  rotate: -8deg;
  white-space: nowrap;
}
.card-veil.notice :deep(svg) { width: 13px; height: 13px; }

.card-veil.stamp {
  inset: 50% auto auto 50%;
  translate: -50% -50%;
  padding: 3px 10px;
  border: 2px solid var(--gold);
  background: color-mix(in srgb, var(--ground) 36%, transparent);
  color: var(--gold);
  font-family: var(--font-display);
  font-size: 15px;
  font-stretch: 125%;
  font-weight: 800;
  letter-spacing: 0.18em;
  rotate: -9deg;
  opacity: 0.92;
  text-shadow: 0 0 12px color-mix(in srgb, var(--gold) 45%, transparent);
  white-space: nowrap;
  animation: stamp-in 0.32s var(--ease-impact) both;
}

/* Purchase strike: a gold wash over the whole card, keyed so it replays on
   every buy. It leaves no visible residue once the animation settles. */
.card-flash {
  position: absolute;
  inset: -6px -6px 0;
  z-index: 7;
  pointer-events: none;
  background:
    radial-gradient(circle at 50% 42%, color-mix(in srgb, var(--gold) 55%, transparent), transparent 68%),
    linear-gradient(180deg, color-mix(in srgb, var(--gold) 26%, transparent), transparent 74%);
  box-shadow:
    inset 0 0 0 2px var(--gold),
    0 0 30px color-mix(in srgb, var(--gold) 35%, transparent);
  animation: card-strike 0.62s var(--ease-out) both;
}

@keyframes stamp-in {
  0% { opacity: 0; scale: 2.2; rotate: -18deg; }
  70% { opacity: 1; scale: 0.94; }
  100% { opacity: 0.92; scale: 1; rotate: -9deg; }
}
@keyframes card-strike {
  0% { opacity: 0; }
  12% { opacity: 0.95; }
  100% { opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .bargain-card,
  .card-glow,
  .card-price { transition: none; }
  .bargain-card.actionable:hover { translate: none; }
  .bargain-card.actionable:hover .card-price,
  .bargain-card.actionable:hover .card-glow { scale: none; }
  .card-flash { animation: none; opacity: 0; }
  .card-veil.stamp { animation: none; }
}

@media (max-width: 620px) {
  .bargain-card { gap: 5px; padding-bottom: 8px; }
  .card-stage { aspect-ratio: 4 / 3; }
  .card-price { font-size: 17px; }
  .card-name { min-height: 0; font-size: 12px; }
}
</style>
