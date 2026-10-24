<script setup lang="ts">
import { RadioGroupItem, RadioGroupRoot } from 'reka-ui'
import { ALL_ITEMS } from '~~/shared/data/catalog'
import { difficultyImageUrl, itemImageUrl } from '~~/shared/data/images'
import { MAX_DIFFICULTY, MIN_DIFFICULTY, VALOR_METER_MAX, baseTierFor, missionsPerOperation } from '~~/shared/engine/config'
import { difficultyName } from '~~/shared/engine/progression'
import { tierForRoll, tierZones } from '~~/shared/engine/rewards'
import type { RewardTier } from '~~/shared/engine/types'
import { REVEAL_BEATS, pinDelay, revealTimeline, type RevealCue } from '~/utils/rewardReveal'

// The climb and the bet in one console: pick a rung, pick your skulls, and the
// same four d100 faces land on the engine's own odds line. Higher rungs raise
// the floor; more skulls stretch the line toward S and Liberty's Cross.
const props = defineProps<{ lit: boolean }>()

const FACES = [18, 52, 79, 95] as const
const DIAL_FROM = { difficulty: 5, skulls: 2 }
const DIAL_TO = { difficulty: 7, skulls: 6 }
const DIAL_STEP_MS = 420

const difficulty = ref<number>(DIAL_FROM.difficulty)
const skulls = ref<number>(DIAL_FROM.skulls)

const rungs = computed(() =>
  Array.from({ length: MAX_DIFFICULTY - MIN_DIFFICULTY + 1 }, (_, i) => {
    const n = MIN_DIFFICULTY + i
    return { n, name: difficultyName(n), tier: baseTierFor(n), missions: missionsPerOperation(n) }
  }))

const zones = computed(() => tierZones(difficulty.value, skulls.value))
const draws = computed(() => FACES.map(face => ({ face, tier: tierForRoll(face, zones.value) })))

// The first deal plays the full left-to-right fanfare; after that a card only
// replays when its own tier moves, landing at once.
const dealt = ref(false)
const opening = computed(() => revealTimeline(draws.value.map(draw => draw.tier)))
function cueFor(index: number, tier: RewardTier): RevealCue {
  return dealt.value ? { tier, start: 0, impact: REVEAL_BEATS[tier].lead } : opening.value[index]!
}
const markers = computed(() => draws.value.map((draw, i) => ({
  roll: draw.face,
  tier: draw.tier,
  key: `${i}-${draw.tier}`,
  delay: pinDelay(cueFor(i, draw.tier)),
})))

const SHOWCASE = ALL_ITEMS.filter(item => item.imageURL && item.category !== 'armorPassive' && item.category !== 'booster')
function itemFor(index: number, tier: RewardTier) {
  const pool = SHOWCASE.filter(item => item.tier === tier.toLowerCase())
  return pool.length ? pool[(index * 3) % pool.length]! : null
}
const cards = computed(() => draws.value.map((draw, i) => {
  const item = draw.tier === 'S+' ? null : itemFor(i, draw.tier)
  return {
    key: `${i}-${draw.tier}`,
    face: draw.face,
    tier: draw.tier,
    cue: cueFor(i, draw.tier),
    name: draw.tier === 'S+' ? 'Liberty\'s Cross' : item?.displayName ?? draw.tier,
    sub: draw.tier === 'S+' ? 'Claim any item' : item ? categoryLabel(item.category) : '',
    image: item ? itemImageUrl(item) : undefined,
  }
}))

// The dial walks itself up once on arrival, so the page shows the trade
// happening before anyone touches it. Any touch hands it over.
const timers: ReturnType<typeof setTimeout>[] = []
function hold(): void {
  timers.forEach(clearTimeout)
  timers.length = 0
}
onBeforeUnmount(hold)
watch(() => props.lit, (lit) => {
  if (!lit) {
    return
  }
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const settle = reduced ? 0 : revealTimeline(draws.value.map(draw => draw.tier)).at(-1)!.impact + 500
  timers.push(setTimeout(() => {
    dealt.value = true
  }, settle))
  if (reduced) {
    difficulty.value = DIAL_TO.difficulty
    skulls.value = DIAL_TO.skulls
    return
  }
  const steps = DIAL_TO.skulls - DIAL_FROM.skulls
  for (let step = 1; step <= steps; step++) {
    timers.push(setTimeout(() => {
      skulls.value = DIAL_FROM.skulls + step
      difficulty.value = DIAL_FROM.difficulty + Math.round((step / steps) * (DIAL_TO.difficulty - DIAL_FROM.difficulty))
    }, settle + step * DIAL_STEP_MS))
  }
})

function pickDifficulty(value: unknown): void {
  hold()
  dealt.value = true
  difficulty.value = Number(value)
}
function pickSkulls(event: Event): void {
  hold()
  dealt.value = true
  skulls.value = Number((event.target as HTMLInputElement).value)
}
</script>

<template>
  <div class="odds">
    <RadioGroupRoot
      :model-value="difficulty"
      class="ladder"
      aria-label="Difficulty"
      orientation="horizontal"
      @update:model-value="pickDifficulty"
    >
      <RadioGroupItem
        v-for="(r, i) in rungs"
        :key="r.n"
        :value="r.n"
        class="rung"
        :class="{ on: r.n === difficulty, passed: r.n < difficulty }"
        :style="{ '--i': i }"
        :aria-label="`Difficulty ${r.n}, ${r.name}, base tier ${r.tier}`"
      >
        <img
          class="rung-emblem"
          :src="difficultyImageUrl(r.n)"
          alt=""
          width="40"
          height="40"
          draggable="false"
        >
        <span class="disp rung-n">{{ r.n }}</span>
        <span class="rung-name">{{ r.name }}</span>
        <span
          class="tb rung-t"
          :data-tier="r.tier"
          aria-hidden="true"
        >{{ r.tier }}</span>
      </RadioGroupItem>
    </RadioGroupRoot>

    <div class="dial">
      <label
        for="odds-skulls"
        class="dial-label"
      >
        <span class="lbl">Skulls taken</span>
        <span class="disp dial-n">{{ skulls }}</span>
      </label>
      <div class="dial-track">
        <RiskPips
          class="dial-pips"
          :value="skulls"
          :max="VALOR_METER_MAX"
          :tone="skulls >= 8 ? 'red' : 'gold'"
        />
        <input
          id="odds-skulls"
          class="dial-range"
          type="range"
          min="0"
          :max="VALOR_METER_MAX"
          step="1"
          :value="skulls"
          :aria-valuetext="`${skulls} skulls`"
          @input="pickSkulls"
        >
      </div>
    </div>

    <ValorRoll
      :zones="zones"
      :markers="markers"
      label="Odds line"
      :note="`Difficulty ${difficulty} · ${skulls} skulls`"
    />

    <ul
      class="draws"
      aria-label="Four example rolls"
    >
      <li
        v-for="card in cards"
        :key="card.key"
        class="draw-slot"
      >
        <RewardReveal
          v-if="lit"
          :cue="card.cue"
          :instant="false"
        >
          <div
            class="draw cut-sm"
            :data-tier="card.tier"
          >
            <span class="draw-well">
              <LibertyCrossEmblem
                v-if="card.tier === 'S+'"
                class="draw-cross"
                instant
              />
              <img
                v-else-if="card.image"
                :src="card.image"
                alt=""
                loading="lazy"
                draggable="false"
              >
              <TierBadge
                class="draw-tier"
                :tier="card.tier"
              />
            </span>
            <span
              class="draw-name"
              :style="fitWord(card.name)"
            >{{ card.name }}</span>
            <span class="draw-sub">
              <span>{{ card.sub }}</span>
              <span class="draw-face">d100 · {{ card.face }}</span>
            </span>
          </div>
        </RewardReveal>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.odds { display: grid; gap: 20px; container-type: inline-size; }

.ladder {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  align-items: end;
  gap: 4px;
}
.rung {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 0;
  height: calc(118px + var(--i) * 10px);
  padding: 10px 2px 8px;
  border: 1px solid var(--line-2);
  border-top: 2px solid var(--line-4);
  background: var(--rail);
  color: var(--khaki);
  font: inherit;
  cursor: pointer;
  transition: background-color var(--dur-fast), border-color var(--dur-fast), transform var(--dur-med) var(--ease-out);
}
.rung:hover { border-color: var(--line-5); transform: translateY(-2px); }
.rung.passed { border-top-color: var(--khaki); }
.rung.on {
  border-color: var(--gold);
  background:
    radial-gradient(100% 70% at 50% 0%, rgba(255, 214, 66, 0.18), transparent 70%),
    var(--panel);
  box-shadow: 0 0 24px rgba(255, 214, 66, 0.18);
}
.rung-emblem { width: 40px; height: 40px; object-fit: contain; filter: grayscale(0.6) brightness(0.8); transition: filter var(--dur-med); }
.rung.on .rung-emblem,
.rung.passed .rung-emblem { filter: none; }
.rung-n { font-size: 20px; line-height: 1; color: var(--text); }
.rung.on .rung-n { color: var(--gold); }
.rung-name {
  max-width: 100%;
  overflow: hidden;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  line-height: 1.2;
  text-align: center;
  text-transform: uppercase;
  text-overflow: ellipsis;
}
.rung-t { margin-top: auto; font-size: 10px; min-width: 22px; }

.dial {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 14px 16px;
  border: 1px solid var(--line-2);
  background: var(--rail);
}
.dial-label { display: grid; gap: 2px; flex-shrink: 0; min-width: 6.5rem; }
.dial-n { font-size: 32px; line-height: 1; color: var(--gold); }
.dial-track { position: relative; display: grid; flex-grow: 1; min-width: 0; height: 32px; align-items: center; }
.dial-pips { justify-content: space-between; width: 100%; }
.dial-pips :deep(i) { width: clamp(14px, 3cqi, 22px); height: clamp(14px, 3cqi, 22px); }
.dial-range {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}
.dial:has(.dial-range:focus-visible) { outline: 2px solid var(--gold); outline-offset: 2px; }

.draws {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--gap-grid);
}
.draw-slot { display: grid; min-height: 100%; }
.draw-slot :deep(.reveal) { --reveal-cut: 6px; }
.draw {
  --tier: var(--tier-c);
  display: grid;
  grid-template-rows: auto auto 1fr;
  gap: 8px;
  height: 100%;
  padding: 8px 8px 10px;
  border: 1px solid color-mix(in srgb, var(--tier) 45%, var(--line-2));
  border-top: 3px solid var(--tier);
  background:
    radial-gradient(90% 60% at 50% 0%, color-mix(in srgb, var(--tier) 14%, transparent), transparent 70%),
    var(--panel);
  container-type: inline-size;
}
.draw[data-tier='B'] { --tier: var(--tier-b); }
.draw[data-tier='A'] { --tier: var(--tier-a); }
.draw[data-tier='S'] { --tier: var(--tier-s); }
.draw[data-tier='S+'] { --tier: var(--tier-splus); }
.draw-well {
  position: relative;
  display: grid;
  place-items: center;
  aspect-ratio: 4 / 3;
  background: var(--ground);
}
.draw-well img,
.draw-cross {
  position: absolute;
  inset: 10% 8%;
  width: 84%;
  height: 80%;
  object-fit: contain;
}
.draw-well img { filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.6)); }
.draw-tier { position: absolute; left: 6px; top: 6px; }
.draw-name {
  font-family: var(--font-display);
  font-stretch: 125%;
  font-weight: 800;
  font-size: min(15px, 100cqi / var(--fit-len, 10));
  line-height: 1.1;
  text-transform: uppercase;
  overflow-wrap: normal;
  color: var(--text);
}
.draw-sub {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
}
.draw-face { color: var(--tier); white-space: nowrap; }

@container (max-width: 560px) {
  .ladder { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .rung { height: auto; min-height: 120px; }
  .draws { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .dial { flex-wrap: wrap; }
}
</style>
