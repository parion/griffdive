<script setup lang="ts">
import { RadioGroupItem, RadioGroupRoot } from 'reka-ui'
import type { Item, Tier } from '~~/shared/data/types'
import { TIERS } from '~~/shared/engine/tierList'
import { KIT_SECTIONS, kitSectionOf } from '~/utils/kit'

// The selection up close, with one big button per tier: the tap path on a
// phone and the way to read an item's name when tiles are art only. Several
// selected items (Ctrl/⌘-click) share the buttons and move together.
const props = defineProps<{ items: readonly Item[], savedTier: Tier | null, unrated: boolean }>()
const emit = defineEmits<{ set: [tier: Tier], close: [] }>()

const item = computed(() => props.items[0]!)
const many = computed(() => props.items.length > 1)
const sectionOf = (entry: Item) => KIT_SECTIONS.find(def => def.id === kitSectionOf(entry))!
const section = computed(() => sectionOf(item.value))
const moved = computed(() => !many.value && props.savedTier !== null && props.savedTier !== item.value.tier)
const common = computed(() => (props.items.every(entry => entry.tier === item.value.tier) ? item.value.tier : ''))
const mix = computed(() => TIERS
  .map(tier => ({ tier, n: props.items.filter(entry => entry.tier === tier).length }))
  .filter(entry => entry.n > 0))
</script>

<template>
  <section
    class="tm-insp"
    :style="{ '--tier': `var(--tier-${item.tier})` }"
    :aria-label="many ? 'Selected items' : 'Selected item'"
  >
    <div class="tm-insp-body">
      <div
        v-if="many"
        class="tm-insp-id"
      >
        <span
          class="tm-insp-stack"
          aria-hidden="true"
        >
          <TierListTile
            v-for="(entry, index) in items.slice(0, 3)"
            :key="entry.id"
            class="tm-insp-tile"
            :style="{ '--i': index }"
            :item="entry"
            :art="sectionOf(entry).art"
            :accent="sectionOf(entry).accent"
          />
        </span>
        <div class="tm-insp-text">
          <span class="tm-insp-cat">{{ items.length }} items selected</span>
          <span class="tm-insp-name tm-insp-names">{{ items.map(entry => entry.displayName).join(', ') }}</span>
          <span class="tm-insp-base">
            <template
              v-for="(entry, index) in mix"
              :key="entry.tier"
            >{{ index ? ' · ' : '' }}{{ entry.n }} <b :data-tier="entry.tier">{{ entry.tier.toUpperCase() }}</b></template>
          </span>
        </div>
        <button
          type="button"
          class="icon-btn tm-insp-close"
          aria-label="Clear selection"
          @click="emit('close')"
        >
          ×
        </button>
      </div>
      <div
        v-else
        class="tm-insp-id"
      >
        <TierListTile
          class="tm-insp-tile"
          :item="item"
          :art="section.art"
          :accent="section.accent"
          :unrated="unrated"
        />
        <div class="tm-insp-text">
          <span class="tm-insp-cat">
            <i
              class="tm-insp-swatch"
              :style="{ background: section.accent }"
              aria-hidden="true"
            />{{ section.label }}
          </span>
          <span class="tm-insp-name">{{ item.displayName }}</span>
          <span class="tm-insp-base">
            <template v-if="unrated">Not rated yet · pick a tier</template>
            <template v-else-if="moved && savedTier">
              Saved <b :data-tier="savedTier">{{ savedTier.toUpperCase() }}</b>
              · now <b :data-tier="item.tier">{{ item.tier.toUpperCase() }}</b>
            </template>
            <template v-else>
              <b :data-tier="item.tier">{{ item.tier.toUpperCase() }}</b> tier
            </template>
          </span>
        </div>
        <button
          type="button"
          class="icon-btn tm-insp-close"
          aria-label="Close item"
          @click="emit('close')"
        >
          ×
        </button>
      </div>
      <RadioGroupRoot
        :model-value="common"
        orientation="horizontal"
        class="tm-insp-tiers"
        :aria-label="many ? `Tier for ${items.length} items` : `${item.displayName} tier`"
        @update:model-value="emit('set', $event as Tier)"
      >
        <RadioGroupItem
          v-for="tier in TIERS"
          :key="tier"
          :value="tier"
          class="tm-insp-tier disp"
          :style="{ '--t': `var(--tier-${tier})` }"
          :aria-label="`${tier.toUpperCase()} tier${moved && tier === savedTier ? ' (saved)' : ''}`"
        >
          {{ tier.toUpperCase() }}
          <span
            v-if="moved && tier === savedTier"
            class="tm-insp-dot"
            aria-hidden="true"
          />
        </RadioGroupItem>
      </RadioGroupRoot>
      <p class="tm-insp-hint">
        <span class="tm-hint-touch">Hold and drag any item to a row.</span>
        <span class="tm-hint-keys"><kbd>Ctrl</kbd>-click to pick several. Keys: <kbd>S</kbd><kbd>A</kbd><kbd>B</kbd><kbd>C</kbd> to move, <kbd>D</kbd> to undo.</span>
      </p>
    </div>
  </section>
</template>

<style scoped>
.tm-insp { min-width: 0; container: tm-insp / inline-size; }
.tm-insp-body { display: grid; gap: 10px; min-width: 0; }
.tm-insp-id { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 12px; }
.tm-insp-tile { --tile: 64px; }
.tm-insp-stack { position: relative; display: block; width: 80px; height: 72px; }
.tm-insp-stack .tm-insp-tile { position: absolute; top: calc(var(--i) * 4px); left: calc(var(--i) * 8px); z-index: calc(3 - var(--i)); --tile: 56px; }
.tm-insp-names { font-size: 0.82rem; }
.tm-insp-text { display: grid; gap: 2px; min-width: 0; }
.tm-insp-cat {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.tm-insp-swatch { width: 8px; height: 8px; }
.tm-insp-name {
  overflow: hidden;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}
.tm-insp-base { font-size: 12px; color: var(--khaki); }
.tm-insp-base b { font-weight: 700; }
.tm-insp-close { align-self: start; font-size: 1.2rem; line-height: 1; }

.tm-insp-tiers { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
.tm-insp-tier {
  position: relative;
  height: 48px;
  font-size: 1.5rem;
  color: var(--t);
  background: color-mix(in srgb, var(--t) 8%, var(--panel));
  border: 1px solid color-mix(in srgb, var(--t) 40%, var(--line-2));
  cursor: pointer;
  clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%);
  transition: background-color var(--dur-fast), color var(--dur-fast), transform var(--dur-fast) var(--ease-out);
}
.tm-insp-tier:hover { background: color-mix(in srgb, var(--t) 18%, var(--panel)); }
.tm-insp-tier:active { transform: translateY(1px); }
.tm-insp-tier[data-state='checked'] { color: var(--on-gold); background: var(--t); border-color: var(--t); }
.tm-insp-dot {
  position: absolute;
  top: 6px;
  right: 10px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}

.tm-insp-hint { margin: 0; font-size: 11px; color: var(--muted); }
.tm-insp-hint kbd {
  display: inline-block;
  min-width: 1.3em;
  margin: 0 1px;
  padding: 0 3px;
  font: inherit;
  font-weight: 700;
  text-align: center;
  color: var(--khaki);
  border: 1px solid var(--line-3);
}
.tm-hint-keys { display: none; }
/* A wide bar (landscape phone, tablet) puts the item and its tiers on one line. */
@container tm-insp (min-width: 560px) {
  .tm-insp-body { grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr); align-items: center; column-gap: 16px; }
  .tm-insp-hint { grid-column: 1 / -1; }
}
@media (orientation: landscape) and (max-height: 520px) {
  .tm-insp-hint { display: none; }
  .tm-insp-tile { --tile: 48px; }
  .tm-insp-tier { height: 42px; }
}

@media (hover: hover) and (pointer: fine) {
  .tm-hint-touch { display: none; }
  .tm-hint-keys { display: inline; }
}
</style>
