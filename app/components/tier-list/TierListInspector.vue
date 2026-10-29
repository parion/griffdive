<script setup lang="ts">
import { RadioGroupItem, RadioGroupRoot } from 'reka-ui'
import { ITEMS_BY_ID } from '~~/shared/data/catalog'
import type { Item, Tier } from '~~/shared/data/types'
import { TIERS } from '~~/shared/engine/tierList'
import { KIT_SECTIONS, kitSectionOf } from '~/utils/kit'

// The selected item up close, with one big button per tier: the tap path on
// a phone and the way to read an item's name when tiles are art only.
const props = defineProps<{ item: Item }>()
const emit = defineEmits<{ set: [tier: Tier], close: [] }>()

const section = computed(() => KIT_SECTIONS.find(entry => entry.id === kitSectionOf(props.item))!)
const base = computed(() => ITEMS_BY_ID.get(props.item.id)?.tier ?? props.item.tier)
const moved = computed(() => base.value !== props.item.tier)
</script>

<template>
  <section
    class="tm-insp"
    :style="{ '--tier': `var(--tier-${item.tier})` }"
    aria-label="Selected item"
  >
    <div class="tm-insp-body">
      <div class="tm-insp-id">
        <TierListTile
          class="tm-insp-tile"
          :item="item"
          :default-tier="base"
          :art="section.art"
          :accent="section.accent"
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
            Default <b :data-tier="base">{{ base.toUpperCase() }}</b>
            <template v-if="moved">
              · now <b :data-tier="item.tier">{{ item.tier.toUpperCase() }}</b>
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
        :model-value="item.tier"
        orientation="horizontal"
        class="tm-insp-tiers"
        :aria-label="`${item.displayName} tier`"
        @update:model-value="emit('set', $event as Tier)"
      >
        <RadioGroupItem
          v-for="tier in TIERS"
          :key="tier"
          :value="tier"
          class="tm-insp-tier disp"
          :style="{ '--t': `var(--tier-${tier})` }"
          :aria-label="`${tier.toUpperCase()} tier${tier === base ? ' (default)' : ''}`"
        >
          {{ tier.toUpperCase() }}
          <span
            v-if="tier === base"
            class="tm-insp-dot"
            aria-hidden="true"
          />
        </RadioGroupItem>
      </RadioGroupRoot>
      <p class="tm-insp-hint">
        <span class="tm-hint-touch">Hold and drag any item to a row.</span>
        <span class="tm-hint-keys">Keys: <kbd>S</kbd><kbd>A</kbd><kbd>B</kbd><kbd>C</kbd> to move, <kbd>D</kbd> for the default.</span>
      </p>
    </div>
  </section>
</template>

<style scoped>
.tm-insp { min-width: 0; container: tm-insp / inline-size; }
.tm-insp-body { display: grid; gap: 10px; min-width: 0; }
.tm-insp-id { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 12px; }
.tm-insp-tile { --tile: 64px; }
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
