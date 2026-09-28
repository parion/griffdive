<script setup lang="ts">
import type { DivePhase } from '~~/shared/engine/types'

const props = withDefaults(defineProps<{ phase: DivePhase, orientation?: 'vertical' | 'horizontal' }>(), {
  orientation: 'vertical',
})

const STEPS = [
  { key: 'spin', label: 'Spin', d: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 3v18M3 12h18' },
  { key: 'decide', label: 'Decide', d: 'M12 21v-8M12 13L6 7M12 13l6-6M4 3h5v5M20 3h-5v5' },
  { key: 'pacts', label: 'Pacts', d: 'M6 3h12v14l-6 4-6-4zM9 8h6M9 12h6' },
  { key: 'dive', label: 'Dive', d: 'M12 3v12M7 10l5 5 5-5M5 21h14' },
  { key: 'report', label: 'Report', d: 'M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6l-5.4 2.9 1.2-6-4.5-4.2 6.1-.7z' },
  { key: 'rewards', label: 'Rewards', d: 'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10' },
] as const

// Engine phases collapse onto the six mission beats: `decision`/`strain` are
// the Decide beat, and the Report beat lives inside `diving` until the result
// is filed.
const active = computed(() => {
  switch (props.phase) {
    case 'spin': return 0
    case 'decision':
    case 'strain': return 1
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
  if (i === active.value + 1) return 'reachable'
  return 'locked'
}
</script>

<template>
  <nav
    class="phase-rail"
    :class="orientation"
    aria-label="Mission phases"
  >
    <ol>
      <li
        v-for="(s, i) in STEPS"
        :key="s.key"
        :data-state="stateOf(i)"
        :aria-current="stateOf(i) === 'current' ? 'step' : undefined"
        :aria-label="`${s.label}, ${stateOf(i)}`"
      >
        <span
          class="node cut-sm"
          aria-hidden="true"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path :d="s.d" />
          </svg>
        </span>
        <span class="rlabel">{{ s.label }}</span>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.phase-rail ol {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  gap: 4px;
}
.node {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--line-2);
  background: var(--ground);
  color: var(--muted);
  flex-shrink: 0;
}
.rlabel {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  white-space: nowrap;
}

.vertical ol { flex-direction: column; gap: 3px; }
.vertical li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  border-left: 2px solid var(--line-1);
}

.horizontal ol { flex-direction: row; flex-wrap: wrap; }
.horizontal li { display: flex; align-items: center; gap: 6px; padding-right: 10px; }

[data-state='current'] { border-left-color: var(--gold); }
[data-state='current'] .node { border-color: var(--gold); color: var(--gold); background: rgba(255, 214, 66, 0.08); }
[data-state='current'] .rlabel { color: var(--gold); }
[data-state='done'] { border-left-color: var(--line-4); }
[data-state='done'] .node { color: var(--teal); border-color: var(--line-3); }
[data-state='done'] .rlabel { color: var(--dim); text-decoration: line-through; }
[data-state='reachable'] .node { border-color: var(--line-4); color: var(--khaki); }
[data-state='reachable'] .rlabel { color: var(--khaki); }
[data-state='locked'] { opacity: 0.5; }
[data-state='locked'] .rlabel { color: var(--ghost-ink); }
</style>
