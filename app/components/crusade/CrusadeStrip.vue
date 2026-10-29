<script setup lang="ts">
import { baseTierFor, missionsPerOperation } from '~~/shared/engine/config'
import { difficultyName } from '~~/shared/engine/progression'

const props = defineProps<{
  difficulty: number
  achieved?: boolean
  failed?: boolean
  missionInOperation: number
  opLength: number
  // Pre-launch route preview (the lobby): rungs below the start are skipped,
  // not cleared, and the path ahead reads as a plan rather than a lockout.
  route?: boolean
}>()

const rows = computed(() => Array.from({ length: 8 }, (_, i) => {
  const n = i + 3
  const state = props.achieved
    ? (n === 10 ? 'goal' : 'cleared')
    : props.route
      ? n < props.difficulty
        ? 'skipped'
        : n === props.difficulty
          ? 'current'
          : n === 10
            ? 'goal'
            : 'locked'
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
    :class="{ failed, route }"
    aria-label="Crusade ladder, difficulty 3 to 10"
  >
    <div
      v-for="r in rows"
      :key="r.n"
      class="rung"
      :data-state="r.state"
      :data-base="r.tier"
      :data-apex="r.n === 10 && r.state === 'current' && !failed ? '' : undefined"
      role="img"
      :style="{ flexGrow: r.state === 'current' ? 2.4 : 1 }"
      :aria-label="`${r.name}, difficulty ${r.n}, tier ${r.tier}${r.state === 'current' ? `, operation mission ${missionInOperation} of ${opLength}` : ''}`"
    >
      <span class="n disp">{{ r.n }}</span>
      <span class="name">{{ r.name }}</span>
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
      </template>
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
  container: strip / inline-size;
}
.rung {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: var(--sp-3) var(--sp-4);
  border: 1px solid var(--line-2);
  background: var(--ground);
  color: var(--muted);
  min-width: 0;
  overflow: hidden;
  transition: border-color var(--dur-fast), background-color var(--dur-fast);
}
/* Base tier rides the bottom edge: the loot floor of the rung without a label. */
.rung::after {
  content: '';
  position: absolute;
  inset: auto 0 0;
  height: 3px;
  background: var(--tier-edge);
}
.rung[data-base] { --tier-edge: var(--tier-c); }
.rung[data-base='B'] { --tier-edge: var(--tier-b); }
.rung[data-base='A'] { --tier-edge: var(--tier-a); }
.rung[data-base='S'] { --tier-edge: var(--tier-s); }
.rung[data-base='S+'] { --tier-edge: var(--tier-splus); }
.n { font-size: 22px; line-height: 1; color: var(--text); }
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

.pips-row { display: flex; align-items: center; gap: 5px; margin-left: auto; flex-shrink: 0; }
.rung-pip { width: 22px; height: 6px; border: 1px solid var(--line-4); background: transparent; }
.rung-pip.filled { border-color: var(--gold); background: var(--gold); animation: pulse 2s ease-in-out infinite; }
.failed-mark { display: inline-flex; color: var(--red); margin-left: auto; }
.failed-mark svg { width: 14px; height: 14px; }

/* Difficulty 10 is the summit: a slow gold breath and a light sweep, nothing louder. */
.rung[data-apex] { animation: apexBreath 3.6s ease-in-out infinite; }
.rung[data-apex]::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 40%;
  background: linear-gradient(100deg, transparent, rgba(255, 214, 66, 0.14), transparent);
  transform: translateX(-120%);
  animation: apexSweep 5.4s ease-in-out infinite;
  pointer-events: none;
}
@keyframes apexBreath {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255, 214, 66, 0); }
  50% { box-shadow: 0 0 14px 0 rgba(255, 214, 66, 0.28); }
}
@keyframes apexSweep {
  0%, 35% { transform: translateX(-120%); }
  80%, 100% { transform: translateX(320%); }
}

/* Too narrow for every name: the off-rungs keep the number (the name stays
   in their accessible label) so the current rung reads in full. */
@container strip (max-width: 1100px) {
  .rung:not([data-state='current']) .name { display: none; }
}

/* Phone: every rung is number + bar; the current rung drops its name too and
   the pips carry the mission count. */
@container strip (max-width: 560px) {
  .strip { gap: var(--sp-1); }
  .rung { padding: var(--sp-3) var(--sp-2); gap: 4px; }
  .rung .name { display: none; }
  .n { font-size: 18px; }
  .mark { display: none; }
  .pips-row { gap: 3px; }
  .rung-pip { width: 12px; }
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

/* Pre-launch route preview: the path ahead is a plan (muted), the rungs below
   the start are skipped (hazard), not cleared. */
.strip.route [data-state='locked'],
.strip.route [data-state='goal'] { color: var(--muted); border-color: var(--line-2); }
.strip.route [data-state='locked'] .n,
.strip.route [data-state='goal'] .n,
.strip.route [data-state='locked'] .name,
.strip.route [data-state='goal'] .name { color: var(--muted); }
[data-state='skipped'] {
  color: var(--line-5);
  border-color: var(--line-1);
  background-image: repeating-linear-gradient(-45deg, rgba(255, 214, 66, 0.08) 0 4px, transparent 4px 8px);
}
[data-state='skipped'] .n,
[data-state='skipped'] .name { color: var(--line-5); }
[data-state='skipped']::after,
[data-state='locked']::after { opacity: 0.45; }
.strip.route [data-state='locked']::after { opacity: 0.8; }
</style>
