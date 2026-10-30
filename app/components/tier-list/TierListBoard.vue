<script setup lang="ts">
import type { Item, Tier } from '~~/shared/data/types'
import { TIERS, tieredCatalog } from '~~/shared/engine/tierList'
import type { TierList } from '~~/shared/engine/tierList'
import { KIT_SECTIONS, TIER_MAKER_SECTIONS, kitSectionOf } from '~/utils/kit'
import type { KitSectionId, TileSize } from '~/utils/kit'

// The Tier Maker's board, tiermaker-style: one row per tier, every item a
// tile. Drag a tile to a row (long-press on touch), or focus it and press
// S/A/B/C. Clicking a tile selects it for the inspector. Presentation only:
// every move is emitted, the page owns the draft and its saved `baseline`.
const props = defineProps<{
  draft: TierList
  baseline: TierList
  named: boolean
  size: TileSize
  section: KitSectionId | 'all'
  query: string
  selectedId: string | null
  landed: { id: string, n: number } | null
}>()

const emit = defineEmits<{
  set: [itemId: string, tier: Tier]
  revert: [itemId: string]
  select: [itemId: string | null]
}>()

const TIER_WORD: Readonly<Record<Tier, string>> = { s: 'Top shelf', a: 'Strong', b: 'Solid', c: 'Surplus' }
const SECTION_ORDER = new Map(TIER_MAKER_SECTIONS.map((section, index) => [section.id, index]))
const SECTION_BY_ID = new Map(KIT_SECTIONS.map(section => [section.id, section]))

function sectionOf(item: Item) {
  return SECTION_BY_ID.get(kitSectionOf(item))!
}

const catalog = computed(() => tieredCatalog(props.draft))
const saved = computed(() => tieredCatalog(props.baseline))

function changed(item: Item): boolean {
  return props.draft.tiers[item.id] !== props.baseline.tiers[item.id]
}

function unrated(item: Item): boolean {
  return props.draft.tiers[item.id] === undefined
}
const needle = computed(() => props.query.trim().toLowerCase())

function matches(item: Item): boolean {
  return !needle.value || item.displayName.toLowerCase().includes(needle.value)
}

// Within a row, items keep the Tier Maker's section order (weapons, then
// stratagems by role, armor and boosters last) and then name, so a row reads
// in groups.
const rows = computed(() => {
  const visible = catalog.value.items
    .filter(item => props.section === 'all' || kitSectionOf(item) === props.section)
    .sort((a, b) =>
      (SECTION_ORDER.get(kitSectionOf(a)) ?? 0) - (SECTION_ORDER.get(kitSectionOf(b)) ?? 0)
      || a.displayName.localeCompare(b.displayName))
  return TIERS.map(tier => ({ tier, items: visible.filter(item => item.tier === tier) }))
})

const { drag, pressing, start, consumeClick } = useTierDrag((id, tier) => emit('set', id, tier))
const dragItem = computed(() => (drag.value ? catalog.value.byId.get(drag.value.id) ?? null : null))

// The row an item just landed in flashes its label.
const flashTier = ref<Tier | null>(null)
let flashTimer: ReturnType<typeof setTimeout> | undefined
watch(() => props.landed, (landed) => {
  const tier = landed ? catalog.value.byId.get(landed.id)?.tier ?? null : null
  flashTier.value = null
  clearTimeout(flashTimer)
  if (tier) {
    requestAnimationFrame(() => {
      flashTier.value = tier
    })
    flashTimer = setTimeout(() => {
      flashTier.value = null
    }, 900)
  }
})
onBeforeUnmount(() => clearTimeout(flashTimer))

// One tab stop for the whole board; arrows walk the tiles.
const focusId = ref<string | null>(null)
const rovingId = computed(() => {
  const all = rows.value.flatMap(row => row.items)
  return all.some(item => item.id === focusId.value) ? focusId.value : all[0]?.id ?? null
})

const board = ref<HTMLElement | null>(null)

function tileButton(id: string): HTMLElement | null {
  return board.value?.querySelector<HTMLElement>(`[data-item="${id}"]`) ?? null
}

function focusTile(id: string): void {
  focusId.value = id
  nextTick(() => tileButton(id)?.focus())
}

// Up and down follow the wrapped grid by geometry: the nearest tile on the
// next visual line, across row boundaries.
function verticalNeighbor(id: string, down: boolean): string | null {
  const from = tileButton(id)?.getBoundingClientRect()
  if (!from || !board.value) {
    return null
  }
  const centre = from.left + from.width / 2
  let best: { id: string, top: number, dx: number } | null = null
  for (const el of board.value.querySelectorAll<HTMLElement>('[data-item]')) {
    const rect = el.getBoundingClientRect()
    const ahead = down ? rect.top > from.top + from.height / 2 : rect.top < from.top - from.height / 2
    if (!ahead) {
      continue
    }
    const dx = Math.abs(rect.left + rect.width / 2 - centre)
    const closer = !best
      || (down ? rect.top < best.top - 1 : rect.top > best.top + 1)
      || (Math.abs(rect.top - best.top) <= 1 && dx < best.dx)
    if (closer) {
      best = { id: el.dataset.item!, top: rect.top, dx }
    }
  }
  return best?.id ?? null
}

const KEY_TIER: Readonly<Record<string, Tier>> = { s: 's', a: 'a', b: 'b', c: 'c', 1: 's', 2: 'a', 3: 'b', 4: 'c' }

function moveByKey(item: Item, tier: Tier): void {
  emit('set', item.id, tier)
  focusTile(item.id)
}

function onKey(event: KeyboardEvent, item: Item): void {
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return
  }
  const all = rows.value.flatMap(row => row.items)
  const index = all.findIndex(entry => entry.id === item.id)
  const key = event.key.toLowerCase()
  if (event.shiftKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
    const next = TIERS[TIERS.indexOf(item.tier) + (event.key === 'ArrowUp' ? -1 : 1)]
    if (next) {
      moveByKey(item, next)
    }
  }
  else if (KEY_TIER[key]) {
    moveByKey(item, KEY_TIER[key])
  }
  else if (key === 'd' || event.key === 'Backspace' || event.key === 'Delete') {
    emit('revert', item.id)
    focusTile(item.id)
  }
  else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    const next = all[index + (event.key === 'ArrowRight' ? 1 : -1)]
    if (next) {
      focusTile(next.id)
    }
  }
  else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    const next = verticalNeighbor(item.id, event.key === 'ArrowDown')
    if (next) {
      focusTile(next)
    }
  }
  else if (event.key === 'Home' || event.key === 'End') {
    const next = event.key === 'Home' ? all[0] : all[all.length - 1]
    if (next) {
      focusTile(next.id)
    }
  }
  else if (event.key === 'Escape' && props.selectedId) {
    emit('select', null)
  }
  else {
    return
  }
  event.preventDefault()
}

function onClick(item: Item): void {
  if (consumeClick()) {
    return
  }
  focusId.value = item.id
  emit('select', props.selectedId === item.id ? null : item.id)
}

function label(item: Item): string {
  const was = saved.value.byId.get(item.id)?.tier
  const note = unrated(item)
    ? ', not rated yet'
    : changed(item) && was && was !== item.tier ? `, was ${was.toUpperCase()}` : ''
  return `${item.displayName}, ${sectionOf(item).label}, ${item.tier.toUpperCase()} tier${note}`
}

defineExpose({ focusTile })
</script>

<template>
  <div
    ref="board"
    class="tm-board"
    :class="[`size-${size}`, { dragging: drag !== null }]"
    role="group"
    aria-roledescription="tier board"
    aria-label="Tier board. Drag items between tiers, or focus an item and press S, A, B or C."
  >
    <section
      v-for="row in rows"
      :key="row.tier"
      class="tm-row"
      :class="{ over: drag?.overTier === row.tier, flash: flashTier === row.tier }"
      :style="{ '--tier': `var(--tier-${row.tier})` }"
      :data-drop-tier="row.tier"
      :aria-labelledby="`tm-row-${row.tier}`"
    >
      <div class="tm-label">
        <div class="tm-label-in">
          <h2
            :id="`tm-row-${row.tier}`"
            class="tm-letter disp"
          >
            <span aria-hidden="true">{{ row.tier.toUpperCase() }}</span>
            <span class="sr-only">{{ row.tier.toUpperCase() }} tier, {{ row.items.length }} items</span>
          </h2>
          <span
            class="tm-word"
            aria-hidden="true"
          >{{ TIER_WORD[row.tier] }}</span>
          <span
            class="tm-count"
            aria-hidden="true"
          >{{ row.items.length }}</span>
        </div>
      </div>
      <ul class="tm-zone">
        <li
          v-for="item in row.items"
          :key="item.id"
          class="tm-slot"
        >
          <button
            type="button"
            class="tm-btn"
            :data-item="item.id"
            :tabindex="rovingId === item.id ? 0 : -1"
            :aria-label="label(item)"
            :aria-pressed="selectedId === item.id"
            :title="item.displayName"
            @pointerdown="start($event, item.id)"
            @click="onClick(item)"
            @keydown="onKey($event, item)"
            @focus="focusId = item.id"
            @contextmenu.prevent
          >
            <TierListTile
              :item="item"
              :art="sectionOf(item).art"
              :accent="sectionOf(item).accent"
              :changed="changed(item)"
              :unrated="unrated(item)"
              :named="named"
              :selected="selectedId === item.id"
              :dimmed="!matches(item)"
              :landed="landed?.id === item.id"
              :pressing="pressing === item.id"
              :lifted="drag?.id === item.id"
            />
          </button>
        </li>
        <li
          v-if="!row.items.length"
          class="tm-empty"
          aria-hidden="true"
        >
          Drop items here
        </li>
      </ul>
    </section>

    <Teleport to="body">
      <div
        v-if="drag && dragItem"
        class="tm-ghost"
        :style="{
          '--tile': `${drag.size}px`,
          'transform': `translate(${drag.x - drag.size / 2}px, ${drag.y - drag.size * 0.7}px) rotate(-4deg) scale(1.14)`,
        }"
        aria-hidden="true"
      >
        <TierListTile
          :item="{ ...dragItem, tier: drag.overTier ?? dragItem.tier }"
          :named="named"
          :art="sectionOf(dragItem).art"
          :accent="sectionOf(dragItem).accent"
          ghost
        />
        <span
          v-if="drag.overTier"
          class="tm-ghost-tier disp"
          :style="{ '--tier': `var(--tier-${drag.overTier})` }"
        >{{ drag.overTier.toUpperCase() }}</span>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.tm-board {
  --label-w: clamp(46px, 9cqi, 104px);
  --tile: clamp(48px, 6.6cqi, 78px);
  --gap: 3px;
  display: grid;
  gap: 4px;
  min-width: 0;
  container: tm-board / inline-size;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

.tm-board.size-s { --tile: clamp(40px, 4.8cqi, 58px); }
.tm-board.size-l { --tile: clamp(68px, 9.4cqi, 112px); }

.tm-row {
  position: relative;
  display: grid;
  grid-template-columns: var(--label-w) minmax(0, 1fr);
  min-height: calc(var(--tile) + 10px);
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--tier) 7%, transparent), transparent 40%),
    var(--rail);
  box-shadow: inset 0 0 0 1px var(--line-2);
  transition: box-shadow var(--dur-fast), background-color var(--dur-fast);
}

/* The tier label: a solid block of the tier's colour, like a tier-list row
   header, cut like the terminal's panels. */
.tm-label {
  position: relative;
  background:
    repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.07) 0 1px, transparent 1px 3px),
    linear-gradient(160deg, color-mix(in srgb, var(--tier) 96%, white), color-mix(in srgb, var(--tier) 70%, black));
  clip-path: polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%);
}
.tm-label::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(115deg, transparent 35%, rgba(255, 255, 255, 0.5) 50%, transparent 65%);
  background-size: 300% 100%;
  background-position: 120% 0;
  opacity: 0;
  pointer-events: none;
}
.tm-row[data-drop-tier='s'] .tm-label::after { animation: tm-label-glint 7s var(--ease-snap) 1.5s infinite; }
.tm-row.flash .tm-label::after { animation: tm-label-flash 800ms var(--ease-out) both; }

/* The letter rides down a tall row so the tier stays in view while scrolling. */
.tm-label-in {
  position: sticky;
  top: 6px;
  display: grid;
  justify-items: center;
  gap: 1px;
  padding: 8px 2px;
  color: var(--on-gold);
}
.tm-letter { margin: 0; font-size: clamp(1.7rem, 4.4cqi, 3rem); line-height: 1; color: var(--on-gold); text-shadow: 0 1px 0 rgba(255, 255, 255, 0.25); }
.tm-word {
  display: none;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-align: center;
  text-transform: uppercase;
  opacity: 0.75;
}
.tm-count { font-size: 11px; font-weight: 700; opacity: 0.7; }

/* Tiles stretch to fill each line, so no screen width leaves a dead strip. */
.tm-zone {
  list-style: none;
  margin: 0;
  padding: 5px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--tile), 1fr));
  align-content: start;
  gap: var(--gap);
  min-width: 0;
}
.tm-slot { display: block; min-width: 0; --tile-w: 100%; }
.tm-btn {
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  cursor: grab;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
.tm-btn:focus-visible { outline: 2px solid var(--gold); outline-offset: 1px; }
.tm-board.dragging,
.tm-board.dragging .tm-btn { cursor: grabbing; }

.tm-empty {
  display: grid;
  place-items: center;
  grid-column: 1 / -1;
  min-height: var(--tile);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--dim);
  border: 1px dashed var(--line-3);
}

/* The row under a held item opens up for it. */
.tm-row.over {
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--tier) 22%, transparent), color-mix(in srgb, var(--tier) 6%, transparent)),
    var(--rail);
  box-shadow: inset 0 0 0 2px var(--tier), 0 0 24px color-mix(in srgb, var(--tier) 24%, transparent);
  z-index: 1;
}
.tm-row.over .tm-label { filter: brightness(1.15); }
.tm-row.over .tm-empty { border-color: var(--tier); color: var(--tier); }

.tm-ghost {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1000;
  pointer-events: none;
  will-change: transform;
}
.tm-ghost-tier {
  position: absolute;
  top: -10px;
  right: -10px;
  display: grid;
  place-items: center;
  min-width: 24px;
  height: 24px;
  padding: 0 4px;
  font-size: 0.95rem;
  color: var(--on-gold);
  background: var(--tier);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.6);
}

@container tm-board (min-width: 700px) {
  .tm-word { display: block; }
  .tm-board { --gap: 4px; }
}

@keyframes tm-label-glint {
  0%, 82% { opacity: 0; background-position: 120% 0; }
  86% { opacity: 1; }
  100% { opacity: 0; background-position: -20% 0; }
}
@keyframes tm-label-flash {
  0% { opacity: 1; background-position: 120% 0; }
  100% { opacity: 0; background-position: -20% 0; }
}
</style>
