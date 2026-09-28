<script setup lang="ts">
import { FRONTS } from '~~/shared/data/fronts'
import { factionImageUrl, strainImageUrl } from '~~/shared/data/images'
import {
  MAJOR_ORDER_REROLL_BONUS,
  MAJOR_ORDER_RISK,
  MISFORTUNE_RISK,
  STRAIN_RISK,
  missionsPerOperation,
} from '~~/shared/engine/config'
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
import { catchUpOpsBehind } from '~~/shared/engine/progression'
import type { DiveState } from '~~/shared/engine/types'
import { ACCOUNTABILITY_LABELS } from '~/utils/accountability'
import { riseIn } from '~/utils/motion'

const props = withDefaults(defineProps<{ state: DiveState, canControl?: boolean }>(), { canControl: true })
const emit = defineEmits<{
  spin: []
  decide: [accepted: boolean]
  decideStrain: [accepted: boolean]
  deal: []
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
const opLength = computed(() => missionsPerOperation(props.state.difficulty))

// The strain is an operation-long commitment, answered on the operation's
// first mission independently of the misfortune (either call may come first).
// In 'pacts' it may still flip until the first pact lock, like the misfortune.
const strainIcon = computed(() => (strain.value ? strainImageUrl(strain.value.id) : undefined))
const strainCall = computed(() => strainDecision(props.state))
const strainDeciding = computed(() => strain.value !== null && !strainCall.value.decided)
const strainSwitchable = computed(() =>
  (props.state.phase === 'deal' || props.state.phase === 'pacts')
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
  (props.state.phase === 'deal' || props.state.phase === 'pacts')
  && props.state.wheel !== null
  && !props.state.divers.some(diver => diver.pactsLocked))
const rerollWindow = computed(() =>
  (props.state.phase === 'decision'
    || props.state.phase === 'strain'
    || props.state.phase === 'deal'
    || props.state.phase === 'pacts')
  && props.state.wheel !== null
  && !props.state.divers.some(diver => diver.pactsLocked))

// The host gate: once both calls are in, the wheel holds with a "Deal the
// pacts" CTA until the host deals the hand. A reroll can reopen a call, so the
// CTA waits for both decisions to stand.
const dealReady = computed(() =>
  props.state.phase === 'deal'
  && decision.value.decided
  && strainCall.value.decided)

// Pre-roll the faction card carries the Major Order chooser: on narrow screens
// it leads, so the squad picks where to fight before hitting Spin.
const preRoll = computed(() => !props.state.wheel && !props.state.frontId)

// The operation ordinal (each cleared operation bumps difficulty by one), so
// the title reads "Operation 5 · Mission 1 of 3" like the rest of the terminal.
const variant = computed(() => props.state.settings?.variant ?? 'standard')
const opNumber = computed(() => catchUpOpsBehind(props.state.difficulty, variant.value) + 1)
const subtitle = computed(() => {
  const base = `Operation ${opNumber.value} · Mission ${props.state.missionInOperation} of ${opLength.value}`
  return preRoll.value ? `${base} · first spin draws the front` : base
})

// Pre-spin the front is unknown; the hint shows whether the Major Order (or a
// manual pick) has already pinned it, and which faction that is.
const pinnedFronts = computed(() => props.state.majorOrder?.fronts ?? [])
const frontHint = computed(() => {
  if (pinnedFronts.value.length > 0) {
    const names = pinnedFronts.value
      .map(id => FRONTS.find(front => front.id === id)?.displayName ?? id)
      .join(' / ')
    return `${names} pinned by the Major Order — no strain drawn.`
  }
  return 'Drawn with the first spin — a subfaction joins it.'
})

// The wheel spins on the seed before the result cards reveal. Purely
// presentational: the engine result already exists, this just holds the reveal
// for the rotation. Reduced motion skips straight to the cards.
const spinning = ref(false)
let spinTimer: ReturnType<typeof setTimeout> | undefined
watch(
  () => props.state.wheel?.seed,
  (seed, previous) => {
    clearTimeout(spinTimer)
    if (seed === undefined || seed === previous) {
      spinning.value = false
      return
    }
    const reduced = import.meta.client
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      spinning.value = false
      return
    }
    spinning.value = true
    spinTimer = setTimeout(() => {
      spinning.value = false
    }, 2400)
  },
)
onBeforeUnmount(() => clearTimeout(spinTimer))

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

// A held accept: the squad has to press and hold to commit, so a stray tap
// never locks a team-wide risk. A keyboard activation or a plain click still
// commits — the hold is an intentionality flourish, not a gate.
const HOLD_MS = 650
function useHold(onCommit: () => void, allowed: () => boolean) {
  const holding = ref(false)
  const committed = ref(false)
  let timer: ReturnType<typeof setTimeout> | undefined
  function down(): void {
    if (!allowed()) {
      return
    }
    committed.value = false
    holding.value = true
    clearTimeout(timer)
    timer = setTimeout(() => {
      committed.value = true
      holding.value = false
      onCommit()
    }, HOLD_MS)
  }
  function up(): void {
    holding.value = false
    clearTimeout(timer)
    if (committed.value) {
      setTimeout(() => {
        committed.value = false
      }, 300)
    }
  }
  function click(): void {
    if (committed.value) {
      committed.value = false
      return
    }
    if (allowed()) {
      onCommit()
    }
  }
  onBeforeUnmount(() => clearTimeout(timer))
  return { holding, down, up, click }
}

const acceptAllowed = computed(() => props.canControl && !acceptBlocked.value && !misfortuneReeling.value)
const acceptHold = useHold(() => emit('decide', true), () => acceptAllowed.value)
const strainAcceptAllowed = computed(() => props.canControl && !cardReeling.value)
const strainHold = useHold(() => emit('decideStrain', true), () => strainAcceptAllowed.value)

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
  // A Major Order pins the front: it is known, not drawn — show it settled
  // instead of rolling through the roster.
  if (props.state.majorOrder) {
    frontSettled.value = true
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
  <section class="panel wheel-panel">
    <header class="sh wheel-head">
      <div class="wheel-head-l">
        <span class="lbl">{{ subtitle }}</span>
        <h2 class="disp wheel-title">
          Wheel of Misfortune
        </h2>
      </div>
      <AppTooltip
        :content="rerollLabel(misfortuneReroll, 'misfortune')"
        :disabled="!canControl || !misfortuneReroll.allowed || misfortuneReeling"
      >
        <button
          class="btn ghost reroll-main"
          type="button"
          :disabled="!canControl || !misfortuneReroll.allowed || misfortuneReeling"
          :aria-label="rerollLabel(misfortuneReroll, 'misfortune')"
          @click="emit('reroll', 'misfortune')"
        >
          <IconDice />
          <span class="reroll-text">Reroll</span>
          <span class="reroll-tally">
            <span
              class="chit hex"
              :class="{ on: state.rerollTokens > 0 }"
              aria-hidden="true"
            />
            <b>{{ state.rerollTokens }}</b>
          </span>
        </button>
      </AppTooltip>
    </header>

    <div class="wheel-body">
      <WheelOfMisfortune
        :difficulty="state.difficulty"
        :seed="state.wheel?.seed ?? null"
        :can-control="canControl"
        :spinning="spinning"
        @spin="$emit('spin')"
      />
      <div class="wheel-side">
        <template v-if="preRoll">
          <slot name="front-before-roll" />
          <section
            class="front-hint cut-sm"
            aria-label="Front and strain"
          >
            <div
              class="front-hint-emblems"
              aria-hidden="true"
            >
              <img
                v-for="entry in FRONTS"
                :key="entry.id"
                :src="factionImageUrl(entry.id)"
                alt=""
                :class="{ on: pinnedFronts.includes(entry.id) }"
                draggable="false"
              >
            </div>
            <div class="front-hint-copy">
              <span class="lbl">Front + strain</span>
              <span class="front-hint-text">{{ frontHint }}</span>
            </div>
          </section>
        </template>
        <section
          v-else-if="spinning"
          class="drawing cut-sm"
          aria-live="polite"
        >
          <span class="disp drawing-word pulse">Drawing</span>
          <span class="lbl">Misfortune · front · strain</span>
        </section>
        <div
          v-else
          class="wheel-result"
        >
          <Motion
            as="article"
            class="wheel-card misfortune cut-sm"
            :class="[state.wheel ? cardTone : 'pending', { reeling: misfortuneReeling }]"
            v-bind="riseIn(0)"
          >
            <div class="card-head">
              <span class="lbl">Misfortune <span class="dim">· whole squad</span></span>
              <span
                v-if="state.wheel"
                class="head-tools"
              >
                <AppTooltip :content="stamp.text">
                  <span
                    class="lock"
                    :class="stamp.tone"
                    role="img"
                    :aria-label="stamp.text"
                  ><IconLock :open="!stamp.locked" /></span>
                </AppTooltip>
              </span>
            </div>

            <template v-if="state.wheel">
              <div
                class="misfortune-name disp"
                aria-live="polite"
              >
                <ReelText
                  :final="misfortune?.name ?? ''"
                  :candidates="misfortuneNames"
                  :reel-id="misfortuneReelId"
                  @reeling="misfortuneReeling = $event"
                />
              </div>
              <p class="rule reel-hide">
                {{ misfortune?.rule }}
              </p>
              <p
                v-if="misfortune"
                class="odl account reel-hide"
              >
                {{ ACCOUNTABILITY_LABELS[misfortune.accountability] }}
              </p>
              <div class="risk-row">
                <span class="cap">Team risk</span>
                <RiskPips
                  :value="teamRisk"
                  :rolling="misfortuneReeling"
                />
                <span
                  v-if="teamRisk > 0"
                  class="risk-plus disp"
                >+{{ teamRisk }}</span>
              </div>
              <p
                v-if="acceptBlocked && canControl && !decision.decided"
                class="stranded-note reel-hide"
              >
                {{ strandedReason }}
              </p>
              <div
                v-if="!decision.decided && canControl"
                class="decision-actions reel-hide"
              >
                <button
                  class="btn primary cut hold"
                  type="button"
                  :disabled="!acceptAllowed"
                  :title="acceptBlocked ? strandedReason : undefined"
                  @pointerdown="acceptHold.down"
                  @pointerup="acceptHold.up"
                  @pointerleave="acceptHold.up"
                  @click="acceptHold.click"
                >
                  <span
                    aria-hidden="true"
                    class="hazard crawl hold-fill"
                    :class="{ on: acceptHold.holding.value }"
                  />
                  <span class="hold-label">
                    <span class="disp">Lock it in</span>
                    <span
                      class="hold-sub"
                      aria-hidden="true"
                    >{{ acceptBlocked ? 'Blocked' : 'Hold to lock' }}</span>
                  </span>
                </button>
                <button
                  class="btn ghost opt-out"
                  type="button"
                  :disabled="misfortuneReeling"
                  @click="emit('decide', false)"
                >
                  <span class="disp">Opt out</span>
                  <span
                    class="hold-sub"
                    aria-hidden="true"
                  >+0</span>
                </button>
              </div>
              <button
                v-else-if="decision.decided && canSwitch"
                class="btn tiny ghost"
                type="button"
                :disabled="!decision.accepted && acceptBlocked"
                :title="!decision.accepted && acceptBlocked ? strandedReason : undefined"
                @click="emit('decide', !decision.accepted)"
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
            <p
              v-else
              class="cap spin-hint"
            >
              {{ canControl ? 'Spin the wheel to draw' : 'Awaiting the host’s spin' }}
            </p>
          </Motion>

          <Motion
            as="article"
            class="wheel-card front-card cut-sm"
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
            <div class="card-head">
              <span class="lbl">Front <span class="dim">· operation lock</span></span>
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
                    @click="emit('reroll', 'front')"
                  ><IconDice /></button>
                </AppTooltip>
              </span>
            </div>

            <template v-if="state.wheel">
              <div class="misfortune-name disp front-name">
                <ReelText
                  :final="front?.displayName ?? ''"
                  :candidates="frontNames"
                  :colors="frontColors"
                  :reel-id="frontReelId"
                  :start-delay="150"
                  @reeling="onFrontReeling"
                />
              </div>
              <span
                v-if="majorOrder?.live"
                class="mo-tag cap reel-hide"
                :title="majorOrder.title ?? undefined"
              >
                Major Order · +{{ MAJOR_ORDER_RISK }} risk · +{{ MAJOR_ORDER_REROLL_BONUS }} reroll
              </span>
              <div
                v-if="state.frontId"
                class="front-lock reel-hide"
              >
                <span
                  v-for="i in opLength"
                  :key="i"
                  class="lock-cell"
                  :class="{ on: i <= state.missionInOperation }"
                  aria-hidden="true"
                />
                <span class="lock-text cap">All {{ opLength }} missions</span>
              </div>
              <div
                v-if="strain"
                class="strain"
              >
                <div class="strain-head">
                  <span class="lbl">Strain <span class="dim">· optional</span></span>
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
                        @click="emit('reroll', 'strain')"
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
                </div>
                <div
                  class="strain-name disp"
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
                </div>
                <div class="risk-row">
                  <span class="cap">Every mission</span>
                  <RiskPips
                    :value="strainRisk"
                    :rolling="strainReeling"
                  />
                  <span
                    v-if="strainRisk > 0"
                    class="risk-plus disp strain-plus"
                  >+{{ strainRisk }}</span>
                </div>
                <div
                  v-if="strainDeciding && canControl"
                  class="decision-actions reel-hide"
                >
                  <button
                    class="btn cut hold strain-hold"
                    type="button"
                    :disabled="!strainAcceptAllowed"
                    @pointerdown="strainHold.down"
                    @pointerup="strainHold.up"
                    @pointerleave="strainHold.up"
                    @click="strainHold.click"
                  >
                    <span
                      aria-hidden="true"
                      class="hazard crawl hold-fill"
                      :class="{ on: strainHold.holding.value }"
                    />
                    <span class="hold-label">
                      <span class="disp">Lock it in</span>
                      <span
                        class="hold-sub"
                        aria-hidden="true"
                      >Hold · commit ×{{ opLength }}</span>
                    </span>
                  </button>
                  <button
                    class="btn ghost opt-out"
                    type="button"
                    :disabled="cardReeling"
                    @click="emit('decideStrain', false)"
                  >
                    <span class="disp">Opt out</span>
                    <span
                      class="hold-sub"
                      aria-hidden="true"
                    >+0</span>
                  </button>
                </div>
                <button
                  v-else-if="strainSwitchable && canControl"
                  class="btn tiny ghost"
                  type="button"
                  @click="emit('decideStrain', !strainCall.accepted)"
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
              <div class="misfortune-name disp front-name">
                {{ front?.displayName }}
              </div>
              <span
                v-if="majorOrder?.live"
                class="mo-tag cap"
                :title="majorOrder.title ?? undefined"
              >
                Major Order · +{{ MAJOR_ORDER_RISK }} risk · +{{ MAJOR_ORDER_REROLL_BONUS }} reroll
              </span>
              <div class="front-lock">
                <span
                  v-for="i in opLength"
                  :key="i"
                  class="lock-cell on"
                  aria-hidden="true"
                />
                <span class="lock-text cap">All {{ opLength }} missions</span>
              </div>
              <div
                v-if="strain"
                class="strain"
              >
                <div class="strain-head">
                  <span class="lbl">Strain <span class="dim">· optional</span></span>
                  <AppTooltip :content="strainStamp.text">
                    <span
                      class="lock"
                      :class="strainStamp.tone"
                      role="img"
                      :aria-label="strainStamp.text"
                    ><IconLock :open="!strainStamp.locked" /></span>
                  </AppTooltip>
                </div>
                <div class="strain-name disp">
                  <span
                    v-if="strainIcon"
                    class="strain-icon"
                    :style="{ maskImage: `url(${strainIcon})`, WebkitMaskImage: `url(${strainIcon})` }"
                    aria-hidden="true"
                  />
                  {{ strain.name }}
                </div>
                <div class="risk-row">
                  <span class="cap">Every mission</span>
                  <RiskPips :value="strainRisk" />
                  <span
                    v-if="strainRisk > 0"
                    class="risk-plus disp strain-plus"
                  >+{{ strainRisk }}</span>
                </div>
              </div>
              <p class="muted small">
                Fixed for the whole operation.
              </p>
            </template>
            <template v-else>
              <p class="front-pending cap">
                Drawn with the first spin
              </p>
            </template>
          </Motion>
        </div>
      </div>
    </div>

    <footer class="wheel-foot row">
      <button
        v-if="dealReady && canControl"
        class="btn primary cut deal-cta"
        type="button"
        @click="emit('deal')"
      >
        <span class="disp">Deal the pacts</span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.4"
          aria-hidden="true"
        >
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </button>
      <span
        v-else-if="dealReady"
        class="muted small"
      >Waiting for the host to deal the pacts…</span>
      <span
        v-else-if="!state.wheel && !canControl"
        class="muted small"
      >Waiting for the host to spin…</span>
      <span
        v-else-if="state.wheel"
        class="cap muted"
      >Free reroll if this combo is already cleared</span>
    </footer>
  </section>
</template>

<style scoped>
.wheel-panel { gap: var(--gap-panel); }
.wheel-head { align-items: flex-end; }
.wheel-head-l { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 0; }
.wheel-title { margin: 0; font-size: var(--fs-h1); color: var(--text); }

/* Prominent reroll: the header control carries the shared chit + count, so the
   per-card dice are reserved for the operation-long front/strain locks. */
.reroll-main {
  height: 44px;
  padding: 0 14px;
  flex-shrink: 0;
  color: var(--text);
}
.reroll-main svg { width: 20px; height: 20px; }
.reroll-text { font-size: 12px; font-weight: 700; letter-spacing: 0.16em; }
.reroll-tally {
  display: flex;
  align-items: center;
  gap: 4px;
  padding-left: 10px;
  border-left: 1px solid var(--line-3);
}
.reroll-main .chit { width: 9px; height: 11px; }
.reroll-tally b { font-size: 14px; font-weight: 700; }

/* Pre-spin front/strain hint: the wheel shows where the first spin is headed. */
.front-hint {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  padding: 16px 20px;
  border: 1px dashed var(--line-3);
}
.front-hint-emblems { display: flex; gap: 8px; }
.front-hint-emblems img {
  width: 38px;
  height: 38px;
  object-fit: contain;
  opacity: 0.35;
  filter: grayscale(0.6);
  transition: opacity var(--dur-med) var(--ease-out), filter var(--dur-med) var(--ease-out);
}
.front-hint-emblems img.on { opacity: 0.95; filter: none; }
.front-hint-copy { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.front-hint-text { font-size: 14px; font-weight: 600; color: var(--khaki); }

.wheel-body {
  display: grid;
  grid-template-columns: minmax(280px, 468px) minmax(0, 1fr);
  gap: clamp(14px, 2vw, 26px);
  align-items: start;
  min-height: 0;
}
.wheel-side { display: flex; flex-direction: column; gap: var(--gap-panel); min-width: 0; }
.drawing {
  flex-grow: 1;
  display: grid;
  place-items: center;
  align-content: center;
  gap: var(--sp-4);
  min-height: 220px;
  border: 1px solid var(--line-1);
  background: rgba(19, 21, 15, 0.6);
}
.drawing-word { font-size: clamp(22px, 2.4vw, 30px); color: var(--gold); }
@media (max-width: 1020px) {
  .wheel-body { grid-template-columns: minmax(0, 1fr); }
}

.wheel-result { display: grid; gap: 0.6rem; grid-template-columns: 1fr; }

.wheel-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 14px 16px 16px;
  background: var(--panel);
  border: 1px solid var(--line-2);
  min-width: 0;
}
/* `min-height: min-content` stops the equal-height grid row from squashing a
   card's own text lines (overflow:hidden otherwise zeroes their min-size). */
.misfortune { overflow: hidden; min-height: min-content; }
.front-card { overflow: hidden; isolation: isolate; min-height: min-content; }
.front-card .misfortune-name { color: var(--front-accent, var(--gold)); }

.card-head { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
.misfortune-name {
  font-size: 1.5rem;
  color: var(--gold);
  line-height: 1.05;
}
.front-name { font-size: 1.35rem; }

/* The strain is a subfaction of the front: same card, its own divider. */
.strain {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-top: 0.4rem;
  padding-top: 0.55rem;
  border-top: 1px dashed var(--line-3);
}
.strain-head { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
.strain-name {
  font-size: 1.05rem;
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
   carry their own faction colors, so nothing gives the draw away early. */
.front-card.accented {
  border-color: color-mix(in srgb, var(--front-accent) 55%, var(--line-2));
  background:
    linear-gradient(165deg, color-mix(in srgb, var(--front-accent) 10%, transparent), transparent 55%),
    var(--panel);
  transition: border-color var(--dur-med) var(--ease-out);
}

.wheel-card.misfortune.pending { border-style: dashed; border-color: color-mix(in srgb, var(--gold) 50%, var(--line-2)); }
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
  border-color: color-mix(in srgb, var(--red) 50%, var(--line-2));
  background:
    linear-gradient(165deg, color-mix(in srgb, var(--red) 10%, transparent), transparent 55%),
    var(--panel);
}
.wheel-card.misfortune.safe { opacity: 0.85; }
.wheel-card.misfortune.safe .misfortune-name { color: var(--muted); }

/* Pre-spin the card is face down: the wheel's hub is the spin control. */
.spin-hint {
  display: grid;
  place-items: center;
  min-height: 4.5rem;
  color: var(--muted);
  text-align: center;
}

.mo-tag {
  justify-self: start;
  align-self: start;
  color: var(--front-accent, var(--gold));
  border: 1px solid color-mix(in srgb, var(--front-accent, var(--gold)) 45%, var(--line-2));
  padding: 0.1rem 0.5rem;
}

/* Operation-lock pips: one cell per mission of the operation, lit up to the
   current mission. */
.front-lock { display: flex; align-items: center; gap: 4px; }
.lock-cell {
  width: 12px;
  height: 4px;
  background: var(--line-2);
  transition: background var(--dur-med) var(--ease-out);
}
.lock-cell.on { background: var(--front-accent, var(--gold)); }
.lock-text { margin-left: 4px; color: var(--muted); }

.risk-row { display: flex; align-items: center; gap: 0.5rem; }
.risk-plus { color: var(--red); font-size: 0.9rem; }
.strain-plus { color: var(--orange); }

.front-pending {
  display: grid;
  place-content: center;
  min-height: 4rem;
  border: 1px dashed var(--line-3);
  color: var(--muted);
  margin: 0;
}

.head-tools { display: inline-flex; align-items: center; gap: 0.45rem; }

.reroll-dice {
  display: inline-grid;
  place-items: center;
  padding: 0;
  width: 1.8rem;
  height: 1.8rem;
  flex-shrink: 0;
  background: none;
  border: 1px solid var(--line-4);
  color: var(--khaki);
  cursor: pointer;
  transition: border-color var(--dur-fast), color var(--dur-fast);
}
.reroll-dice svg { width: 1.05rem; height: 1.05rem; }
.reroll-dice:hover:not(:disabled) { border-color: var(--gold); color: var(--gold); }
.reroll-dice:disabled { opacity: 0.4; cursor: not-allowed; }

/* The decision state is an icon, not a chip: a closed lock when the call is
   locked in, an open one otherwise, with the tone carrying pending/safe. */
.lock {
  display: inline-grid;
  place-items: center;
  width: 1.8rem;
  height: 1.8rem;
  flex-shrink: 0;
  border: 1px solid var(--line-4);
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
  .spin-ring { animation: none; }
}

.stranded-note {
  margin: 0;
  color: var(--red);
  border-left: 2px solid var(--red);
  padding-left: 0.5rem;
  font-size: 0.8rem;
}
.account { color: var(--dim); }
.rule { margin: 0; font-size: 1rem; line-height: 1.35; }

/* Decision controls: the accept is a hold, the opt-out a plain ghost. */
.decision-actions { display: flex; gap: 0.5rem; margin-top: 0.2rem; }
.hold {
  position: relative;
  overflow: hidden;
  flex: 1 1 auto;
  min-height: 52px;
  background: var(--gold);
  border-color: var(--gold);
  color: var(--on-gold);
  touch-action: none;
  user-select: none;
}
.hold:hover:not(:disabled) { background: var(--gold); color: var(--on-gold); filter: brightness(1.08); }
.hold:disabled { opacity: 0.4; }
.strain-hold { background: var(--orange); border-color: var(--orange); }
.strain-hold:hover:not(:disabled) { background: var(--orange); border-color: var(--orange); }
.hold-fill {
  position: absolute;
  inset: 0;
  opacity: 0.4;
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 650ms linear;
}
.hold-fill.on { transform: scaleX(1); }
.hold-fill:not(.on) { transition: none; }
.hold-label {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.hold-sub {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  opacity: 0.85;
}
.opt-out {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 7rem;
  min-height: 52px;
}

/* While a reel is spinning, the card's static content steps aside for it.
   Anything that would spoil the draw is hidden outright (visibility also keeps
   it out of the a11y tree); the risk rows stay put — their pips are rolling. */
.reel-hide {
  transition: opacity 0.2s ease-in, visibility 0.2s ease-in;
}
.wheel-card.reeling .reel-hide {
  opacity: 0;
  visibility: hidden;
}

.wheel-foot { gap: 0.6rem; align-items: center; }
.wheel-foot .cap { margin-left: auto; }
.deal-cta {
  width: 100%;
  min-height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.7rem;
}
.deal-cta svg { width: 22px; height: 22px; }
</style>
