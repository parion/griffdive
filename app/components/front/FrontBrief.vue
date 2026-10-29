<script setup lang="ts">
import { STRAIN_RISK } from '~~/shared/engine/config'
import { factionImageUrl, strainImageUrl } from '~~/shared/data/images'
import { frontById } from '~~/shared/engine/wheel'
import {
  currentFront,
  currentStrain,
  majorOrderPlanetsForFront,
  strainDecision,
} from '~~/shared/engine/selectors'
import type { FrontId } from '~~/shared/data/fronts'
import type { DiveState } from '~~/shared/engine/types'

const props = withDefaults(defineProps<{
  state: DiveState
  canControl: boolean
  drawing?: boolean
  compact?: boolean
}>(), {
  drawing: false,
  compact: false,
})

const emit = defineEmits<{ decideStrain: [accepted: boolean] }>()

const front = computed(() => currentFront(props.state))
const strain = computed(() => currentStrain(props.state))
const strainImage = computed(() => (strain.value ? strainImageUrl(strain.value.id) : undefined))
const strainCall = computed(() => strainDecision(props.state))
const strainRisk = computed(() => (strain.value ? STRAIN_RISK[strain.value.id] ?? 0 : 0))

// A pinned Major Order shows its fronts before the first spin, when the wheel
// has not derived a front yet.
const pinnedFronts = computed(() =>
  (props.state.majorOrder?.fronts ?? [])
    .map(id => frontById(id))
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null))
const frontPlanetsLabel = computed(() =>
  majorOrderPlanetsForFront(props.state).map(planet => planet.name).join(' / '))
const pinnedPlanetsLabel = computed(() => {
  const ids = new Set(pinnedFronts.value.map(entry => entry.id))
  return (props.state.majorOrder?.planets ?? [])
    .filter(planet => ids.has(planet.front) && planet.available !== false)
    .map(planet => planet.name)
    .join(' / ')
})

interface FrontCard {
  cap: string
  name: string
  planets: string
  accent: string
  ids: FrontId[]
}

// The front and its planet are the squad's most consequential choice after
// the directive itself, so they get their own card. The strain lives in the
// same card as its own section. While the wheel turns, hold the plan that was
// pinned before this draw.
const frontCard = computed<FrontCard | null>(() => {
  if (front.value && !props.drawing) {
    return {
      cap: 'Front',
      name: front.value.displayName,
      planets: frontPlanetsLabel.value,
      accent: front.value.accent,
      ids: [front.value.id],
    }
  }
  if (props.state.majorOrder && pinnedFronts.value.length) {
    const fronts = pinnedFronts.value
    return {
      cap: props.state.majorOrder.live ? 'Major Order' : 'Front',
      name: fronts.map(entry => entry.displayName).join(' · '),
      planets: pinnedPlanetsLabel.value,
      accent: fronts.length === 1 ? fronts[0]?.accent ?? 'var(--gold)' : 'var(--gold)',
      ids: fronts.map(entry => entry.id),
    }
  }
  return null
})
</script>

<template>
  <article
    v-if="frontCard"
    class="front-card rise"
    :class="{ compact }"
    :style="{ '--front-accent': frontCard.accent }"
  >
    <div class="front-summary front-pin">
      <span
        class="front-emblem"
        aria-hidden="true"
      >
        <img
          v-for="id in frontCard.ids"
          :key="id"
          :src="factionImageUrl(id)"
          alt=""
          draggable="false"
        >
      </span>
      <span class="front-copy">
        <span class="cap">{{ frontCard.cap }}</span>
        <b
          class="disp front-name"
          :style="fitWord(frontCard.name)"
        >{{ frontCard.name }}</b>
        <span
          v-if="frontCard.planets"
          class="front-planet"
        >{{ frontCard.planets }}</span>
      </span>
    </div>

    <div
      v-if="strain && !drawing"
      class="strain-card strain strain-section"
      :class="{ accepted: state.strainAccepted, decided: strainCall.decided }"
    >
      <span class="strain-icon">
        <img
          v-if="strainImage"
          :src="strainImage"
          alt=""
          draggable="false"
        >
        <svg
          v-else
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linejoin="round"
          aria-hidden="true"
        ><path d="m12 2.8 2.7 6.1 6.5.6-4.9 4.3 1.5 6.4L12 16.9l-5.8 3.3 1.5-6.4-4.9-4.3 6.5-.6z" /></svg>
      </span>
      <span class="strain-copy">
        <span class="cap strain-cap">
          Strain · whole operation
          <RiskPips
            :value="strainRisk"
            :max="strainRisk"
            tone="orange"
          />
        </span>
        <b
          class="disp strain-name"
          :style="fitWord(strain.name)"
        >{{ strain.name }}</b>
        <span class="strain-blurb">{{ strain.blurb }}</span>
      </span>
      <span
        v-if="!strainCall.decided && canControl"
        class="strain-actions"
      >
        <button
          class="take mini"
          type="button"
          @click="emit('decideStrain', true)"
        >
          Take
        </button>
        <button
          class="skip mini"
          type="button"
          @click="emit('decideStrain', false)"
        >
          Skip
        </button>
      </span>
      <div
        v-else-if="strainCall.decided"
        class="strain-verdict pick-toggle stamp-in"
        :class="state.strainAccepted ? 'taken' : 'skipped'"
        role="group"
        aria-label="Strain call"
      >
        <template v-if="canControl && state.missionInOperation === 1">
          <button
            class="pick-choice"
            type="button"
            :class="{ on: state.strainAccepted }"
            :aria-pressed="state.strainAccepted"
            @click="emit('decideStrain', true)"
          >
            Taken
          </button>
          <button
            class="pick-choice"
            type="button"
            :class="{ on: !state.strainAccepted }"
            :aria-pressed="!state.strainAccepted"
            @click="emit('decideStrain', false)"
          >
            Skipped
          </button>
        </template>
        <span
          v-else
          class="pick-static"
        >{{ state.strainAccepted ? 'Taken' : 'Skipped' }}</span>
      </div>
      <span
        v-else
        class="dc-waiting"
      >Waiting…</span>
    </div>
  </article>
</template>

<style scoped>
.front-card {
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(ellipse 85% 100% at 0% 0%, color-mix(in srgb, var(--front-accent) 13%, transparent), transparent 70%),
    var(--panel);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--front-accent) 45%, var(--line-3));
  clip-path: polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%);
}
.front-summary {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
}
.front-emblem {
  display: flex;
  align-items: center;
  justify-content: center;
  width: auto;
  min-width: 48px;
  height: 48px;
  color: var(--front-accent);
}
.front-emblem img {
  width: 48px;
  height: 48px;
  object-fit: contain;
  filter: drop-shadow(0 0 10px color-mix(in srgb, var(--front-accent) 35%, transparent));
}
.front-emblem img + img { margin-left: -16px; }
.front-copy {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.front-copy .cap { color: color-mix(in srgb, var(--front-accent) 55%, var(--muted)); }
.front-name {
  font-size: min(clamp(20px, 2.1vw, 27px), 100cqi / var(--fit-len, 1));
  line-height: 1;
  color: var(--front-accent);
}
.front-planet {
  color: var(--gold);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.25;
}

/* The strain is its own section inside the front card: a divider, a warmed
   wash, and the same take/skip grammar as the directive. */
.strain-section {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 10px 14px 12px;
  border-top: 1px solid color-mix(in srgb, var(--orange) 26%, var(--line-2));
  background: linear-gradient(90deg, rgba(255, 159, 67, 0.07), transparent 65%);
}
.strain-section.accepted {
  background: linear-gradient(90deg, rgba(255, 159, 67, 0.13), transparent 70%);
  border-top-color: color-mix(in srgb, var(--orange) 55%, var(--line-2));
}
.strain-icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  color: var(--red);
}
.strain-icon img { width: 100%; height: 100%; object-fit: contain; }
.strain-copy {
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.strain-cap { display: inline-flex; align-items: center; gap: 8px; color: var(--muted); }
.strain-cap :deep(.pips i) { width: 12px; height: 12px; }
.strain-name { font-size: min(18px, 100cqi / var(--fit-len, 1)); line-height: 1.05; color: var(--text); }
.strain-blurb {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.35;
}
.strain-actions { display: flex; gap: 4px; }
.take,
.skip {
  min-height: 40px;
  border: 0;
  font: 800 11px var(--font-body);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
}
.take { background: var(--gold); color: var(--on-gold); }
.take:hover:not(:disabled) { filter: brightness(1.08); }
.take:disabled { opacity: 0.4; cursor: not-allowed; }
.skip { background: var(--rail); color: var(--khaki); box-shadow: inset 0 0 0 1px var(--line-4); }
.skip:hover { color: var(--text); box-shadow: inset 0 0 0 1px var(--line-5); }
.strain-actions .take,
.strain-actions .skip { min-width: 58px; padding: 0 12px; }

.dc-waiting { color: var(--dim); font-size: 12px; }
.stamp-in { animation: stampFlat 0.32s var(--ease-out) both; }

/* The post-pick call is a real two-way toggle, not a footnote. */
.pick-toggle {
  display: flex;
  gap: 3px;
  padding: 3px;
  background: var(--rail);
  box-shadow: inset 0 0 0 1px var(--line-3);
}
.pick-choice,
.pick-static {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 0 12px;
  border: 0;
  font: 800 12px var(--font-body);
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.pick-choice {
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  transition: background-color var(--dur-fast), color var(--dur-fast), box-shadow var(--dur-fast);
}
.pick-choice:hover:not(:disabled) {
  background: color-mix(in srgb, var(--gold) 10%, transparent);
  color: var(--text);
}
.pick-toggle.taken .pick-choice.on {
  background: var(--gold);
  color: var(--on-gold);
  box-shadow: inset 0 -2px 0 rgba(110, 80, 0, 0.28);
}
.pick-toggle.skipped .pick-choice.on {
  background: var(--raised);
  color: var(--text);
  box-shadow: inset 0 0 0 1px var(--line-4);
}
.pick-toggle.taken .pick-static { background: var(--gold); color: var(--on-gold); }
.pick-toggle.skipped .pick-static { background: var(--raised); color: var(--muted); }
.strain-verdict { min-width: 148px; }

.front-card.compact .front-summary { gap: 10px; padding: 10px 12px; }
.front-card.compact .front-emblem { min-width: 38px; width: auto; height: 38px; }
.front-card.compact .front-emblem img { width: 38px; height: 38px; }
.front-card.compact .front-emblem img + img { margin-left: -12px; }
.front-card.compact .front-name { font-size: min(22px, 100cqi / var(--fit-len, 1)); }
.front-card.compact .front-planet { font-size: 12px; }
.front-card.compact .strain-section {
  grid-template-columns: auto minmax(0, 1fr);
  gap: 9px 10px;
  padding: 9px 11px 10px;
}
.front-card.compact .strain-icon { width: 34px; height: 34px; }
.front-card.compact .strain-actions,
.front-card.compact .strain-verdict,
.front-card.compact .dc-waiting { grid-column: 1 / -1; }
.front-card.compact .strain-actions .take,
.front-card.compact .strain-actions .skip { flex: 1; }
.front-card.compact .strain-verdict { min-width: 0; }
.front-card.compact .pick-choice,
.front-card.compact .pick-static { min-height: 40px; }

@keyframes stampFlat {
  0% { transform: scale(1.7); opacity: 0; }
  60% { transform: scale(0.95); opacity: 1; }
  100% { transform: none; opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .stamp-in { animation: none; }
}
</style>
