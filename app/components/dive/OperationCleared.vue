<script setup lang="ts">
import { MAX_DIFFICULTY, missionsPerOperation } from '~~/shared/engine/config'
import { catchUpOpsBehind, difficultyName } from '~~/shared/engine/progression'
import { difficultyImageUrl } from '~~/shared/data/images'
import type { DiveState } from '~~/shared/engine/types'

const props = defineProps<{
  state: DiveState
  canControl: boolean
}>()

const emit = defineEmits<{ start: [], openBargains: [] }>()

const nextDifficulty = computed(() => Math.min(MAX_DIFFICULTY, props.state.difficulty + 1))
const nextName = computed(() => difficultyName(nextDifficulty.value))
const opNumber = computed(() =>
  catchUpOpsBehind(props.state.difficulty, props.state.settings?.variant ?? 'medium') + 1)
const nextOp = computed(() => opNumber.value + 1)
const nextLength = computed(() => missionsPerOperation(nextDifficulty.value))
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
      <span class="next-num disp">{{ nextDifficulty }}</span>
    </div>
    <span class="kicker">Operation {{ opNumber }} cleared</span>
    <h1 class="disp title">
      The squad climbs
    </h1>
    <p class="sub">
      Next drop: <b>Difficulty {{ nextDifficulty }} · {{ nextName }}</b>
    </p>

    <CrusadeStrip
      class="ladder"
      :difficulty="nextDifficulty"
      :mission-in-operation="1"
      :op-length="nextLength"
    />

    <button
      v-if="canControl"
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
      Waiting for the host to start operation {{ nextOp }}…
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
  max-width: 980px;
  margin: 0 auto;
  padding: 20px 0 8px;
  text-align: center;
}
.rays {
  position: absolute;
  inset: -80px 0 auto;
  height: 520px;
  background:
    repeating-conic-gradient(from 0deg at 50% 24%, rgba(255, 214, 66, 0.075) 0deg 3deg, transparent 3deg 10deg);
  mask-image: radial-gradient(ellipse 55% 60% at 50% 30%, #000 0 30%, transparent 75%);
  pointer-events: none;
}
.mark-wrap {
  position: relative;
  display: grid;
  place-items: center;
  width: 128px;
  height: 112px;
  color: var(--on-gold);
  background: linear-gradient(180deg, #ffe57a, var(--gold) 50%, #e0b000);
  clip-path: polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%);
  filter: drop-shadow(0 0 34px rgba(255, 214, 66, 0.35));
}
.diff-emblem {
  width: 90px;
  height: 44px;
  object-fit: contain;
  opacity: 0.32;
  filter: brightness(0.2);
}
.next-num {
  position: absolute;
  font-size: 56px;
  line-height: 1;
  color: var(--on-gold);
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
.title { font-size: clamp(42px, 6vw, 76px); margin: 0; color: var(--text); }
.sub { margin: 0; color: var(--muted); font-size: 16px; }
.sub b { color: var(--text); }
.ladder { width: 100%; max-width: 900px; }
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
</style>
