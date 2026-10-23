<script setup lang="ts">
import { ITEMS_BY_ID } from '~~/shared/data/catalog'
import { itemImageUrl } from '~~/shared/data/images'
import { missionHaul } from '~~/shared/engine/rewards'
import { currentFront, draftSummaryFor } from '~~/shared/engine/selectors'
import type { DiverState, DiveState, RewardTier } from '~~/shared/engine/types'
import { categoryLabel } from '~/utils/itemCategory'

// The beat between two missions of one operation: the whole squad has banked,
// so everyone regroups here — their haul, the squad's picks and Brasch's shelf
// — until the host calls the next drop. Presentation only: the engine stays in
// rewards and ADVANCE is the one way out, exactly as from the draft.
const props = withDefaults(defineProps<{
  state: DiveState
  self: DiverState | null
  selfId: string | null
  canControl: boolean
  opLength: number
  phone?: boolean
}>(), { phone: false })

const emit = defineEmits<{ advance: [], buy: [itemId: string] }>()

const mission = computed(() => props.state.missionInOperation)
const opEnds = computed(() => mission.value >= props.opLength)
const front = computed(() => currentFront(props.state))
const hostName = computed(() =>
  props.state.divers.find(diver => diver.id === props.state.hostId)?.name ?? 'The host')

const summary = computed(() => (props.self ? draftSummaryFor(props.state, props.self) : null))
const banked = computed(() =>
  summary.value?.bankedItemId ? ITEMS_BY_ID.get(summary.value.bankedItemId) ?? null : null)
const bankedTier = computed<RewardTier | null>(() => {
  const option = summary.value?.options.find(entry => entry.optionId === summary.value?.bankedOptionId)
  return option?.tier ?? (banked.value ? (banked.value.tier.toUpperCase() as RewardTier) : null)
})
const haul = computed(() => missionHaul(props.state.lastReport))

const squadDrafts = computed(() =>
  props.state.divers
    .filter(diver => diver.id !== props.selfId)
    .map(diver => ({ id: diver.id, name: diver.name, summary: draftSummaryFor(props.state, diver) })))

const nextDrop = computed(() => {
  if (opEnds.value) {
    return 'Operation complete — the crusade’s last rung is cleared.'
  }
  const where = front.value ? ` · ${front.value.displayName} front` : ''
  return `Next drop: mission ${mission.value + 1} of ${props.opLength}${where}`
})
const ctaLabel = computed(() => (opEnds.value ? 'Complete operation' : 'Next mission'))
const emptyHaul = computed(() => {
  if (summary.value?.status === 'banned') {
    return 'Broken pacts cost this draft.'
  }
  if (summary.value?.status === 'skipped') {
    return 'You sat this draft out.'
  }
  return 'Nothing banked this mission.'
})
</script>

<template>
  <section
    class="mc"
    :class="{ phone }"
  >
    <header class="mc-head">
      <span class="kick">Mission {{ mission }} of {{ opLength }} secured</span>
      <h1 class="disp mc-title">
        {{ opEnds ? 'Operation secured' : 'Regroup' }}
      </h1>
      <p class="mc-sub">
        {{ nextDrop }}
      </p>
      <ol
        class="track"
        :aria-label="`Operation progress: mission ${mission} of ${opLength} secured`"
      >
        <li
          v-for="i in opLength"
          :key="i"
          class="seg"
          :class="{ done: i <= mission, next: i === mission + 1 }"
          :style="{ '--i': i - 1 }"
        >
          <span class="seg-num disp">{{ i }}</span>
          <span class="seg-word">{{ i <= mission ? 'Secured' : i === mission + 1 ? 'Next drop' : 'Ahead' }}</span>
        </li>
      </ol>
    </header>

    <div class="mc-grid">
      <article
        class="haul"
        :data-tier="bankedTier ?? 'C'"
        aria-label="Your haul"
      >
        <header class="haul-head">
          <span class="cap">Your haul</span>
          <span
            v-if="bankedTier"
            class="haul-tier disp"
          >{{ bankedTier }}</span>
        </header>
        <template v-if="banked">
          <span class="haul-media">
            <img
              v-if="itemImageUrl(banked)"
              :src="itemImageUrl(banked)"
              alt=""
              draggable="false"
            >
          </span>
          <span class="haul-copy">
            <span class="cap haul-cat">{{ categoryLabel(banked.category) }}</span>
            <b
              class="disp haul-name"
              :style="fitWord(banked.displayName)"
            >{{ banked.displayName }}</b>
          </span>
        </template>
        <p
          v-else
          class="haul-empty"
        >
          {{ emptyHaul }}
        </p>
        <footer
          v-if="haul > 0"
          class="haul-credits"
        >
          <span>Credits banked</span>
          <CreditAmount
            class="disp haul-amount"
            :value="haul"
            signed
          />
        </footer>
      </article>

      <div class="shop">
        <BraschBargains
          :state="state"
          :self="self"
          @buy="emit('buy', $event)"
        />
      </div>
    </div>

    <SquadDraftBoard
      v-if="squadDrafts.length"
      :drafts="squadDrafts"
      compact
    />

    <PhoneActionBar v-if="phone">
      <template #primary>
        <button
          v-if="canControl"
          class="bar-cta cta-sweep"
          type="button"
          @click="emit('advance')"
        >
          <span class="disp">{{ ctaLabel }}</span>
        </button>
        <span
          v-else
          class="bar-gate"
        >Waiting on {{ hostName }}</span>
      </template>
    </PhoneActionBar>
    <footer
      v-else
      class="mc-foot"
    >
      <button
        v-if="canControl"
        class="cta cut cta-sweep"
        type="button"
        @click="emit('advance')"
      >
        {{ ctaLabel }}
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
        Waiting for {{ hostName }} to call the next drop. Shop while you wait.
      </p>
    </footer>
  </section>
</template>

<style scoped>
.mc {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
}
.mc-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}
.kick {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--teal);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.24em;
  text-transform: uppercase;
}
.kick::before,
.kick::after {
  content: '';
  width: 22px;
  height: 2px;
  background: currentColor;
  box-shadow: 0 0 8px currentColor;
}
.mc-title {
  font-size: clamp(40px, 5vw, 68px);
  text-shadow: 0 0 36px rgba(74, 215, 200, 0.16);
  animation: riseIn 0.45s var(--ease-out) both;
}
.mc-sub { margin: 0; color: var(--muted); font-size: 15px; }

/* The operation as a row of drops: secured ones lit, the next one breathing. */
.track {
  display: flex;
  gap: 4px;
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
}
.seg {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 150px;
  height: 46px;
  padding: 0 22px 0 26px;
  color: var(--dim);
  background: var(--panel);
  box-shadow: inset 0 -2px 0 var(--line-3);
  clip-path: polygon(0 0, calc(100% - 13px) 0, 100% 50%, calc(100% - 13px) 100%, 0 100%, 13px 50%);
  animation: rungOn 0.5s var(--ease-out) both;
  animation-delay: calc(var(--i) * 90ms);
}
.seg:first-child {
  padding-left: 16px;
  clip-path: polygon(0 0, calc(100% - 13px) 0, 100% 50%, calc(100% - 13px) 100%, 0 100%);
}
.seg-num { font-size: 20px; font-variant-numeric: lining-nums; }
.seg-word { font-size: 10px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; }
.seg.done { color: var(--teal); background: color-mix(in srgb, var(--teal) 12%, var(--panel)); box-shadow: inset 0 -2px 0 var(--teal); }
.seg.next {
  color: var(--gold);
  box-shadow: inset 0 -2px 0 var(--gold);
  animation: rungOn 0.5s var(--ease-out) both, next-breathe 2.2s ease-in-out 0.8s infinite;
  animation-delay: calc(var(--i) * 90ms), 0.8s;
}
@keyframes next-breathe { 50% { background: color-mix(in srgb, var(--gold) 14%, var(--panel)); } }

.mc-grid {
  display: grid;
  grid-template-columns: minmax(240px, 300px) minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}

.haul {
  --tier: var(--tier-c);
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--tier) 14%, var(--panel)), var(--panel) 60%);
  box-shadow: inset 0 0 0 2px var(--gold), 0 0 30px rgba(255, 214, 66, 0.14);
  clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px);
  animation: deal-in 0.55s var(--ease-out) 0.15s both;
}
@keyframes deal-in {
  from { opacity: 0; translate: 0 24px; }
  to { opacity: 1; translate: 0 0; }
}
.haul[data-tier='B'] { --tier: var(--tier-b); }
.haul[data-tier='A'] { --tier: var(--tier-a); }
.haul[data-tier='S'] { --tier: var(--tier-s); }
.haul[data-tier='S+'] { --tier: var(--tier-splus); }
.haul-head { display: flex; align-items: flex-start; justify-content: space-between; min-height: 30px; }
.haul-head .cap { color: var(--gold); }
.haul-tier {
  color: var(--tier);
  font-size: 40px;
  line-height: 0.8;
  text-shadow: 0 0 20px color-mix(in srgb, var(--tier) 50%, transparent);
  animation: slamIn 0.45s var(--ease-impact) 0.4s both;
}
.haul-media {
  position: relative;
  display: block;
  aspect-ratio: 4 / 3;
  border: 1px solid color-mix(in srgb, var(--tier) 50%, var(--line-2));
  background:
    radial-gradient(ellipse 70% 70% at 50% 55%, color-mix(in srgb, var(--tier) 20%, transparent), transparent 75%),
    var(--ground);
}
.haul-media img {
  position: absolute;
  inset: 8%;
  width: 84%;
  height: 84%;
  object-fit: contain;
  filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.55));
}
.haul-copy { container-type: inline-size; display: flex; flex-direction: column; gap: 4px; }
.haul-cat { color: var(--muted); }
.haul-name { font-size: min(20px, 100cqi / var(--fit-len, 1)); line-height: 1.05; }
.haul-empty { margin: 0; padding: 24px 0; color: var(--muted); font-size: 14px; }
.haul-credits {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--line-2);
  color: var(--muted);
  font-size: 12px;
}
.haul-amount { color: var(--gold); font-size: 20px; }

.shop {
  padding: 16px;
  background: var(--rail);
  box-shadow: inset 0 0 0 1px var(--line-2);
  animation: deal-in 0.55s var(--ease-out) 0.25s both;
}

.mc-foot { display: flex; justify-content: center; }
.cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  width: min(100%, 440px);
  min-height: 60px;
  padding: 0 24px;
  border: 0;
  background: linear-gradient(180deg, #ffe57a 0%, var(--gold) 45%, #f0bf1a 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6), inset 0 -3px 0 rgba(110, 80, 0, 0.35), 0 0 34px rgba(255, 214, 66, 0.24);
  color: var(--on-gold);
  font: 800 18px var(--font-display);
  font-stretch: 125%;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
}
.cta:hover { filter: brightness(1.06); }
.waiting { margin: 0; color: var(--muted); font-size: 14px; text-align: center; }

@media (max-width: 860px) {
  .mc-grid { grid-template-columns: minmax(0, 1fr); }
}

.phone { gap: 14px; }
.phone .mc-head { align-items: flex-start; text-align: left; }
.phone .kick::after { display: none; }
.phone .mc-title { font-size: 38px; }
.phone .mc-sub { font-size: 13px; }
.phone .track { width: 100%; }
.phone .seg { flex: 1; min-width: 0; height: 40px; padding: 0 8px 0 16px; gap: 6px; }
.phone .seg:first-child { padding-left: 10px; }
.phone .seg-word { display: none; }
.phone .haul {
  display: grid;
  grid-template-columns: 112px minmax(0, 1fr);
  grid-template-rows: auto 1fr auto;
  column-gap: 12px;
  row-gap: 6px;
}
.phone .haul-head { grid-column: 1 / -1; }
.phone .haul-media { grid-row: 2 / 4; aspect-ratio: 1; }
.phone .haul-credits { grid-column: 2; }
.phone .shop { padding: 12px; }
</style>
