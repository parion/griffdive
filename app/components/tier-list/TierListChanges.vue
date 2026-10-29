<script setup lang="ts">
import { TIERS, tierListMoves } from '~~/shared/engine/tierList'
import type { TierList } from '~~/shared/engine/tierList'

// Read-only view of what a tier list changes against the community default:
// every diver can check the host's list before launch and during the run.
const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ list: TierList }>()

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
    :description="`Tier list · ${moves.length} items moved from the community default. Everything else keeps its default tier.`"
    size="md"
  >
    <div class="tl-changes">
      <section
        v-for="group in groups"
        :key="group.tier"
        class="tl-group"
        :aria-label="`Moved to ${group.tier.toUpperCase()} tier`"
      >
        <h3
          class="tl-group-h"
          :data-tier="group.tier"
        >
          Now {{ group.tier.toUpperCase() }} tier
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
              :aria-label="`from ${move.from.toUpperCase()} to ${move.to.toUpperCase()}`"
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
    </div>
  </AppDialog>
</template>

<style scoped>
.tl-changes { display: grid; gap: 16px; max-height: min(60dvh, 34rem); overflow-y: auto; padding-right: 4px; }
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
