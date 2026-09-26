<script setup lang="ts">
import { FRONTS } from '~~/shared/data/fronts'
import { factionImageUrl, strainImageUrl } from '~~/shared/data/images'
import { MISFORTUNE_RISK, MAJOR_ORDER_REROLL_BONUS, STRAIN_RISK } from '~~/shared/engine/config'
import {
  canRerollWheel,
  currentFront,
  currentMisfortune,
  currentStrain,
  misfortuneDecision,
  misfortuneStrandedDivers,
  strainDecision,
} from '~~/shared/engine/selectors'
import { eligibleMisfortunes, eligibleStrains } from '~~/shared/engine/wheel'
import type { DiveState } from '~~/shared/engine/types'
import { ACCOUNTABILITY_LABELS } from '~/utils/accountability'
import { riseIn } from '~/utils/motion'

const props = withDefaults(defineProps<{ state: DiveState, canControl?: boolean }>(), { canControl: true })
defineEmits<{
  spin: []
  decide: [accepted: boolean]
  decideStrain: [accepted: boolean]
  reroll: [wheel: 'misfortune' | 'front' | 'strain']
}>()

// The card shows the drawn misfortune — the squad decides on what it can see.
// (activeMisfortune is the accepted-only variant, used by briefing/pacts.)
const misfortune = computed(() => currentMisfortune(props.state))
const front = computed(() => currentFront(props.state))
const strain = computed(() => currentStrain(props.state))
const majorOrder = computed(() => props.state.majorOrder)
const misfortuneReroll = computed(() => canRerollWheel(props.state, 'misfortune'))
const frontReroll = computed(() => canRerollWheel(props.state, 'front'))
const strainReroll = computed(() => canRerollWheel(props.state, 'strain'))
const teamRisk = computed(() =>
  props.state.wheel ? (MISFORTUNE_RISK[props.state.wheel.misfortuneId] ?? 0) : 0,
)
const strainRisk = computed(() =>
  strain.value ? (STRAIN_RISK[strain.value.id] ?? 0) : 0,
)

// The strain is an operation-long commitment, answered on the operation's
// first mission independently of the misfortune (either call may come first).
// In 'pacts' it may still flip until the first pact lock, like the misfortune.
const strainIcon = computed(() => (strain.value ? strainImageUrl(strain.value.id) : undefined))
const strainCall = computed(() => strainDecision(props.state))
const strainDeciding = computed(() => strain.value !== null && !strainCall.value.decided)
const strainSwitchable = computed(() =>
  props.state.phase === 'pacts'
  && strain.value !== null
  && props.state.missionInOperation === 1
  && !props.state.divers.some(diver => diver.pactsLocked))

// The decision is its own phase: the spin leaves the squad in 'decision', and
// only the accepted-or-declined call moves them on to pacts. A switch is still
// allowed while nobody has locked pacts — team risk is shared, so the call
// freezes at the first pact lock.
const decision = computed(() => misfortuneDecision(props.state))
const decisionOpen = computed(() =>
  props.state.phase === 'decision'
  && props.state.wheel !== null)
const canSwitch = computed(() =>
  props.state.phase === 'pacts'
  && props.state.wheel !== null
  && !props.state.divers.some(diver => diver.pactsLocked))
const rerollWindow = computed(() =>
  (props.state.phase === 'decision'
    || props.state.phase === 'strain'
    || props.state.phase === 'pacts')
  && props.state.wheel !== null
  && !props.state.divers.some(diver => diver.pactsLocked))

// A squad-binding rule every diver must be able to field: a drawn misfortune
// that strands a diver below HD2's four required stratagems can't be accepted.
// The reducer refuses it too — this is the legible half.
const stranded = computed(() => misfortuneStrandedDivers(props.state))
const acceptBlocked = computed(() => stranded.value.length > 0)
const strandedReason = computed(() => {
  const names = stranded.value.map(diver => diver.name)
  if (names.length === 0) {
    return ''
  }
  return `${names.join(', ')} can't field four stratagems under this rule — opt out or reroll.`
})

const misfortuneNames = computed(() =>
  eligibleMisfortunes(props.state.difficulty).map(entry => entry.name),
)
const frontNames = computed(() => FRONTS.map(entry => entry.displayName))
const strainNames = computed(() =>
  props.state.frontId
    ? eligibleStrains(props.state.difficulty, props.state.frontId).map(entry => entry.name)
    : [],
)

const misfortuneReeling = ref(false)
const frontReeling = ref(false)
const strainReeling = ref(false)
// The front card hides its static content (blurb, risk, buttons) while any of
// its reels runs, so a roll never spoils its own draw.
const cardReeling = computed(() =>
  misfortuneReeling.value || frontReeling.value || strainReeling.value)

// Faction colors keyed by display name, so the reel rolls its candidates in
// their own colors and never shows the winner's before it lands.
const frontColors: Record<string, string> = Object.fromEntries(
  FRONTS.map(entry => [entry.displayName, entry.accent]),
)

// Reels replay only on live changes — a spin or reroll re-seeds them, while a
// page load mid-phase settles straight onto the stored result.
const misfortuneReelId = ref<number | null>(null)
watch(() => props.state.wheel?.seed ?? null, (seed) => {
  if (seed !== null) {
    misfortuneReelId.value = seed
  }
})

const frontReelId = ref<string | null>(null)
let frontTick = 0

// The strain is a subfaction of the front, so it reels only after the front
// settles — never alongside it. A spin or front reroll queues the strain roll;
// a strain-only reroll has no front reel to wait for and runs at once.
const strainReelId = ref<string | null>(null)
let strainTick = 0
let strainQueued = false
function startStrainReel(): void {
  strainTick++
  strainReelId.value = `${misfortuneReelId.value}:strain:${strainTick}`
}

// The card frame stays neutral until the drawn front actually settles — the
// reel has a start delay, so keying the frame to the state change alone makes
// the border flash before the roll begins.
const frontSettled = ref(true)
function onFrontReeling(rolling: boolean): void {
  frontReeling.value = rolling
  if (!rolling) {
    frontSettled.value = true
    if (strainQueued) {
      strainQueued = false
      startStrainReel()
    }
  }
}

watch(() => props.state.frontId, (id, prev) => {
  if (id === null || misfortuneReelId.value === null) {
    return
  }
  if (prev !== undefined) {
    frontTick++
  }
  frontReelId.value = `${misfortuneReelId.value}:${frontTick}`
  frontSettled.value = false
})

watch(() => props.state.strainId, (id, prev) => {
  if (id === null || misfortuneReelId.value === null || prev === undefined) {
    return
  }
  // The front changed in the same tick and is reeling: wait for it to settle.
  if (!frontSettled.value) {
    strainQueued = true
    return
  }
  startStrainReel()
})

const strainStamp = computed(() => {
  if (!strain.value) {
    return { locked: false, text: 'Standard forces', tone: 'safe' }
  }
  if (!strainCall.value.decided) {
    return {
      locked: false,
      text: props.canControl ? 'Strain call pending' : 'Strain call — awaiting host',
      tone: 'pending',
    }
  }
  return strainCall.value.accepted
    ? { locked: true, text: 'Strain active — team-wide', tone: 'locked' }
    : { locked: false, text: 'Standard forces — no strain', tone: 'safe' }
})

const cardTone = computed(() =>
  decision.value.decided
    ? decision.value.accepted ? 'locked' : 'safe'
    : decisionOpen.value ? 'pending' : 'safe')

const stamp = computed(() => {
  if (decision.value.decided) {
    return decision.value.accepted
      ? { locked: true, text: 'Locked in — team-wide', tone: 'locked' }
      : { locked: false, text: 'Opted out — safe dive', tone: 'safe' }
  }
  if (decisionOpen.value) {
    return {
      locked: false,
      text: props.canControl ? 'Decision pending' : 'Awaiting host',
      tone: 'pending',
    }
  }
  return { locked: false, text: 'Undecided — safe dive', tone: 'safe' }
})

function rerollLabel(
  info: { allowed: boolean, free: boolean, reason: string | null },
  wheel: 'misfortune' | 'front' | 'strain',
): string {
  if (!info.allowed) {
    return info.reason ?? `Reroll ${wheel}`
  }
  return info.free
    ? `Reroll ${wheel} — free: combo already completed`
    : `Reroll ${wheel} — spends a reroll token (${props.state.rerollTokens} left)`
}
</script>

<template>
  <section class="panel">
    <h2>Wheel of Misfortune</h2>
    <div class="wheel-result">
      <Motion
        as="div"
        class="wheel-card misfortune"
        :class="[state.wheel ? cardTone : 'pending', { reeling: misfortuneReeling }]"
        v-bind="riseIn(0)"
      >
        <span class="card-head">
          <span class="muted small">Misfortune</span>
          <span
            v-if="state.wheel"
            class="head-tools"
          >
            <AppTooltip
              v-if="canControl && rerollWindow"
              :content="rerollLabel(misfortuneReroll, 'misfortune')"
              :disabled="!misfortuneReroll.allowed || misfortuneReeling"
            >
              <button
                class="reroll-dice"
                type="button"
                :disabled="!misfortuneReroll.allowed || misfortuneReeling"
                :aria-label="rerollLabel(misfortuneReroll, 'misfortune')"
                :title="!misfortuneReroll.allowed || misfortuneReeling ? rerollLabel(misfortuneReroll, 'misfortune') : undefined"
                @click="$emit('reroll', 'misfortune')"
              ><IconDice /></button>
            </AppTooltip>
            <AppTooltip :content="stamp.text">
              <span
                class="lock"
                :class="stamp.tone"
                role="img"
                :aria-label="stamp.text"
              ><IconLock :open="!stamp.locked" /></span>
            </AppTooltip>
          </span>
        </span>
        <template v-if="state.wheel">
          <strong class="misfortune-name">
            <ReelText
              :final="misfortune?.name ?? ''"
              :candidates="misfortuneNames"
              :reel-id="misfortuneReelId"
              @reeling="misfortuneReeling = $event"
            />
          </strong>
          <p>{{ misfortune?.rule }}</p>
          <p
            v-if="misfortune"
            class="small muted"
          >
            {{ ACCOUNTABILITY_LABELS[misfortune.accountability] }}
          </p>
          <span class="row risk-row small muted">Team risk <RiskPips
            :value="teamRisk"
            :rolling="misfortuneReeling"
          /></span>
          <p
            v-if="acceptBlocked && canControl && !decision.decided"
            class="stranded-note small"
          >
            {{ strandedReason }}
          </p>
          <div
            v-if="!decision.decided && canControl"
            class="row decision-actions"
          >
            <button
              class="btn primary"
              type="button"
              :disabled="misfortuneReeling || acceptBlocked"
              :title="acceptBlocked ? strandedReason : undefined"
              @click="$emit('decide', true)"
            >
              Lock it in
            </button>
            <button
              class="btn ghost"
              type="button"
              :disabled="misfortuneReeling"
              @click="$emit('decide', false)"
            >
              Opt out
            </button>
          </div>
          <button
            v-else-if="decision.decided && canSwitch"
            class="btn tiny ghost"
            type="button"
            :disabled="!decision.accepted && acceptBlocked"
            :title="!decision.accepted && acceptBlocked ? strandedReason : undefined"
            @click="$emit('decide', !decision.accepted)"
          >
            {{ decision.accepted ? 'Switch — opt out' : 'Switch — lock it in' }}
          </button>
          <p
            v-else-if="!decision.decided && !canControl"
            class="muted small"
          >
            The host decides before pacts roll.
          </p>
        </template>
        <button
          v-else
          class="spin-overlay"
          type="button"
          :disabled="!canControl"
          @click="$emit('spin')"
        >
          <strong>Spin</strong>
        </button>
      </Motion>
      <Motion
        as="div"
        class="wheel-card front-card"
        :class="{ reeling: cardReeling, accented: !!front && frontSettled }"
        :style="front ? { '--front-accent': front.accent } : undefined"
        v-bind="riseIn(1)"
      >
        <AnimatePresence>
          <Motion
            v-if="front && frontSettled"
            :key="front.id"
            as="img"
            class="front-art"
            :src="factionImageUrl(front.id)"
            alt=""
            draggable="false"
            :initial="{ opacity: 0, x: 26 }"
            :animate="{ opacity: 0.16, x: 0 }"
            :exit="{ opacity: 0, x: 26 }"
            :transition="{ duration: 0.45, ease: 'easeOut' }"
          />
        </AnimatePresence>
        <span class="card-head">
          <span class="muted small">Front</span>
          <span
            v-if="state.wheel && canControl"
            class="head-tools"
          >
            <AppTooltip
              :content="rerollLabel(frontReroll, 'front')"
              :disabled="!frontReroll.allowed || frontReeling"
            >
              <button
                class="reroll-dice"
                type="button"
                :disabled="!frontReroll.allowed || frontReeling"
                :aria-label="rerollLabel(frontReroll, 'front')"
                :title="!frontReroll.allowed || frontReeling ? rerollLabel(frontReroll, 'front') : undefined"
                @click="$emit('reroll', 'front')"
              ><IconDice /></button>
            </AppTooltip>
          </span>
        </span>
        <template v-if="state.wheel">
          <strong class="misfortune-name">
            <ReelText
              :final="front?.displayName ?? ''"
              :candidates="frontNames"
              :colors="frontColors"
              :reel-id="frontReelId"
              :start-delay="150"
              @reeling="onFrontReeling"
            />
          </strong>
          <span
            v-if="majorOrder"
            class="mo-tag"
            :title="majorOrder.title ?? undefined"
          >
            Major Order · +{{ MAJOR_ORDER_REROLL_BONUS }} reroll on completion
          </span>
          <div
            v-if="strain"
            class="strain"
          >
            <span class="strain-head">
              <span class="muted small">Strain</span>
              <span class="head-tools">
                <AppTooltip
                  v-if="canControl && rerollWindow"
                  :content="rerollLabel(strainReroll, 'strain')"
                  :disabled="!strainReroll.allowed || cardReeling"
                >
                  <button
                    class="reroll-dice"
                    type="button"
                    :disabled="!strainReroll.allowed || cardReeling"
                    :aria-label="rerollLabel(strainReroll, 'strain')"
                    :title="!strainReroll.allowed || cardReeling ? rerollLabel(strainReroll, 'strain') : undefined"
                    @click="$emit('reroll', 'strain')"
                  ><IconDice /></button>
                </AppTooltip>
                <AppTooltip :content="strainStamp.text">
                  <span
                    class="lock"
                    :class="strainStamp.tone"
                    role="img"
                    :aria-label="strainStamp.text"
                  ><IconLock :open="!strainStamp.locked" /></span>
                </AppTooltip>
              </span>
            </span>
            <strong
              class="strain-name"
              :class="{ waiting: cardReeling && !strainReeling }"
            >
              <span
                v-if="strainIcon && !cardReeling"
                class="strain-icon"
                :style="{ maskImage: `url(${strainIcon})`, WebkitMaskImage: `url(${strainIcon})` }"
                aria-hidden="true"
              />
              <ReelText
                :final="strain.name"
                :candidates="strainNames"
                :reel-id="strainReelId"
                @reeling="strainReeling = $event"
              />
            </strong>
            <span class="row risk-row small muted">Team risk <RiskPips
              :value="strainRisk"
              :rolling="strainReeling"
            /></span>
            <div
              v-if="strainDeciding && canControl"
              class="row decision-actions"
            >
              <button
                class="btn primary"
                type="button"
                :disabled="cardReeling"
                @click="$emit('decideStrain', true)"
              >
                Lock it in
              </button>
              <button
                class="btn ghost"
                type="button"
                :disabled="cardReeling"
                @click="$emit('decideStrain', false)"
              >
                Opt out
              </button>
            </div>
            <button
              v-else-if="strainSwitchable && canControl"
              class="btn tiny ghost"
              type="button"
              @click="$emit('decideStrain', !strainCall.accepted)"
            >
              {{ strainCall.accepted ? 'Switch — opt out' : 'Switch — lock it in' }}
            </button>
            <p
              v-else-if="strainDeciding && !canControl"
              class="muted small"
            >
              The host decides before pacts roll.
            </p>
          </div>
        </template>
        <template v-else-if="state.frontId">
          <strong class="misfortune-name">{{ front?.displayName }}</strong>
          <span
            v-if="majorOrder"
            class="mo-tag"
            :title="majorOrder.title ?? undefined"
          >
            Major Order · +{{ MAJOR_ORDER_REROLL_BONUS }} reroll on completion
          </span>
          <div
            v-if="strain"
            class="strain"
          >
            <span class="strain-head">
              <span class="muted small">Strain</span>
              <AppTooltip :content="strainStamp.text">
                <span
                  class="lock"
                  :class="strainStamp.tone"
                  role="img"
                  :aria-label="strainStamp.text"
                ><IconLock :open="!strainStamp.locked" /></span>
              </AppTooltip>
            </span>
            <strong class="strain-name">
              <span
                v-if="strainIcon"
                class="strain-icon"
                :style="{ maskImage: `url(${strainIcon})`, WebkitMaskImage: `url(${strainIcon})` }"
                aria-hidden="true"
              />
              {{ strain.name }}
            </strong>
            <span class="row risk-row small muted">Team risk <RiskPips :value="strainRisk" /></span>
          </div>
          <p class="muted small">
            Fixed for the whole operation.
          </p>
        </template>
        <p
          v-else
          class="front-pending muted small"
        >
          Drawn with the first spin
        </p>
      </Motion>
    </div>
    <div class="row">
      <span
        v-if="!state.wheel && !canControl"
        class="muted small"
      >Waiting for the host to spin…</span>
      <span class="muted small">Reroll tokens: {{ state.rerollTokens }}</span>
    </div>
  </section>
</template>

<style scoped>
.wheel-result { display: grid; gap: 0.6rem; grid-template-columns: 1fr; }
.wheel-card {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.75rem;
  display: grid;
  gap: 0.3rem;
  background: var(--bg);
}
.misfortune { position: relative; overflow: hidden; }
.misfortune-name { font-size: 1.1rem; color: var(--gold); }
.front-card { position: relative; overflow: hidden; isolation: isolate; }
.front-card .misfortune-name { color: var(--front-accent, var(--gold)); }
.mo-tag {
  justify-self: start;
  align-self: start;
  font-size: 0.68rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--front-accent, var(--gold));
  border: 1px solid color-mix(in srgb, var(--front-accent, var(--gold)) 45%, var(--border));
  border-radius: 999px;
  padding: 0.1rem 0.5rem;
}

/* The strain is a subfaction of the front: same card, its own divider. */
.strain {
  display: grid;
  gap: 0.3rem;
  margin-top: 0.35rem;
  padding-top: 0.45rem;
  border-top: 1px dashed color-mix(in srgb, var(--front-accent, var(--border)) 35%, var(--border));
}
.strain-head { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
.strain-name {
  font-size: 0.98rem;
  color: var(--front-accent, var(--gold));
  transition: opacity 0.35s var(--ease-out);
}
/* While the front (or the misfortune) reels, the strain waits its turn: hold
   its name back so the queued draw can't spoil itself. */
.strain-name.waiting { opacity: 0; visibility: hidden; }

/* The strain emblem is tinted to the front's accent with a mask, so one
   monochrome emblem set reads in faction colors. */
.strain-icon {
  display: inline-block;
  width: 1.35rem;
  height: 1.35rem;
  margin-right: 0.4rem;
  vertical-align: -0.3rem;
  background-color: var(--front-accent, var(--gold));
  mask-repeat: no-repeat;
  mask-position: center;
  mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-position: center;
  -webkit-mask-size: contain;
}

/* Faction emblem watermark: behind the card text (isolation keeps z-index -1
   above the card's own background), slides in from the right edge on settle
   and slides back out while a roll is live. */
.front-art {
  position: absolute;
  top: 50%;
  right: -0.5rem;
  translate: 0 -50%;
  width: 7rem;
  z-index: -1;
  pointer-events: none;
}

/* A settled front frames its card in faction colors — border and a faint
   wash. While the reel spins the frame stays neutral: the names rolling by
   carry their own faction colors, so nothing gives the draw away early. The
   border fades in only on the way back, so a settle reads as a reveal. */
.front-card.accented {
  border-color: color-mix(in srgb, var(--front-accent) 55%, var(--border));
  background:
    linear-gradient(165deg, color-mix(in srgb, var(--front-accent) 10%, transparent), transparent 55%),
    var(--bg);
  transition: border-color var(--dur-med) var(--ease-out);
}

.wheel-card.misfortune.pending {
  border-style: dashed;
  border-color: color-mix(in srgb, var(--gold) 50%, var(--border));
}
.wheel-card.misfortune.pending::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(100deg, transparent 22%, color-mix(in srgb, var(--gold) 9%, transparent) 50%, transparent 78%);
  animation: decision-sweep 3.2s ease-in-out infinite;
  pointer-events: none;
}
@keyframes decision-sweep {
  0% { transform: translateX(-130%); }
  55%, 100% { transform: translateX(130%); }
}
.wheel-card.misfortune.locked {
  border-color: color-mix(in srgb, var(--red) 50%, var(--border));
  background:
    linear-gradient(165deg, color-mix(in srgb, var(--red) 10%, transparent), transparent 55%),
    var(--bg);
}
.wheel-card.misfortune.safe { opacity: 0.82; }
.wheel-card.misfortune.safe .misfortune-name { color: var(--muted); }

/* Pre-spin the misfortune card is face down: the card itself is the button. */
.spin-overlay {
  display: grid;
  place-content: center;
  min-height: 7.5rem;
  width: 100%;
  padding: 0;
  background: transparent;
  border: none;
  color: var(--gold);
  font: inherit;
  cursor: pointer;
  animation: spin-pulse 1.6s ease-in-out infinite;
}
.spin-overlay strong {
  font-family: var(--font-display);
  font-stretch: 125%;
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.spin-overlay:hover:not(:disabled) strong {
  text-shadow: 0 0 18px color-mix(in srgb, var(--gold) 65%, transparent);
}
.spin-overlay:disabled { cursor: default; opacity: 0.55; animation: none; }
@keyframes spin-pulse {
  0%, 100% { text-shadow: 0 0 0 color-mix(in srgb, var(--gold) 40%, transparent); }
  50% { text-shadow: 0 0 18px color-mix(in srgb, var(--gold) 55%, transparent); }
}

.front-pending {
  display: grid;
  place-content: center;
  min-height: 4rem;
  border: 1px dashed var(--border);
  border-radius: 8px;
}

.card-head { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
.head-tools { display: inline-flex; align-items: center; gap: 0.45rem; }

.reroll-dice {
  display: inline-grid;
  place-items: center;
  padding: 0;
  width: 1.7rem;
  height: 1.7rem;
  flex-shrink: 0;
  background: none;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--khaki);
  cursor: pointer;
  transition: border-color var(--dur-fast) ease, color var(--dur-fast) ease;
}
.reroll-dice svg { width: 1.05rem; height: 1.05rem; }
.reroll-dice:hover:not(:disabled) { border-color: var(--gold); color: var(--gold); }
.reroll-dice:disabled { opacity: 0.4; cursor: not-allowed; }

/* The decision state is an icon, not a chip: a closed lock when the call is
   locked in, an open one otherwise, with the tone carrying pending/safe. The
   tooltip and aria-label spell out the state the old chip used to print. */
.lock {
  display: inline-grid;
  place-items: center;
  width: 1.7rem;
  height: 1.7rem;
  flex-shrink: 0;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--muted);
}
.lock svg { width: 1.05rem; height: 1.05rem; }
.lock.pending {
  color: var(--gold);
  border-color: color-mix(in srgb, var(--gold) 60%, transparent);
  animation: lock-pulse 2s ease-in-out infinite;
}
.lock.locked { color: var(--red); border-color: var(--red); }
.lock.safe { color: var(--muted); }
@keyframes lock-pulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .lock.pending { animation: none; }
}

.stranded-note {
  color: var(--red);
  border-left: 2px solid var(--red);
  padding-left: 0.5rem;
}

/* While a reel is spinning, the card's static content steps aside for it.
   The misfortune's rule and accountability would spoil the draw if merely
   dimmed, so they are hidden outright (visibility also keeps them out of the
   a11y tree and unselectable); the team-risk row stays put — its pips are
   rolling, not settling. */
.wheel-card.reeling p,
.wheel-card.reeling .row:not(:first-child):not(.risk-row),
.wheel-card.reeling .btn {
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s ease-in;
}
.wheel-card p,
.wheel-card .row,
.wheel-card .btn {
  transition: opacity 0.35s var(--ease-out);
}

@media (min-width: 640px) {
  .wheel-result { grid-template-columns: 1fr 1fr; }
}
</style>
