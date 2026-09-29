<script setup lang="ts">
import { difficultyImageUrl, factionImageUrl, strainImageUrl } from '~~/shared/data/images'
import { STRAIN_RISK, maxStarsFor, missionsPerOperation } from '~~/shared/engine/config'
import { difficultyName } from '~~/shared/engine/progression'
import { currentFront, currentStrain } from '~~/shared/engine/selectors'
import type { DiveState, ItemRef } from '~~/shared/engine/types'

const props = defineProps<{ state: DiveState, canControl: boolean }>()

const emit = defineEmits<{ forfeit: [itemRef: ItemRef] }>()

const opLength = computed(() => missionsPerOperation(props.state.difficulty))
const maxStars = computed(() => maxStarsFor(props.state.difficulty))
const difficultyImg = computed(() => difficultyImageUrl(props.state.difficulty))

const front = computed(() => currentFront(props.state))
const strain = computed(() => currentStrain(props.state))
const frontImage = computed(() => (front.value ? factionImageUrl(front.value.id) : undefined))
const strainImage = computed(() => (strain.value ? strainImageUrl(strain.value.id) : undefined))
const strainRisk = computed(() => (strain.value ? STRAIN_RISK[strain.value.id] ?? 0 : 0))

const kicker = computed(() =>
  `Report · ${difficultyName(props.state.difficulty)} · Mission ${props.state.missionInOperation} of ${opLength.value}`)

const selected = ref<ItemRef | null>(null)
const confirmed = ref(false)

const pickLabel = computed(() => {
  const current = selected.value
  if (!current) {
    return 'PICK 1 ITEM'
  }
  const owner = props.state.divers.find(diver => diver.id === current.ownerId)
  return `1 OF 1 · ${(owner?.name ?? 'DIVER').toUpperCase()}`
})

const canSurrender = computed(() => props.canControl && selected.value !== null)

// ---- Hold to confirm ----------------------------------------------------

const HOLD_MS = 700
const holding = ref(false)
let holdTimer: ReturnType<typeof setTimeout> | undefined

function down(): void {
  if (!canSurrender.value || confirmed.value) {
    return
  }
  holding.value = true
  clearTimeout(holdTimer)
  holdTimer = setTimeout(() => {
    holding.value = false
    confirmed.value = true
  }, HOLD_MS)
}
function up(): void {
  holding.value = false
  clearTimeout(holdTimer)
}
function surrender(): void {
  if (canSurrender.value && selected.value) {
    emit('forfeit', selected.value)
  }
}
onBeforeUnmount(() => clearTimeout(holdTimer))
</script>

<template>
  <section
    class="forfeit"
    aria-labelledby="ff-h"
  >
    <div
      class="ff-frame"
      aria-hidden="true"
    >
      <span class="ff-band top hazard-red crawl-slow" />
      <span class="ff-band bottom hazard-red crawl-slow" />
      <span class="ff-ticks ticks ticks-red" />
      <span class="ff-sweep" />
    </div>

    <header class="ff-head">
      <div class="ff-copy">
        <span class="lbl ff-kicker">
          <span
            class="pulse ff-dot"
            aria-hidden="true"
          />
          {{ kicker }}
        </span>
        <h1
          id="ff-h"
          class="disp ff-title slam"
        >
          <span class="flicker">Mission failed</span>
        </h1>
      </div>

      <p class="ff-notice rise">
        <span class="lbl ff-notice-lbl">Ministry notice</span>
        Failure is a debt against liberty, and the Ministry does not forgive — it compounds.
      </p>

      <div class="ff-stars">
        <div
          class="ff-star-row"
          role="img"
          :aria-label="`0 of ${maxStars} stars`"
        >
          <svg
            v-for="i in maxStars"
            :key="i"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            aria-hidden="true"
          >
            <path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6l-5.4 2.9 1.2-6-4.5-4.2 6.1-.7z" />
          </svg>
        </div>
        <div class="ff-stars-meta">
          <span class="disp">0 / {{ maxStars }}</span>
          <span class="ff-no-draft">NO REWARD DRAFT</span>
        </div>
      </div>
    </header>

    <div class="ff-cards">
      <div class="ff-card rise">
        <span class="ff-card-icon">
          <svg
            width="26"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          ><path d="M4 12a8 8 0 1 0 2.3-5.7" /><path d="M4 4v4h4" /></svg>
        </span>
        <div class="ff-card-copy">
          <span class="disp ff-card-t">Restart</span>
          <span class="ff-card-s">MISSION 1/{{ opLength }}</span>
        </div>
        <div
          class="ff-card-deco"
          aria-hidden="true"
        >
          <svg
            width="76"
            height="16"
            viewBox="0 0 76 16"
          ><path
            d="M66 14 V6 H11 V12"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
          /><path
            d="M7 9 L11 14 L15 9"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
          /></svg>
          <div class="ff-restart-pips">
            <span
              v-for="i in opLength"
              :key="i"
              :class="{ on: i === 1 }"
            />
          </div>
        </div>
      </div>

      <div class="ff-card rise">
        <span class="ff-card-diff disp">{{ state.difficulty }}</span>
        <div class="ff-card-copy">
          <span class="disp ff-card-t">{{ difficultyName(state.difficulty) }}</span>
          <span class="ff-card-s">HELD</span>
        </div>
        <div
          class="ff-ladder"
          aria-hidden="true"
        >
          <span class="ff-ladder-bar dim" />
          <span class="ff-ladder-bar gold" />
          <span class="ff-ladder-bar dashed">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
            ><path d="M6 6l12 12M18 6L6 18" /></svg>
          </span>
        </div>
        <img
          :src="difficultyImg"
          alt=""
          class="ff-diff-emblem"
        >
      </div>

      <div class="ff-card rise">
        <span class="ff-card-icon">
          <img
            v-if="frontImage"
            :src="frontImage"
            alt=""
            width="34"
            height="34"
          >
        </span>
        <div class="ff-card-copy">
          <span class="disp ff-card-t">{{ front?.displayName ?? 'Front' }} held</span>
          <span
            v-if="strain"
            class="ff-card-s orange"
          >STRAIN CALL REOPENS</span>
          <span
            v-else
            class="ff-card-s"
          >FRONT HELD</span>
        </div>
        <span
          v-if="strain"
          class="ff-strain"
          :aria-label="`${strain.name} reopens, plus ${strainRisk} operation-long risk`"
        >
          <img
            v-if="strainImage"
            :src="strainImage"
            alt=""
            width="24"
            height="24"
          >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="var(--ground)"
            stroke="currentColor"
            stroke-width="2.2"
            aria-hidden="true"
          ><path d="M5 11h14v10H5zM8 11V7a4 4 0 0 1 7.5-2" /></svg>
        </span>
      </div>
    </div>

    <div class="ff-surrender-head">
      <span
        class="hazard-red ff-hz"
        aria-hidden="true"
      />
      <h2
        id="surrender-h"
        class="disp ff-surrender-t"
      >
        The squad surrenders one item
      </h2>
      <span class="ff-host-chip">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        ><path d="M3 18h18v2H3zM4 16l2-9 4 4 2-6 2 6 4-4 2 9z" /></svg>
        HOST CALLS IT
      </span>
      <span class="ff-pick-count">{{ pickLabel }}</span>
    </div>

    <ForfeitPicker
      v-model="selected"
      :state="state"
      :can-control="canControl && !confirmed"
      :confirmed="confirmed"
    />

    <section
      class="ff-bar ticks ticks-red"
      aria-label="Surrender"
      aria-live="polite"
    >
      <span
        class="hazard-red ff-bar-hz"
        aria-hidden="true"
      />
      <div class="ff-bar-copy">
        <span class="lbl ff-bar-lbl">
          {{ confirmed ? 'Forfeited' : canControl ? 'Awaiting your call' : 'Host is choosing' }}
        </span>
        <span class="disp ff-bar-t">
          {{ confirmed ? 'One item surrendered' : selected ? 'Ready to surrender' : 'Select one item' }}
        </span>
      </div>
      <div class="ff-bar-grow" />

      <button
        v-if="!confirmed"
        class="hold cut"
        type="button"
        :disabled="!canSurrender"
        aria-label="Surrender the selected item. Press and hold."
        @pointerdown="down"
        @pointerup="up"
        @pointerleave="up"
      >
        <span
          class="hazard-red crawl hold-fill"
          :class="{ on: holding }"
          aria-hidden="true"
        />
        <span class="hold-label">
          <span class="disp">Surrender</span>
          <span class="hold-sub">HOLD TO CONFIRM · HOST</span>
        </span>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          aria-hidden="true"
        ><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>
      </button>

      <div
        v-else
        class="ff-done"
      >
        <span class="disp ff-confiscated stamp">Confiscated</span>
        <button
          class="btn cut ff-respin rise"
          type="button"
          @click="surrender"
        >
          <span class="disp">Respin the wheel</span>
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.4"
            aria-hidden="true"
          ><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>
      </div>
    </section>
  </section>
</template>

<style scoped>
.forfeit {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--gap-panel);
  min-width: 0;
  padding: var(--pad-panel);
  background-color: #0c0b09;
  background-image:
    linear-gradient(rgba(255, 75, 62, 0.07) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 75, 62, 0.07) 1px, transparent 1px);
  background-size: 40px 40px;
}

.ff-frame {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}
.ff-frame::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(255, 75, 62, 0.035);
}
.ff-band {
  position: absolute;
  left: 0;
  right: 0;
  height: 8px;
  opacity: 0.9;
}
.ff-band.top { top: 0; }
.ff-band.bottom { bottom: 0; }
.ff-ticks {
  position: absolute;
  inset: 16px 12px 14px;
  opacity: 0.8;
}
.ff-sweep {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 64px;
  background: linear-gradient(180deg, transparent, rgba(255, 75, 62, 0.06));
  animation: sweep 7s linear infinite;
}

.ff-head {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--gap-panel);
  flex-wrap: wrap;
}
.ff-copy { display: flex; flex-direction: column; gap: var(--sp-3); }
.ff-kicker {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  color: var(--red);
}
.ff-dot { width: 8px; height: 8px; background: var(--red); }
.ff-title {
  margin: 0;
  font-size: clamp(28px, 3.2vw, 40px);
  color: var(--red);
  white-space: nowrap;
}

.ff-notice {
  flex: 0 1 310px;
  min-width: 0;
  margin: 0 0 2px;
  padding: var(--sp-3) var(--sp-4);
  border: 1px dashed color-mix(in srgb, var(--red) 55%, transparent);
  background: color-mix(in srgb, var(--red) 6%, transparent);
  font-size: 12px;
  line-height: 1.45;
  color: var(--khaki);
}
.ff-notice-lbl {
  display: block;
  margin-bottom: var(--sp-1);
  font-size: 9px;
  color: var(--red);
}

.ff-stars {
  display: flex;
  align-items: center;
  gap: var(--sp-5);
}
.ff-star-row { display: flex; gap: var(--sp-1); color: var(--line-5); }
.ff-star-row svg { width: 20px; height: 20px; }
.ff-stars-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  padding-left: var(--sp-5);
  border-left: 1px solid var(--line-2);
}
.ff-stars-meta .disp { font-size: 20px; color: var(--text); }
.ff-no-draft {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.16em;
  color: var(--muted);
  white-space: nowrap;
}

.ff-cards {
  position: relative;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
  gap: var(--gap-panel);
}
.ff-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--gap-panel);
  min-height: 84px;
  padding: 0 var(--sp-5);
  background: var(--panel);
  border: 1px solid color-mix(in srgb, var(--red) 50%, transparent);
  overflow: hidden;
}
.ff-card-icon {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--red) 10%, transparent);
  border: 1px solid var(--red);
  color: var(--red);
}
.ff-card-icon img { object-fit: contain; }
.ff-card-diff {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  font-size: 26px;
  color: var(--gold);
  background: var(--raised);
  border: 1px solid var(--gold);
}
.ff-card-copy {
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex-grow: 1;
  min-width: 0;
}
.ff-card-t { font-size: 15px; color: var(--text); white-space: nowrap; }
.ff-card-s {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: var(--red);
}
.ff-card-s.orange { color: var(--orange); }
.ff-card-deco {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: var(--red);
}
.ff-restart-pips { display: flex; gap: 4px; }
.ff-restart-pips span {
  width: 22px;
  height: 7px;
  border: 1px solid var(--line-5);
}
.ff-restart-pips span.on { background: var(--red); border-color: var(--red); }

.ff-ladder {
  display: flex;
  align-items: flex-end;
  gap: 3px;
}
.ff-ladder-bar { width: 14px; background: var(--line-3); }
.ff-ladder-bar.dim { height: 14px; }
.ff-ladder-bar.gold { height: 24px; background: var(--gold); }
.ff-ladder-bar.dashed {
  position: relative;
  height: 34px;
  border: 1px dashed var(--line-5);
  display: grid;
  place-items: center;
  color: var(--red);
}
.ff-ladder-bar.dashed svg { position: absolute; }
.ff-diff-emblem {
  position: absolute;
  right: -10px;
  bottom: -10px;
  width: 54px;
  height: 54px;
  object-fit: contain;
  opacity: 0.12;
}

.ff-strain {
  position: relative;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border: 1px dashed var(--orange);
  color: var(--orange);
}
.ff-strain img { object-fit: contain; }
.ff-strain svg { position: absolute; right: -8px; bottom: -8px; }

.ff-surrender-head {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  margin-top: var(--sp-3);
}
.ff-hz { width: 8px; height: 26px; }
.ff-surrender-t {
  margin: 0;
  font-size: 20px;
  color: var(--text);
}
.ff-host-chip {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  margin-left: var(--sp-2);
  padding: 4px var(--sp-3);
  border: 1px solid var(--line-4);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.16em;
  color: var(--khaki);
  white-space: nowrap;
}
.ff-host-chip svg { color: var(--gold); }
.ff-pick-count {
  margin-left: auto;
  font-size: var(--fs-sm);
  font-weight: 700;
  letter-spacing: 0.14em;
  color: var(--khaki);
  white-space: nowrap;
}

.ff-bar {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--sp-5);
  min-height: 68px;
  padding: 0 6px 0 var(--sp-5);
  background-color: var(--panel);
  border: 1px solid color-mix(in srgb, var(--red) 45%, transparent);
}
.ff-bar-hz { width: 10px; height: 40px; flex-shrink: 0; }
.ff-bar-copy { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.ff-bar-lbl { font-size: 10px; color: var(--red); }
.ff-bar-t { font-size: 1.3rem; color: var(--text); white-space: nowrap; }
.ff-bar-grow { flex-grow: 1; }

.hold {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 330px;
  max-width: 100%;
  min-height: 54px;
  padding: 0 22px;
  border: 0;
  background: var(--red);
  color: var(--on-gold);
  touch-action: none;
  user-select: none;
  cursor: pointer;
}
.hold:disabled { opacity: 0.4; cursor: not-allowed; }
.hold-fill {
  position: absolute;
  inset: 0;
  opacity: 0.55;
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 700ms linear;
}
.hold-fill.on { transform: scaleX(1); }
.hold-fill:not(.on) { transition: none; }
.hold-label {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}
.hold-label .disp { font-size: 18px; }
.hold-sub { font-size: 10px; font-weight: 700; letter-spacing: 0.24em; }

.ff-done {
  display: flex;
  align-items: center;
  gap: var(--sp-5);
  flex-wrap: wrap;
}
.ff-confiscated {
  display: inline-block;
  padding: 7px 14px;
  font-size: 20px;
  border: 3px solid var(--red);
  color: var(--red);
  transform: rotate(-7deg);
}
.ff-respin {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  width: 330px;
  max-width: 100%;
  min-height: 54px;
  padding: 0 22px;
  background: var(--gold);
  color: var(--on-gold);
}
.ff-respin .disp { font-size: 18px; }

@media (max-width: 1020px) {
  .ff-title { white-space: normal; }
  .hold,
  .ff-respin { width: 100%; }
}
</style>
