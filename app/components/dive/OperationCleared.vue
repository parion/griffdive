<script setup lang="ts">
import { baseTierFor, MAX_DIFFICULTY } from '~~/shared/engine/config'
import { catchUpOpsBehind, difficultyName } from '~~/shared/engine/progression'
import { difficultyImageUrl } from '~~/shared/data/images'
import type { DiveState } from '~~/shared/engine/types'

const props = withDefaults(defineProps<{
  state: DiveState
  canControl: boolean
  phone?: boolean
}>(), { phone: false })
const hostName = computed(() =>
  props.state.divers.find(diver => diver.id === props.state.hostId)?.name ?? 'the host')

const emit = defineEmits<{ start: [], openBargains: [] }>()

const nextDifficulty = computed(() => Math.min(MAX_DIFFICULTY, props.state.difficulty + 1))
const nextName = computed(() => difficultyName(nextDifficulty.value))
const opNumber = computed(() =>
  catchUpOpsBehind(props.state.difficulty, props.state.settings?.variant ?? 'medium') + 1)
const nextOp = computed(() => opNumber.value + 1)
const rungs = computed(() => Array.from({ length: MAX_DIFFICULTY - 2 }, (_, i) => {
  const n = i + 3
  return {
    n,
    tier: baseTierFor(n),
    state: n < nextDifficulty.value ? 'climbed' : n === nextDifficulty.value ? 'current' : 'locked',
  }
}))
</script>

<template>
  <section class="cleared">
    <span
      class="rays"
      aria-hidden="true"
    />
    <div class="mark-wrap">
      <img
        class="diff-emblem"
        :src="difficultyImageUrl(nextDifficulty)"
        alt=""
        draggable="false"
      >
    </div>
    <span class="kicker">Operation {{ opNumber }} cleared</span>
    <h1 class="disp title">
      The squad climbs
    </h1>
    <p class="next-drop">
      Next drop: <b>Difficulty {{ nextDifficulty }} · {{ nextName }}</b>
    </p>

    <ol
      class="ladder"
      :aria-label="`Crusade ladder, next drop difficulty ${nextDifficulty} of ${MAX_DIFFICULTY}`"
    >
      <li
        v-for="(rung, index) in rungs"
        :key="rung.n"
        class="rung disp"
        :class="rung.state"
        :data-tier="rung.tier"
        :style="{ '--i': index }"
        :aria-current="rung.state === 'current' ? 'step' : undefined"
      >
        {{ rung.n }}
      </li>
    </ol>

    <PhoneActionBar v-if="phone">
      <template #primary>
        <button
          v-if="canControl"
          class="bar-cta cta-sweep"
          type="button"
          @click="emit('start')"
        >
          <span class="disp">Start operation {{ nextOp }}</span>
        </button>
        <span
          v-else
          class="bar-gate"
        >Waiting on {{ hostName }}</span>
      </template>
    </PhoneActionBar>
    <button
      v-else-if="canControl"
      class="cta cut cta-sweep"
      type="button"
      @click="emit('start')"
    >
      Start operation {{ nextOp }}
      <svg
        width="22"
        height="14"
        viewBox="0 0 22 14"
        aria-hidden="true"
      >
        <path
          d="M0 0h5l7 7-7 7H0l7-7zM10 0h5l7 7-7 7h-5l7-7z"
          fill="currentColor"
        />
      </svg>
    </button>
    <p
      v-else
      class="waiting"
    >
      Waiting for {{ hostName }} to start operation {{ nextOp }}…
    </p>

    <button
      v-if="canControl"
      class="restock"
      type="button"
      @click="emit('openBargains')"
    >
      Brasch has restocked. Spend credits before the spin.
    </button>
    <p
      v-else
      class="restock-note"
    >
      Brasch has restocked. Spend credits before the spin.
    </p>
  </section>
</template>

<style scoped>
.cleared {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
  padding: 20px 0 8px;
  text-align: center;
}
.rays {
  position: absolute;
  inset: -120px -20vw auto;
  height: 760px;
  animation: raysIn 1.2s var(--ease-out) both;
  background:
    repeating-conic-gradient(from 0deg at 50% 24%, rgba(255, 214, 66, 0.075) 0deg 3deg, transparent 3deg 10deg);
  mask-image: radial-gradient(ellipse 50% 60% at 50% 30%, #000 0 30%, transparent 75%);
  pointer-events: none;
}
.mark-wrap {
  position: relative;
  display: grid;
  place-items: center;
  width: min(60vw, 240px);
  aspect-ratio: 190 / 92;
}
.diff-emblem {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 0 28px rgba(255, 214, 66, 0.45)) drop-shadow(0 0 2px rgba(255, 255, 255, 0.6));
  animation: slamIn 0.6s var(--ease-impact) both;
}
.kicker {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--gold);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.24em;
  text-transform: uppercase;
}
.kicker::before,
.kicker::after {
  content: '';
  width: 22px;
  height: 2px;
  background: currentColor;
  box-shadow: 0 0 8px currentColor;
}
.title {
  font-size: clamp(40px, 5.2vw, 76px);
  margin: 0;
  color: var(--text);
  text-shadow: 0 0 40px rgba(255, 214, 66, 0.18);
}
.next-drop { margin: 0; color: var(--muted); font-size: 16px; }
.next-drop b { color: var(--text); }
.ladder {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 4px;
  width: 100%;
  max-width: 1100px;
  margin: 10px 0 14px;
  padding: 0;
  list-style: none;
}
.rung {
  --tier: var(--tier-c);
  display: grid;
  place-items: center;
  height: 64px;
  padding-left: 10px;
  color: var(--ghost-ink);
  font-size: 22px;
  font-variant-numeric: lining-nums tabular-nums;
  background: var(--panel);
  box-shadow: inset 0 -3px 0 color-mix(in srgb, var(--tier) 70%, transparent);
  clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%, 14px 50%);
  animation: rungOn 0.5s var(--ease-out) both;
  animation-delay: calc(var(--i) * 60ms);
}
.rung:first-child { clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%); padding-left: 0; }
.rung[data-tier='B'] { --tier: var(--tier-b); }
.rung[data-tier='A'] { --tier: var(--tier-a); }
.rung[data-tier='S'] { --tier: var(--tier-s); }
.rung.climbed { color: var(--muted); background: var(--raised); }
.rung.current {
  color: var(--on-gold);
  background: linear-gradient(180deg, #ffe57a, var(--gold) 50%, #f0bf1a);
  box-shadow: none;
  font-size: 26px;
  animation: rungOn 0.5s var(--ease-out) both, glowPulse 2.4s ease-in-out 0.8s infinite;
  animation-delay: calc(var(--i) * 60ms), 0.8s;
}
@keyframes glowPulse { 50% { filter: brightness(1.12) drop-shadow(0 0 12px rgba(255, 214, 66, 0.6)); } }
.cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  min-width: 340px;
  min-height: 60px;
  padding: 0 26px;
  border: 0;
  background: linear-gradient(180deg, #ffe57a 0%, var(--gold) 45%, #f0bf1a 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6), inset 0 -3px 0 rgba(110, 80, 0, 0.35);
  color: var(--on-gold);
  font: 800 18px var(--font-display);
  font-stretch: 125%;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
}
.restock {
  min-height: 30px;
  border: 0;
  background: none;
  color: var(--muted);
  font: 500 13px var(--font-body);
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-color: var(--line-4);
  cursor: pointer;
}
.restock:hover { color: var(--gold); }
.restock-note { margin: 0; color: var(--dim); font-size: 12px; }
.waiting { color: var(--muted); font-size: 13px; }

@media (max-width: 600px) {
  .rung { height: 46px; font-size: 15px; padding-left: 6px; clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 50%, calc(100% - 8px) 100%, 0 100%, 8px 50%); }
  .rung:first-child { clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 50%, calc(100% - 8px) 100%, 0 100%); }
  .rung.current { font-size: 18px; }
  .ladder { gap: 2px; }
  .cta { min-width: 0; width: 100%; }
}
</style>
