<script setup lang="ts">
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
        ? 'Operation complete at difficulty 10. Super Earth thanks you, divers.'
        : 'The crusade was ended early.' }}
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
@keyframes victory-glow {
  0%, 100% { text-shadow: 0 0 0 transparent; }
  50% { text-shadow: 0 0 26px color-mix(in srgb, var(--gold) 50%, transparent); }
}
</style>
