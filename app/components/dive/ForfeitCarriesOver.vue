<script setup lang="ts">
import { factionImageUrl, strainImageUrl } from '~~/shared/data/images'
import { REWARD_TOKEN_CAP, STRAIN_RISK } from '~~/shared/engine/config'
import { currentFront, currentStrain } from '~~/shared/engine/selectors'
import type { DiveState } from '~~/shared/engine/types'

const props = defineProps<{ state: DiveState }>()

const front = computed(() => currentFront(props.state))
const strain = computed(() => currentStrain(props.state))
const frontImage = computed(() => (front.value ? factionImageUrl(front.value.id) : undefined))
const strainImage = computed(() => (strain.value ? strainImageUrl(strain.value.id) : undefined))
const strainRisk = computed(() => (strain.value ? STRAIN_RISK[strain.value.id] ?? 0 : 0))

const tokenChits = REWARD_TOKEN_CAP

const divers = computed(() => props.state.divers.map(diver => ({
  id: diver.id,
  name: diver.name,
  initial: diver.name.trim().slice(0, 1).toUpperCase(),
  isHost: diver.isHost,
  tokens: diver.rewardTokens,
  items: (props.state.personalInventories[diver.id] ?? []).length,
})))
</script>

<template>
  <section
    class="carry"
    aria-label="Carries over"
  >
    <div class="carry-head">
      <h2 class="lbl">
        Carries over
      </h2>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      ><path d="M4 12h12M11 7l5 5-5 5M20 4v16" /></svg>
    </div>

    <div class="carry-divers">
      <div
        v-for="diver in divers"
        :key="diver.id"
        class="carry-diver"
      >
        <div class="carry-diver-head">
          <span
            class="carry-av cut-sm disp"
            :class="{ host: diver.isHost }"
            aria-hidden="true"
          >{{ diver.initial }}</span>
          <span class="carry-name">{{ diver.name }}</span>
          <span
            class="chits"
            role="img"
            :aria-label="`${diver.tokens} reward tokens`"
          >
            <span
              v-for="chit in tokenChits"
              :key="chit"
              class="chit"
              :class="{ on: chit <= diver.tokens }"
            />
          </span>
        </div>
        <div class="carry-diver-row">
          <span
            class="carry-pips"
            aria-hidden="true"
          >
            <span
              v-for="i in 6"
              :key="i"
              :class="{ on: i <= diver.items }"
            />
          </span>
          <span
            class="carry-inv"
            :aria-label="`${diver.items} items kept`"
          >{{ diver.items }}</span>
        </div>
      </div>
    </div>

    <div class="carry-cell">
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
        aria-hidden="true"
      >
        <rect
          x="3.5"
          y="3.5"
          width="17"
          height="17"
          rx="2"
        />
        <circle
          cx="8.5"
          cy="8.5"
          r="1.3"
          fill="currentColor"
        />
        <circle
          cx="15.5"
          cy="15.5"
          r="1.3"
          fill="currentColor"
        />
        <circle
          cx="12"
          cy="12"
          r="1.3"
          fill="currentColor"
        />
      </svg>
      <div class="carry-cell-copy">
        <span class="carry-cell-t">WHEEL REROLL</span>
        <span class="carry-cell-s">TOKENS · KEPT</span>
      </div>
      <span class="carry-cell-n">
        <span class="chit on" />
        <span class="disp">{{ state.rerollTokens }}</span>
      </span>
    </div>

    <div
      v-if="front"
      class="carry-front"
    >
      <div class="carry-front-row">
        <img
          v-if="frontImage"
          :src="frontImage"
          :alt="front.displayName"
          width="48"
          height="48"
          class="carry-front-icon"
        >
        <div class="carry-front-copy">
          <span class="lbl">Front · kept</span>
          <span
            class="disp carry-front-name"
            :style="{ color: front.accent }"
          >{{ front.displayName }}</span>
        </div>
      </div>

      <div class="carry-rule" />

      <div
        v-if="strain"
        class="carry-front-row"
      >
        <span class="carry-strain-icon">
          <img
            v-if="strainImage"
            :src="strainImage"
            alt=""
            width="30"
            height="30"
          >
        </span>
        <div class="carry-front-copy">
          <span class="carry-strain-name">{{ strain.name.toUpperCase() }}</span>
          <span class="carry-strain-risk">CALL REOPENS · +{{ strainRisk }}</span>
        </div>
      </div>
      <div
        v-else
        class="carry-front-copy"
      >
        <span class="carry-strain-name">NO STRAIN</span>
        <span class="carry-strain-none">MAJOR ORDER FRONT</span>
      </div>
    </div>

    <div class="carry-resets">
      <span class="lbl">Resets</span>
      <div class="carry-reset">
        <span class="carry-swatch gold" />MISFORTUNE<span class="carry-reset-v">RESPIN</span>
      </div>
      <div class="carry-reset">
        <span class="carry-swatch red" />PACTS<span class="carry-reset-v">REDEALT</span>
      </div>
      <div class="carry-reset">
        <span class="carry-swatch hollow" />VALOR<span class="carry-reset-v">0</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.carry {
  display: flex;
  flex-direction: column;
  gap: var(--gap-panel);
}

.carry-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--text);
}
.carry-head h2 { color: var(--text); }

.carry-divers {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}
.carry-diver {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding: var(--sp-3);
  background: var(--panel);
  border: 1px solid var(--line-2);
}
.carry-diver-head {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  min-width: 0;
}
.carry-av {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  background: var(--line-2);
  color: var(--text);
  font-size: 12px;
}
.carry-av.host { background: var(--gold); color: var(--on-gold); }
.carry-name {
  font-size: var(--fs-sm);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.carry-diver-head .chits { margin-left: auto; }
.carry-diver-row {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}
.carry-pips {
  display: flex;
  gap: 2px;
  flex-grow: 1;
}
.carry-pips span {
  width: 12px;
  height: 10px;
  border: 1px solid var(--line-3);
}
.carry-pips span.on {
  background: color-mix(in srgb, var(--gold) 22%, transparent);
  border-color: var(--gold);
}
.carry-inv {
  font-size: var(--fs-sm);
  font-weight: 700;
  color: var(--text);
}

.carry-cell {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  padding: var(--sp-4);
  border: 1px solid var(--line-2);
  color: var(--muted);
}
.carry-cell-copy { display: flex; flex-direction: column; gap: 2px; }
.carry-cell-t { font-size: var(--fs-sm); font-weight: 700; letter-spacing: 0.14em; color: var(--text); }
.carry-cell-s { font-size: var(--fs-cap); font-weight: 700; letter-spacing: 0.14em; color: var(--muted); }
.carry-cell-n {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}
.carry-cell-n .disp { font-size: 1.4rem; color: var(--text); }

.carry-front {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  padding: var(--sp-4);
  background: var(--panel);
  border: 1px solid color-mix(in srgb, var(--red) 45%, transparent);
}
.carry-front-row {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  min-width: 0;
}
.carry-front-icon { width: 48px; height: 48px; object-fit: contain; flex-shrink: 0; }
.carry-strain-icon {
  width: 48px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
}
.carry-strain-icon img { opacity: 0.85; object-fit: contain; }
.carry-front-copy { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.carry-front-name { font-size: 1.05rem; }
.carry-rule {
  height: 1px;
  background: repeating-linear-gradient(90deg, var(--line-4) 0 6px, transparent 6px 10px);
}
.carry-strain-name { font-size: var(--fs-sm); font-weight: 700; letter-spacing: 0.08em; }
.carry-strain-risk { font-size: var(--fs-cap); font-weight: 700; letter-spacing: 0.14em; color: var(--orange); }
.carry-strain-none { font-size: var(--fs-cap); font-weight: 700; letter-spacing: 0.14em; color: var(--muted); }

.carry-resets {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  padding-top: var(--sp-4);
  border-top: 1px solid var(--line-1);
}
.carry-reset {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  font-size: var(--fs-cap);
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--muted);
}
.carry-reset-v { margin-left: auto; }
.carry-swatch { width: 10px; height: 10px; }
.carry-swatch.gold { background: var(--gold); opacity: 0.5; }
.carry-swatch.red { background: var(--red); opacity: 0.5; }
.carry-swatch.hollow { border: 1px solid var(--muted); }
</style>
