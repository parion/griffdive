<script setup lang="ts">
import { DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { itemImageUrl } from '~~/shared/data/images'
import type { Item } from '~~/shared/data/types'
import type { RewardTier } from '~~/shared/engine/types'
import { revealTimeline } from '~/utils/rewardReveal'

// A full-screen pack opening, not a dialog card: the foil tears, a deck of
// three backs deals itself, and each card flies out and flips onto the fan.
// The engine has already banked the pull; this is presentation only, and every
// step is skippable (tap, Enter/Space, Escape).
const props = withDefaults(defineProps<{
  open: boolean
  items: Item[]
  packSeed?: number | null
  instant?: boolean
  // Desktop: sit the stage over the shop instead of taking the whole viewport.
  // A phone keeps the fullscreen takeover (the shop is fullscreen there too).
  contained?: boolean
}>(), {
  packSeed: null,
  instant: false,
  contained: false,
})

const emit = defineEmits<{ close: [] }>()

const { lockPanel } = useDrawers()
let releasePanel: (() => void) | null = null

type Phase = 'sealed' | 'bursting' | 'drawing' | 'settled'

const reduced = import.meta.client
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const skipMotion = computed(() => props.instant || reduced)
const phase = ref<Phase>('sealed')
const screen = useTemplateRef<HTMLElement>('screen')

let burstTimer: ReturnType<typeof setTimeout> | null = null
let settleTimer: ReturnType<typeof setTimeout> | null = null

const cues = computed(() =>
  revealTimeline(props.items.map(item => item.tier.toUpperCase() as RewardTier)))
// The deck needs a beat to settle before the first card leaves it.
const DECK_SETTLE = 120
const drawDuration = computed(() => {
  const last = cues.value[cues.value.length - 1]
  return (last?.impact ?? 0) + DECK_SETTLE + 700
})
const sIndex = computed(() => props.items.findIndex(item => item.tier === 's'))
const sDelay = computed(() =>
  (sIndex.value >= 0 ? (cues.value[sIndex.value]?.impact ?? 0) + DECK_SETTLE : 0))
const key = computed(() => `${props.packSeed ?? ''}:${props.items.map(item => item.id).join()}`)

const status = computed(() => {
  if (phase.value === 'sealed') {
    return 'Armor Pack sealed. Press Enter or tap to open.'
  }
  if (phase.value !== 'settled') {
    return 'Opening the Armor Pack.'
  }
  const cards = props.items
    .map(item => `${item.displayName}, ${tierOf(item)} tier`)
    .join('. ')
  return `Pack opened. ${cards}.`
})

const motes = Array.from({ length: 18 }, (_, index) => ({
  left: `${(index * 37 + 9) % 100}%`,
  delay: `${((index * 0.19) % 1.6).toFixed(2)}s`,
  duration: `${(2.4 + ((index * 0.47) % 2.2)).toFixed(2)}s`,
  size: `${2 + (index % 3)}px`,
  drift: `${((index % 5) - 2) * 18}px`,
}))

watch(() => [props.open, key.value] as const, () => {
  if (props.open) {
    reset()
  }
  else {
    clearTimers()
  }
}, { immediate: true })

watch(() => props.open, (open) => {
  if (open && !releasePanel) {
    releasePanel = lockPanel()
  }
  else if (!open && releasePanel) {
    releasePanel()
    releasePanel = null
  }
}, { immediate: true })

onBeforeUnmount(() => {
  clearTimers()
  releasePanel?.()
  releasePanel = null
})

function clearTimers(): void {
  if (burstTimer) {
    clearTimeout(burstTimer)
    burstTimer = null
  }
  if (settleTimer) {
    clearTimeout(settleTimer)
    settleTimer = null
  }
}

function reset(): void {
  clearTimers()
  phase.value = skipMotion.value ? 'settled' : 'sealed'
}

function tierOf(item: Item): RewardTier {
  return item.tier.toUpperCase() as RewardTier
}

function cardStyle(index: number): Record<string, string> {
  const middle = (props.items.length - 1) / 2
  const offset = index - middle
  return {
    '--x': `calc(var(--spread) * ${offset})`,
    '--y': `calc(var(--lift) * ${Math.abs(offset)})`,
    '--r': `${offset * 7}deg`,
    '--delay': `${(cues.value[index]?.start ?? 0) + DECK_SETTLE}ms`,
    '--z': `${10 - Math.abs(offset) + (props.items[index]?.tier === 's' ? 2 : 0)}`,
  }
}

// The deck sheds its top back as each card leaves it, so the pile is never
// still standing behind a card that has already landed. The backs paint in
// DOM order, so the last one is the top card and deals first.
function deckStyle(back: number): Record<string, string> {
  const cue = cues.value[props.items.length - 1 - back]
  return {
    '--i': `${back}`,
    '--out': `${(cue?.start ?? 0) + DECK_SETTLE}ms`,
  }
}

function advance(): void {
  if (phase.value === 'sealed') {
    phase.value = 'bursting'
    burstTimer = setTimeout(() => {
      phase.value = 'drawing'
      settleTimer = setTimeout(() => {
        phase.value = 'settled'
      }, drawDuration.value)
    }, 850)
    return
  }
  if (phase.value === 'bursting' || phase.value === 'drawing') {
    clearTimers()
    phase.value = 'settled'
  }
}

function focusScreen(event: Event): void {
  event.preventDefault()
  screen.value?.focus()
}

function onScreenKey(event: KeyboardEvent): void {
  if (event.target !== event.currentTarget) {
    return
  }
  advance()
}
</script>

<template>
  <DialogRoot
    :open="open"
    @update:open="value => { if (!value) emit('close') }"
  >
    <DialogPortal>
      <DialogOverlay as-child>
        <div class="pack-veil" />
      </DialogOverlay>
      <DialogContent
        as-child
        aria-modal="true"
        @open-auto-focus="focusScreen"
      >
        <div
          ref="screen"
          class="pack-screen"
          :class="[phase, { contained }]"
          tabindex="-1"
          @keydown.enter.prevent="onScreenKey"
          @keydown.space.prevent="onScreenKey"
        >
          <DialogTitle class="sr-only">
            Armor Pack
          </DialogTitle>
          <DialogDescription class="sr-only">
            {{ items.length }} armor passives from Brasch's sealed stock.
          </DialogDescription>

          <div
            class="pack-aura"
            aria-hidden="true"
          />
          <div
            class="pack-motes"
            aria-hidden="true"
          >
            <span
              v-for="(mote, index) in motes"
              :key="index"
              class="mote"
              :style="{
                'left': mote.left,
                'width': mote.size,
                'height': mote.size,
                'animationDelay': mote.delay,
                'animationDuration': mote.duration,
                '--drift': mote.drift,
              }"
            />
          </div>

          <header class="pack-top">
            <span class="pack-kicker disp">
              <IconPack />
              Armor Pack
            </span>
            <DialogClose as-child>
              <button
                class="pack-close"
                type="button"
                aria-label="Close pack"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  aria-hidden="true"
                >
                  <path
                    d="M2 2l10 10M12 2 2 12"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  />
                </svg>
              </button>
            </DialogClose>
          </header>

          <main class="pack-stage">
            <div
              v-if="phase === 'sealed' || phase === 'bursting'"
              class="pack-wrap"
              :class="{ opening: phase === 'bursting' }"
              aria-hidden="true"
            >
              <span class="pack-glow" />
              <span class="pack-half left" />
              <span class="pack-half right" />
              <span class="pack-face">
                <AppBrandMark
                  class="pack-mark"
                  :size="76"
                />
                <span class="pack-count disp">{{ items.length }}</span>
                <span class="pack-word disp">Armor passives</span>
                <span class="pack-brand">Brasch's sealed stock</span>
              </span>
            </div>

            <div
              v-if="phase === 'drawing'"
              class="pack-deck"
              aria-hidden="true"
            >
              <span
                v-for="i in 3"
                :key="i"
                class="deck-card"
                :style="deckStyle(i - 1)"
              />
            </div>

            <div
              v-if="phase === 'drawing' || phase === 'settled'"
              class="pack-fan"
              :class="{ settled: phase === 'settled' }"
              :aria-hidden="phase !== 'settled'"
              role="list"
            >
              <div
                v-for="(item, index) in items"
                :key="item.id"
                class="card-slot"
                :class="{ s: item.tier === 's' }"
                :data-tier="tierOf(item)"
                :style="cardStyle(index)"
                role="listitem"
              >
                <div class="card-flip">
                  <div class="card-face card-back">
                    <AppBrandMark
                      class="back-mark"
                      :size="58"
                    />
                    <span class="back-rule" />
                    <span class="back-word disp">Griffdive</span>
                  </div>
                  <div class="card-face card-front">
                    <header class="card-top">
                      <span class="card-cat">Armor passive</span>
                      <span class="card-tier disp">{{ tierOf(item) }}</span>
                    </header>
                    <div class="card-art">
                      <img
                        v-if="itemImageUrl(item)"
                        :src="itemImageUrl(item)"
                        alt=""
                        loading="lazy"
                        draggable="false"
                      >
                    </div>
                    <h3
                      class="card-name disp"
                      :style="fitWord(item.displayName)"
                    >
                      {{ item.displayName }}
                    </h3>
                    <span
                      v-if="item.tier === 's'"
                      class="card-rare disp"
                    >S pull</span>
                  </div>
                </div>
              </div>
            </div>

            <span
              v-if="sIndex >= 0 && phase === 'drawing'"
              class="s-burst"
              :style="{ '--s-delay': `${sDelay}ms` }"
              aria-hidden="true"
            />

            <button
              v-if="phase !== 'settled'"
              class="tap-zone"
              type="button"
              :aria-label="phase === 'sealed' ? 'Open Armor Pack' : 'Reveal all cards'"
              @click="advance"
            />
            <span
              v-if="phase === 'sealed'"
              class="tap-hint disp"
              aria-hidden="true"
            >Tap to open</span>
          </main>

          <footer class="pack-foot">
            <DialogClose
              v-if="phase === 'settled'"
              as-child
            >
              <button
                class="pack-cta cut"
                type="button"
              >
                To the shelf
              </button>
            </DialogClose>
          </footer>

          <p
            class="sr-only"
            aria-live="polite"
          >
            {{ status }}
          </p>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.pack-veil {
  position: fixed;
  inset: 0;
  z-index: 70;
  background: rgba(4, 5, 3, 0.78);
  backdrop-filter: blur(1px);
  animation: veil-in 0.35s ease-out both;
}

/* The stage is the whole screen: no card, no dialog chrome, no page scroll. */
.pack-screen {
  position: fixed;
  inset: 0;
  z-index: 71;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  overflow: hidden;
  overscroll-behavior: none;
  color: var(--text);
  background:
    radial-gradient(ellipse 75% 55% at 50% 42%, #202014 0%, #0d0f09 52%, #060704 100%);
  outline: none;
  animation: screen-in 0.4s var(--ease-out) both;
}

/* The desktop reveal is a stage laid over Brasch's counter, not a takeover:
   the shop stays visible around it and comes straight back when the fan
   closes. A phone keeps the edge-to-edge version below. */
.pack-screen.contained {
  inset: 50% auto auto 50%;
  translate: -50% -50%;
  width: min(60rem, calc(100vw - 8rem));
  height: min(40rem, calc(100dvh - 9rem));
  border: 1px solid color-mix(in srgb, var(--gold) 45%, var(--line-3));
  clip-path: polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px);
  animation: screen-in 0.28s var(--ease-out) both;
}
@media (min-width: 1021px) {
  .pack-screen.contained .pack-wrap { width: clamp(190px, 20vw, 270px); }
  .pack-screen.contained .pack-deck { --card-w: clamp(150px, 15vw, 190px); }
  .pack-screen.contained .pack-fan {
    --card-w: clamp(150px, 15vw, 190px);
    --spread: clamp(118px, 11vw, 158px);
    --lift: 34px;
  }
}
.pack-screen::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(184, 176, 141, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(184, 176, 141, 0.05) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse 70% 65% at 50% 45%, #000 0%, transparent 78%);
  opacity: 0.6;
}
.pack-screen::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(ellipse 60% 45% at 50% 42%, transparent 30%, rgba(0, 0, 0, 0.55) 100%);
}

.pack-aura {
  position: absolute;
  left: 50%;
  top: 46%;
  width: min(90vw, 900px);
  aspect-ratio: 1;
  translate: -50% -50%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 214, 66, 0.16) 0%, rgba(255, 214, 66, 0.05) 32%, transparent 62%);
  filter: blur(8px);
  animation: aura-breathe 5s ease-in-out infinite;
  pointer-events: none;
}

.pack-motes {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}
.mote {
  position: absolute;
  bottom: 16%;
  border-radius: 50%;
  background: var(--gold-bright);
  box-shadow: 0 0 6px 1px var(--gold), 0 0 18px 3px rgba(255, 159, 67, 0.45);
  opacity: 0;
}
.pack-screen.drawing .mote,
.pack-screen.settled .mote {
  animation: mote-rise linear infinite;
}
.pack-screen.sealed .mote,
.pack-screen.bursting .mote {
  opacity: 0;
}

.pack-top {
  position: relative;
  z-index: 6;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding:
    max(14px, env(safe-area-inset-top))
    max(16px, env(safe-area-inset-right))
    0
    max(16px, env(safe-area-inset-left));
}
.pack-kicker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--gold);
  font-size: 0.72rem;
  letter-spacing: 0.24em;
  text-transform: uppercase;
}
.pack-kicker :deep(svg) { width: 16px; height: 16px; }
.pack-close {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--line-3);
  background: rgba(9, 10, 7, 0.6);
  color: var(--khaki);
  cursor: pointer;
}
.pack-close:hover { color: var(--gold); border-color: var(--gold); }

.pack-stage {
  position: relative;
  min-height: 0;
  perspective: 1400px;
}

/* -- sealed foil ---------------------------------------------------------- */
.pack-wrap {
  position: absolute;
  left: 50%;
  top: 50%;
  width: clamp(210px, 26vw, 360px);
  aspect-ratio: 3 / 4;
  translate: -50% -54%;
  transform-style: preserve-3d;
  animation: pack-float 4.2s ease-in-out infinite;
}
.pack-glow {
  position: absolute;
  inset: -24%;
  z-index: -1;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 214, 66, 0.24), transparent 66%);
  filter: blur(16px);
}
.pack-half {
  position: absolute;
  inset: 0;
  border: 1px solid color-mix(in srgb, var(--gold) 62%, var(--line-3));
  background:
    repeating-linear-gradient(135deg, rgba(255, 214, 66, 0.1) 0 8px, transparent 8px 18px),
    linear-gradient(155deg, color-mix(in srgb, var(--gold) 24%, var(--panel)), var(--ground) 58%, color-mix(in srgb, var(--gold) 16%, var(--panel)));
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08), 0 24px 60px rgba(0, 0, 0, 0.6), 0 0 50px rgba(255, 214, 66, 0.12);
}
.pack-half.left { clip-path: polygon(0 0, 52% 0, 48% 100%, 0 100%); }
.pack-half.right { clip-path: polygon(52% 0, 100% 0, 100% 100%, 48% 100%); }
.pack-half::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(105deg, transparent 32%, rgba(255, 255, 255, 0.16) 48%, transparent 64%);
}
.pack-face {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--gold);
  pointer-events: none;
}
.pack-mark { filter: drop-shadow(0 0 18px rgba(255, 214, 66, 0.4)); }
.pack-count {
  font-size: clamp(64px, 9vw, 100px);
  line-height: 0.72;
  text-shadow: 0 0 28px rgba(255, 214, 66, 0.4);
}
.pack-word {
  font-size: 0.8rem;
  letter-spacing: 0.26em;
  text-transform: uppercase;
}
.pack-brand {
  color: var(--khaki);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  opacity: 0.8;
}
.pack-wrap.opening { animation: pack-shake 0.36s ease-in-out both; }
.pack-wrap.opening .pack-half.left { animation: tear-left 0.56s var(--ease-snap) 0.26s forwards; }
.pack-wrap.opening .pack-half.right { animation: tear-right 0.56s var(--ease-snap) 0.26s forwards; }
.pack-wrap.opening .pack-face { animation: face-out 0.3s 0.3s forwards; }

/* -- the deck ------------------------------------------------------------- */
.pack-deck {
  --card-w: clamp(180px, 19vw, 236px);
  position: absolute;
  left: 50%;
  top: 50%;
  width: var(--card-w);
  aspect-ratio: 5 / 7;
  translate: -50% -54%;
  transform-style: preserve-3d;
  animation: deck-in 0.36s var(--ease-out) both;
}
.deck-card {
  position: absolute;
  inset: 0;
  border: 1px solid color-mix(in srgb, var(--gold) 50%, var(--line-3));
  background:
    repeating-linear-gradient(135deg, rgba(255, 214, 66, 0.08) 0 8px, transparent 8px 18px),
    linear-gradient(155deg, #2a2817, #0b0c09 60%);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.55);
  transform: translateY(calc(var(--i) * 5px)) rotate(calc((var(--i) - 1) * 2deg));
  animation: deck-deal 0.16s var(--ease-out) var(--out, 0ms) forwards;
}
.deck-card::after {
  content: '';
  position: absolute;
  inset: 10%;
  border: 1px solid rgba(255, 214, 66, 0.2);
}

/* -- the fan -------------------------------------------------------------- */
.pack-fan {
  --card-w: clamp(190px, 17vw, 224px);
  --spread: clamp(150px, 13vw, 190px);
  --lift: 46px;
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
}
.card-slot {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: var(--z, 1);
  width: var(--card-w);
  aspect-ratio: 5 / 7;
  container-type: inline-size;
  perspective: 1200px;
  transform: translate(-50%, -50%) translateX(var(--x, 0)) translateY(var(--y, 0)) rotate(var(--r, 0deg));
  transform-origin: 50% 120%;
}
.pack-screen.drawing .card-slot {
  animation: card-fly 0.78s var(--ease-out) var(--delay) both;
}
.card-flip {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transform: rotateY(0);
}
.pack-screen.drawing .card-flip {
  animation: card-flip 0.66s var(--ease-out) calc(var(--delay) + 0.16s) both;
}
.card-face {
  position: absolute;
  inset: 0;
  overflow: hidden;
  backface-visibility: hidden;
  clip-path: polygon(11px 0, 100% 0, 100% calc(100% - 11px), calc(100% - 11px) 100%, 0 100%, 0 11px);
}
.card-back {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 1px solid color-mix(in srgb, var(--gold) 60%, var(--line-3));
  background:
    repeating-linear-gradient(135deg, rgba(255, 214, 66, 0.07) 0 8px, transparent 8px 18px),
    radial-gradient(ellipse 70% 55% at 50% 45%, rgba(255, 214, 66, 0.16), transparent 70%),
    linear-gradient(160deg, #2b2918, #0a0b08 65%);
  color: var(--gold);
  transform: rotateY(180deg);
}
.card-back::after {
  content: '';
  position: absolute;
  inset: 9px;
  border: 1px solid rgba(255, 214, 66, 0.22);
  clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
}
.back-mark { filter: drop-shadow(0 0 16px rgba(255, 214, 66, 0.35)); }
.back-rule { width: 42px; height: 1px; background: currentColor; opacity: 0.5; }
.back-word { font-size: 0.62rem; letter-spacing: 0.3em; text-transform: uppercase; }

.card-front {
  --tier: var(--tier-c);
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  border: 1px solid var(--tier);
  background:
    radial-gradient(ellipse 85% 55% at 50% 12%, color-mix(in srgb, var(--tier) 18%, transparent), transparent 72%),
    linear-gradient(180deg, color-mix(in srgb, var(--tier) 9%, #14160f), #0a0b08 68%);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--tier) 22%, transparent), 0 18px 48px rgba(0, 0, 0, 0.55);
  transform: rotateY(0);
}
.card-slot[data-tier='B'] .card-front { --tier: var(--tier-b); }
.card-slot[data-tier='A'] .card-front { --tier: var(--tier-a); }
.card-slot[data-tier='S'] .card-front { --tier: var(--tier-s); }

.card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 6px;
  min-height: 26px;
}
.card-cat {
  color: var(--muted);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.card-tier {
  color: var(--tier);
  font-size: clamp(28px, 3vw, 40px);
  line-height: 0.75;
  text-shadow: 0 0 18px color-mix(in srgb, var(--tier) 45%, transparent);
}
.card-art {
  position: relative;
  display: grid;
  place-items: center;
  flex: 1;
  min-height: 0;
  border: 1px solid var(--line-2);
  background:
    radial-gradient(ellipse 65% 55% at 50% 55%, color-mix(in srgb, var(--tier) 18%, transparent), transparent 76%),
    var(--ground);
  overflow: hidden;
}
.card-art img {
  width: 78%;
  height: 78%;
  object-fit: contain;
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.55));
}
.card-name {
  margin: 0;
  color: var(--text);
  font-size: min(15px, 100cqi / var(--fit-len, 1));
  line-height: 1.05;
  text-align: center;
  overflow-wrap: normal;
}
.card-rare {
  color: var(--gold);
  font-size: 9px;
  letter-spacing: 0.24em;
  text-align: center;
  text-transform: uppercase;
  border-top: 1px solid color-mix(in srgb, var(--gold) 35%, transparent);
  padding-top: 5px;
}
.card-slot.s .card-front {
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--tier) 45%, transparent),
    0 0 42px color-mix(in srgb, var(--tier) 28%, transparent),
    0 18px 48px rgba(0, 0, 0, 0.55);
}
.card-slot.s .card-front::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(115deg, transparent 20%, rgba(255, 246, 200, 0.24) 42%, rgba(255, 214, 66, 0.2) 52%, transparent 72%) 0 0 / 250% 100%;
  mix-blend-mode: screen;
  animation: holo-sweep 3.4s ease-in-out 1.2s infinite;
}

.s-burst {
  position: absolute;
  left: 50%;
  top: 50%;
  width: min(120vw, 900px);
  aspect-ratio: 1;
  translate: -50% -50%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 246, 200, 0.65) 0%, rgba(255, 214, 66, 0.28) 24%, transparent 60%);
  opacity: 0;
  pointer-events: none;
  animation: s-burst 1.2s var(--ease-out) var(--s-delay) both;
}

/* -- interaction ---------------------------------------------------------- */
.tap-zone {
  position: absolute;
  inset: 0;
  z-index: 40;
  border: 0;
  background: transparent;
  cursor: pointer;
}
.tap-zone:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: -6px;
}
.tap-hint {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 10%;
  z-index: 41;
  color: var(--gold);
  font-size: 0.68rem;
  letter-spacing: 0.3em;
  text-align: center;
  text-transform: uppercase;
  animation: hint-breathe 2.2s ease-in-out infinite;
  pointer-events: none;
}

.pack-foot {
  position: relative;
  z-index: 6;
  display: grid;
  place-items: center;
  min-height: 86px;
  padding:
    0
    max(16px, env(safe-area-inset-right))
    max(18px, env(safe-area-inset-bottom))
    max(16px, env(safe-area-inset-left));
}
.pack-cta {
  min-width: min(300px, 84vw);
  min-height: 54px;
  padding: 0 28px;
  border: 0;
  background: linear-gradient(180deg, #ffe57a 0%, var(--gold) 45%, #f0bf1a 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6), inset 0 -3px 0 rgba(110, 80, 0, 0.35), 0 0 34px rgba(255, 214, 66, 0.22);
  color: var(--on-gold);
  font: 800 16px var(--font-display);
  font-stretch: 125%;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  animation: rise-in 0.45s var(--ease-out) both;
}

@keyframes veil-in { from { opacity: 0; } }
@keyframes screen-in { from { opacity: 0; } }
@keyframes aura-breathe {
  0%, 100% { opacity: 0.55; scale: 0.94; }
  50% { opacity: 1; scale: 1.06; }
}
@keyframes pack-float {
  0%, 100% { translate: -50% -54%; rotate: -1deg; }
  50% { translate: -50% -57%; rotate: 1deg; }
}
@keyframes pack-shake {
  0%, 100% { transform: translateX(0) rotate(0); }
  15% { transform: translateX(-7px) rotate(-2deg); }
  35% { transform: translateX(6px) rotate(2deg); }
  55% { transform: translateX(-4px) rotate(-1deg); }
  75% { transform: translateX(3px) rotate(1deg); }
}
@keyframes tear-left {
  to { translate: -42% -10%; rotate: -8deg; opacity: 0; }
}
@keyframes tear-right {
  to { translate: 42% -10%; rotate: 8deg; opacity: 0; }
}
@keyframes face-out { to { opacity: 0; scale: 1.15; } }
@keyframes deck-in {
  from { opacity: 0; scale: 0.7; translate: -50% -46%; }
  to { opacity: 1; scale: 1; translate: -50% -54%; }
}
@keyframes deck-deal {
  to { opacity: 0; scale: 0.9; }
}
@keyframes card-fly {
  0% { transform: translate(-50%, -50%) translate(0, 26px) rotate(0deg) scale(0.58); opacity: 0; filter: brightness(2); }
  16% { opacity: 1; }
  68% { transform: translate(-50%, -50%) translate(calc(var(--x) * 1.1), calc(var(--y) - 12px)) rotate(calc(var(--r) * 1.25)) scale(1.05); filter: brightness(1.15); }
  100% { transform: translate(-50%, -50%) translate(var(--x), var(--y)) rotate(var(--r)) scale(1); opacity: 1; filter: none; }
}
@keyframes card-flip {
  from { transform: rotateY(180deg); }
  to { transform: rotateY(0); }
}
@keyframes s-burst {
  0% { opacity: 0; scale: 0.25; }
  18% { opacity: 1; scale: 0.9; }
  100% { opacity: 0; scale: 1.35; }
}
@keyframes holo-sweep {
  0%, 100% { background-position: 120% 0; }
  50% { background-position: -20% 0; }
}
@keyframes hint-breathe {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
}
@keyframes mote-rise {
  0% { opacity: 0; translate: 0 0; }
  12% { opacity: 0.9; }
  80% { opacity: 0.5; }
  100% { opacity: 0; translate: var(--drift) -62vh; }
}
@keyframes rise-in {
  from { opacity: 0; translate: 0 14px; }
}

@media (max-width: 1020px) {
  .pack-screen.contained {
    inset: 0;
    translate: 0 0;
    width: auto;
    height: auto;
    border: 0;
    clip-path: none;
  }
}

@media (max-width: 720px) {
  .pack-wrap { width: min(58vw, 230px); }
  .pack-fan {
    --card-w: min(44vw, 176px);
    --spread: min(25vw, 100px);
    --lift: 60px;
  }
  .pack-deck { --card-w: min(44vw, 176px); }
  .card-front { padding: 8px; }
  .card-cat { font-size: 7px; }
  .card-name { font-size: min(13px, 100cqi / var(--fit-len, 1)); }
  .pack-foot { min-height: 78px; }
}

@media (max-height: 560px) {
  .pack-fan {
    --card-w: min(26vh, 150px);
    --spread: min(14vh, 90px);
    --lift: 26px;
  }
  .pack-deck { --card-w: min(26vh, 150px); }
  .pack-wrap { width: min(30vh, 170px); }
  .tap-hint { bottom: 6%; }
  .pack-foot { min-height: 64px; }
}

@media (prefers-reduced-motion: reduce) {
  .pack-aura,
  .pack-wrap,
  .pack-deck,
  .deck-card,
  .card-slot,
  .card-flip,
  .s-burst,
  .mote,
  .tap-hint,
  .card-slot.s .card-front::after,
  .pack-cta { animation: none; }
  .pack-veil,
  .pack-screen { animation: none; }
}
</style>
