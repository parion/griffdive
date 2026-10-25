<script setup lang="ts">
import { baseTierFor, missionsPerOperation } from '~~/shared/engine/config'
import { difficultyName } from '~~/shared/engine/progression'

const props = withDefaults(defineProps<{ difficulty: number, achieved?: boolean, compact?: boolean }>(), {
  achieved: false,
  compact: false,
})

const rows = computed(() => {
  const out: { n: number, name: string, tier: string, pips: number, state: 'cleared' | 'current' | 'locked' | 'goal' }[] = []
  for (let n = 3; n <= 10; n++) {
    const state = props.achieved
      ? (n === 10 ? 'goal' : 'cleared')
      : n < props.difficulty
        ? 'cleared'
        : n === props.difficulty
          ? 'current'
          : 'locked'
    out.push({
      n,
      name: difficultyName(n),
      tier: baseTierFor(n),
      pips: missionsPerOperation(n),
      state,
    })
  }
  return [...out].reverse()
})
</script>

<template>
  <div
    class="ladder"
    :class="{ compact }"
    role="img"
    :aria-label="`Crusade ladder, difficulty 3 to 10, currently on ${difficulty} of 10`"
  >
    <ol>
      <li
        v-for="r in rows"
        :key="r.n"
        :data-state="r.state"
        :aria-label="`${r.name}, difficulty ${r.n}, tier ${r.tier}`"
      >
        <span class="n disp">{{ r.n }}</span>
        <span class="meta">
          <span class="name cap">{{ r.name }}</span>
          <span
            class="rung-pips"
            aria-hidden="true"
          >
            <i
              v-for="k in r.pips"
              :key="k"
            />
          </span>
        </span>
        <span
          class="tier tb"
          :data-tier="r.tier"
        >{{ r.tier }}</span>
        <span
          v-if="r.state === 'goal'"
          class="flag"
          aria-hidden="true"
        />
      </li>
    </ol>
  </div>
</template>

<style scoped>
.ladder ol {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.ladder li {
  display: grid;
  grid-template-columns: 22px 1fr auto;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  border: 1px solid var(--line-1);
  border-left: 3px solid var(--line-2);
  background: var(--rail);
}
.n {
  font-size: 16px;
  color: var(--text);
  text-align: center;
}
.meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.name {
  overflow: hidden;
  text-overflow: ellipsis;
}
.rung-pips { display: flex; gap: 3px; margin-top: 2px; }
.rung-pips i {
  width: 12px;
  height: 4px;
  border: 1px solid var(--line-4);
}
.tier { font-size: 12px; min-width: 20px; }

[data-state='cleared'] { border-left-color: var(--line-4); opacity: 0.55; }
[data-state='cleared'] .name { text-decoration: line-through; color: var(--dim); }
[data-state='cleared'] .n { color: var(--ghost-ink); }
[data-state='current'] {
  border-color: var(--gold);
  border-left-color: var(--gold);
  background: rgba(255, 214, 66, 0.06);
}
[data-state='current'] .n { color: var(--gold); }
[data-state='current'] .rung-pips i { border-color: var(--gold); }
[data-state='goal'] {
  border-color: var(--line-4);
  background: rgba(255, 214, 66, 0.04);
}
[data-state='goal'] .n { color: var(--gold); }
.flag {
  position: absolute;
}
[data-state='goal'] { position: relative; }
[data-state='goal'] .flag {
  right: -5px;
  top: 50%;
  width: 6px;
  height: 14px;
  margin-top: -7px;
  background: var(--gold);
  clip-path: polygon(0 0, 100% 25%, 100% 75%, 0 100%);
}

.ladder.compact ol { flex-direction: row; }
.ladder.compact li {
  flex: 1;
  grid-template-columns: 1fr;
  justify-items: center;
  text-align: center;
  padding: 4px;
}
.ladder.compact .meta { align-items: center; }
.ladder.compact .name { display: none; }
</style>
