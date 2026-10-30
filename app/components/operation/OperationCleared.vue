<script setup lang="ts">
import { baseTierFor, MAX_DIFFICULTY } from '~~/shared/engine/config'
import { catchUpOpsBehind, difficultyName } from '~~/shared/engine/progression'
import { difficultyImageUrl } from '~~/shared/data/images'
import { draftSummaryFor, honorsPending } from '~~/shared/engine/selectors'
import type { DiverState, DiveState } from '~~/shared/engine/types'

// The operation's last bank: the climb to the next difficulty, then the same
// regroup as between missions — the diver's haul, the squad's picks and a last
// call at Brasch's shelf before the host starts the next operation.
const props = withDefaults(defineProps<{
  state: DiveState
  self: DiverState | null
  selfId: string | null
  canControl: boolean
  phone?: boolean
}>(), { phone: false })

const emit = defineEmits<{ start: [] }>()

const hostName = computed(() =>
  upperName(props.state.divers.find(diver => diver.id === props.state.hostId)?.name) ?? 'the host')
const nextDifficulty = computed(() => Math.min(MAX_DIFFICULTY, props.state.difficulty + 1))
const nextName = computed(() => difficultyName(nextDifficulty.value))
const opNumber = computed(() =>
  catchUpOpsBehind(props.state.difficulty, props.state.settings?.variant ?? 'medium') + 1)
const nextOp = computed(() => opNumber.value + 1)
const honorsLocked = computed(() => honorsPending(props.state))
const startLabel = computed(() => (honorsLocked.value ? 'Award honors first' : `Start operation ${nextOp.value}`))
const rungs = computed(() => Array.from({ length: MAX_DIFFICULTY - 2 }, (_, i) => {
  const n = i + 3
  return {
    n,
    tier: baseTierFor(n),
    state: n < nextDifficulty.value ? 'climbed' : n === nextDifficulty.value ? 'current' : 'locked',
  }
}))

const squadDrafts = computed(() =>
  props.state.divers
    .filter(diver => diver.id !== props.selfId)
    .map(diver => ({ id: diver.id, name: upperName(diver.name), summary: draftSummaryFor(props.state, diver) })))

// Embers are laid out by index, not Math.random: the server render and the
// client hydrate must agree, and a fixed scatter reads the same every time.
const EMBER_COUNT = 26
const embers = Array.from({ length: EMBER_COUNT }, (_, i) => ({
  left: `${(i * 37 + 11) % 100}%`,
  delay: `${((i * 0.83) % 6).toFixed(2)}s`,
  duration: `${(5 + ((i * 1.7) % 4)).toFixed(2)}s`,
  drift: `${((i % 5) - 2) * 14}px`,
  size: `${3 + (i % 3)}px`,
}))
</script>

<template>
  <section
    class="cleared"
    :class="{ phone }"
  >
    <div
      class="backdrop"
      aria-hidden="true"
    >
      <span class="rays rays-a" />
      <span class="rays rays-b" />
      <span class="halo" />
      <span
        v-for="(ember, i) in embers"
        :key="i"
        class="ember"
        :style="{
          'left': ember.left,
          'width': ember.size,
          'height': ember.size,
          'animationDelay': ember.delay,
          'animationDuration': ember.duration,
          '--drift': ember.drift,
        }"
      />
    </div>

    <header class="hero">
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
    </header>

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

    <div class="regroup">
      <MissionBankedHaul
        class="haul-card"
        :state="state"
        :self="self"
        :phone="phone"
      />
      <div class="shop">
        <p class="last-call">
          <span class="cap">Last call</span>
          Brasch restocks at Difficulty {{ nextDifficulty }} when operation {{ nextOp }} starts.
        </p>
        <BraschShopDoor
          :state="state"
          :self="self"
        />
      </div>
    </div>

    <SquadDraftBoard
      v-if="squadDrafts.length"
      class="squad"
      :drafts="squadDrafts"
      compact
    />

    <PhoneActionBar v-if="phone">
      <template #primary>
        <button
          v-if="canControl && !honorsLocked"
          class="bar-cta cta-sweep"
          type="button"
          @click="emit('start')"
        >
          <span class="disp">{{ startLabel }}</span>
        </button>
        <span
          v-else-if="canControl"
          class="bar-gate"
        ><span class="bar-gate-word quiet">Award honors first</span></span>
        <span
          v-else
          class="bar-gate"
        >Waiting on {{ hostName }}</span>
      </template>
    </PhoneActionBar>
    <footer
      v-else
      class="foot"
    >
      <button
        v-if="canControl"
        class="cta cut cta-sweep"
        :class="{ 'cta-locked': honorsLocked }"
        type="button"
        :disabled="honorsLocked"
        @click="emit('start')"
      >
        {{ startLabel }}
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
        role="status"
      >
        Waiting for {{ hostName }} to start operation {{ nextOp }}. Shop while you wait.
      </p>
    </footer>
  </section>
</template>

<style scoped>
.cleared {
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
}
.cleared > * { width: 100%; }

/* The backdrop lives: two ray fields turn against each other behind the
   emblem, a halo breathes, and embers rise past the climb. It spans the stage
   width but is clipped to the beat's height so it never adds scroll. It reaches well above the beat so the rays fade out
   instead of meeting a hard top edge. */
.backdrop {
  position: absolute;
  z-index: -1;
  top: -560px;
  bottom: 0;
  left: 50%;
  width: 100vw;
  translate: -50% 0;
  overflow: hidden;
  pointer-events: none;
  mask-image: linear-gradient(180deg, #000 0 calc(100% - 200px), transparent 100%);
}
.rays {
  position: absolute;
  left: 50%;
  top: 636px;
  width: 1700px;
  height: 1700px;
  margin: -850px 0 0 -850px;
  border-radius: 50%;
  mask-image: radial-gradient(circle, #000 0 8%, rgba(0, 0, 0, 0.5) 22%, transparent 46%);
}
.rays-a {
  background: repeating-conic-gradient(from 0deg, rgba(255, 214, 66, 0.1) 0deg 3deg, transparent 3deg 10deg);
  animation: raysIn 1.2s var(--ease-out) both, rays-turn 90s linear 1.2s infinite;
}
.rays-b {
  background: repeating-conic-gradient(from 5deg, rgba(255, 232, 138, 0.05) 0deg 1.5deg, transparent 1.5deg 17deg);
  animation: raysIn 1.6s var(--ease-out) both, rays-turn 140s linear 1.6s infinite reverse;
}
@keyframes rays-turn { to { rotate: 360deg; } }
.halo {
  position: absolute;
  left: 50%;
  top: 636px;
  width: 520px;
  height: 320px;
  margin: -160px 0 0 -260px;
  background: radial-gradient(ellipse, rgba(255, 214, 66, 0.22), transparent 68%);
  animation: halo-breathe 4.5s ease-in-out infinite;
}
@keyframes halo-breathe {
  0%, 100% { opacity: 0.6; scale: 0.92; }
  50% { opacity: 1; scale: 1.08; }
}
.ember {
  position: absolute;
  bottom: -8px;
  background: var(--gold-bright);
  box-shadow: 0 0 6px 1px var(--gold), 0 0 18px 3px rgba(255, 159, 67, 0.55);
  opacity: 0;
  animation: ember-rise linear infinite;
}
@keyframes ember-rise {
  0% { opacity: 0; translate: 0 0; }
  10% { opacity: 1; }
  75% { opacity: 0.7; }
  100% { opacity: 0; translate: var(--drift) -620px; }
}

.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;
}
.mark-wrap {
  position: relative;
  display: grid;
  place-items: center;
  width: min(44vw, 140px);
  aspect-ratio: 190 / 92;
}
.diff-emblem {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 0 28px rgba(255, 214, 66, 0.45)) drop-shadow(0 0 2px rgba(255, 255, 255, 0.6));
  animation: slamIn 0.6s var(--ease-impact) both, emblem-glow 3.2s ease-in-out 0.8s infinite;
}
@keyframes emblem-glow {
  50% { filter: drop-shadow(0 0 40px rgba(255, 214, 66, 0.7)) drop-shadow(0 0 3px rgba(255, 255, 255, 0.9)); }
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
/* One pass of light across the headline as it lands. */
.title {
  margin: 0;
  font-size: clamp(38px, 4.4vw, 60px);
  color: transparent;
  background: linear-gradient(100deg, var(--text) 0 40%, #fff6c8 48%, var(--text) 56% 100%) 0 0 / 250% 100% no-repeat;
  background-clip: text;
  -webkit-background-clip: text;
  filter: drop-shadow(0 0 30px rgba(255, 214, 66, 0.2));
  animation: riseIn 0.5s var(--ease-out) 0.15s both, title-shine 1.6s var(--ease-out) 0.7s both;
}
@keyframes title-shine {
  from { background-position: 100% 0; }
  to { background-position: 0 0; }
}
.next-drop { margin: 0; color: var(--muted); font-size: 16px; }
.next-drop b { color: var(--text); }

.ladder {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 4px;
  max-width: 1100px;
  margin: 2px 0;
  padding: 0;
  list-style: none;
}
.rung {
  --tier: var(--tier-c);
  display: grid;
  place-items: center;
  height: 48px;
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

.regroup {
  display: grid;
  grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
  /* A wider art well keeps the climb, the haul and the CTA on one desktop screen. */
  --haul-aspect: 16 / 10;
}
.shop {
  display: flex;
  flex-direction: column;
  gap: 10px;
  animation: deal-in 0.55s var(--ease-out) 0.3s both;
}
@keyframes deal-in {
  from { opacity: 0; translate: 0 24px; }
  to { opacity: 1; translate: 0 0; }
}
.last-call { display: flex; align-items: baseline; gap: 10px; margin: 0; color: var(--muted); font-size: 12px; }
.last-call .cap { color: var(--orange); }

.foot { display: flex; justify-content: center; }
.cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  width: min(100%, 440px);
  min-height: 60px;
  padding: 0 26px;
  border: 0;
  background: linear-gradient(180deg, #ffe57a 0%, var(--gold) 45%, #f0bf1a 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6), inset 0 -3px 0 rgba(110, 80, 0, 0.35), 0 0 34px rgba(255, 214, 66, 0.26);
  color: var(--on-gold);
  font: 800 18px var(--font-display);
  font-stretch: 125%;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
}
.cta:hover { filter: brightness(1.06); }
.cta:disabled { opacity: 0.4; cursor: not-allowed; filter: none; }
.waiting { margin: 0; color: var(--muted); font-size: 14px; text-align: center; }

@media (max-width: 860px) {
  .regroup { grid-template-columns: minmax(0, 1fr); --haul-aspect: 4 / 3; }
}
@media (max-width: 600px) {
  .rung { height: 46px; font-size: 15px; padding-left: 6px; clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 50%, calc(100% - 8px) 100%, 0 100%, 8px 50%); }
  .rung:first-child { clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 50%, calc(100% - 8px) 100%, 0 100%); }
  .rung.current { font-size: 18px; }
  .ladder { gap: 2px; }
}

.phone { gap: 14px; }
.phone .regroup { grid-template-columns: minmax(0, 1fr); }
.phone .shop { padding: 0; }
.phone .last-call { flex-direction: column; gap: 2px; }
.phone .title { font-size: 34px; }
</style>
