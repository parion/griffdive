<script setup lang="ts">
import { baseTierFor, MAX_DIFFICULTY } from '~~/shared/engine/config'
import { catchUpOpsBehind, difficultyName } from '~~/shared/engine/progression'
import { difficultyImageUrl } from '~~/shared/data/images'
import { bargainsClosedReason, currentFront, draftSummaryFor } from '~~/shared/engine/selectors'
import type { DiverState, DiveState } from '~~/shared/engine/types'
import { operationMilestone } from '~/utils/operationMilestone'

// The squad-climbs page: where the squad regroups once every draft is banked,
// at the end of every mission and operation. The debrief already settled the
// stats screen, so this is the haul, a last call at Brasch's shelf and the
// host's call to the next drop. The engine stays in rewards and ADVANCE is the
// one way out.
const props = withDefaults(defineProps<{
  state: DiveState
  self: DiverState | null
  selfId: string | null
  canControl: boolean
  opLength: number
  phone?: boolean
}>(), { phone: false })

const emit = defineEmits<{
  advance: []
}>()

const mission = computed(() => props.state.missionInOperation)
const opEnds = computed(() => mission.value >= props.opLength)
// The operation's last mission climbs a rung; the crusade's last has none left.
const climbs = computed(() => opEnds.value && props.state.difficulty < MAX_DIFFICULTY)
const nextDifficulty = computed(() => Math.min(MAX_DIFFICULTY, props.state.difficulty + 1))
const nextName = computed(() => difficultyName(nextDifficulty.value))
const opNumber = computed(() =>
  catchUpOpsBehind(props.state.difficulty, props.state.settings?.variant ?? 'medium') + 1)
const nextOp = computed(() => opNumber.value + 1)
const milestone = computed(() => operationMilestone(props.state))
const hostName = computed(() =>
  upperName(props.state.divers.find(diver => diver.id === props.state.hostId)?.name) ?? 'the host')
const rungs = computed(() => Array.from({ length: MAX_DIFFICULTY - 2 }, (_, i) => {
  const n = i + 3
  return {
    n,
    tier: baseTierFor(n),
    state: n < nextDifficulty.value ? 'climbed' : n === nextDifficulty.value ? 'current' : 'locked',
  }
}))

const shopOpen = computed(() => props.self?.bargain != null && bargainsClosedReason(props.state) === null)

const squadDrafts = computed(() =>
  props.state.divers
    .filter(diver => diver.id !== props.selfId)
    .map(diver => ({ id: diver.id, name: upperName(diver.name), summary: draftSummaryFor(props.state, diver) })))

const ctaLabel = computed(() => {
  if (climbs.value) {
    return `Start operation ${nextOp.value}`
  }
  return opEnds.value ? 'Complete operation' : 'Next mission'
})

const nextDrop = computed(() => {
  if (climbs.value) {
    return `Next drop: Difficulty ${nextDifficulty.value} · ${nextName.value}`
  }
  if (opEnds.value) {
    return 'The crusade’s last rung is cleared.'
  }
  const front = currentFront(props.state)
  const where = front ? ` · ${front.displayName} front` : ''
  return `Next drop: mission ${mission.value + 1} of ${props.opLength}${where}`
})

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
    class="climb"
    :class="{ phone, climbs }"
    aria-labelledby="climb-h"
  >
    <div
      v-if="climbs"
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
      <div
        v-if="climbs"
        class="mark-wrap"
      >
        <img
          class="diff-emblem"
          :src="difficultyImageUrl(nextDifficulty)"
          alt=""
          draggable="false"
        >
      </div>
      <span class="kicker">{{ climbs ? `Operation ${opNumber} cleared` : `Mission ${mission} of ${opLength} secured` }}</span>
      <h1
        id="climb-h"
        class="disp title"
      >
        {{ climbs ? 'The squad climbs' : opEnds ? 'Operation secured' : 'Mission secured' }}
      </h1>
      <p class="next-drop">
        {{ nextDrop }}
      </p>
    </header>

    <ol
      v-if="milestone"
      class="op-milestone"
      :aria-label="milestone.accessibleLabel"
    >
      <li class="op-ms-cell">
        <span class="lbl">Cleared</span>
        <span class="op-ms-v">
          <b class="disp">{{ milestone.clearedDifficulty }}</b>
          {{ milestone.clearedName }}
        </span>
      </li>
      <li class="op-ms-cell op-ms-front">
        <span class="lbl">New front</span>
        <span class="op-ms-v">{{ milestone.front }}</span>
      </li>
      <li
        v-for="row in milestone.carries"
        :key="row.label"
        class="op-ms-cell"
      >
        <span class="lbl">{{ row.label }}</span>
        <span class="op-ms-v">{{ row.value }}</span>
      </li>
    </ol>

    <ol
      v-if="climbs"
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
    <MissionTrack
      v-else
      class="track"
      :mission="mission"
      :op-length="opLength"
      :phone="phone"
    />

    <ClimbReport
      :state="state"
      :phone="phone"
    />

    <div class="board">
      <div class="haul-stack">
        <MissionBankedHaul
          class="haul-card"
          :state="state"
          :self="self"
          :phone="phone"
        />
        <SquadDraftBoard
          v-if="squadDrafts.length"
          class="squad-under-haul"
          :drafts="squadDrafts"
          compact
        />
      </div>
    </div>

    <section
      v-if="shopOpen"
      class="shop"
    >
      <p
        v-if="climbs"
        class="last-call"
      >
        <span class="cap">Last call</span>
        Shelf restocks at Difficulty {{ nextDifficulty }} when operation {{ nextOp }} starts. Pack prices carry over.
      </p>
      <BraschShopDoor
        :state="state"
        :self="self"
      />
    </section>

    <ClimbFoot
      :label="ctaLabel"
      :can-control="canControl"
      :waiting="`Waiting for ${hostName} to call the next drop.${shopOpen ? ' Shop while you wait.' : ''}`"
      :phone="phone"
      @go="emit('advance')"
    />
  </section>
</template>

<style scoped>
.climb {
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
.climb > * { width: 100%; }

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

/* The boundary beat: what was cleared, how the new front arrives, and what the
   squad keeps. Presentation only — the host's Start operation still runs the
   same ADVANCE. */
.op-milestone {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(158px, 1fr));
  gap: 1px;
  margin: 2px 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--line-2);
  background: var(--line-1);
}
.op-ms-cell {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 10px 14px;
  background: var(--rail);
}
.op-ms-cell .lbl { color: var(--gold); }
.op-ms-v {
  color: var(--khaki);
  font-size: 12px;
  line-height: 1.35;
}
.op-ms-v b {
  margin-right: 5px;
  color: var(--gold);
  font-size: 19px;
}
.op-ms-front .op-ms-v { color: var(--text); }

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

.climb:not(.climbs) .hero { gap: 8px; }
.climb:not(.climbs) .kicker { color: var(--teal); }
.climb:not(.climbs) .title { animation: riseIn 0.45s var(--ease-out) both; background: none; color: var(--text); filter: none; text-shadow: 0 0 36px rgba(74, 215, 200, 0.16); }
.climb > .track { width: auto; align-self: center; }
.board {
  display: grid;
  /* A wider art well keeps the climb, the haul and the CTA on one desktop screen. */
  --haul-aspect: 16 / 10;
}
.haul-stack { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.squad-under-haul :deep(.board-grid) { display: flex; flex-wrap: wrap; gap: 8px; }
.squad-under-haul :deep(.squad-pick) { flex: 1 1 180px; }
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

@media (max-width: 860px) {
  .board { --haul-aspect: 4 / 3; }
}
@media (max-width: 600px) {
  .rung { height: 46px; font-size: 15px; padding-left: 6px; clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 50%, calc(100% - 8px) 100%, 0 100%, 8px 50%); }
  .rung:first-child { clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 50%, calc(100% - 8px) 100%, 0 100%); }
  .rung.current { font-size: 18px; }
  .ladder { gap: 2px; }
}

.phone { gap: 14px; }
.phone .shop { padding: 0; }
.phone .last-call { flex-direction: column; gap: 2px; }
.phone .title { font-size: 34px; }
.phone:not(.climbs) .hero { align-items: flex-start; text-align: left; }
.phone:not(.climbs) .kicker::after { display: none; }
</style>
