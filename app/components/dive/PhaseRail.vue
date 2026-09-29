<script setup lang="ts">
import type { DivePhase } from '~~/shared/engine/types'

const props = defineProps<{ phase: DivePhase }>()

const STEPS = [
  { key: 'spin', label: 'Spin', d: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 3v18M3 12h18' },
  { key: 'decide', label: 'Decide', d: 'M12 21v-8M12 13L6 7M12 13l6-6M4 3h5v5M20 3h-5v5' },
  { key: 'pacts', label: 'Pacts', d: 'M6 3h12v14l-6 4-6-4zM9 8h6M9 12h6' },
  { key: 'dive', label: 'Dive', d: 'M12 3v12M7 10l5 5 5-5M5 21h14' },
  { key: 'report', label: 'Report', d: 'M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6l-5.4 2.9 1.2-6-4.5-4.2 6.1-.7z' },
  { key: 'rewards', label: 'Rewards', d: 'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10' },
] as const

const active = computed(() => {
  switch (props.phase) {
    case 'spin': return 0
    case 'decision':
    case 'strain': return 1
    case 'deal':
    case 'pacts': return 2
    case 'diving': return 3
    case 'rewards': return 5
    case 'forfeit': return -1
    case 'complete': return 6
    default: return -2
  }
})

function stateOf(i: number): 'done' | 'current' | 'reachable' | 'locked' {
  if (active.value === 6) return 'done'
  if (active.value < 0) return 'locked'
  if (i < active.value) return 'done'
  if (i === active.value) return 'current'
  return 'locked'
}
</script>

<template>
  <nav
    class="phase-bar"
    aria-label="Mission phases"
  >
    <div
      v-for="(s, i) in STEPS"
      :key="s.key"
      class="step"
      :class="i === 0 ? 'chev-first' : 'chev'"
      :data-state="stateOf(i)"
      :aria-current="stateOf(i) === 'current' ? 'step' : undefined"
      :aria-label="`${s.label}, ${stateOf(i)}`"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path :d="s.d" />
      </svg>
      <span>{{ s.label }}</span>
    </div>
  </nav>
</template>

<style scoped>
.phase-bar {
  display: flex;
  gap: var(--sp-1);
  padding: var(--sp-3) var(--pad-page);
  border-top: 1px solid var(--line-1);
  background: var(--ground);
  overflow-x: auto;
}
.step {
  flex: 1 1 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-3);
  height: 36px;
  padding: 0 var(--sp-3);
  background: var(--ground);
  color: var(--ghost-ink);
  font-size: var(--fs-sm);
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  white-space: nowrap;
  min-width: max-content;
  transition: background-color var(--dur-fast), color var(--dur-fast);
}
[data-state='done'] { color: var(--khaki); background: var(--line-1); }
[data-state='reachable'] { color: var(--khaki); }
[data-state='locked'] { color: var(--dim); background: var(--panel); }
[data-state='current'] {
  background: var(--gold);
  color: var(--on-gold);
  animation: tagFlash 0.4s var(--ease-out);
}
</style>
