<script setup lang="ts">
import { ITEMS_BY_ID } from '~~/shared/data/catalog'
import { sortKitItems } from '~~/shared/data/ordering'
import type { Item } from '~~/shared/data/types'
import { SEAF_SUPPORT_TIER } from '~~/shared/engine/config'
import { startingItemIds, supportRollsFor } from '~~/shared/engine/progression'
import type { CrusadeMode, CrusadeVariant } from '~~/shared/engine/types'
import { START_SECTIONS, startKindOf } from '~/utils/kit'

// The kit a diver drops with for the chosen start, laid out like the Kit drawer
// but with weapons told apart. In SEAF mode each section ends in blue "?" boxes
// — one per item the pack will roll there. Handed the rolled `support` ids, the
// boxes fill in display order, `shown` of them so far (all, when unset): the
// launch reveal drives that count, so the animation stays presentation only.
const props = withDefaults(defineProps<{
  variant: CrusadeVariant
  mode?: CrusadeMode
  support?: readonly string[] | null
  shown?: number
  compact?: boolean
  // Show only the pack's own slots, leaving the surplus out.
  supportOnly?: boolean
}>(), { mode: undefined, support: null, shown: undefined, compact: false, supportOnly: false })

interface Slot {
  key: string
  item: Item | null
  fresh: boolean
}

const tierLabel = SEAF_SUPPORT_TIER.toUpperCase()
const rolls = computed(() => supportRollsFor(props.variant, props.mode))
const base = computed(() => startingItemIds(props.variant)
  .map(id => ITEMS_BY_ID.get(id))
  .filter((item): item is Item => !!item))

const dealt = computed(() => (props.support ?? [])
  .map(id => ITEMS_BY_ID.get(id))
  .filter((item): item is Item => !!item))

const sections = computed(() => {
  let order = 0
  return START_SECTIONS.map((def) => {
    const owned = props.supportOnly
      ? []
      : sortKitItems(base.value.filter(item => startKindOf(item) === def.kind))
    const rolled = props.support
      ? dealt.value.filter(item => startKindOf(item) === def.kind)
      : []
    const mystery = props.support ? rolled.length : rolls.value?.[def.kind] ?? 0
    const slots: Slot[] = Array.from({ length: mystery }, (_, index) => {
      const at = order++
      const revealed = props.support !== null && (props.shown === undefined || at < props.shown)
      const item = revealed ? rolled[index] ?? null : null
      return {
        key: `${def.kind}:${index}:${item ? item.id : 'q'}`,
        item,
        fresh: item !== null && props.shown !== undefined && at === props.shown - 1,
      }
    })
    return { ...def, owned, slots, count: owned.length + slots.length }
  }).filter(section => section.count > 0)
})

const hasRoll = computed(() => rolls.value !== null)
</script>

<template>
  <div
    class="kit"
    :class="{ compact, 'support-only': supportOnly }"
  >
    <KitSection
      v-for="section in sections"
      :key="section.kind"
      :label="section.label"
      :accent="section.accent"
      :art="section.art"
      :count="section.count"
      :compact="compact"
    >
      <KitTile
        v-for="item in section.owned"
        :key="item.id"
        :item="item"
        :art="section.art"
      />
      <KitTile
        v-for="slot in section.slots"
        :key="slot.key"
        :item="slot.item"
        :art="section.art"
        :fresh="slot.fresh"
        :tier-label="tierLabel"
      />
    </KitSection>
    <p
      v-if="!supportOnly"
      class="kit-note"
    >
      <template v-if="hasRoll">
        <span
          class="kit-key"
          aria-hidden="true"
        >?</span>
        Each box is rolled separately for every diver at launch, {{ tierLabel }}-tier, from the warbonds they own.
      </template>
      <template v-else>
        Bare surplus kit.
      </template>
      Every reward adds to it.
    </p>
  </div>
</template>

<style scoped>
.kit {
  display: grid;
  gap: var(--sp-5);
  padding: var(--sp-3);
  min-width: 0;
  border: 1px solid var(--line-2);
  background: var(--panel);
}
.kit.compact { gap: var(--sp-4); }
/* The pack alone is a handful of tiles: let the sections sit side by side and
   drop the surplus panel's frame. */
.kit.support-only {
  grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
  align-items: start;
  padding: 0;
  border: 0;
  background: transparent;
}
.kit-note {
  margin: 0;
  font-size: 11px;
  line-height: 1.4;
  color: var(--muted);
}
.kit-key {
  display: inline-grid;
  place-items: center;
  width: 1.15em;
  height: 1.15em;
  margin-right: 4px;
  vertical-align: -0.15em;
  color: #4a90ff;
  font: 800 0.85em var(--font-display);
  border: 1px solid #4a90ff;
  background: color-mix(in srgb, #4a90ff 16%, transparent);
}
</style>
