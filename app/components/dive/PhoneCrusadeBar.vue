<script setup lang="ts">
import { difficultyName } from '~~/shared/engine/progression'

const props = defineProps<{
  difficulty: number
  achieved?: boolean
  failed?: boolean
  missionInOperation: number
  opLength: number
}>()

const name = computed(() => difficultyName(props.difficulty))

const rail = computed(() => Array.from({ length: 8 }, (_, i) => {
  const n = i + 3
  const state = props.achieved
    ? (n === 10 ? 'goal' : 'cleared')
    : n < props.difficulty
      ? 'cleared'
      : n === props.difficulty
        ? 'current'
        : n === 10
          ? 'goal'
          : 'locked'
  return { n, state }
}))

const pips = computed(() => Array.from(
  { length: props.opLength },
  (_, i) => i + 1,
))
</script>

<template>
  <nav
    class="crusade-bar"
    aria-label="Crusade ladder"
  >
    <span class="diff disp">{{ difficulty }}</span>
    <span class="name">{{ name }}</span>

    <span
      class="pips"
      role="img"
      :aria-label="`Mission ${missionInOperation} of ${opLength}`"
    >
      <span
        v-for="p in pips"
        :key="p"
        class="pip"
        :class="{
          on: p <= missionInOperation && !failed,
          now: p === missionInOperation && !failed,
          failed: p === missionInOperation && failed,
        }"
      />
    </span>

    <span class="pos">{{ failed ? 'Failed' : `M${missionInOperation}/${opLength}` }}</span>

    <span
      class="rail"
      role="img"
      :aria-label="`Difficulty ${difficulty} of 10${achieved ? ', achieved' : ''}`"
    >
      <span
        v-for="r in rail"
        :key="r.n"
        :data-state="r.state"
      />
    </span>
  </nav>
</template>

<style scoped>
.crusade-bar {
  position: relative;
  z-index: 20;
  flex-shrink: 0;
  height: 40px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  background: var(--rail);
  border-bottom: 1px solid var(--line-1);
}
.diff { font-size: 20px; color: var(--gold); line-height: 1; }
.name {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--gold);
  white-space: nowrap;
}
.pips { display: flex; gap: 3px; margin-left: 4px; }
.pip {
  width: 16px;
  height: 5px;
  border: 1px solid var(--line-3);
  background: transparent;
}
.pip.on { background: var(--gold); border-color: var(--gold); }
.pip.now { animation: pipPulse 1.6s ease-in-out infinite; }
.pip.failed { background: var(--red); border-color: var(--red); }
.pos {
  margin-left: auto;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--text);
  white-space: nowrap;
}
.rail {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  display: flex;
  gap: 2px;
}
.rail span { flex: 1 1 0; background: var(--line-2); }
.rail span[data-state='cleared'] { background: var(--khaki); }
.rail span[data-state='current'] { background: var(--gold); }
.rail span[data-state='goal'] { background: var(--line-4); }

@keyframes pipPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
@media (prefers-reduced-motion: reduce) {
  .pip.now { animation: none; }
}
</style>
