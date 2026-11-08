<script setup lang="ts">
import { TIER_RANK } from '~~/shared/data/catalog'
import { itemImageUrl } from '~~/shared/data/images'
import type { Item } from '~~/shared/data/types'
import { baseTierFor } from '~~/shared/engine/config'
import { availableCaches, catchUpOptionsFor } from '~~/shared/engine/selectors'
import type { DiveState, DiverState } from '~~/shared/engine/types'

const props = defineProps<{
  open: boolean
  state: DiveState
  diver: DiverState
}>()
const { itemById } = useTierCatalog()

const emit = defineEmits<{
  claimOption: [optionId: string]
  claimCache: [ownerId: string]
  openWarbonds: []
}>()

// A joiner settles their promotion before they dive, so they reach the squad
// with their gear ready. The gate holds only while the engine says something
// is left to claim (promotionPending), never the squad.
const options = computed(() => catchUpOptionsFor(props.state, props.diver))
const untouched = computed(() => props.diver.catchUpOwed === props.diver.catchUpGranted)
const baseTier = computed(() => baseTierFor(props.state.difficulty))

// Best gear first, so a kit's headline pieces lead its tile row.
function byTier(a: Item, b: Item): number {
  return TIER_RANK[b.tier] - TIER_RANK[a.tier]
}

const caches = computed(() => untouched.value
  ? availableCaches(props.state).map((cache) => {
      const items = cache.itemIds
        .map(id => itemById(id))
        .filter((item): item is Item => item !== undefined)
        .sort(byTier)
      return {
        ownerId: cache.ownerId,
        name: cache.name,
        items,
        topTier: items[0]?.tier.toUpperCase() ?? 'C',
      }
    })
  : [])

// Calling in the promotion is final: the choice never comes back, and the
// first claim commits the diver regardless.
const rolling = ref(false)
const view = computed<'choice' | 'picks'>(() => rolling.value || !untouched.value ? 'picks' : 'choice')

const picksLabel = computed(() => props.diver.catchUpOwed === 1 ? 'pick' : 'picks')

// The call-in shows the picks as a honeycomb — one gold hex per pick owed,
// stamped with the tier it rolls — echoing the picks chits on the draft.
const HEX_R = 14
const HEX_W = HEX_R * Math.sqrt(3)
const HEX_DX = HEX_W + 3
const HEX_DY = HEX_R * 1.5 + 2.6
const HONEYCOMB: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[-HEX_DX / 2, 0], [HEX_DX / 2, 0]],
  3: [[-HEX_DX / 2, -HEX_DY / 2], [HEX_DX / 2, -HEX_DY / 2], [0, HEX_DY / 2]],
  4: [[0, -HEX_DY], [-HEX_DX / 2, 0], [HEX_DX / 2, 0], [0, HEX_DY]],
}

const pickHexes = computed(() => {
  const count = Math.min(Math.max(props.diver.catchUpOwed, 1), 4)
  return HONEYCOMB[count]!.map(([x, y]) => ({
    x,
    y,
    points: [
      [x, y - HEX_R],
      [x + HEX_W / 2, y - HEX_R / 2],
      [x + HEX_W / 2, y + HEX_R / 2],
      [x, y + HEX_R],
      [x - HEX_W / 2, y + HEX_R / 2],
      [x - HEX_W / 2, y - HEX_R / 2],
    ].map(point => point.map(n => n.toFixed(2)).join(',')).join(' '),
  }))
})

function tileLabel(item: Item): string {
  return `${item.displayName}, ${item.tier.toUpperCase()} tier ${item.category.toLowerCase()}`
}
</script>

<template>
  <AppDialog
    :open="open"
    title="Field Promotion"
    size="xl"
    :dismissible="false"
    :show-close="false"
    :hide-title="view === 'picks'"
  >
    <template #title>
      <span class="promo-title">
        <svg
          class="promo-rank"
          viewBox="0 0 28 32"
          fill="none"
          aria-hidden="true"
        >
          <path
            v-for="i in Math.max(diver.catchUpGranted, 1)"
            :key="i"
            :d="`M3 ${8 + (i - 1) * 7}l11-6 11 6`"
          />
        </svg>
        <span class="promo-words">
          <span class="lbl promo-kicker">Mid-crusade enlistment</span>
          <span class="disp promo-name">Field Promotion</span>
        </span>
      </span>
    </template>

    <template
      v-if="view === 'choice'"
      #actions
    >
      <button
        class="btn tiny ghost warbonds-btn"
        type="button"
        @click="emit('openWarbonds')"
      >
        <IconWarbond aria-hidden="true" />
        Warbonds
      </button>
    </template>

    <div
      v-if="view === 'choice'"
      class="choice-wrap"
    >
      <div class="choice">
        <section
          class="col kits"
          aria-labelledby="promo-kits-title"
        >
          <h3
            id="promo-kits-title"
            class="disp col-title"
          >
            Fallen divers' kits
          </h3>
          <p class="col-sub">
            Their sacrifice, your call. Make it count.
          </p>

          <ul
            v-if="caches.length"
            class="kit-list"
          >
            <li
              v-for="(cache, index) in caches"
              :key="cache.ownerId"
              class="kit cut-sm"
              :data-tier="cache.topTier"
              :style="{ '--i': index }"
            >
              <div class="kit-portrait">
                <IconSalute class="kit-salute" />
                <span class="kit-ribbon">
                  <span class="kit-name">{{ upperName(cache.name) }}</span>
                </span>
              </div>
              <ul
                class="tiles"
                :aria-label="`${cache.name}'s kit`"
              >
                <li
                  v-for="item in cache.items"
                  :key="item.id"
                >
                  <AppTooltip :content="tileLabel(item)">
                    <span
                      class="tile"
                      :data-tier="item.tier.toUpperCase()"
                      role="img"
                      tabindex="0"
                      :aria-label="tileLabel(item)"
                    >
                      <img
                        v-if="itemImageUrl(item)"
                        :src="itemImageUrl(item)"
                        alt=""
                        loading="lazy"
                        draggable="false"
                      >
                      <span
                        v-else
                        class="disp tile-glyph"
                      >{{ item.tier.toUpperCase() }}</span>
                    </span>
                  </AppTooltip>
                </li>
              </ul>
              <button
                class="btn kit-claim"
                type="button"
                :aria-label="`Claim ${cache.name}'s kit: ${cache.items.map(item => item.displayName).join(', ')}`"
                @click="emit('claimCache', cache.ownerId)"
              >
                Claim kit
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.2"
                  aria-hidden="true"
                ><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </button>
            </li>
          </ul>
          <p
            v-else
            class="kits-empty"
          >
            No kits on the field — every fallen diver's gear has been claimed.
          </p>
        </section>

        <div
          class="or"
          aria-hidden="true"
        >
          <span class="disp">or</span>
        </div>

        <button
          class="col roll cut"
          type="button"
          :aria-label="`Promotion picks: draft ${diver.catchUpOwed} ${picksLabel} at ${baseTier} tier`"
          @click="rolling = true"
        >
          <svg
            class="roll-icon"
            viewBox="-40 -40 80 80"
            aria-hidden="true"
          >
            <g
              v-for="(hex, index) in pickHexes"
              :key="index"
            >
              <polygon
                class="roll-hex"
                :points="hex.points"
              />
              <text
                class="disp roll-hex-tier"
                :x="hex.x"
                :y="hex.y"
              >{{ baseTier }}</text>
            </g>
          </svg>
          <span class="roll-copy">
            <span class="disp roll-word">Promotion picks</span>
            <span class="roll-sub">
              {{ diver.catchUpOwed }} {{ picksLabel }} ·
              <span
                class="tb roll-tier"
                :data-tier="baseTier"
              >{{ baseTier }}</span>
              tier
            </span>
          </span>
        </button>
      </div>
    </div>

    <RewardDraft
      v-else
      variant="promotion"
      kicker=""
      title="Promotion Picks"
      :options="options"
      :picked-id="null"
      :pool="[]"
      :owned-ids="[]"
      :base-tier="baseTier"
      :picks-left="diver.catchUpOwed"
      :picks-total="diver.catchUpGranted"
      @pick="optionId => emit('claimOption', optionId)"
    >
      <template #head-actions>
        <button
          class="btn tiny ghost warbonds-btn"
          type="button"
          @click="emit('openWarbonds')"
        >
          <IconWarbond aria-hidden="true" />
          Warbonds
        </button>
      </template>
    </RewardDraft>
  </AppDialog>
</template>

<style scoped>
/* Header: rank chevrons (one per pick granted) beside a display-font title. */
.promo-title { display: flex; align-items: center; gap: 0.75rem; }
.promo-rank { width: 1.9rem; height: 2.2rem; flex-shrink: 0; overflow: visible; }
.promo-rank path {
  stroke: var(--teal);
  stroke-width: 3.2;
  stroke-linecap: square;
  stroke-linejoin: miter;
}
.promo-words { display: flex; flex-direction: column; gap: 2px; }
.promo-kicker { font-size: 10px; color: var(--teal); }
.promo-name { font-size: clamp(1.35rem, 3.4vw, 1.9rem); line-height: 1; color: var(--text); }

.warbonds-btn { display: inline-flex; align-items: center; gap: 0.4rem; }
.warbonds-btn :deep(svg) { width: 14px; height: 14px; }

.choice-wrap { container-type: inline-size; }
.choice {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) auto minmax(0, 1fr);
  gap: var(--gap-panel);
}

.col {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  min-width: 0;
  padding: 1rem;
  border: 1px solid var(--line-2);
  background: var(--ground);
  animation: riseIn 0.42s var(--ease-out) both;
}
.col-title { margin: 0; font-size: 1.15rem; color: var(--text); }
.col-sub { margin: -0.5rem 0 0; font-size: 0.85rem; font-style: italic; color: var(--khaki); }

.or {
  display: grid;
  place-items: center;
  position: relative;
  color: var(--dim);
  font-size: 0.85rem;
  text-transform: uppercase;
}
.or::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  border-left: 1px dashed var(--line-3);
}
.or span { position: relative; padding: 0.4rem 0; background: var(--panel); }

/* Fallen divers' kits */
.kit-list {
  display: grid;
  gap: 0.6rem;
  margin: 0;
  padding: 0;
  list-style: none;
  max-height: 24rem;
  overflow: auto;
}

.kit {
  --salute-cut: var(--panel);
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  grid-template-areas: 'portrait tiles claim';
  align-items: center;
  gap: 0.9rem;
  padding: 0 0.75rem 0 0.4rem;
  overflow: hidden;
  background: var(--panel);
  border: 1px solid var(--line-2);
  border-left: 3px solid currentColor;
  animation: riseIn 0.42s var(--ease-out) calc(var(--i) * 70ms + 120ms) both;
  transition: border-color var(--dur-fast);
}
.kit:hover,
.kit:focus-within { border-color: color-mix(in srgb, currentColor 55%, var(--line-2)); border-left-color: currentColor; }

/* The salute stands on the row itself, running off its bottom edge; the
   name rides a gold memorial ribbon across it. */
.kit-portrait {
  grid-area: portrait;
  position: relative;
  align-self: stretch;
  width: 6rem;
  height: 4.75rem;
}
.kit-salute {
  position: absolute;
  left: 50%;
  bottom: -1rem;
  width: 5.5rem;
  height: 5.5rem;
  translate: -50% 0;
  color: var(--text);
}
.kit-ribbon {
  position: absolute;
  left: -0.15rem;
  right: -0.15rem;
  bottom: 0.2rem;
  display: flex;
  justify-content: center;
  padding: 3px 10px;
  background: var(--gold);
  color: var(--on-gold);
  clip-path: polygon(0 0, 100% 0, calc(100% - 6px) 50%, 100% 100%, 0 100%, 6px 50%);
  rotate: -3deg;
}
/* Pointer devices reveal the name on hover or focus; touch screens (and the
   stacked phone layout) always show it. */
@media (hover: hover) {
  .kit-ribbon { opacity: 0; transition: opacity var(--dur-med) var(--ease-out); }
  .kit:hover .kit-ribbon,
  .kit:focus-within .kit-ribbon { opacity: 1; }
}
.kit-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.tiles {
  grid-area: tiles;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.tile {
  position: relative;
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border: 1px solid var(--line-2);
  border-bottom: 2px solid currentColor;
  background: var(--ground);
  transition: transform var(--dur-fast) var(--ease-out), border-color var(--dur-fast);
}
.tile:hover,
.tile:focus-visible { transform: translateY(-2px); border-color: currentColor; }
.tile img { width: 32px; height: 32px; object-fit: contain; pointer-events: none; }
.tile-glyph { font-size: 0.8rem; }

.kit-claim {
  grid-area: claim;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  align-self: center;
  height: 44px;
  padding: 0 0.9rem;
  color: var(--gold);
  border-color: color-mix(in srgb, var(--gold) 45%, var(--line-3));
  white-space: nowrap;
}
.kit-claim:hover,
.kit-claim:focus-visible { background: color-mix(in srgb, var(--gold) 12%, transparent); }

.kits-empty {
  margin: 0;
  padding: 1rem;
  font-size: 0.85rem;
  color: var(--muted);
  border: 1px dashed var(--line-2);
}

/* Promotion picks: the whole column is the call-in. */
.roll {
  position: relative;
  align-items: center;
  justify-content: center;
  gap: 1.1rem;
  min-height: 17rem;
  padding: 1.5rem 1rem;
  background:
    radial-gradient(ellipse 65% 50% at 50% 40%, color-mix(in srgb, var(--gold) 13%, transparent), transparent 72%),
    var(--ground);
  border-color: color-mix(in srgb, var(--gold) 45%, var(--line-3));
  color: var(--text);
  font: inherit;
  cursor: pointer;
  overflow: hidden;
  animation-delay: 90ms;
  transition: border-color var(--dur-fast), background-color var(--dur-fast);
}
.roll:hover,
.roll:focus-visible { border-color: var(--gold); background-color: color-mix(in srgb, var(--gold) 5%, var(--ground)); }

.roll-icon { width: 7rem; height: 7rem; overflow: visible; filter: drop-shadow(0 0 14px color-mix(in srgb, var(--gold) 28%, transparent)); }
.roll-hex { fill: var(--gold); stroke: color-mix(in srgb, var(--gold) 60%, white); stroke-width: 1; stroke-linejoin: round; }
.roll-hex-tier {
  fill: var(--on-gold);
  font-size: 13px;
  text-anchor: middle;
  dominant-baseline: central;
}

.roll-copy { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; }
.roll-word { font-size: 1.4rem; color: var(--gold); text-align: center; }
.roll-sub {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--khaki);
}
.roll-tier { min-width: 20px; height: 18px; padding: 0 3px; font-size: 10px; border: 1px solid currentColor; }

/* Phones (and any narrow dialog) stack the options: kits first, the call-in
   beneath, the divider turning horizontal. */
@container (max-width: 40rem) {
  /* The stacked row leaves room above the salute: the name rides there. */
  .kit-ribbon { opacity: 1; top: 0.5rem; bottom: auto; }
  .choice { grid-template-columns: minmax(0, 1fr); }
  .or { padding: 0.2rem 0; }
  .or::before { top: 50%; bottom: auto; left: 0; right: 0; border-left: 0; border-top: 1px dashed var(--line-3); }
  .or span { padding: 0 0.6rem; }
  .roll { min-height: 0; flex-direction: row; gap: 1rem; padding: 1rem; }
  .roll-icon { width: 3.6rem; height: 3.6rem; flex-shrink: 0; }
  .roll-copy { align-items: flex-start; }
  .roll-word { text-align: left; font-size: 1.15rem; }
  .kit {
    grid-template-columns: auto minmax(0, 1fr);
    grid-template-areas:
      'portrait tiles'
      'portrait claim';
    row-gap: 0.5rem;
    padding-top: 0.6rem;
  }
  .kit-portrait { height: auto; min-height: 4.75rem; margin-top: -0.6rem; }
  .kit-claim { justify-content: center; height: 38px; margin-bottom: 0.6rem; }
  .kit-list { max-height: none; }
}
</style>
