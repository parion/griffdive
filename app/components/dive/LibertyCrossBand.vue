<script setup lang="ts">
import { POD_STAGGER } from '~/utils/motion'
import type { Item } from '~~/shared/data/types'

const props = withDefaults(defineProps<{
  pool: Item[]
  ownedIds: string[]
  // Landing order within the cabinet: the band opens after every pod has landed.
  revealRank?: number
  // Skip the unfurl: a reload onto a resolved draft, or reduced motion.
  instant?: boolean
  canPick?: boolean
  picked?: boolean
  dimmed?: boolean
  banMode?: boolean
  // Resolved overlay stamped over the opened band.
  stamp?: string | null
  // Extra wait before the unfurl starts (ms).
  delay?: number
}>(), { revealRank: 0, instant: false, canPick: true, picked: false, dimmed: false, banMode: false, stamp: null, delay: 0 })

const titleId = useId()

const emit = defineEmits<{
  choose: [itemId: string]
  settled: []
}>()

// The unfurl: a beam of light draws across, the band opens from it, then the
// crest assembles. `SETTLE` is when the claim button becomes live.
const SUSPENSE = 380
const SETTLE = 1500

const reduced = import.meta.client
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const instant = computed(() => props.instant || reduced)
const start = computed(() => props.delay + props.revealRank * POD_STAGGER + SUSPENSE)
const landed = ref(instant.value)
let timer: ReturnType<typeof setTimeout> | undefined

onMounted(() => {
  if (instant.value) {
    emit('settled')
    return
  }
  timer = setTimeout(() => {
    landed.value = true
    emit('settled')
  }, start.value + SETTLE)
})
onBeforeUnmount(() => clearTimeout(timer))

const open = ref(false)
const selectable = computed(() => props.canPick && landed.value && !props.dimmed && !props.banMode)

function openPicker(): void {
  if (selectable.value) {
    open.value = true
  }
}

function onChoose(itemId: string): void {
  open.value = false
  emit('choose', itemId)
}
</script>

<template>
  <div
    class="cross-slot"
    :style="{ '--delay': `${instant ? 0 : start}ms` }"
    :class="{ landed, instant, faded: dimmed || banMode }"
    data-tier="S+"
  >
    <div
      class="cross-placeholder cut-sm"
      aria-hidden="true"
    >
      <span class="hazard-soft placeholder-bar" />
      <span class="lbl placeholder-label">Bonus slot</span>
    </div>
    <span
      class="cross-beam"
      aria-hidden="true"
    />

    <section
      class="cross-card cut-sm"
      :class="{ picked, dimmed: dimmed || banMode }"
      :aria-labelledby="titleId"
    >
      <span
        class="cross-top"
        aria-hidden="true"
      />
      <span
        class="cross-rays"
        aria-hidden="true"
      />
      <span
        class="cross-bloom"
        aria-hidden="true"
      />
      <span
        class="cross-sheen"
        aria-hidden="true"
      />

      <div class="cross-emblem">
        <LibertyCrossEmblem :instant="instant" />
      </div>

      <div class="cross-copy">
        <span class="cross-kicker lbl">
          <span
            class="tb cross-mark"
            data-tier="S+"
          >S+</span>
          Bonus slot
        </span>
        <h3
          :id="titleId"
          class="cross-title"
        >
          Liberty’s Cross
        </h3>
        <p class="cross-sub">
          The ceiling broke the scale — claim any item from your codex.
        </p>
      </div>

      <button
        type="button"
        class="cross-claim cut"
        :class="{ 'cta-sweep': selectable }"
        aria-haspopup="dialog"
        :disabled="!selectable"
        @click="openPicker"
      >
        <span class="disp claim-word">Claim any item</span>
        <span class="claim-sub">
          Search the codex
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.4"
            aria-hidden="true"
          ><circle
            cx="10.5"
            cy="10.5"
            r="6.5"
          /><path d="M15.5 15.5L21 21" /></svg>
        </span>
      </button>

      <span
        v-if="stamp"
        class="disp stamp cross-stamp"
      >{{ stamp }}</span>
    </section>

    <DiversChoicePicker
      :open="open"
      :pool="pool"
      :owned-ids="ownedIds"
      @close="open = false"
      @choose="onChoose"
    />
  </div>
</template>

<style scoped>
.cross-slot {
  --ease-unfurl: cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  min-width: 0;
  container-type: inline-size;
  /* The card is clip-pathed, so the glow rides the slot and follows the cut. */
  animation: cross-breathe 5s ease-in-out calc(var(--delay) + 2.6s) infinite;
}
.cross-slot.faded,
.cross-slot.instant { animation: none; }

.cross-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 1px dashed var(--line-3);
  animation: fade-out 0.5s ease-out calc(var(--delay) + 0.9s) forwards;
}
.placeholder-bar { width: 32%; height: 6px; }
.placeholder-label { color: var(--dim); }

/* One thin line of light draws out from the centre, then gives way to the band. */
.cross-beam {
  position: absolute;
  left: 4%;
  right: 4%;
  top: 50%;
  z-index: 3;
  height: 2px;
  margin-top: -1px;
  background: linear-gradient(90deg, transparent, var(--tier-s) 18%, var(--tier-splus) 82%, transparent);
  box-shadow: 0 0 18px 2px color-mix(in srgb, var(--tier-splus) 45%, transparent);
  opacity: 0;
  pointer-events: none;
  animation: beam 1.6s cubic-bezier(0.65, 0, 0.35, 1) var(--delay) both;
}

.cross-card {
  position: relative;
  display: grid;
  grid-template-columns: minmax(150px, 22cqi) minmax(0, 1fr) auto;
  grid-template-areas: 'emblem copy claim';
  align-items: center;
  gap: clamp(14px, 3cqi, 36px);
  min-height: 168px;
  padding: 20px clamp(16px, 3cqi, 32px);
  overflow: hidden;
  background:
    radial-gradient(70% 140% at 12% 50%, color-mix(in srgb, var(--tier-splus) 20%, transparent), transparent 70%),
    linear-gradient(100deg, color-mix(in srgb, var(--tier-s) 8%, transparent), transparent 55%),
    var(--panel);
  border: 1px solid color-mix(in srgb, var(--tier-splus) 55%, var(--line-3));
  animation: cross-open 1.2s var(--ease-unfurl) calc(var(--delay) + 0.5s) both;
}
.cross-card.picked {
  border-color: var(--tier-splus);
  box-shadow: inset 0 0 40px color-mix(in srgb, var(--tier-splus) 20%, transparent);
}
.cross-card.dimmed { opacity: 0.26; filter: grayscale(0.85); }
.cross-slot.instant .cross-card,
.cross-slot.instant .cross-copy,
.cross-slot.instant .cross-claim,
.cross-slot.instant .cross-bloom,
.cross-slot.instant .cross-beam,
.cross-slot.instant .cross-placeholder { animation: none; }
.cross-slot.instant .cross-placeholder,
.cross-slot.instant .cross-bloom { display: none; }

.cross-top {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--tier-splus) 0 50%, var(--tier-s) 50% 100%);
}

/* Light behind the crest: slow rays masked to a halo, a one-off soft bloom. */
.cross-rays {
  position: absolute;
  left: calc(clamp(16px, 3cqi, 32px) + 11cqi);
  top: 50%;
  width: 150cqi;
  aspect-ratio: 1;
  translate: -50% -50%;
  pointer-events: none;
  background: repeating-conic-gradient(from 0deg, color-mix(in srgb, var(--tier-splus) 20%, transparent) 0deg 5deg, transparent 5deg 16deg);
  mask-image: radial-gradient(circle, #000 0%, transparent 34%);
  animation: spinSlow 120s linear infinite, fade-in 2.6s ease-out calc(var(--delay) + 1s) both;
}
.cross-bloom {
  position: absolute;
  left: calc(clamp(16px, 3cqi, 32px) + 11cqi);
  top: 50%;
  width: 46cqi;
  aspect-ratio: 1;
  translate: -50% -50%;
  pointer-events: none;
  background: radial-gradient(circle, color-mix(in srgb, var(--tier-s) 38%, transparent), transparent 62%);
  opacity: 0;
  animation: bloom 2.6s ease-in-out calc(var(--delay) + 0.9s) both;
}
.cross-sheen {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(100deg, transparent 40%, color-mix(in srgb, var(--tier-s) 14%, transparent) 50%, transparent 60%);
  transform: translateX(-130%);
  animation: ctaSweep 2.8s var(--ease-out) calc(var(--delay) + 2.2s) 1 both, ctaSweep 4s var(--ease-out) calc(var(--delay) + 9s) infinite;
}

.cross-emblem {
  grid-area: emblem;
  position: relative;
  aspect-ratio: 3 / 2;
  min-width: 0;
}
.cross-copy {
  grid-area: copy;
  position: relative;
  display: grid;
  gap: 6px;
  min-width: 0;
  animation: rise 1s var(--ease-unfurl) calc(var(--delay) + 1.2s) both;
}
.cross-kicker {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--tier-splus);
}
.cross-mark {
  min-width: 30px;
  height: 22px;
  font-size: 11px;
  border: 1px solid currentColor;
  background: color-mix(in srgb, var(--tier-splus) 14%, transparent);
}
.cross-title {
  margin: 0;
  font-family: var(--font-display);
  font-stretch: 125%;
  font-size: clamp(1.25rem, 4cqi, 2.1rem);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  background: linear-gradient(90deg, var(--tier-s), var(--tier-splus));
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
}
.cross-sub {
  margin: 0;
  max-width: 44ch;
  font-size: var(--fs-sm);
  line-height: 1.4;
  color: var(--muted);
}

.cross-claim {
  grid-area: claim;
  position: relative;
  display: grid;
  gap: 4px;
  justify-items: start;
  padding: 12px 20px;
  border: 0;
  background: linear-gradient(95deg, var(--tier-s), var(--tier-splus));
  color: var(--on-gold);
  cursor: pointer;
  animation: rise 1s var(--ease-unfurl) calc(var(--delay) + 1.4s) both;
  --sweep: rgba(255, 255, 255, 0.5);
}
.cross-claim:disabled { cursor: default; filter: saturate(0.45) brightness(0.8); }
.claim-word { font-size: 1rem; white-space: nowrap; }
.claim-sub {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  opacity: 0.8;
}

.cross-stamp {
  position: absolute;
  right: 28px;
  top: 50%;
  z-index: 4;
  translate: 0 -50%;
  padding: 0.4rem 0.9rem;
  font-size: 1.4rem;
  border: 3px solid var(--gold);
  color: var(--gold);
  background: color-mix(in srgb, var(--ground) 88%, transparent);
  pointer-events: none;
}

@container (max-width: 640px) {
  .cross-card {
    grid-template-columns: 104px minmax(0, 1fr);
    grid-template-areas: 'emblem copy' 'claim claim';
    gap: 12px 14px;
    min-height: 0;
    padding: 16px 14px 14px;
  }
  .cross-emblem { aspect-ratio: auto; height: 76px; }
  .cross-claim { justify-items: center; }
  .cross-rays { left: 66px; width: 130cqi; }
  .cross-bloom { left: 66px; width: 70cqi; }
  .cross-stamp { right: 14px; top: 38%; }
}

/* The band opens from a hairline: every vertex starts on the centre line and
   settles into the cut-sm silhouette, so nothing scales or flashes. */
@keyframes cross-open {
  from {
    clip-path: polygon(6px 50%, 100% 50%, 100% 50%, calc(100% - 6px) 50%, 0 50%, 0 50%);
    opacity: 0.4;
  }
  to {
    clip-path: polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px);
    opacity: 1;
  }
}
@keyframes beam {
  0% { transform: scaleX(0); opacity: 0; }
  25% { opacity: 1; }
  55% { transform: scaleX(1); opacity: 1; }
  100% { transform: scaleX(1); opacity: 0; }
}
@keyframes bloom {
  0%, 100% { opacity: 0; transform: scale(0.7); }
  45% { opacity: 0.6; transform: scale(1); }
}
@keyframes rise {
  from { opacity: 0; transform: translateY(10px); }
}
@keyframes fade-in { from { opacity: 0; } }
@keyframes fade-out { to { opacity: 0; } }
@keyframes cross-breathe {
  0%, 100% { filter: drop-shadow(0 0 4px color-mix(in srgb, var(--tier-splus) 25%, transparent)); }
  50% { filter: drop-shadow(0 0 16px color-mix(in srgb, var(--tier-splus) 45%, transparent)); }
}

@media (prefers-reduced-motion: reduce) {
  .cross-sheen,
  .cross-bloom { display: none; }
}
</style>
