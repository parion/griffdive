<script setup lang="ts">
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'
import { TIERS, tierListMoves, tieredCatalog, unratedItems } from '~~/shared/engine/tierList'
import type { TierList } from '~~/shared/engine/tierList'
import { TIER_MAKER_SECTIONS, kitSectionOf } from '~/utils/kit'

// Read-only view of a tier list: the whole list tier by tier, and a second
// tab comparing it with the default tiers for divers who know those by
// heart. Every diver can open the host's list before launch and in the run.
const open = defineModel<boolean>('open', { required: true })
const props = withDefaults(defineProps<{ list: TierList, description?: string }>(), {
  description: 'The tier list this crusade rolls rewards from.',
})

const SECTION_ORDER = new Map(TIER_MAKER_SECTIONS.map((section, index) => [section.id, index]))

const tiers = computed(() => {
  const items = [...tieredCatalog(props.list).items].sort((a, b) =>
    (SECTION_ORDER.get(kitSectionOf(a)) ?? 0) - (SECTION_ORDER.get(kitSectionOf(b)) ?? 0)
    || a.displayName.localeCompare(b.displayName))
  return TIERS.map(tier => ({ tier, items: items.filter(item => item.tier === tier) }))
})
const unrated = computed(() => unratedItems(props.list).length)
const moves = computed(() => tierListMoves(props.list))
const groups = computed(() =>
  TIERS
    .map(tier => ({ tier, moves: moves.value.filter(move => move.to === tier) }))
    .filter(group => group.moves.length > 0))
</script>

<template>
  <AppDialog
    v-model:open="open"
    :title="list.name"
    :description="description"
    size="md"
  >
    <TabsRoot
      default-value="list"
      class="tl-view"
    >
      <TabsList
        class="tl-tabs"
        aria-label="View"
      >
        <TabsTrigger
          value="list"
          class="tl-tab"
        >
          Whole list
        </TabsTrigger>
        <TabsTrigger
          value="compare"
          class="tl-tab"
        >
          Vs default · {{ moves.length }}
        </TabsTrigger>
      </TabsList>

      <TabsContent
        value="list"
        class="tl-pane"
      >
        <section
          v-for="row in tiers"
          :key="row.tier"
          class="tl-group"
          :aria-label="`${row.tier.toUpperCase()} tier`"
        >
          <h3
            class="tl-group-h"
            :data-tier="row.tier"
          >
            {{ row.tier.toUpperCase() }} tier
            <span class="cap">{{ row.items.length }}</span>
          </h3>
          <ul class="tl-names">
            <li
              v-for="item in row.items"
              :key="item.id"
            >
              {{ item.displayName }}
            </li>
          </ul>
        </section>
        <p
          v-if="unrated"
          class="tl-note"
        >
          {{ unrated }} newer {{ unrated === 1 ? 'item isn\'t' : 'items aren\'t' }} rated by this list yet and
          {{ unrated === 1 ? 'plays' : 'play' }} at the default tier.
        </p>
      </TabsContent>

      <TabsContent
        value="compare"
        class="tl-pane"
      >
        <p class="tl-note">
          {{ moves.length }} items sit in a different tier than in the default tiers.
        </p>
        <section
          v-for="group in groups"
          :key="group.tier"
          class="tl-group"
          :aria-label="`${group.tier.toUpperCase()} here, elsewhere by default`"
        >
          <h3
            class="tl-group-h"
            :data-tier="group.tier"
          >
            {{ group.tier.toUpperCase() }} here
            <span class="cap">{{ group.moves.length }}</span>
          </h3>
          <ul class="tl-moves">
            <li
              v-for="move in group.moves"
              :key="move.item.id"
              class="tl-move"
            >
              <span class="tl-name">{{ move.item.displayName }}</span>
              <span class="tl-cat odl">{{ categoryLabel(move.item.category) }}</span>
              <span
                class="tl-shift"
                :aria-label="`default ${move.from.toUpperCase()}, here ${move.to.toUpperCase()}`"
              >
                <span
                  class="tb"
                  :data-tier="move.from"
                >{{ move.from.toUpperCase() }}</span>
                <span aria-hidden="true">→</span>
                <span
                  class="tb"
                  :data-tier="move.to"
                >{{ move.to.toUpperCase() }}</span>
              </span>
            </li>
          </ul>
        </section>
      </TabsContent>
    </TabsRoot>
  </AppDialog>
</template>

<style scoped>
.tl-view { display: grid; gap: 12px; }
.tl-tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--line-2); }
.tl-tab {
  padding: 8px 12px;
  font: inherit;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
  background: none;
  border: 0;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  cursor: pointer;
}
.tl-tab:hover { color: var(--khaki); }
.tl-tab[data-state='active'] { color: var(--gold); border-bottom-color: var(--gold); }
.tl-pane { display: grid; gap: 16px; max-height: min(58dvh, 32rem); overflow-y: auto; padding-right: 4px; }
.tl-note { margin: 0; font-size: 0.8rem; color: var(--muted); }
.tl-group { display: grid; gap: 6px; }
.tl-group-h {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin: 0;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  border-bottom: 1px solid var(--line-2);
  padding-bottom: 4px;
}
.tl-names { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 4px; }
.tl-names li { padding: 3px 7px; font-size: 0.78rem; background: var(--panel); border: 1px solid var(--line-2); }
.tl-moves { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
.tl-move {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 10px;
  padding: 5px 6px;
  background: var(--panel);
}
.tl-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.85rem; }
.tl-cat { font-size: 10px; color: var(--muted); }
.tl-shift { display: inline-flex; align-items: center; gap: 4px; color: var(--muted); font-size: 0.75rem; }
.tl-shift .tb { min-width: 1.3rem; font-size: 0.66rem; padding: 0.05rem 0.25rem; }
@container (max-width: 380px) {
  .tl-cat { display: none; }
}
</style>
