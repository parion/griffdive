<script setup lang="ts">
import { baseTierFor, missionsPerOperation } from '~~/shared/engine/config'
import { difficultyName } from '~~/shared/engine/progression'

const props = defineProps<{
  difficulty: number
  achieved?: boolean
  failed?: boolean
  missionInOperation: number
  opLength: number
}>()

const rows = computed(() => Array.from({ length: 8 }, (_, i) => {
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
  return {
    n,
    name: difficultyName(n),
    tier: baseTierFor(n),
    pips: missionsPerOperation(n),
    state,
  }
}))
</script>

<template>
  <nav
    class="strip"
    :class="{ failed }"
    aria-label="Crusade ladder, difficulty 3 to 10"
  >
    <div
      v-for="r in rows"
      :key="r.n"
      class="rung"
      :data-state="r.state"
      role="img"
      :style="{ flexGrow: r.state === 'current' ? 2.4 : 1 }"
      :aria-label="`${r.name}, difficulty ${r.n}, tier ${r.tier}${r.state === 'current' ? `, operation mission ${missionInOperation} of ${opLength}` : ''}`"
    >
      <div class="rung-top">
        <span class="n disp">{{ r.n }}</span>
        <span class="name">{{ r.name }}</span>
        <svg
          v-if="r.state === 'cleared'"
          class="mark"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="3"
          aria-label="cleared"
          role="img"
        >
          <path d="M5 12l5 5 9-10" />
        </svg>
        <svg
          v-else-if="r.state === 'goal'"
          class="mark"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-label="goal"
          role="img"
        >
          <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
        </svg>
      </div>
      <div class="rung-bottom">
        <span
          class="tier tb"
          :data-tier="r.tier"
        >{{ r.tier }}</span>
        <template v-if="r.state === 'current'">
          <span
            v-if="failed"
            class="failed-mark"
            role="img"
            aria-label="Operation failed — repeat difficulty"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.6"
              aria-hidden="true"
            ><path d="M6 6l12 12M18 6L6 18" /></svg>
          </span>
          <span
            v-else
            class="pips-row"
          >
            <span
              v-for="k in r.pips"
              :key="k"
              class="rung-pip"
              :class="{ filled: k <= missionInOperation }"
            />
          </span>
          <span class="mission">Mission {{ missionInOperation }}/{{ opLength }}</span>
        </template>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.strip {
  display: flex;
  align-items: stretch;
  gap: var(--sp-2);
  padding: var(--sp-4) var(--pad-page);
  border-bottom: 1px solid var(--line-1);
  background: var(--rail);
  min-height: 0;
  overflow-x: auto;
}
.rung {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: var(--sp-3);
  padding: var(--sp-3) var(--sp-4);
  border: 1px solid var(--line-2);
  background: var(--ground);
  color: var(--muted);
  min-width: 6.5rem;
  overflow: hidden;
  transition: border-color var(--dur-fast), background-color var(--dur-fast);
}
.rung-top { display: flex; align-items: baseline; gap: 8px; min-width: 0; }
.n { font-size: 22px; color: var(--text); }
.name {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mark { width: 14px; height: 14px; margin-left: auto; flex-shrink: 0; }
.rung-bottom { display: flex; align-items: center; gap: 8px; min-width: 0; }
.tier { width: 18px; height: 18px; font-size: 11px; border: 1px solid currentColor; }

.pips-row { display: flex; align-items: center; gap: 5px; }
.rung-pip { width: 22px; height: 6px; border: 1px solid var(--line-4); background: transparent; }
.rung-pip.filled { border-color: var(--gold); background: var(--gold); animation: pulse 2s ease-in-out infinite; }
.failed-mark { display: inline-flex; color: var(--red); }
.failed-mark svg { width: 14px; height: 14px; }
.mission {
  margin-left: auto;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--text);
  white-space: nowrap;
}

[data-state='cleared'] { color: var(--khaki); border-color: var(--line-3); }
[data-state='cleared'] .n { color: var(--khaki); }
[data-state='locked'] { color: var(--dim); border-color: #1e2118; }
[data-state='locked'] .n { color: var(--dim); }
[data-state='locked'] .name { color: var(--dim); }
[data-state='current'] {
  border-color: var(--gold);
  background: var(--raised);
}
[data-state='current'] .n { color: var(--gold); }
[data-state='current'] .name { color: var(--gold); }
/* A failed operation repeats the difficulty: the current rung goes red. */
.strip.failed [data-state='current'] {
  border-color: var(--red);
  background: color-mix(in srgb, var(--red) 8%, transparent);
}
.strip.failed [data-state='current'] .n,
.strip.failed [data-state='current'] .name { color: var(--red); }
[data-state='goal'] { color: var(--dim); border-color: #1e2118; }
[data-state='goal'] .n { color: var(--dim); }
</style>
