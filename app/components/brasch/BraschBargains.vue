<script setup lang="ts">
import { DialogClose } from 'reka-ui'
import { catchUpOpsBehind } from '~~/shared/engine/progression'
import { armorPackOfferFor, armorPacksFor, armorPackItemsFor, bargainShelfFor, bargainsClosedReason, canBuyArmorPack, canBuyItem } from '~~/shared/engine/selectors'
import type { DiverState, DiveState } from '~~/shared/engine/types'

// Brasch's Bargains: a counter, not a page section. On desktop it is a wide
// modal; on a phone AppDialog's fullscreen mode turns it into the whole screen.
// The shelf is one buy per mission, the Armor Pack is repeatable with a rising
// price, and both are engine verdicts — this component only renders them.
const props = defineProps<{
  state: DiveState
  self: DiverState | null
}>()

const emit = defineEmits<{ buy: [itemId: string], openPack: [] }>()

const { bargainsOpen, closeBargains } = useDrawers()

const credits = computed(() => props.self?.credits ?? 0)
const opNumber = computed(() =>
  catchUpOpsBehind(props.state.difficulty, props.state.settings?.variant ?? 'medium') + 1)
const closed = computed(() => bargainsClosedReason(props.state))
const shelf = computed(() => (props.self ? bargainShelfFor(props.state, props.self) : []))
const pack = computed(() => (props.self ? armorPackOfferFor(props.state, props.self) : null))
const packs = computed(() => (props.self ? armorPacksFor(props.self) : []))
const lastPull = computed(() => (props.self ? armorPackItemsFor(props.self) : []))
const packVerdict = computed(() =>
  props.self ? canBuyArmorPack(props.state, props.self) : { allowed: false, reason: null })

const packOpen = ref(false)
const packInstant = ref(false)
const pendingPack = ref(false)

const shelfBought = computed(() => Boolean(props.self?.bargain?.boughtItemId))
const footNote = computed(() => {
  if (closed.value) {
    return closed.value
  }
  return shelfBought.value ? 'Shelf bought this mission' : 'Restocks every mission'
})

// A purchase round-trips through the engine, so open the reveal when the stored
// pull lands, not when the button is pressed. The counter stays mounted under
// the desktop stage; a phone gets both as full-screen layers.
watch(() => packs.value.length, (count, previous) => {
  if (count > previous && pendingPack.value) {
    pendingPack.value = false
    showPack(false)
  }
})

watch(closed, (reason) => {
  if (reason) {
    packOpen.value = false
    closeBargains()
  }
})

onBeforeUnmount(closeBargains)

function showPack(instant: boolean): void {
  packInstant.value = instant
  packOpen.value = true
}

function buyPack(): void {
  if (!packVerdict.value.allowed) {
    return
  }
  pendingPack.value = true
  emit('openPack')
}

function viewPack(): void {
  if (lastPull.value.length === 0) {
    return
  }
  showPack(true)
}

function closePack(): void {
  packOpen.value = false
}

// The engine's verdict (canBuyItem): the shelf never invents a reason.
function verdict(slotId: string): { allowed: boolean, reason: string | null } {
  const slot = shelf.value.find(entry => entry.slotId === slotId)
  if (!props.self || !slot?.item) {
    return { allowed: false, reason: null }
  }
  return canBuyItem(props.state, props.self, slot.item.id)
}
</script>

<template>
  <AppDialog
    v-model:open="bargainsOpen"
    title="Brasch's Bargains"
    description="Samples become credits. Brasch sells gear between missions."
    size="xl"
    hide-title
    :show-close="false"
    :dismissible="!packOpen"
    fullscreen="mobile"
    content-class="brasch-dialog"
  >
    <div
      class="shop"
      :class="{ locked: closed }"
    >
      <span
        class="shop-grid"
        aria-hidden="true"
      />

      <header class="shop-head">
        <div class="shop-sign">
          <span class="shop-kicker">Operation {{ opNumber }} · Mission {{ state.missionInOperation }}</span>
          <h2 class="shop-title disp">
            Brasch's <b>Bargains</b>
          </h2>
        </div>

        <div
          class="shop-purse"
          role="img"
          :aria-label="`${credits} credits`"
        >
          <IconCredit />
          <b class="shop-purse-num disp">{{ credits }}</b>
          <span class="shop-purse-word">credits</span>
        </div>

        <DialogClose
          v-if="!packOpen"
          as-child
        >
          <button
            class="shop-x"
            type="button"
            aria-label="Close Brasch's Bargains"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              aria-hidden="true"
            >
              <path
                d="M2 2l12 12M14 2 2 14"
                stroke="currentColor"
                stroke-width="2"
              />
            </svg>
          </button>
        </DialogClose>
      </header>

      <div
        class="shop-rail"
        aria-hidden="true"
      />

      <div class="shop-scroll">
        <AppBanner
          v-if="closed"
          tone="locked"
        >
          {{ closed }}
        </AppBanner>

        <div
          v-else
          class="shop-body"
        >
          <div class="shop-row">
            <ul
              class="shelf"
              :style="{ '--cols': Math.max(1, shelf.length) }"
              aria-label="Brasch's shelf"
            >
              <BraschShelfSlot
                v-for="entry in shelf"
                :key="entry.slotId"
                :entry="entry"
                :verdict="verdict(entry.slotId)"
                @buy="entry.item && emit('buy', entry.item.id)"
              />
            </ul>

            <BraschArmorPack
              v-if="pack"
              :offer="pack"
              :packs="packs"
              :last-pull="lastPull"
              :verdict="packVerdict"
              @buy="buyPack"
              @view="viewPack"
            />
          </div>

          <div
            class="shelf-lip"
            aria-hidden="true"
          />
        </div>
      </div>

      <footer class="shop-foot">
        <span class="shop-foot-note">
          <IconCredit />
          {{ footNote }}
        </span>
        <span
          v-if="!closed"
          class="shop-foot-rule"
        >
          One shelf buy per mission · Packs stack
        </span>
      </footer>
    </div>
  </AppDialog>

  <BraschPackReveal
    :open="packOpen"
    :items="lastPull"
    :pack-seed="packs.at(-1)?.seed ?? null"
    :instant="packInstant"
    contained
    @close="closePack"
  />
</template>

<style scoped>
/* The counter owns the whole dialog surface. */
:global(.app-dialog.brasch-dialog) {
  width: min(72rem, calc(100vw - 2rem));
  max-height: min(90vh, 880px);
  padding: 0;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--gold) 28%, var(--line-3));
  border-top: 0;
  background: var(--ground);
}
:global(.app-dialog.brasch-dialog .app-dialog-body) {
  display: flex;
  flex: 1;
  min-height: 0;
}

.shop {
  position: relative;
  isolation: isolate;
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  color: var(--text);
  background:
    radial-gradient(ellipse 72% 62% at 32% -12%, color-mix(in srgb, var(--gold) 13%, transparent), transparent 68%),
    radial-gradient(ellipse 50% 40% at 92% 18%, color-mix(in srgb, var(--orange) 8%, transparent), transparent 70%),
    linear-gradient(180deg, #12140d 0%, #0b0c09 58%, #080906 100%);
}
.shop-grid {
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background-image:
    linear-gradient(color-mix(in srgb, var(--khaki) 4%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--khaki) 4%, transparent) 1px, transparent 1px);
  background-size: 44px 44px;
  mask-image: radial-gradient(ellipse 85% 72% at 50% 34%, #000, transparent 82%);
  opacity: 0.55;
}

/* -- the sign ------------------------------------------------------------- */
.shop-head {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: clamp(12px, 2vw, 28px);
  padding:
    clamp(16px, 2.2vw, 26px)
    clamp(16px, 2.4vw, 30px)
    clamp(10px, 1.4vw, 16px);
}
.shop-sign {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.shop-kicker {
  color: var(--gold);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.24em;
  text-transform: uppercase;
}
.shop-title {
  margin: 0;
  color: var(--khaki);
  font-size: clamp(30px, 4vw, 48px);
  font-weight: 800;
  line-height: 0.92;
  letter-spacing: 0.01em;
  text-transform: uppercase;
}
.shop-title b {
  color: var(--text);
  font-weight: 800;
  background: linear-gradient(180deg, #fff8d6 0%, var(--gold) 52%, #d9a91c 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 0 18px color-mix(in srgb, var(--gold) 24%, transparent));
}

.shop-purse {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-left: auto;
  padding: 6px 14px 6px 12px;
  border: 1px solid color-mix(in srgb, var(--gold) 45%, var(--line-3));
  background:
    repeating-linear-gradient(135deg, color-mix(in srgb, var(--gold) 7%, transparent) 0 6px, transparent 6px 14px),
    color-mix(in srgb, var(--gold) 5%, var(--rail));
  color: var(--gold);
  clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
}
.shop-purse :deep(.credit-mark) {
  width: 20px;
  height: 20px;
  align-self: center;
}
.shop-purse-num {
  font-size: clamp(24px, 2.6vw, 34px);
  line-height: 1;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 18px color-mix(in srgb, var(--gold) 30%, transparent);
}
.shop-purse-word {
  color: var(--khaki);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.shop-x {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border: 1px solid var(--line-3);
  background: color-mix(in srgb, var(--ground) 70%, transparent);
  color: var(--khaki);
  cursor: pointer;
}
.shop-x:hover { color: var(--gold); border-color: var(--gold); }

/* A brass rail under the sign, with hazard ticks at the ends. */
.shop-rail {
  flex-shrink: 0;
  height: 4px;
  margin: 0 clamp(16px, 2.4vw, 30px);
  background:
    repeating-linear-gradient(90deg, transparent 0 9px, color-mix(in srgb, var(--gold) 55%, transparent) 9px 10px),
    linear-gradient(90deg, transparent, color-mix(in srgb, var(--gold) 55%, var(--line-3)) 18%, color-mix(in srgb, var(--gold) 55%, var(--line-3)) 82%, transparent);
  opacity: 0.75;
}

.shop-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: clamp(12px, 1.6vw, 20px) clamp(16px, 2.4vw, 30px) clamp(10px, 1.4vw, 14px);
}

.shop-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shop-row {
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: clamp(16px, 2vw, 28px);
}

/* -- the shelf ------------------------------------------------------------ */
.shelf {
  --gap: clamp(12px, 1.5vw, 20px);
  display: grid;
  grid-template-columns: repeat(var(--cols, 3), minmax(0, 1fr));
  flex: 1;
  gap: var(--gap);
  width: 100%;
  max-width: calc(var(--cols, 3) * 210px + (var(--cols, 3) - 1) * var(--gap));
  margin: 0;
  padding: 0 0 2px;
  list-style: none;
}
.shelf-lip {
  height: 10px;
  margin: -2px 0 8px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--gold) 22%, var(--line-3)), transparent 46%),
    linear-gradient(90deg, transparent, var(--line-4) 8%, var(--line-4) 92%, transparent);
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.35);
  opacity: 0.9;
}

@media (max-width: 900px) {
  .shelf { --gap: 12px; }
}
@media (max-width: 720px) {
  .shop-row {
    flex-direction: column;
    gap: 18px;
  }
  .shelf {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    max-width: none;
  }
}

/* -- the counter's foot --------------------------------------------------- */
.shop-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding:
    10px
    clamp(16px, 2.4vw, 30px)
    max(12px, env(safe-area-inset-bottom));
  border-top: 1px solid color-mix(in srgb, var(--gold) 14%, var(--line-1));
  background: color-mix(in srgb, var(--ground) 82%, transparent);
  color: var(--muted);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.shop-foot-note {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.shop-foot-note :deep(.credit-mark) { width: 14px; height: 14px; color: var(--gold); }
.shop-foot-rule { color: var(--dim); }

/* -- phone takeover ------------------------------------------------------- */
@media (max-width: 1020px) {
  :global(.app-dialog.brasch-dialog) {
    width: 100vw;
    height: 100dvh;
    max-height: none;
    border: 0;
  }
  .shop-head {
    padding-top: max(16px, env(safe-area-inset-top));
  }
  .shop-foot {
    padding-bottom: max(12px, env(safe-area-inset-bottom));
  }
}
@media (max-width: 620px) {
  .shop-head {
    position: relative;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
  }
  .shop-title { font-size: 30px; padding-right: 42px; }
  .shop-purse { order: 3; margin-left: 0; }
  .shop-x {
    position: absolute;
    top: max(14px, env(safe-area-inset-top));
    right: 14px;
    margin-left: 0;
  }
  .shop-foot-rule { display: none; }
  .shop-foot-note { font-size: 10px; }
}

.locked .shop-grid { opacity: 0.3; }
</style>
