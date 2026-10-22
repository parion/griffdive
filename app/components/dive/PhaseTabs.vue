<script setup lang="ts">
import type { DivePhase } from '~~/shared/engine/types'

const props = withDefaults(defineProps<{
  phase: DivePhase
  reporting?: boolean
}>(), { reporting: false })

interface Beat {
  id: 'call' | 'pacts' | 'dive' | 'loot'
  label: string
}

const beats: Beat[] = [
  { id: 'call', label: 'Call' },
  { id: 'pacts', label: 'Pacts' },
  { id: 'dive', label: 'Dive' },
  { id: 'loot', label: 'Loot' },
]

const current = computed<'call' | 'pacts' | 'dive' | 'loot' | null>(() => {
  switch (props.phase) {
    case 'spin':
    case 'decision':
    case 'strain':
    case 'deal': return 'call'
    case 'pacts': return 'pacts'
    case 'diving':
    case 'forfeit': return 'dive'
    case 'rewards': return 'loot'
    default: return null
  }
})

const order = ['call', 'pacts', 'dive', 'loot'] as const

function indexOf(id: typeof order[number]): number {
  return order.indexOf(id)
}

function done(id: typeof order[number]): boolean {
  if (!current.value) {
    return props.phase === 'complete'
  }
  return indexOf(id) < indexOf(current.value)
}

function label(beat: Beat): string {
  if (beat.id === 'dive' && current.value === 'dive' && props.reporting) {
    return 'Report'
  }
  return beat.label
}
</script>

<template>
  <nav
    v-if="phase !== 'lobby' && phase !== 'complete'"
    class="beats"
    aria-label="Mission beats"
  >
    <span
      v-for="(beat, index) in beats"
      :key="beat.id"
      class="beat"
      :class="{
        first: index === 0,
        done: done(beat.id),
        current: current === beat.id,
      }"
      :aria-current="current === beat.id ? 'step' : undefined"
    >
      <span
        v-if="done(beat.id)"
        class="check"
        aria-hidden="true"
      >✓</span>
      {{ label(beat) }}
    </span>
  </nav>
</template>

<style scoped>
.beats {
  display: flex;
  align-items: stretch;
  gap: 3px;
  min-width: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.beat {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-width: 74px;
  padding: 10px 24px;
  color: var(--dim);
  background: var(--raised);
  clip-path: polygon(0 0, calc(100% - 13px) 0, 100% 50%, calc(100% - 13px) 100%, 0 100%, 13px 50%);
  white-space: nowrap;
}
.beat.first {
  clip-path: polygon(0 0, calc(100% - 13px) 0, 100% 50%, calc(100% - 13px) 100%, 0 100%);
}
.beat.done { color: var(--muted); }
.beat.current {
  color: var(--on-gold);
  background: var(--gold);
  text-shadow: none;
}
.check { color: var(--teal); font-size: 12px; }
.current .check { color: var(--on-gold); }

@media (max-width: 720px) {
  .beats { width: 100%; gap: 2px; font-size: 10px; letter-spacing: 0.08em; }
  .beat { flex: 1; min-width: 0; padding: 9px 8px 9px 12px; }
  .beat:first-child { padding-left: 10px; }
}
</style>
