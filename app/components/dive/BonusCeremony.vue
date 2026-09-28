<script setup lang="ts">
import { BONUS_STATS, REWARD_TOKEN_CAP, bonusIntervalFor, maxStarsFor, missionsPerOperation } from '~~/shared/engine/config'
import { bonusFor } from '~~/shared/engine/selectors'
import type { DiveState, DiverState } from '~~/shared/engine/types'

const props = withDefaults(defineProps<{
  state: DiveState
  selfId: string | null
  self: DiverState | null
  canControl?: boolean
}>(), { canControl: true })

const emit = defineEmits<{
  spin: []
  award: [playerId: string]
  advance: []
}>()

// Icon per end-of-mission stat — the reel is iconographic, not text-only. The
// set is presentation only; `BONUS_STATS` stays the engine's contract.
const STAT_ICONS: Readonly<Record<string, string>> = {
  kills: 'M13 2L4 14h6l-1 8 9-12h-6z',
  accuracy: 'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18M12 7.5a4.5 4.5 0 1 0 0 9M12 12h.01',
  shotsFired: 'M3 12h13M13 8l4 4-4 4M3 8v8',
  shotsHit: 'M12 3v18M3 12h18M12 7a5 5 0 1 0 0 10M12 12h.01',
  deaths: 'M12 3a7 7 0 0 0-7 7v4l2 2v3h10v-3l2-2v-4a7 7 0 0 0-7-7M9.5 11h.01M14.5 11h.01M10 16h4',
  stimsUsed: 'M14 3l7 7M16.5 5.5L12 10M11 9l4 4M6 14l4 4M4 20l6-6-4-4-6 6z',
  accidentals: 'M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2M12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8',
  samplesExtracted: 'M5 21L19 7M13 3c3 0 6 2 7 5M11 3c-1 0-2 .5-3 1.5M8 6l10 10',
  stratagemsUsed: 'M6 3l6 5 6-5M6 12l6 5 6-5',
  meleeKills: 'M4 20l7-7M11 13L20 4l-1-1-9 9M18 11l2 2M15 8l2 2',
  timesReinforcing: 'M12 3v12M7 10l5 5 5-5M4 19h16',
  friendlyFireDamage: 'M12 3l9 16H3zM12 10v4M12 17h.01',
}

const contest = computed(() => bonusFor(props.state))
const spun = computed(() => props.state.bonusSeed !== null)
const winner = computed(() =>
  props.state.divers.find(diver => diver.id === props.state.bonusWinnerId) ?? null)
// A diver seated mid-mission sat the draft out, so they have no stats to win
// with — only the divers who dove are award candidates.
const candidates = computed(() =>
  props.state.divers.filter(diver => !diver.skipsCurrentDraft))
const solo = computed(() => candidates.value.length === 1)

const stars = computed(() => props.state.lastReport?.stars ?? 0)
const maxStars = computed(() => maxStarsFor(props.state.difficulty))
const opLength = computed(() => missionsPerOperation(props.state.difficulty))
const kicker = computed(() =>
  `Mission ${props.state.missionInOperation} of ${opLength.value} · bonus stats`)
// A completed operation starts a new one on advance, so the CTA names the
// operation instead of a phantom next mission at the ladder top.
const nextLabel = computed(() =>
  props.state.missionInOperation >= opLength.value
    ? 'Next operation'
    : `Next mission · ${props.state.missionInOperation + 1}/${opLength.value}`)
const interval = computed(() => bonusIntervalFor(props.state.divers.length))
const cadenceLabel = computed(() => {
  if (interval.value === 1) {
    return 'Every mission'
  }
  return interval.value === 2 ? 'Every other mission' : 'Every third mission'
})
// The cadence readout mirrors the rail's legend: a lit bar every `interval`
// missions, so a smaller squad sees its rarer cadence directly.
const cadenceBars = computed(() =>
  Array.from({ length: 3 }, (_, i) => interval.value === 1 || i % interval.value === 0))

const hostName = computed(() =>
  props.state.divers.find(diver => diver.id === props.state.hostId)?.name ?? 'Host')

// ---- The reel ------------------------------------------------------------
// Rows are the full stat pool repeated so the strip can wind down onto the
// seeded winner. Deterministic: the landing index is `rollBonus`'s output, and
// the strip is a fixed list — no local randomness.
const REEL_ROWS = 4
const ROW_H = 64
const REEL_MS = 1900
const reelRows = computed(() =>
  Array.from({ length: REEL_ROWS }, () => BONUS_STATS).flat())
const winIndex = computed(() =>
  contest.value ? Math.max(0, BONUS_STATS.findIndex(stat => stat.id === contest.value!.id)) : 0)
const targetRow = computed(() => BONUS_STATS.length * 2 + winIndex.value)
function restY(): string {
  return `${ROW_H - targetRow.value * ROW_H}px`
}

const landed = ref(false)
const reelY = ref(`${ROW_H}px`)
const reduced = import.meta.client
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches
let reelTimer: ReturnType<typeof setTimeout> | undefined
// Only the component's very first observation may skip the reel: that is the
// rejoin case where the seed is already set at mount. A seed that arrives later
// (the host spins) always animates, so `initial` must be consumed even when the
// first observation is `null`.
let initial = true

watch(() => props.state.bonusSeed, (seed) => {
  clearTimeout(reelTimer)
  const isInitial = initial
  initial = false
  if (seed === null) {
    landed.value = false
    reelY.value = `${ROW_H}px`
    return
  }
  if (reduced || isInitial) {
    landed.value = true
    reelY.value = restY()
    return
  }
  reelY.value = `${ROW_H}px`
  landed.value = false
  requestAnimationFrame(() => {
    reelY.value = restY()
  })
  reelTimer = setTimeout(() => {
    landed.value = true
  }, REEL_MS)
}, { immediate: true })
onBeforeUnmount(() => clearTimeout(reelTimer))

const spinning = computed(() => spun.value && !landed.value)
const direction = computed(() => contest.value?.direction ?? 'most')

// ---- Winner naming -------------------------------------------------------
const selectedWinnerId = ref<string | null>(null)
const HOLD_MS = 900
const holding = ref(false)
let holdTimer: ReturnType<typeof setTimeout> | undefined

function pickWinner(id: string): void {
  if (!props.canControl) {
    return
  }
  selectedWinnerId.value = id
}

function awardDown(): void {
  if (!props.canControl || !selectedWinnerId.value) {
    return
  }
  holding.value = true
  clearTimeout(holdTimer)
  holdTimer = setTimeout(() => {
    holding.value = false
    if (selectedWinnerId.value) {
      emit('award', selectedWinnerId.value)
    }
  }, HOLD_MS)
}
function awardEnd(): void {
  holding.value = false
  clearTimeout(holdTimer)
}
onBeforeUnmount(() => clearTimeout(holdTimer))

function initials(name: string): string {
  const trimmed = name.trim()
  return trimmed ? trimmed.slice(0, 2).toUpperCase() : '??'
}
function serial(id: string): string {
  return `#${id.replace(/[^a-z0-9]/gi, '').slice(-4).toUpperCase().padStart(4, '0')}`
}
function tokenChits(count: number): boolean[] {
  return Array.from({ length: REWARD_TOKEN_CAP }, (_, i) => i < count)
}
</script>

<template>
  <section
    class="honors"
    aria-label="Squad honors"
  >
    <header class="honors-head">
      <div class="head-l">
        <span class="lbl">{{ kicker }}</span>
        <h1 class="disp honors-title">
          Squad Honors
        </h1>
      </div>
      <span class="host-chip">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        ><path d="M3 18h18v2H3zM4 16l2-9 4 4 2-6 2 6 4-4 2 9z" /></svg>
        Host calls it · {{ hostName }}
      </span>
    </header>

    <section
      class="elig-bar"
      aria-label="Eligibility"
    >
      <div class="elig-cell">
        <span
          class="elig-stars"
          role="img"
          :aria-label="`${stars} of ${maxStars} stars`"
        >
          <svg
            v-for="i in maxStars"
            :key="i"
            viewBox="0 0 24 24"
            class="elig-star"
            :class="{ on: i <= stars }"
          ><path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6l-5.4 2.9 1.2-6-4.5-4.2 6.1-.7z" /></svg>
        </span>
        <span class="elig-strong">{{ stars }}/{{ maxStars }} stars</span>
      </div>
      <div class="elig-cell">
        <span
          class="elig-avatars"
          aria-hidden="true"
        >
          <span
            v-for="diver in state.divers"
            :key="diver.id"
            class="elig-av cut-sm disp"
          >{{ initials(diver.name).slice(0, 1) }}</span>
        </span>
        <span class="elig-strong">{{ state.divers.length }} divers</span>
      </div>
      <div class="elig-cell cadence-cell">
        <span
          class="cadence-bars"
          aria-hidden="true"
        >
          <span
            v-for="(on, i) in cadenceBars"
            :key="i"
            class="cadence-bar"
            :class="{ on }"
          />
        </span>
        <span class="elig-strong">{{ cadenceLabel }}</span>
      </div>
      <div class="elig-spacer" />
      <div class="elig-ok">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="3"
          aria-hidden="true"
        ><path d="M5 12l5 5 9-10" /></svg>
        Eligible
      </div>
    </section>

    <section
      class="stat-stage"
      aria-label="Honors stat"
    >
      <div
        class="reel-box ticks"
        :class="{ landed }"
      >
        <span class="lbl reel-caption">{{ spun ? 'The winning stat' : 'Draw a stat' }}</span>
        <div
          class="reel-view"
          aria-hidden="true"
        >
          <div
            class="reel-strip"
            :style="{ transform: `translateY(${reelY})`, transitionDuration: reduced ? '0ms' : `${REEL_MS}ms` }"
          >
            <div
              v-for="(stat, i) in reelRows"
              :key="`${stat.id}-${i}`"
              class="reel-row"
              :class="{ win: landed && spun && stat.id === contest?.id }"
            >
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="reel-icon"
              ><path :d="STAT_ICONS[stat.id] ?? ''" /></svg>
              <span class="disp reel-label">{{ stat.label }}</span>
              <span class="reel-dir">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                ><path
                  fill="currentColor"
                  :d="stat.direction === 'most' ? 'M12 5l7 13H5z' : 'M12 19L5 6h14z'"
                /></svg>
                {{ stat.direction === 'most' ? 'Most' : 'Least' }}
              </span>
            </div>
          </div>
        </div>
        <span
          class="reel-band"
          aria-hidden="true"
        />
        <span
          class="reel-tri left"
          aria-hidden="true"
        />
        <span
          class="reel-tri right"
          aria-hidden="true"
        />
        <span
          v-if="landed && spun"
          class="dir-stamp stamp"
          :class="direction"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            aria-hidden="true"
          ><path
            fill="currentColor"
            :d="direction === 'most' ? 'M12 5l7 13H5z' : 'M12 19L5 6h14z'"
          /></svg>
          {{ direction === 'most' ? 'Most' : 'Least' }}
        </span>
        <span
          class="sr-only"
          aria-live="polite"
        >{{ landed && contest ? `Winning stat: ${contest.label}, ${direction}` : '' }}</span>
      </div>

      <div class="action-col">
        <button
          v-if="!spun"
          class="spin-btn"
          type="button"
          :disabled="!canControl"
          aria-label="Spin the honors stat"
          @click="emit('spin')"
        >
          <svg
            width="34"
            height="34"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          ><rect
            x="3"
            y="4"
            width="18"
            height="16"
          /><path d="M9 4v16M15 4v16M3 12h18" /></svg>
          <span class="disp spin-word">Spin</span>
          <span class="spin-sub">Host · draw a stat</span>
        </button>

        <div
          v-else-if="spinning"
          class="drawing"
        >
          <span class="disp drawing-dots">···</span>
          <span class="lbl">Drawing</span>
        </div>

        <div
          v-else
          class="prize"
        >
          <span class="lbl prize-lbl">Prize</span>
          <span class="prize-hex-wrap">
            <span
              class="hex prize-hex"
              aria-hidden="true"
            />
            <span
              class="hex prize-hex-in"
              aria-hidden="true"
            />
            <span class="disp prize-mark">1</span>
          </span>
          <strong class="prize-name">Reward token</strong>
          <span class="prize-sub">Spend on a reroll or a ban</span>
        </div>
      </div>
    </section>

    <template v-if="spun && landed && !winner">
      <div class="name-row">
        <span class="lbl name-lbl">Name the winner</span>
        <span class="name-source">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            aria-hidden="true"
          ><rect
            x="3"
            y="4"
            width="18"
            height="12"
          /><path d="M8 20h8M12 16v4M7 12V9M11 12V7M15 12v-2" /></svg>
          From the in-game stats screen
        </span>
        <span class="name-ties">Ties · host's call</span>
      </div>

      <div
        class="tag-row"
        role="radiogroup"
        aria-label="Honors winner"
      >
        <button
          v-for="diver in candidates"
          :key="diver.id"
          class="winner-tag"
          :class="{ 'tag-flash': state.bonusWinnerId === diver.id }"
          type="button"
          role="radio"
          :aria-checked="selectedWinnerId === diver.id"
          :aria-label="`Name ${diver.name} the honors winner`"
          :disabled="!canControl"
          @click="pickWinner(diver.id)"
        >
          <span
            class="tag-shape tag-edge"
            aria-hidden="true"
          />
          <span
            class="tag-shape tag-body"
            aria-hidden="true"
          />
          <span
            class="tag-hole"
            aria-hidden="true"
          />
          <span class="tag-inner">
            <span class="tag-top">
              <span class="disp tag-name">{{ diver.name }}</span>
              <span
                class="tag-radio"
                :class="{ on: selectedWinnerId === diver.id }"
                aria-hidden="true"
              >
                <svg
                  v-if="selectedWinnerId === diver.id"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="3.6"
                ><path d="M5 12l5 5 9-10" /></svg>
              </span>
            </span>
            <span class="tag-serial">
              {{ serial(diver.id) }}
              <svg
                v-if="diver.id === state.hostId"
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-label="host"
              ><path d="M3 18h18v2H3zM4 16l2-9 4 4 2-6 2 6 4-4 2 9z" /></svg>
            </span>
            <span class="tag-bottom">
              <span
                class="tag-chits"
                role="img"
                :aria-label="`${diver.rewardTokens} reward tokens`"
              >
                <span
                  v-for="(on, i) in tokenChits(diver.rewardTokens)"
                  :key="i"
                  class="hex tag-chit"
                  :class="{ on }"
                />
              </span>
              <span
                v-if="diver.rewardTokens < REWARD_TOKEN_CAP"
                class="tag-count"
              >{{ diver.rewardTokens }}</span>
              <span
                v-else
                class="tag-max"
              >Max {{ REWARD_TOKEN_CAP }}</span>
            </span>
          </span>
          <span
            v-if="state.bonusWinnerId === diver.id"
            class="tag-honored"
            aria-hidden="true"
          >Honored</span>
        </button>
      </div>
    </template>

    <div class="award-row">
      <template v-if="spun && !landed">
        <p class="muted small award-note">
          {{ canControl ? 'Drawing the honors…' : 'The host is drawing…' }}
        </p>
      </template>

      <template v-else-if="spun && !winner">
        <button
          class="hold-award cut"
          type="button"
          :disabled="!canControl || !selectedWinnerId"
          :aria-label="`Award the honors and bank a reward token. Press and hold.`"
          @pointerdown="awardDown"
          @pointerup="awardEnd"
          @pointerleave="awardEnd"
        >
          <span
            class="hazard award-fill crawl"
            :class="{ on: holding }"
            aria-hidden="true"
          />
          <span class="hold-copy">
            <span class="disp hold-word">{{ selectedWinnerId ? 'Award the honors' : 'Select a diver' }}</span>
            <span class="hold-sub">Hold to confirm</span>
          </span>
        </button>
        <button
          class="ghost skip-btn"
          type="button"
          @click="emit('advance')"
        >
          Skip
        </button>
        <p
          v-if="!canControl"
          class="muted small award-note"
        >
          Waiting for the host to award…
        </p>
      </template>

      <template v-else-if="winner">
        <div class="banked rise">
          <span
            class="hex banked-chit"
            aria-hidden="true"
          />
          <span class="banked-copy">
            <span class="lbl banked-lbl">Token banked</span>
            <span class="banked-name">{{ winner.name }} · {{ winner.rewardTokens }}/{{ REWARD_TOKEN_CAP }}</span>
          </span>
        </div>
        <button
          class="btn primary cut next-btn rise"
          type="button"
          :disabled="!canControl"
          @click="emit('advance')"
        >
          <span class="disp next-word">{{ nextLabel }}</span>
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
      </template>

      <template v-else>
        <p
          v-if="canControl"
          class="muted small award-note"
        >
          Spin to draw the honors contest.
        </p>
        <p
          v-else
          class="muted small award-note"
        >
          Waiting for the host to spin…
        </p>
      </template>
    </div>

    <p
      v-if="solo && spun && landed && !winner"
      class="muted small solo-note"
    >
      Only one diver can win — the spin banks the token automatically.
    </p>
  </section>
</template>

<style scoped>
.honors {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
}

.honors-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
}
.head-l { display: flex; flex-direction: column; gap: 6px; }
.honors-title { margin: 0; font-size: var(--fs-h1); color: var(--text); }
.host-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--line-2);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--khaki);
  white-space: nowrap;
}

.elig-bar {
  display: flex;
  align-items: stretch;
  min-height: 48px;
  border: 1px solid var(--line-2);
  background: color-mix(in srgb, var(--panel) 85%, transparent);
  flex-wrap: wrap;
}
.elig-cell {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 18px;
  border-right: 1px solid var(--line-2);
}
.elig-stars { display: flex; gap: 2px; }
.elig-star { width: 14px; height: 14px; fill: var(--line-3); }
.elig-star.on { fill: var(--gold); }
.elig-avatars { display: flex; gap: 3px; }
.elig-av {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  font-size: 10px;
  background: var(--line-2);
  color: var(--text);
}
.elig-av:first-child { background: var(--gold); color: var(--on-gold); }
.elig-strong {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text);
  white-space: nowrap;
}
.cadence-bars { display: flex; gap: 4px; }
.cadence-bar { width: 16px; height: 6px; border: 1px solid var(--line-4); }
.cadence-bar.on { background: var(--gold); border-color: var(--gold); }
.elig-spacer { flex-grow: 1; }
.elig-ok {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 18px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--teal);
}

.stat-stage {
  display: grid;
  grid-template-columns: 1fr 212px;
  gap: 16px;
  min-height: 222px;
}

.reel-box {
  position: relative;
  overflow: hidden;
  background: var(--ground);
  border: 1px solid var(--line-4);
}
.reel-caption {
  position: absolute;
  left: 16px;
  top: 12px;
  z-index: 3;
  font-size: 10px;
}
.reel-view {
  position: absolute;
  left: 1px;
  right: 1px;
  top: 15px;
  height: 192px;
  overflow: hidden;
  -webkit-mask-image: linear-gradient(180deg, transparent 0, #000 34%, #000 66%, transparent 100%);
  mask-image: linear-gradient(180deg, transparent 0, #000 34%, #000 66%, transparent 100%);
}
.reel-strip {
  transition-property: transform;
  transition-timing-function: cubic-bezier(0.12, 0.64, 0.14, 1);
}
.reel-row {
  height: 64px;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 0 30px 0 44px;
  color: var(--khaki);
  opacity: 0.55;
}
.reel-row.win { color: var(--gold); opacity: 1; }
.reel-icon { flex-shrink: 0; }
.reel-label { font-size: 1.35rem; white-space: nowrap; }
.reel-dir {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  white-space: nowrap;
}
.reel-band {
  position: absolute;
  left: 12px;
  right: 12px;
  top: 79px;
  height: 64px;
  border-top: 1px solid var(--line-4);
  border-bottom: 1px solid var(--line-4);
  background: color-mix(in srgb, var(--gold) 9%, transparent);
  pointer-events: none;
}
.reel-box.landed .reel-band { animation: bandFlash 0.5s ease-out both; }
.reel-tri {
  position: absolute;
  top: 111px;
  width: 14px;
  height: 18px;
  margin-top: -9px;
  background: var(--gold);
}
.reel-tri.left { left: 12px; clip-path: polygon(0 0, 100% 50%, 0 100%); }
.reel-tri.right { right: 12px; clip-path: polygon(100% 0, 0 50%, 100% 100%); }
.dir-stamp {
  position: absolute;
  right: 38px;
  top: 94px;
  display: flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  background: var(--gold);
  color: var(--on-gold);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.action-col { display: flex; }
.spin-btn {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 0;
  background: var(--gold);
  color: var(--on-gold);
  cursor: pointer;
  animation: glow 2.4s ease-in-out infinite;
}
.spin-btn:hover:not(:disabled) { filter: brightness(1.1); }
.spin-btn:disabled { cursor: default; opacity: 0.5; animation: none; }
.spin-word { font-size: 2.1rem; letter-spacing: 0.08em; }
.spin-sub { font-size: 10px; font-weight: 700; letter-spacing: 0.24em; text-transform: uppercase; }

.drawing {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 1px solid var(--line-4);
  background: var(--panel);
}
.drawing-dots { font-size: 1.9rem; color: var(--gold); animation: pulse 1.6s ease-in-out infinite; }

.prize {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border: 1px solid color-mix(in srgb, var(--gold) 45%, var(--line-3));
  background: var(--panel);
  text-align: center;
}
.prize-lbl { font-size: 10px; }
.prize-hex-wrap {
  position: relative;
  width: 64px;
  height: 72px;
  display: grid;
  place-items: center;
}
.prize-hex {
  position: absolute;
  inset: 0;
  background: var(--gold);
}
.prize-hex-in {
  position: absolute;
  inset: 5px;
  background: var(--panel);
}
.prize-mark { position: relative; font-size: 1.4rem; color: var(--gold); }
.prize-name { font-size: 13px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--gold); }
.prize-sub { font-size: 11px; color: var(--muted); }

.name-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 2px;
}
.name-lbl { color: var(--text); }
.name-source {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.name-ties {
  margin-left: auto;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}

.tag-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  min-height: 158px;
}
.winner-tag {
  position: relative;
  display: block;
  height: 158px;
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: transform 0.15s var(--ease-out);
}
.winner-tag:disabled { cursor: default; opacity: 0.6; }
.tag-edge,
.tag-body {
  position: absolute;
  pointer-events: none;
}
.tag-edge {
  inset: 0;
  background: var(--line-4);
  transition: background-color 0.15s ease;
}
.tag-body {
  inset: 3px;
  background: var(--raised);
  transition: background-color 0.15s ease;
}
.winner-tag:hover:not(:disabled) .tag-edge { background: var(--khaki); }
.winner-tag.tag-flash .tag-body { animation: tagFlash 0.5s var(--ease-out); }
.tag-honored {
  position: absolute;
  left: 50%;
  top: 50%;
  padding: 4px 12px;
  border: 2px solid var(--gold);
  background: color-mix(in srgb, var(--ground) 82%, transparent);
  color: var(--gold);
  font-family: var(--font-display);
  font-stretch: 125%;
  font-weight: 800;
  font-size: 0.95rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  pointer-events: none;
  animation: honoredIn 0.42s var(--ease-out) both;
}
@keyframes honoredIn {
  0% { opacity: 0; transform: translate(-50%, -50%) rotate(-9deg) scale(1.4); }
  100% { opacity: 1; transform: translate(-50%, -50%) rotate(-9deg) scale(1); }
}
.tag-hole {
  position: absolute;
  left: 14px;
  top: 50%;
  width: 14px;
  height: 14px;
  margin-top: -7px;
  border-radius: 50%;
  background: var(--ground);
  border: 2px solid var(--line-5);
}
.tag-inner {
  position: absolute;
  left: 42px;
  right: 16px;
  top: 18px;
  bottom: 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.tag-top { display: flex; align-items: center; gap: 8px; }
.tag-name {
  font-size: 1.25rem;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tag-radio {
  margin-left: auto;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  border: 2px solid var(--line-4);
  color: var(--on-gold);
}
.tag-radio.on { background: var(--gold); border-color: var(--gold); }
.tag-serial {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--muted);
}
.tag-bottom { display: flex; align-items: center; gap: 10px; }
.tag-chits { display: flex; gap: 5px; }
.tag-chit { width: 18px; height: 21px; background: var(--line-2); }
.tag-chit.on { background: var(--gold); }
.tag-count { font-size: 13px; font-weight: 700; color: var(--khaki); }
.tag-max {
  padding: 4px 7px;
  border: 1px solid var(--gold);
  background: color-mix(in srgb, var(--gold) 10%, transparent);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--gold);
  white-space: nowrap;
}

.award-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 58px;
  flex-wrap: wrap;
}
.hold-award {
  position: relative;
  overflow: hidden;
  flex-grow: 1;
  height: 58px;
  border: 0;
  background: var(--gold);
  color: var(--on-gold);
  touch-action: none;
  user-select: none;
  cursor: pointer;
}
.hold-award:disabled { opacity: 0.45; cursor: not-allowed; }
.award-fill {
  position: absolute;
  inset: 0;
  opacity: 0.4;
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 900ms linear;
}
.award-fill.on { transform: scaleX(1); }
.award-fill:not(.on) { transition: none; }
.hold-copy {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}
.hold-word { font-size: 1.2rem; }
.hold-sub { font-size: 10px; font-weight: 700; letter-spacing: 0.24em; text-transform: uppercase; }
.skip-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 128px;
  height: 58px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  flex-shrink: 0;
}
.award-note { margin: 0; flex-basis: 100%; }

.banked {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 58px;
  padding: 0 16px;
  border: 1px solid var(--line-2);
  background: var(--panel);
}
.banked-chit { width: 14px; height: 16px; background: var(--gold); }
.banked-copy { display: flex; flex-direction: column; gap: 3px; }
.banked-lbl { font-size: 10px; }
.banked-name { font-size: 15px; font-weight: 700; letter-spacing: 0.1em; color: var(--text); }
.next-btn {
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 58px;
  padding: 0 22px;
}
.next-word { font-size: 1.1rem; }
.next-btn:disabled { opacity: 0.5; cursor: not-allowed; }

@media (prefers-reduced-motion: reduce) {
  .spin-btn { animation: none; }
  .reel-strip { transition-duration: 0ms !important; }
}
</style>
