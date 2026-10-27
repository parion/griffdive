<script setup lang="ts">
import { ALL_ITEMS } from '~~/shared/data/catalog'
import { misfortuneById } from '~~/shared/data/misfortunes'
import { pactById } from '~~/shared/data/conditions'
import { itemImageUrl } from '~~/shared/data/images'
import { conditionRiskAt } from '~~/shared/engine/config'
import type { BriefingStepId } from '~/utils/briefing'

// A small looping scene of one mission beat, drawn from real catalog data so
// the guide shows the same names, risks and renders the dive will. Pure
// presentation: CSS loops whose resting styles are the final frame, so reduced
// motion simply shows the beat already played out.
const props = defineProps<{ step: BriefingStepId, difficulty: number }>()

const WEDGES = 10
const wedges = Array.from({ length: WEDGES }, (_, i) => {
  const step = 360 / WEDGES
  const a0 = ((i * step - step / 2) * Math.PI) / 180
  const a1 = ((i * step + step / 2) * Math.PI) / 180
  return `M50 50 L${50 + 44 * Math.cos(a0)} ${50 + 44 * Math.sin(a0)} A44 44 0 0 1 ${50 + 44 * Math.cos(a1)} ${50 + 44 * Math.sin(a1)}Z`
})
const hitWedge = wedges[0]!

const directive = misfortuneById('noEagles')
const directiveRisk = computed(() => conditionRiskAt('noEagles', props.difficulty))

const HAND = [
  { id: 'thirsty', tilt: -7, sworn: true },
  { id: 'untouchable', tilt: 0, sworn: false },
  { id: 'loadoutLoyalist', tilt: 7, sworn: true },
] as const
const hand = computed(() => HAND.flatMap(({ id, tilt, sworn }, i) => {
  const pact = pactById(id)
  return pact ? [{ id, name: pact.name, tilt, sworn, i, risk: conditionRiskAt(id, props.difficulty) }] : []
}))
const swornRisk = computed(() => hand.value.filter(card => card.sworn).reduce((sum, card) => sum + card.risk, 0))

const STRATAGEM_CATEGORIES = new Set(['Eagle', 'Orbital', 'Supply', 'Defense'])
const loot = (['c', 'b', 'a'] as const).flatMap((tier, i) => {
  const item = ALL_ITEMS.find(entry => entry.tier === tier && STRATAGEM_CATEGORIES.has(entry.category))
  return item ? [{ id: item.id, name: item.displayName, tier, image: itemImageUrl(item), i }] : []
})
</script>

<template>
  <div
    class="pv"
    :data-step="step"
    aria-hidden="true"
  >
    <!-- Spin: the wheel turns, lands, and the directive is put to the squad. -->
    <div
      v-if="step === 'spin'"
      class="sc sc-spin"
    >
      <div class="spin-wheel">
        <svg viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="48"
            class="spin-rim"
          />
          <g class="spin-rotor">
            <path
              v-for="(d, i) in wedges"
              :key="i"
              :d="d"
              :class="i % 2 ? 'w-a' : 'w-b'"
            />
          </g>
          <path
            class="spin-hit"
            :d="hitWedge"
          />
          <circle
            cx="50"
            cy="50"
            r="13"
            class="spin-hub"
          />
        </svg>
        <span class="spin-pointer" />
      </div>
      <div class="spin-card">
        <span class="pv-cap">Directive</span>
        <b class="disp spin-name">{{ directive?.name }}</b>
        <RiskPips
          :value="directiveRisk"
          :max="directiveRisk"
          tone="red"
        />
        <span class="spin-acts">
          <span class="spin-take">Take it</span>
          <span class="spin-skip">Skip</span>
        </span>
      </div>
    </div>

    <!-- Swear pacts: a hand of three; two take the stamp. -->
    <div
      v-else-if="step === 'pacts'"
      class="sc sc-pacts"
    >
      <div class="pact-hand">
        <div
          v-for="card in hand"
          :key="card.id"
          class="pact"
          :style="{ '--tilt': `${card.tilt}deg`, '--i': card.i }"
        >
          <RiskPips
            :value="card.risk"
            :max="card.risk"
            tone="gold"
          />
          <b class="disp pact-name">{{ card.name }}</b>
          <span
            v-if="card.sworn"
            class="disp pact-stamp"
          >Sworn</span>
        </div>
      </div>
      <span class="pv-tally">+{{ swornRisk }} risk · your loot only</span>
    </div>

    <!-- Dive: the hellpod drops, the mission is played in Helldivers 2. -->
    <div
      v-else-if="step === 'dive'"
      class="sc sc-dive"
    >
      <span class="dive-trail" />
      <svg
        class="dive-pod"
        viewBox="0 0 24 34"
      >
        <path d="M7 1h10v18l-5 9-5-9z" />
        <path d="M7 13 3 17v6M17 13l4 4v6" />
      </svg>
      <span class="dive-ring" />
      <span class="dive-ground" />
      <span class="dive-tag">
        <i class="lamp teal" />
        <span>Playing in Helldivers 2</span>
        <b>Extract</b>
      </span>
    </div>

    <!-- Report: copy the stars, samples and clock off the end screen. -->
    <div
      v-else-if="step === 'report'"
      class="sc sc-report"
    >
      <div class="rep-card">
        <span class="rep-stars">
          <svg
            v-for="n in 3"
            :key="n"
            viewBox="0 0 24 24"
            :style="{ '--i': n - 1 }"
          ><path d="m12 2.5 2.9 5.9 6.5 1-4.7 4.5 1.1 6.4-5.8-3-5.8 3 1.1-6.4-4.7-4.5 6.5-1z" /></svg>
        </span>
        <span class="rep-row">
          <span class="pv-cap">Samples</span>
          <span class="rep-bar"><i class="rep-fill samples" /></span>
        </span>
        <span class="rep-row">
          <span class="pv-cap">Time left</span>
          <span class="rep-bar"><i class="rep-fill clock" /></span>
        </span>
        <span class="rep-file">File report</span>
      </div>
    </div>

    <!-- Loot: each option rolls its tier; one is banked. -->
    <div
      v-else
      class="sc sc-loot"
    >
      <div
        v-for="card in loot"
        :key="card.id"
        class="loot"
        :class="{ pick: card.i === 1 }"
        :style="{ '--i': card.i }"
      >
        <span
          class="disp loot-tier"
          :data-tier="card.tier"
        >{{ card.tier.toUpperCase() }}</span>
        <img
          v-if="card.image"
          :src="card.image"
          alt=""
          draggable="false"
        >
        <span class="loot-name">{{ card.name }}</span>
        <span
          v-if="card.i === 1"
          class="disp loot-stamp"
        >Banked</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pv {
  --loop: 5.2s;
  container-type: inline-size;
  position: relative;
  height: 150px;
  overflow: hidden;
  background:
    radial-gradient(ellipse 70% 80% at 50% 100%, rgba(255, 214, 66, 0.07), transparent 70%),
    var(--ground);
  border: 1px solid var(--line-2);
}
.sc { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 18px; padding: 12px; }
.pv-cap { font-size: 9px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: var(--muted); }
.pv-tally { position: absolute; right: 10px; bottom: 8px; font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--gold); animation: pv-late var(--loop) var(--ease-out) infinite both; }

/* Every loop clears its own stage in the last beat so the restart is clean. */
@keyframes pv-late {
  0%, 62% { opacity: 0; transform: translateY(4px); }
  70%, 94% { opacity: 1; transform: none; }
  100% { opacity: 0; }
}

/* ---- Spin --------------------------------------------------------------- */
.spin-wheel { position: relative; width: 116px; height: 116px; flex-shrink: 0; }
.spin-wheel svg { width: 100%; height: 100%; display: block; }
.spin-rim { fill: none; stroke: var(--gold); stroke-width: 2.4; stroke-dasharray: 1 2.6; }
.w-a { fill: #1b1e15; stroke: var(--line-2); stroke-width: 0.5; }
.w-b { fill: #15170f; stroke: var(--line-2); stroke-width: 0.5; }
.spin-hub { fill: var(--panel); stroke: var(--gold); stroke-width: 1.4; }
.spin-rotor { transform-origin: 50px 50px; animation: pv-spin var(--loop) infinite both; }
@keyframes pv-spin {
  0% { transform: rotate(0deg); animation-timing-function: cubic-bezier(0.12, 0.72, 0.1, 1); }
  48%, 100% { transform: rotate(1080deg); }
}
.spin-hit { fill: var(--gold); filter: drop-shadow(0 0 4px rgba(255, 214, 66, 0.6)); animation: pv-hit var(--loop) infinite both; }
@keyframes pv-hit {
  0%, 48% { opacity: 0; }
  54%, 94% { opacity: 1; }
  100% { opacity: 0; }
}
.spin-pointer {
  position: absolute;
  right: -6px;
  top: 50%;
  width: 14px;
  height: 14px;
  margin-top: -7px;
  background: var(--gold);
  clip-path: polygon(0 50%, 100% 0, 100% 100%);
}
.spin-card {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
  padding: 10px 12px;
  background: var(--panel);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--gold) 40%, var(--line-3));
  animation: pv-card var(--loop) var(--ease-out) infinite both;
}
@keyframes pv-card {
  0%, 50% { opacity: 0; transform: translateX(10px); }
  58%, 94% { opacity: 1; transform: none; }
  100% { opacity: 0; }
}
.spin-name { font-size: 17px; color: var(--gold); line-height: 1; white-space: nowrap; }
.spin-card :deep(.pips i) { width: 11px; height: 11px; }
.spin-acts { display: flex; gap: 4px; margin-top: 2px; }
.spin-take,
.spin-skip { padding: 4px 8px; font-size: 9px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; }
.spin-take { background: var(--gold); color: var(--on-gold); animation: pv-press var(--loop) infinite both; }
.spin-skip { color: var(--khaki); box-shadow: inset 0 0 0 1px var(--line-4); }
@keyframes pv-press {
  0%, 74% { box-shadow: none; transform: none; }
  78% { transform: scale(0.92); }
  84%, 94% { box-shadow: 0 0 0 2px var(--ground), 0 0 0 3px var(--gold); transform: none; }
}

/* ---- Swear pacts ---------------------------------------------------------- */
.pact-hand { display: flex; align-items: flex-end; justify-content: center; gap: 6px; padding-bottom: 6px; }
.pact {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: min(104px, 30cqw);
  height: 108px;
  padding: 9px 8px;
  background: linear-gradient(170deg, var(--raised), var(--panel));
  border: 1px solid var(--line-3);
  transform: rotate(var(--tilt));
  animation: pv-deal var(--loop) var(--ease-out) infinite both;
  animation-delay: calc(var(--i) * 120ms);
}
@keyframes pv-deal {
  0% { opacity: 0; transform: translateY(26px) rotate(0deg); }
  14%, 94% { opacity: 1; transform: rotate(var(--tilt)); }
  100% { opacity: 0; transform: rotate(var(--tilt)); }
}
.pact :deep(.pips i) { width: 10px; height: 10px; }
.pact-name { font-size: 11px; line-height: 1.1; color: var(--text); overflow-wrap: anywhere; }
.pact-stamp {
  position: absolute;
  left: 50%;
  bottom: 14px;
  padding: 2px 6px;
  border: 2px solid var(--red);
  color: var(--red);
  font-size: 12px;
  letter-spacing: 0.08em;
  background: rgba(19, 21, 15, 0.9);
  transform: translateX(-50%) rotate(-10deg);
  animation: pv-stamp var(--loop) var(--ease-impact) infinite both;
  animation-delay: calc(var(--i) * 260ms);
}
@keyframes pv-stamp {
  0%, 30% { opacity: 0; transform: translateX(-50%) rotate(-10deg) scale(1.8); }
  36%, 94% { opacity: 1; transform: translateX(-50%) rotate(-10deg) scale(1); }
  100% { opacity: 0; transform: translateX(-50%) rotate(-10deg) scale(1); }
}

/* ---- Dive ---------------------------------------------------------------- */
.sc-dive { align-items: flex-end; }
.dive-ground { position: absolute; left: 0; right: 0; bottom: 34px; height: 1px; background: var(--line-4); }
.dive-pod {
  position: absolute;
  left: 50%;
  bottom: 34px;
  width: 34px;
  height: 50px;
  margin-left: -17px;
  fill: var(--panel);
  stroke: var(--gold);
  stroke-width: 1.6;
  stroke-linejoin: round;
  animation: pv-drop var(--loop) infinite both;
}
@keyframes pv-drop {
  0% { transform: translateY(-150px); animation-timing-function: cubic-bezier(0.55, 0, 1, 0.45); }
  24% { transform: translateY(0); }
  27% { transform: translateY(3px); }
  31%, 100% { transform: none; }
}
.dive-trail {
  position: absolute;
  left: 50%;
  bottom: 70px;
  width: 4px;
  height: 90px;
  margin-left: -2px;
  background: linear-gradient(to bottom, transparent, rgba(255, 214, 66, 0.55));
  opacity: 0;
  animation: pv-trail var(--loop) infinite both;
}
@keyframes pv-trail {
  0% { opacity: 0; transform: translateY(-120px); }
  6% { opacity: 1; }
  24% { opacity: 0.8; transform: none; }
  34%, 100% { opacity: 0; transform: none; }
}
.dive-ring {
  position: absolute;
  left: 50%;
  bottom: 28px;
  width: 60px;
  height: 14px;
  margin-left: -30px;
  border: 2px solid var(--gold);
  border-radius: 50%;
  opacity: 0;
  animation: pv-ring var(--loop) var(--ease-out) infinite both;
}
@keyframes pv-ring {
  0%, 24% { opacity: 0; transform: scale(0.3); }
  26% { opacity: 0.9; }
  46%, 100% { opacity: 0; transform: scale(2.6); }
}
.dive-tag {
  position: absolute;
  left: 50%;
  bottom: 8px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--khaki);
  white-space: nowrap;
  transform: translateX(-50%);
  animation: pv-tag var(--loop) var(--ease-out) infinite both;
}
.dive-tag b { color: var(--teal); }
.dive-tag b::before { content: '→ '; color: var(--muted); }
@keyframes pv-tag {
  0%, 36% { opacity: 0; }
  46%, 94% { opacity: 1; }
  100% { opacity: 0; }
}

/* ---- Report -------------------------------------------------------------- */
.rep-card {
  display: flex;
  flex-direction: column;
  gap: 7px;
  width: min(230px, 80cqw);
  padding: 10px 12px;
  background: var(--panel);
  border: 1px solid var(--line-3);
}
.rep-stars { display: flex; gap: 4px; }
.rep-stars svg {
  width: 22px;
  height: 22px;
  fill: var(--gold);
  stroke: var(--gold);
  stroke-width: 1.4;
  stroke-linejoin: round;
  animation: pv-star var(--loop) var(--ease-impact) infinite both;
  animation-delay: calc(var(--i) * 260ms);
}
@keyframes pv-star {
  0%, 4% { fill: transparent; stroke: var(--line-5); transform: scale(1); }
  10% { transform: scale(1.3); }
  14%, 94% { fill: var(--gold); stroke: var(--gold); transform: none; }
  100% { fill: transparent; stroke: var(--line-5); }
}
.rep-row { display: grid; grid-template-columns: 74px minmax(0, 1fr); white-space: nowrap; align-items: center; gap: 8px; }
.rep-bar { height: 6px; background: var(--line-1); overflow: hidden; }
.rep-fill { display: block; height: 100%; background: var(--teal); transform-origin: left; animation: pv-fill var(--loop) var(--ease-out) infinite both; }
.rep-fill.samples { width: 70%; animation-delay: 0.9s; }
.rep-fill.clock { width: 55%; background: var(--khaki); animation-delay: 1.3s; }
@keyframes pv-fill {
  0%, 10% { transform: scaleX(0); }
  30%, 94% { transform: scaleX(1); }
  100% { transform: scaleX(0); }
}
.rep-file {
  align-self: flex-end;
  padding: 4px 10px;
  background: var(--gold);
  color: var(--on-gold);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  animation: pv-press var(--loop) infinite both;
}

/* ---- Loot ---------------------------------------------------------------- */
.sc-loot { gap: 8px; }
.loot {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: min(88px, 28cqw);
  padding: 8px 6px 7px;
  background: var(--panel);
  border: 1px solid var(--line-3);
  animation: pv-rise var(--loop) var(--ease-out) infinite both;
  animation-delay: calc(var(--i) * 140ms);
}
@keyframes pv-rise {
  0% { opacity: 0; transform: translateY(18px); }
  14%, 94% { opacity: 1; transform: none; }
  100% { opacity: 0; }
}
.loot.pick { border-color: var(--gold); box-shadow: 0 0 16px rgba(255, 214, 66, 0.2); animation-name: pv-rise, pv-pick; animation-delay: calc(var(--i) * 140ms), 0s; }
@keyframes pv-pick {
  0%, 52% { border-color: var(--line-3); box-shadow: none; }
  58%, 94% { border-color: var(--gold); box-shadow: 0 0 16px rgba(255, 214, 66, 0.2); }
}
.loot img { width: 46px; height: 46px; object-fit: contain; }
.loot-tier { align-self: flex-end; font-size: 15px; line-height: 1; }
.loot-tier[data-tier='c'] { color: var(--tier-c); }
.loot-tier[data-tier='b'] { color: var(--tier-b); }
.loot-tier[data-tier='a'] { color: var(--tier-a); }
.loot-name { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 10px; font-weight: 700; color: var(--khaki); }
.loot-stamp {
  position: absolute;
  top: 44%;
  left: 50%;
  padding: 2px 6px;
  border: 2px solid var(--gold);
  color: var(--gold);
  font-size: 11px;
  letter-spacing: 0.08em;
  background: rgba(19, 21, 15, 0.9);
  transform: translateX(-50%) rotate(-9deg);
  animation: pv-banked var(--loop) var(--ease-impact) infinite both;
}
@keyframes pv-banked {
  0%, 62% { opacity: 0; transform: translateX(-50%) rotate(-9deg) scale(1.8); }
  68%, 94% { opacity: 1; transform: translateX(-50%) rotate(-9deg) scale(1); }
  100% { opacity: 0; transform: translateX(-50%) rotate(-9deg) scale(1); }
}

/* Reduced motion: no loops; every element rests on its final frame. */
@media (prefers-reduced-motion: reduce) {
  .pv *,
  .pv-tally { animation: none !important; }
}
</style>
