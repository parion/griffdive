<script setup lang="ts">
import { armorPackPrice } from '~~/shared/engine/config'
import { armorPackOfferFor, bargainShelfFor, bargainsClosedReason } from '~~/shared/engine/selectors'
import type { DiverState, DiveState } from '~~/shared/engine/types'

// The shop's doorway on the regroup beats. The counter itself is a modal (a
// fullscreen takeover on a phone), so this is deliberately one control, not a
// miniature shelf: the credits, what the shelf holds, and the way in.
const props = defineProps<{
  state: DiveState
  self: DiverState | null
}>()

const { openBargains } = useDrawers()

const closed = computed(() => bargainsClosedReason(props.state))
const credits = computed(() => props.self?.credits ?? 0)
const stock = computed(() =>
  (props.self ? bargainShelfFor(props.state, props.self) : []).filter(slot => slot.item).length)
const packPrice = computed(() =>
  props.self ? armorPackOfferFor(props.state, props.self).price : armorPackPrice(props.state.difficulty, 0))
const label = computed(() => {
  const base = `Brasch's Bargains, ${credits.value} credits`
  return closed.value ? `${base} — ${closed.value}` : base
})
</script>

<template>
  <button
    class="door"
    type="button"
    :disabled="Boolean(closed)"
    :aria-label="label"
    :title="closed ?? undefined"
    @click="openBargains()"
  >
    <span
      class="door-glow"
      aria-hidden="true"
    />
    <span
      class="door-mark cut-sm"
      aria-hidden="true"
    >
      <IconPack />
    </span>

    <span class="door-copy">
      <span class="door-kicker">Brasch's Bargains</span>
      <strong class="door-title disp">
        {{ closed ?? 'The counter is open' }}
      </strong>
      <span
        v-if="!closed"
        class="door-meta"
      >
        <CreditAmount :value="credits" />
        <span
          class="door-dot"
          aria-hidden="true"
        >·</span>
        {{ stock }} on the shelf
        <span
          class="door-dot"
          aria-hidden="true"
        >·</span>
        packs from <CreditAmount :value="packPrice" />
      </span>
      <span
        v-else
        class="door-meta"
      >
        <CreditAmount :value="credits" /> banked
      </span>
    </span>

    <span
      class="door-go disp"
      aria-hidden="true"
    >
      {{ closed ? 'Locked' : 'Shop' }}
      <svg
        width="24"
        height="16"
        viewBox="0 0 24 16"
        fill="none"
      >
        <path
          d="M1 8h19M14 2l6 6-6 6"
          stroke="currentColor"
          stroke-width="2"
        />
      </svg>
    </span>
  </button>
</template>

<style scoped>
.door {
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: clamp(12px, 1.6vw, 20px);
  width: 100%;
  min-height: 126px;
  padding: 20px clamp(16px, 2vw, 26px);
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--gold) 30%, var(--line-3));
  background:
    repeating-linear-gradient(135deg, color-mix(in srgb, var(--gold) 4%, transparent) 0 10px, transparent 10px 24px),
    radial-gradient(ellipse 70% 130% at 12% 50%, color-mix(in srgb, var(--gold) 12%, transparent), transparent 70%),
    var(--rail);
  color: var(--text);
  text-align: left;
  cursor: pointer;
  clip-path: polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px);
  transition: border-color var(--dur-fast), filter var(--dur-fast), translate var(--dur-fast) var(--ease-out);
}
.door::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 3px;
  background: repeating-linear-gradient(90deg, var(--gold) 0 9px, transparent 9px 18px);
  opacity: 0.7;
}
.door:hover:not(:disabled) {
  border-color: var(--gold);
  filter: brightness(1.06);
  translate: 0 -2px;
}
.door:disabled {
  cursor: not-allowed;
  border-color: var(--line-3);
  filter: grayscale(0.6);
}
.door:disabled::before { background: var(--line-4); }

.door-glow {
  position: absolute;
  left: -40px;
  top: 50%;
  width: 220px;
  height: 220px;
  translate: 0 -50%;
  border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--gold) 18%, transparent), transparent 68%);
  filter: blur(10px);
  pointer-events: none;
}

.door-mark {
  position: relative;
  display: grid;
  place-items: center;
  width: clamp(54px, 6vw, 72px);
  aspect-ratio: 1;
  border: 1px solid color-mix(in srgb, var(--gold) 55%, var(--line-3));
  background: var(--ground);
  color: var(--gold);
  rotate: -3deg;
  box-shadow:
    inset 0 0 0 4px color-mix(in srgb, var(--gold) 7%, transparent),
    0 6px 0 color-mix(in srgb, var(--gold) 16%, transparent),
    0 0 28px color-mix(in srgb, var(--gold) 12%, transparent);
}
.door-mark :deep(svg) {
  width: 44%;
  height: 44%;
}
.door:disabled .door-mark { color: var(--muted); }

.door-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.door-kicker {
  color: var(--gold);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.24em;
  text-transform: uppercase;
}
.door:disabled .door-kicker { color: var(--muted); }
.door-title {
  color: var(--text);
  font-size: clamp(22px, 2.4vw, 34px);
  line-height: 1;
  text-shadow: 0 2px 18px rgba(0, 0, 0, 0.55);
}
.door-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px;
  color: var(--khaki);
  font-size: 12px;
}
.door-meta :deep(.credit-amount) { color: var(--gold); font-weight: 700; }
.door-dot { color: var(--dim); }

.door-go {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--gold);
  font-size: clamp(13px, 1.2vw, 17px);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.door-go svg { transition: translate var(--dur-fast) var(--ease-out); }
.door:hover:not(:disabled) .door-go svg { translate: 5px 0; }
.door:disabled .door-go { color: var(--muted); }

@media (max-width: 620px) {
  .door {
    grid-template-columns: auto minmax(0, 1fr);
    min-height: 0;
    padding: 16px;
  }
  .door-go { display: none; }
  .door-mark { width: 52px; }
  .door-title { font-size: 24px; }
  .door-meta { font-size: 11px; gap: 4px; }
}
</style>
