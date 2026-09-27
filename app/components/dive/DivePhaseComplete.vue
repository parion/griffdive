<script setup lang="ts">
import { GRIFFDIVER_COMPLETE_LINE } from '~~/shared/data/lore'
import type { DiveState } from '~~/shared/engine/types'

const props = defineProps<{ state: DiveState, mode: 'local' | 'room' }>()

const emit = defineEmits<{ abandonSlot: [] }>()

const itemsOwned = computed(() =>
  Object.values(props.state.personalInventories).flat().length)
</script>

<template>
  <section class="panel victory">
    <Motion
      as="h1"
      :initial="{ opacity: 0, scale: 0.8, y: 12 }"
      :animate="{ opacity: 1, scale: 1, y: 0 }"
      :transition="{ type: 'spring', stiffness: 260, damping: 14 }"
    >
      {{ state.achieved ? 'GRIFFDIVE ACHIEVED' : 'Dive ended' }}
    </Motion>
    <p class="muted">
      {{ state.achieved
        ? 'Operation complete at difficulty 10.'
        : 'The crusade was ended early — your file with the Ministry remains open.' }}
    </p>
    <p
      v-if="state.achieved"
      class="pardon"
    >
      {{ GRIFFDIVER_COMPLETE_LINE }}
    </p>
    <p class="row small muted">
      {{ state.missionIndex }} missions · {{ state.completedCombos.length }} combos completed
      · {{ itemsOwned }} items owned across the squad
    </p>
    <div class="row">
      <button
        v-if="mode === 'local'"
        class="btn danger"
        type="button"
        @click="emit('abandonSlot')"
      >
        Delete save
      </button>
      <NuxtLink
        class="btn"
        to="/"
      >Back to base</NuxtLink>
    </div>
  </section>
</template>

<style scoped>
.victory { text-align: center; align-items: center; }
.victory h1 { color: var(--gold); animation: victory-glow 2.4s ease-in-out 1.2s infinite; }
.pardon {
  max-width: 34rem;
  margin: 0;
  padding: 0.55rem 0.75rem;
  border-left: 2px solid var(--gold);
  background: color-mix(in srgb, var(--gold) 6%, transparent);
  border-radius: 6px;
  font-size: 0.9rem;
  color: var(--khaki);
  text-align: left;
}
@keyframes victory-glow {
  0%, 100% { text-shadow: 0 0 0 transparent; }
  50% { text-shadow: 0 0 26px color-mix(in srgb, var(--gold) 50%, transparent); }
}
</style>
