<script setup lang="ts">
import { currentFront, draftSummaryFor, honorsPending } from '~~/shared/engine/selectors'
import type { DiverState, DiveState } from '~~/shared/engine/types'

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
  upperName(props.state.divers.find(diver => diver.id === props.state.hostId)?.name) ?? 'The host')

const squadDrafts = computed(() =>
  props.state.divers
    .filter(diver => diver.id !== props.selfId)
    .map(diver => ({ id: diver.id, name: upperName(diver.name), summary: draftSummaryFor(props.state, diver) })))

const nextDrop = computed(() => {
  if (opEnds.value) {
    return 'Operation complete — the crusade’s last rung is cleared.'
  }
  const where = front.value ? ` · ${front.value.displayName} front` : ''
  return `Next drop: mission ${mission.value + 1} of ${props.opLength}${where}`
})
const honorsLocked = computed(() => honorsPending(props.state))
const ctaLabel = computed(() => {
  if (honorsLocked.value) {
    return 'Award honors first'
  }
  return opEnds.value ? 'Complete operation' : 'Next mission'
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
      <MissionTrack
        :mission="mission"
        :op-length="opLength"
        :phone="phone"
      />
    </header>

    <div class="mc-grid">
      <MissionBankedHaul
        :state="state"
        :self="self"
        :phone="phone"
      />

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
          v-if="canControl && !honorsLocked"
          class="bar-cta cta-sweep"
          type="button"
          @click="emit('advance')"
        >
          <span class="disp">{{ ctaLabel }}</span>
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
      class="mc-foot"
    >
      <button
        v-if="canControl"
        class="cta cut cta-sweep"
        :class="{ 'cta-locked': honorsLocked }"
        type="button"
        :disabled="honorsLocked"
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

.mc-grid {
  display: grid;
  grid-template-columns: minmax(240px, 300px) minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}

@keyframes deal-in {
  from { opacity: 0; translate: 0 24px; }
  to { opacity: 1; translate: 0 0; }
}

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
.cta:disabled { opacity: 0.4; cursor: not-allowed; filter: none; }
.waiting { margin: 0; color: var(--muted); font-size: 14px; text-align: center; }

@media (max-width: 860px) {
  .mc-grid { grid-template-columns: minmax(0, 1fr); }
}

.phone { gap: 14px; }
.phone .mc-head { align-items: flex-start; text-align: left; }
.phone .kick::after { display: none; }
.phone .mc-title { font-size: 38px; }
.phone .mc-sub { font-size: 13px; }
.phone .shop { padding: 12px; }
</style>
