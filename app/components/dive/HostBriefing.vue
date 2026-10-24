<script setup lang="ts">
import { useIntersectionObserver } from '@vueuse/core'
import { WARBONDS } from '~~/shared/data/catalog'
import { difficultyImageUrl, itemImageUrl } from '~~/shared/data/images'
import { MAX_DIFFICULTY, MAX_NAME_LENGTH, MIN_DIFFICULTY, SQUAD_SIZE_MAX, VALOR_METER_MAX } from '~~/shared/engine/config'
import { difficultyName, startingItemIds } from '~~/shared/engine/progression'
import { tierZones } from '~~/shared/engine/rewards'
import type { DivePhase, DiveState, RewardTier } from '~~/shared/engine/types'
import { storedDiverName } from '~/composables/useGameSocket'
import { DIAL_STEP, REGISTRY_AUTOFILE, REGISTRY_BEAT, REGISTRY_HOLD, REGISTRY_STAMP } from '~/utils/motion'

// The host's whole onboarding on one page, forked from JoinBriefing: the
// callsign, what Class E means, then the job only the host does — raising the
// squad, launching the crusade, spinning the wheel and filing each result.
const props = withDefaults(defineProps<{
  state: DiveState
  roomCode: string
  // Replayed from the Tutorial control rather than the first seating.
  review?: boolean
  selfName?: string
}>(), { review: false, selfName: '' })

const emit = defineEmits<{ close: [name: string] }>()

const { ownedWarbonds } = useOwnedWarbonds()
const { openCodex, openWarbonds } = useDrawers()
const { isPhone } = usePhoneShell()

const reduced = import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const timers: ReturnType<typeof setTimeout>[] = []
function later(ms: number, run: () => void): void {
  timers.push(setTimeout(run, ms))
}
onBeforeUnmount(() => timers.forEach(clearTimeout))

const saved = storedDiverName()
// A host seats under the placeholder name before the registry names them.
const placeholder = (value: string): string => (value === 'Diver' ? '' : value)
const name = ref(placeholder(props.selfName) || placeholder(saved))
const callsign = computed(() => name.value.trim())

// ---- Registry: the callsign is the page's first and only required input ----
// Filing it (Enter, leaving the field, or a saved name) rolls the class strike
// A→E, stamps the file, and only then opens the squad card beneath.
type Filing = 'open' | 'rolling' | 'filed'
const CLASSES = [
  { letter: 'A', word: 'Citizens' },
  { letter: 'B', word: 'Residents' },
  { letter: 'C', word: 'Conscripts' },
  { letter: 'D', word: 'Debtors' },
  { letter: 'E', word: 'Griffdivers' },
] as const
const filing = ref<Filing>(props.review ? 'filed' : 'open')
// 0 = nothing struck; 1–4 = A–D struck; 5 = E landed.
const classStep = ref(props.review ? CLASSES.length : 0)
const stamped = ref(props.review)
const squadOpen = ref(props.review)
const classWord = computed(() =>
  filing.value === 'open' ? 'Pending' : CLASSES[Math.min(classStep.value, CLASSES.length - 1)]!.word)

function fileCallsign(): void {
  if (!callsign.value || filing.value !== 'open') {
    return
  }
  if (reduced) {
    classStep.value = CLASSES.length
    stamped.value = true
    squadOpen.value = true
    filing.value = 'filed'
    return
  }
  filing.value = 'rolling'
  for (let step = 1; step <= CLASSES.length; step++) {
    later(step * REGISTRY_BEAT, () => {
      classStep.value = step
    })
  }
  const landed = CLASSES.length * REGISTRY_BEAT + REGISTRY_STAMP
  later(landed, () => {
    stamped.value = true
  })
  later(landed + REGISTRY_HOLD, () => {
    squadOpen.value = true
    filing.value = 'filed'
  })
}

// Enter files the callsign first; once filed, Enter joins like the CTA.
function onNameEnter(): void {
  if (filing.value === 'open') {
    fileCallsign()
  }
  else {
    submit()
  }
}

// The cursor locks into the callsign the moment the page lands: it is the one
// thing a joiner must do before anything else here matters.
const nameInput = ref<HTMLInputElement | null>(null)
function focusName(): void {
  nameInput.value?.scrollIntoView({ block: 'center' })
  nameInput.value?.focus({ preventScroll: true })
}
onMounted(() => {
  if (props.review) {
    return
  }
  nameInput.value?.focus()
  if (callsign.value) {
    later(reduced ? 0 : REGISTRY_AUTOFILE, fileCallsign)
  }
})

const divers = computed(() => props.state.divers)
const difficulty = computed(() => props.state.difficulty ?? MIN_DIFFICULTY)
const canStart = computed(() => callsign.value.length > 0)

const PHASE_STATUS: Record<DivePhase, string> = {
  lobby: 'In the lobby',
  spin: 'At the wheel',
  decision: 'At the wheel',
  strain: 'At the wheel',
  deal: 'At the wheel',
  pacts: 'Swearing pacts',
  diving: 'In the field',
  rewards: 'Drafting rewards',
  forfeit: 'Settling a failed mission',
  complete: 'Crusade over',
}
const status = computed(() => PHASE_STATUS[props.state.phase])

// ---- 01 · the kit a Class E diver is issued --------------------------------
// The lobby has no settings yet, so it shows the bare surplus every start shares.
const kitMode = computed(() => props.state.settings?.mode)
const kitIds = computed(() => startingItemIds(props.state.settings?.variant ?? 'medium', kitMode.value))
const kitCount = computed(() => kitIds.value.length)
const kitGroupList = computed(() => kitGroups(kitIds.value))
const heroIcons = computed(() =>
  kitGroupList.value.flatMap(group => group.items).filter(item => item.category !== 'primary' && item.category !== 'secondary').slice(0, 6))

// ---- 02 · the mission loop, split by who acts ------------------------------
type Who = 'host' | 'you' | 'all'
const LOOP: readonly { who: Who, beat: string, text: string }[] = [
  { who: 'host', beat: 'Launch', text: 'Gather your squad with the invite link. Pick your front, make your choices and launch.' },
  { who: 'host', beat: 'Spin', text: 'Spin the Wheel of Adversity — one Squad Directive the whole squad plays under.' },
  { who: 'host', beat: 'Squad call', text: 'Take or skip the directive. Call it on voice; it is everyone\'s risk.' },
  { who: 'all', beat: 'Pacts & dive', text: 'Everyone swears their own pacts, then plays the mission in Helldivers 2.' },
  { who: 'host', beat: 'Report', text: 'File the stars, time and samples; spin Squad Honors on a full-star clear.' },
  { who: 'you', beat: 'Draft', text: 'Like everyone, bank one reward and spend credits at Brasch\'s Bargains.' },
]
const WHO_TAG: Record<Who, string> = { host: 'Host', you: 'You', all: 'Squad' }

// ---- 03 · what Valor buys, at any altitude ---------------------------------
// The dial sweeps Valor 2→6 and difficulty 3→5 the first time it scrolls into
// view, both landing together; touching either slider ends the sweep.
const DIAL_VALOR = [2, 6] as const
const DIAL_DIFFICULTY = [MIN_DIFFICULTY, MIN_DIFFICULTY + 2] as const
const TIERS: readonly RewardTier[] = ['C', 'B', 'A', 'S', 'S+']
const valor = ref<number>(DIAL_VALOR[0])
const dialDifficulty = ref<number>(DIAL_DIFFICULTY[0])
// Zone chances, not cumulative reach: the bars read as the slice of the d100
// line each tier owns, which is exactly what the draft rolls.
const odds = computed(() => {
  const zones = tierZones(dialDifficulty.value, valor.value)
  return TIERS.map(tier => ({
    tier,
    pct: Math.round((zones.find(zone => zone.tier === tier)?.chance ?? 0) * 100),
  }))
})
const baseTier = computed(() => {
  const zones = tierZones(dialDifficulty.value, valor.value)
  return zones.find(zone => zone.chance > 0)?.tier ?? 'C'
})

const dialEl = ref<HTMLElement | null>(null)
let dialTimers: ReturnType<typeof setTimeout>[] = []
function sweepDial(): void {
  const [valorFrom, valorTo] = DIAL_VALOR
  const [diffFrom, diffTo] = DIAL_DIFFICULTY
  if (reduced) {
    valor.value = valorTo
    dialDifficulty.value = diffTo
    return
  }
  const steps = valorTo - valorFrom
  for (let step = 1; step <= steps; step++) {
    dialTimers.push(setTimeout(() => {
      valor.value = valorFrom + step
      dialDifficulty.value = diffFrom + Math.round((step / steps) * (diffTo - diffFrom))
    }, step * DIAL_STEP))
  }
}
function holdDial(): void {
  dialTimers.forEach(clearTimeout)
  dialTimers = []
}
onBeforeUnmount(holdDial)
const { stop: stopWatchingDial } = useIntersectionObserver(dialEl, ([entry]) => {
  if (entry?.isIntersecting) {
    stopWatchingDial()
    sweepDial()
  }
}, { threshold: 0.6 })

// ---- 04 · where everything lives -------------------------------------------
type Spot = 'kit' | 'codex' | 'warbonds' | 'tutorial'
const lit = ref<Spot | null>(null)
const SPOTS: readonly Spot[] = ['kit', 'codex', 'warbonds', 'tutorial']
const spotNo = (spot: Spot): number => SPOTS.indexOf(spot) + 1

function submit(): void {
  if (canStart.value) {
    emit('close', callsign.value)
  }
}
</script>

<template>
  <component
    :is="review ? 'div' : 'main'"
    :id="review ? undefined : 'main-content'"
    class="jb"
    :class="{ review }"
    :tabindex="review ? undefined : -1"
  >
    <form
      class="jb-form"
      novalidate
      @submit.prevent="submit"
    >
      <header
        v-if="!review"
        class="jb-top"
      >
        <NuxtLink
          to="/"
          class="jb-brand"
          aria-label="Griffdive bridge"
        >
          <BrandMark :size="24" />
          <span class="disp">Griffdive</span>
        </NuxtLink>
        <span class="chip jb-form-no">Form 5-H · Command</span>
        <span class="grow" />
        <span class="chan jb-uplink">
          <span
            class="lamp teal pulse"
            aria-hidden="true"
          />
          Room <b class="mono">{{ roomCode }}</b>
        </span>
      </header>

      <!-- HERO · the squad you're joining -->
      <section
        class="jb-hero rise"
        aria-labelledby="jb-title"
      >
        <div class="jb-hero-copy">
          <span
            v-if="!review"
            class="lbl gold"
          >Command transmission</span>
          <h1
            v-if="!review"
            id="jb-title"
            class="disp jb-title"
          >
            You hold the <span class="jb-drafted">wheel.</span>
          </h1>
          <h2
            v-else
            id="jb-title"
            class="disp jb-title sm"
          >
            Everything a host needs.
          </h2>
          <p class="jb-lede">
            Griffdive keeps the rules; you run the table. Raise a squad, launch the crusade and
            call each mission as it comes — everyone else only ever has to swear pacts and dive.
          </p>
          <ul
            v-if="heroIcons.length"
            class="jb-reel"
            aria-hidden="true"
          >
            <li
              v-for="(item, i) in heroIcons"
              :key="item.id"
              :style="{ '--i': i }"
            >
              <img
                :src="itemImageUrl(item)"
                alt=""
                draggable="false"
              >
            </li>
          </ul>
        </div>

        <div class="jb-hero-side">
          <div
            class="jb-reg cut"
          >
            <div class="jb-reg-h">
              <span class="lbl">Citizen registry</span>
              <span class="cap">Form 5-E</span>
            </div>

            <div
              v-if="!review"
              class="jb-reg-field"
              :class="{ empty: !callsign }"
            >
              <label
                for="jb-callsign"
                class="jb-reg-label"
              >
                <span class="lbl gold">Callsign</span>
                <span class="sr-only">(your name)</span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.4"
                  aria-hidden="true"
                ><path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4" /></svg>
              </label>
              <input
                id="jb-callsign"
                ref="nameInput"
                v-model="name"
                class="disp jb-reg-input"
                type="text"
                :maxlength="MAX_NAME_LENGTH"
                placeholder="Type your callsign"
                autocomplete="nickname"
                spellcheck="false"
                enterkeyhint="done"
                aria-describedby="jb-callsign-hint"
                aria-required="true"
                @keydown.enter.prevent="onNameEnter"
                @blur="fileCallsign"
              >
              <span
                id="jb-callsign-hint"
                class="jb-reg-hint"
              >
                <span class="cap">{{ filing === 'open' ? 'The name your squad sees' : 'Filed — edit any time' }}</span>
                <span class="cap"><kbd v-if="filing === 'open'">Enter</kbd> {{ name.length }} / {{ MAX_NAME_LENGTH }}</span>
              </span>
            </div>
            <span
              v-else
              class="disp jb-reg-name"
            >{{ callsign }}</span>

            <div
              class="jb-class"
              aria-hidden="true"
            >
              <span class="jb-class-h">
                <span class="lbl">Class</span>
                <span
                  class="cap jb-class-word"
                  :class="{ pending: filing === 'open', e: classStep >= CLASSES.length }"
                >{{ classWord }}</span>
              </span>
              <ol class="jb-classes">
                <li
                  v-for="(c, i) in CLASSES"
                  :key="c.letter"
                  :class="{
                    e: i === CLASSES.length - 1,
                    struck: i < CLASSES.length - 1 && i < classStep,
                    probe: filing === 'rolling' && i === classStep,
                    lit: i === CLASSES.length - 1 && classStep >= CLASSES.length,
                  }"
                >
                  <span class="disp">{{ c.letter }}</span>
                </li>
              </ol>
              <span
                v-if="stamped && callsign"
                class="disp jb-reg-stamp stamp"
              >Griffdiver</span>
            </div>
            <p
              class="sr-only"
              aria-live="polite"
            >
              {{ filing === 'filed' && !review ? `Filed: ${callsign}, Class E — Griffdiver.` : '' }}
            </p>
          </div>

          <div
            class="jb-squad-wrap"
            :class="{ open: squadOpen }"
            :inert="!squadOpen"
            :aria-hidden="!squadOpen"
          >
            <div class="jb-squad-clip">
              <aside
                class="jb-squad cut"
                aria-label="The squad"
              >
                <div class="jb-squad-head">
                  <span class="lbl">Squad</span>
                  <span class="jb-status"><span
                    class="lamp teal pulse"
                    aria-hidden="true"
                  />{{ status }}</span>
                </div>
                <ul class="jb-seats">
                  <li
                    v-for="d in divers"
                    :key="d.id"
                    class="jb-seat"
                    :class="{ host: d.id === state.hostId, away: d.away }"
                  >
                    <span class="disp jb-seat-l">{{ (d.name[0] ?? '?').toUpperCase() }}</span>
                    <span class="jb-seat-n jb-callsign">{{ d.name }}</span>
                    <span
                      v-if="d.id === state.hostId"
                      class="jb-seat-tag"
                    >Host</span>
                  </li>
                  <li
                    v-for="i in Math.max(0, SQUAD_SIZE_MAX - divers.length)"
                    :key="`open-${i}`"
                    class="jb-seat open"
                  >
                    <span class="disp jb-seat-l">+</span>
                    <span class="jb-seat-n">Open</span>
                  </li>
                </ul>
                <div class="jb-alt">
                  <img
                    :src="difficultyImageUrl(difficulty)"
                    alt=""
                    draggable="false"
                  >
                  <span>
                    <span class="lbl">Difficulty</span>
                    <span class="disp jb-alt-n">{{ difficulty }} · {{ difficultyName(difficulty) }}</span>
                  </span>
                </div>
              </aside>
              <div class="jb-acts">
                <button
                  class="btn ghost jb-acts-wb"
                  type="button"
                  aria-haspopup="dialog"
                  @click="openWarbonds"
                >
                  <IconWarbond class="jb-acts-i" />
                  <span class="disp">Set warbonds</span>
                </button>
                <button
                  class="btn primary cut jb-cta"
                  :class="{ 'cta-sweep': canStart }"
                  type="submit"
                  :disabled="!canStart"
                >
                  <span class="disp">{{ review ? 'Back to the dive' : 'Start the dive' }}</span>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.4"
                    aria-hidden="true"
                  ><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 01 · IDENTIFY -->
      <section
        class="jb-sec jb-sec-id rise"
        style="--d: 1"
        aria-labelledby="jb-01"
      >
        <header class="jb-sec-h">
          <span class="disp jb-no">01</span>
          <h2
            id="jb-01"
            class="disp"
          >
            Identify
          </h2>
        </header>
        <div class="jb-id">
          <div class="jb-id-copy">
            <p class="jb-big">
              <span class="jb-big-a">Helldivers are Class <span class="gold">A</span>.</span>
              <span class="jb-big-e">You are Class <span class="red">E</span>.</span>
            </p>
            <p>
              A <b>Griffdiver</b>: shipped to the front with surplus kit and no arsenal. You earn your
              gear back one dive at a time — every reward you bank stays yours for the whole crusade.
            </p>
          </div>

          <div
            class="jb-kit cut"
            aria-labelledby="jb-kit-h"
            role="group"
          >
            <div class="jb-kit-h">
              <span
                id="jb-kit-h"
                class="lbl gold"
              >Issued kit · surplus</span>
              <span class="cap"><b>{{ kitCount }}</b> items</span>
            </div>
            <div
              v-for="group in kitGroupList"
              :key="group.label"
              class="jb-kit-g"
            >
              <span class="cap">{{ group.label }}</span>
              <ul class="jb-kit-items">
                <li
                  v-for="item in group.items"
                  :key="item.id"
                  :class="{ wide: item.category === 'primary' || item.category === 'secondary' }"
                  :title="item.displayName"
                >
                  <img
                    :src="itemImageUrl(item)"
                    :alt="item.displayName"
                    loading="lazy"
                    draggable="false"
                  >
                </li>
              </ul>
            </div>
            <span class="jb-kit-note">
              {{ kitMode === 'seaf'
                ? 'Includes the SEAF Support Package you launched with.'
                : state?.settings
                  ? 'The bare surplus — this crusade runs without the SEAF Support Package.'
                  : 'Your launch can add the SEAF Support Package on top.' }}
              It's all yours from the first drop; every reward adds to it.
            </span>
          </div>
        </div>
      </section>

      <!-- 02 · YOUR JOB -->
      <section
        class="jb-sec rise"
        style="--d: 2"
        aria-labelledby="jb-02"
      >
        <header class="jb-sec-h">
          <span class="disp jb-no">02</span>
          <h2
            id="jb-02"
            class="disp"
          >
            You drive. They dive.
          </h2>
        </header>
        <ol class="jb-loop">
          <li
            v-for="(step, i) in LOOP"
            :key="step.beat"
            class="jb-beat"
            :data-who="step.who"
          >
            <span class="jb-beat-h">
              <span class="cap jb-beat-i">{{ String(i + 1).padStart(2, '0') }}</span>
              <span class="jb-who">{{ WHO_TAG[step.who] }}</span>
            </span>
            <span class="disp jb-beat-t">{{ step.beat }}</span>
            <span class="jb-beat-x">{{ step.text }}</span>
          </li>
        </ol>
        <div class="jb-cues">
          <span class="jb-cue act"><span class="lamp gold pulse" />Your move</span>
          <span class="jb-cue-x">The wheel, the call and the report wait on you — the cue sits by the squad list.</span>
          <span class="jb-cue wait"><span class="lamp teal" />Stand by</span>
          <span class="jb-cue-x">The squad is swearing pacts or drafting; nudge them on voice.</span>
        </div>
        <ul class="jb-keep">
          <li>
            <b>Keep the table</b>
            <span>Kick a seat that has gone quiet, or hand the crown to another diver from the squad list.</span>
          </li>
          <li>
            <b>Fail it clean</b>
            <span>Report a failed mission and the squad replays the operation; each diver surrenders one earned item.</span>
          </li>
          <li>
            <b>Carry on later</b>
            <span>Start a new session from the menu to continue the crusade in a fresh room; absent divers' kits become claimable caches.</span>
          </li>
        </ul>
      </section>

      <!-- 03 · RISK BUYS LOOT -->
      <section
        class="jb-sec rise"
        style="--d: 3"
        aria-labelledby="jb-03"
      >
        <header class="jb-sec-h">
          <span class="disp jb-no">03</span>
          <h2
            id="jb-03"
            class="disp"
          >
            Risk buys loot
          </h2>
        </header>
        <ol class="jb-chain">
          <li>
            <span class="disp">Risk</span>
            <span>Every rule you play under: the squad's directive plus your own pacts.</span>
          </li>
          <li>
            <span class="disp">Odds</span>
            <span>Your risk plots one d100 line. Every point widens the better zones.</span>
          </li>
          <li>
            <span class="disp">Roll</span>
            <span>Each reward option rolls its own face. The zone it lands in sets its tier.</span>
          </li>
          <li>
            <span class="disp">Loot</span>
            <span>Clear the mission and bank one option — its card shows the face it rolled.</span>
          </li>
        </ol>

        <div
          ref="dialEl"
          class="jb-dial cut"
        >
          <div class="jb-dial-ctl">
            <label class="jb-dial-h">
              <span class="lbl gold">Try it · Chosen risk</span>
              <input
                v-model.number="valor"
                class="jb-range"
                type="range"
                min="0"
                :max="VALOR_METER_MAX"
                step="1"
                aria-label="Chosen risk"
                @pointerdown="holdDial"
                @keydown="holdDial"
              >
            </label>
            <label class="jb-dial-h diff">
              <span class="lbl">Difficulty</span>
              <span class="jb-dial-d">
                <img
                  :src="difficultyImageUrl(dialDifficulty)"
                  alt=""
                  draggable="false"
                >
                <span class="disp">{{ dialDifficulty }}</span>
              </span>
              <input
                v-model.number="dialDifficulty"
                class="jb-range diff"
                type="range"
                :min="MIN_DIFFICULTY"
                :max="MAX_DIFFICULTY"
                step="1"
                aria-label="Difficulty"
                :aria-valuetext="`${dialDifficulty} · ${difficultyName(dialDifficulty)}`"
                @pointerdown="holdDial"
                @keydown="holdDial"
              >
            </label>
          </div>
          <ul
            class="jb-odds"
            :aria-label="`Tier odds at difficulty ${dialDifficulty}`"
          >
            <li
              v-for="row in odds"
              :key="row.tier"
              :class="{ none: row.pct === 0 }"
            >
              <span
                class="tb jb-odds-t"
                :data-tier="row.tier"
              >{{ row.tier }}</span>
              <span class="jb-odds-bar"><i
                :data-tier="row.tier"
                :style="{ width: `${row.pct}%` }"
              /></span>
              <span class="jb-odds-p">{{ row.tier === baseTier ? `Base · ${row.pct}%` : `${row.pct}%` }}</span>
            </li>
          </ul>
          <p class="jb-dial-foot">
            <span>
              <b>{{ difficultyName(dialDifficulty) }}</b> floors every reward at <b
                class="tb"
                :data-tier="baseTier"
              >{{ baseTier }}</b> — risk widens the zones above it.
            </span>
            <span>Your squad dives at <b>{{ difficulty }}</b> today and climbs to {{ MAX_DIFFICULTY }}.</span>
          </p>
        </div>
      </section>

      <!-- 04 · YOUR GEAR -->
      <section
        class="jb-sec rise"
        style="--d: 4"
        aria-labelledby="jb-04"
      >
        <header class="jb-sec-h">
          <span class="disp jb-no">04</span>
          <h2
            id="jb-04"
            class="disp"
          >
            Where your gear lives
          </h2>
        </header>
        <div class="jb-deck">
          <!-- A deck plan of the screen you're about to land on, not a
               tour overlay: the numbered beacons match the legend. -->
          <div
            class="jb-plan"
            :class="isPhone ? 'phone' : 'desk'"
            aria-hidden="true"
          >
            <template v-if="!isPhone">
              <div class="pl-top">
                <span class="pl-brand" />
                <span class="grow" />
                <span class="pl-btn">Credits</span>
                <span
                  class="pl-btn"
                  :class="{ lit: lit === 'kit' }"
                >Kit<i class="pl-mk">{{ spotNo('kit') }}</i></span>
                <span
                  class="pl-btn"
                  :class="{ lit: lit === 'codex' }"
                >Codex<i class="pl-mk">{{ spotNo('codex') }}</i></span>
                <span
                  class="pl-btn"
                  :class="{ lit: lit === 'warbonds' }"
                >Warbonds<i class="pl-mk">{{ spotNo('warbonds') }}</i></span>
                <span
                  class="pl-btn dots"
                  :class="{ lit: lit === 'tutorial' }"
                >⋮<i class="pl-mk">{{ spotNo('tutorial') }}</i></span>
              </div>
              <div class="pl-tabs pl-beats">
                <span>CALL</span><span>PACTS</span><span>DIVE</span><span>LOOT</span>
              </div>
              <div class="pl-body">
                <div class="pl-centre">
                  <span class="pl-lbl">One lit stage</span>
                  <span class="pl-wheel" />
                </div>
              </div>
              <div class="pl-dock">
                <span
                  v-for="i in 3"
                  :key="i"
                  class="pl-chip"
                />
              </div>
            </template>
            <template v-else>
              <div class="pl-top">
                <span class="pl-brand" />
                <span class="grow" />
                <span class="pl-btn">Squad</span>
                <span
                  class="pl-btn"
                  :class="{ lit: lit === 'kit' }"
                >Kit<i class="pl-mk">{{ spotNo('kit') }}</i></span>
                <span
                  class="pl-btn dots"
                  :class="{ lit: lit === 'tutorial' }"
                >⋮<i class="pl-mk">{{ spotNo('tutorial') }}</i></span>
              </div>
              <div class="pl-tabs pl-beats">
                <span>CALL</span><span>PACTS</span><span>DIVE</span><span>LOOT</span>
              </div>
              <div class="pl-body">
                <div class="pl-centre">
                  <span class="pl-wheel" />
                </div>
              </div>
              <div class="pl-bar" />
            </template>
          </div>

          <ul class="jb-legend">
            <li
              @mouseenter="lit = 'kit'"
              @mouseleave="lit = null"
              @focusin="lit = 'kit'"
              @focusout="lit = null"
            >
              <span class="jb-mk">{{ spotNo('kit') }}</span>
              <span class="jb-leg">
                <span class="jb-leg-h"><IconKit class="jb-leg-i" /><b>Kit</b><span class="cap">Header · Kit</span></span>
                <span>Everything you own: the surplus starters plus every reward you bank. Pacts and
                  directives grey out what they ban, live.</span>
              </span>
            </li>
            <li
              @mouseenter="lit = 'codex'"
              @mouseleave="lit = null"
              @focusin="lit = 'codex'"
              @focusout="lit = null"
            >
              <span class="jb-mk">{{ spotNo('codex') }}</span>
              <span class="jb-leg">
                <span class="jb-leg-h"><IconBook class="jb-leg-i" /><b>Codex</b><span class="cap">Header · menu</span></span>
                <span>Every stratagem, weapon and booster in the pool, with its tier.</span>
                <button
                  class="btn tiny ghost jb-try"
                  type="button"
                  aria-haspopup="dialog"
                  @click="openCodex"
                >
                  Open the Codex
                </button>
              </span>
            </li>
            <li
              @mouseenter="lit = 'warbonds'"
              @mouseleave="lit = null"
              @focusin="lit = 'warbonds'"
              @focusout="lit = null"
            >
              <span class="jb-mk">{{ spotNo('warbonds') }}</span>
              <span class="jb-leg">
                <span class="jb-leg-h"><IconWarbond class="jb-leg-i" /><b>Warbonds</b><span class="cap">Header · menu</span></span>
                <span>Rewards only roll from warbonds you own. Most come ticked — untick any you
                  haven't bought.</span>
                <span class="jb-wb">
                  <span class="jb-wb-bar"><i
                    v-for="w in WARBONDS"
                    :key="w.code"
                    :class="{ on: ownedWarbonds.includes(w.code) }"
                  /></span>
                  <span class="cap"><b>{{ ownedWarbonds.length }}</b> / {{ WARBONDS.length }} declared</span>
                </span>
                <button
                  class="btn tiny ghost jb-try"
                  type="button"
                  aria-haspopup="dialog"
                  @click="openWarbonds"
                >
                  Declare warbonds
                </button>
              </span>
            </li>
            <li
              @mouseenter="lit = 'tutorial'"
              @mouseleave="lit = null"
              @focusin="lit = 'tutorial'"
              @focusout="lit = null"
            >
              <span class="jb-mk">{{ spotNo('tutorial') }}</span>
              <span class="jb-leg">
                <span class="jb-leg-h"><b>Tutorial</b><span class="cap">Header · menu</span></span>
                <span>Brings this page back, any time.</span>
              </span>
            </li>
          </ul>
        </div>
      </section>

      <footer class="jb-go">
        <span class="jb-go-who">
          <span class="lbl">{{ review ? 'Filed as' : 'Callsign' }}</span>
          <button
            v-if="!callsign && !review"
            class="disp jb-go-need"
            type="button"
            @click="focusName"
          >Required</button>
          <span
            v-else
            class="disp"
          >{{ callsign }}</span>
        </span>
        <span class="grow" />
        <NuxtLink
          v-if="!review"
          to="/"
          class="jb-exit small"
        >Back to base</NuxtLink>
      </footer>
    </form>
  </component>
</template>

<style scoped>
.jb {
  min-height: 100vh;
  background:
    radial-gradient(ellipse 80% 50% at 85% 0%, rgba(255, 214, 66, 0.06), transparent 70%),
    var(--ground);
  outline: none;
}
.jb.review { min-height: 0; background: none; }

.jb-form {
  container: jb / inline-size;
  max-width: 1080px;
  margin-inline: auto;
  padding: 0 var(--pad-page);
  display: flex;
  flex-direction: column;
  gap: clamp(28px, 4vw, 48px);
}
.review .jb-form { padding: 0; gap: 28px; }

/* ---- Top bar ---------------------------------------------------------- */
.jb-top {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 60px;
  border-bottom: 1px solid var(--line-1);
}
.jb-top::before {
  content: '';
  position: absolute;
  inset: 0 calc(-1 * var(--pad-page)) auto;
  height: 4px;
  background-image: repeating-linear-gradient(-45deg, var(--gold) 0 8px, var(--ground) 8px 16px);
}
.jb-brand { display: flex; align-items: center; gap: 8px; color: var(--text); text-decoration: none; font-size: 15px; }
.jb-uplink { flex-shrink: 0; }
.jb-uplink b { color: var(--text); letter-spacing: 0.12em; }
@container jb (max-width: 520px) {
  .jb-form-no { display: none; }
}

/* ---- Hero ------------------------------------------------------------- */
.jb-hero {
  display: grid;
  gap: 24px;
  grid-template-columns: minmax(0, 1fr);
}
@container jb (min-width: 760px) {
  .jb-hero { grid-template-columns: minmax(0, 1.25fr) minmax(300px, 1fr); align-items: center; }
}
.jb-hero-copy { display: flex; flex-direction: column; gap: 14px; }
.jb-hero-side { display: flex; flex-direction: column; gap: 10px; min-width: 0; }

/* The squad card waits under the registry until the callsign is filed, then
   unfolds — a grid-row reveal so nothing below jumps by a fixed height. */
.jb-squad-wrap {
  display: grid;
  grid-template-rows: 0fr;
  visibility: hidden;
  opacity: 0;
  transform: translateY(-6px);
  transition: grid-template-rows var(--dur-slow) var(--ease-out), opacity var(--dur-slow) var(--ease-out), transform var(--dur-slow) var(--ease-out), visibility 0s linear var(--dur-slow);
}
.jb-squad-clip { min-height: 0; overflow: hidden; }
.jb-squad-wrap.open { grid-template-rows: 1fr; visibility: visible; opacity: 1; transform: none; transition-delay: 0s; }
/* Both actions fade in a beat after the card unfolds, so the squad reads
   first and the way forward arrives second. */
.jb-acts { display: flex; gap: 10px; padding-top: 10px; opacity: 0; transform: translateY(6px); transition: opacity var(--dur-slow) var(--ease-out), transform var(--dur-slow) var(--ease-out); }
.jb-squad-wrap.open .jb-acts { opacity: 1; transform: none; transition-delay: var(--dur-slow); }
.jb-acts .btn { min-height: 50px; gap: 10px; justify-content: center; }
.jb-acts-wb { flex: 0 1 auto; padding: 0 16px; }
.jb-acts-i { width: 20px; height: 20px; }
.jb-cta { flex: 1 1 auto; min-height: 50px; padding: 0 22px; font-size: 15px; }
@container jb (max-width: 420px) {
  .jb-acts { flex-direction: column-reverse; }
}
.jb-title { margin: 0; font-size: clamp(38px, 7vw, 76px); color: var(--text); }
.jb-title.sm { font-size: clamp(26px, 4vw, 40px); }
.jb-drafted {
  color: var(--gold);
  display: inline-block;
  animation: slam 0.5s var(--ease-impact) 0.25s both;
}
.jb-reel { list-style: none; margin: 4px 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; }
.jb-reel li {
  width: clamp(52px, 11cqw, 72px);
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  background: linear-gradient(160deg, var(--raised), var(--panel));
  border: 1px solid var(--line-3);
  border-bottom: 2px solid var(--gold);
  animation: jb-reel-in var(--dur-slow) var(--ease-out) both;
  animation-delay: calc(var(--i) * 70ms + 200ms);
}
.jb-reel img { width: 80%; height: 80%; object-fit: contain; filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.55)); }
@keyframes jb-reel-in { from { opacity: 0; transform: translateY(8px) scale(0.92); } }
.jb-lede { margin: 0; max-width: 46ch; color: var(--khaki); font-size: clamp(15px, 1.4vw, 18px); line-height: 1.5; }
.jb-lede b { color: var(--text); }

/* Callsigns read in the registry's own type wherever another diver is named. */
.jb-callsign {
  font-family: var(--font-display);
  font-stretch: 125%;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.jb-squad {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: var(--panel);
  border: 1px solid var(--line-2);
  border-top: 3px solid var(--teal);
}
.jb-squad-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.jb-status { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--teal); }
.jb-seats { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px; }
.jb-seat { display: flex; align-items: center; gap: 8px; min-width: 0; height: 36px; padding: 0 8px 0 0; background: var(--raised); border: 1px solid var(--line-2); }
.jb-seat-l { display: grid; place-items: center; width: 34px; height: 100%; flex-shrink: 0; background: var(--line-2); color: var(--text); font-size: 14px; }
.jb-seat-n { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; font-weight: 600; }
.jb-seat-n.jb-callsign { font-size: 12px; font-weight: 800; }
.jb-seat-tag { margin-left: auto; font-size: 9px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--teal); }
.jb-seat.host .jb-seat-l { background: var(--teal); color: var(--on-gold); }
.jb-seat.away { opacity: 0.55; }
.jb-seat.open { background: transparent; border-style: dashed; border-color: var(--line-4); color: var(--muted); }
.jb-seat.open .jb-seat-l { background: transparent; color: var(--dim); }
.jb-seat.you { border: 1px solid var(--gold); color: var(--gold); }
.jb-seat.you .jb-seat-l { background: var(--gold); color: var(--on-gold); }
.jb-alt { display: flex; align-items: center; gap: 10px; padding-top: 10px; border-top: 1px dashed var(--line-2); }
.jb-alt img { width: 34px; height: 34px; }
.jb-alt > span { display: flex; flex-direction: column; gap: 3px; }
.jb-alt-n { font-size: 15px; color: var(--text); }
.jb-note { margin: 0; padding: 8px 10px; font-size: 13px; line-height: 1.4; color: var(--khaki); background: color-mix(in srgb, var(--teal) 7%, transparent); border-left: 2px solid var(--teal); }
.jb-note b { color: var(--teal); }
.jb-note.warn { color: var(--orange); background: color-mix(in srgb, var(--orange) 8%, transparent); border-left-color: var(--orange); }

/* ---- Sections --------------------------------------------------------- */
.rise { animation-delay: calc(var(--d, 0) * 90ms); }
.jb-sec { display: flex; flex-direction: column; gap: 18px; }
.jb-sec-h { display: flex; align-items: baseline; gap: 14px; padding-bottom: 10px; border-bottom: 1px solid var(--line-2); }
.jb-sec-h h2 { margin: 0; font-size: clamp(20px, 2.6vw, 30px); color: var(--text); }
.jb-no { font-size: clamp(20px, 2.6vw, 30px); color: var(--gold); opacity: 0.9; }
.gold { color: var(--gold); }
.red { color: var(--red); }

/* 01 · Identify */
.jb-id { display: grid; gap: 20px; grid-template-columns: minmax(0, 1fr); }
@container jb (min-width: 700px) {
  .jb-id { grid-template-columns: minmax(0, 1.1fr) minmax(280px, 1fr); align-items: center; }
}
.jb-id-copy { display: flex; flex-direction: column; gap: 14px; }
.jb-id-copy p { margin: 0; max-width: 52ch; color: var(--khaki); line-height: 1.55; }
.jb-id-copy b { color: var(--text); }
.jb-sec-id { margin-top: clamp(12px, 3vw, 40px); }
.jb-big { display: flex; flex-direction: column; gap: 8px; font-family: var(--font-display); font-stretch: 125%; font-weight: 800; text-transform: uppercase; line-height: 1 !important; }
.jb-big-a { font-size: clamp(16px, 1.5vw, 19px); color: var(--khaki); letter-spacing: 0.04em; }
.jb-big-e { font-size: clamp(30px, 4.2vw, 50px); color: var(--text); }
.jb-kit {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: var(--panel);
  border: 1px solid var(--line-3);
}
.jb-kit-h { display: flex; justify-content: space-between; align-items: baseline; }
.jb-kit-g { display: flex; flex-direction: column; gap: 6px; }
.jb-kit-items { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 4px; }
.jb-kit-items li {
  width: 64px;
  height: 64px;
  display: grid;
  place-items: center;
  background: var(--raised);
  border: 1px solid var(--line-2);
}
.jb-kit-items li.wide { width: 120px; }
.jb-kit-items img { width: 52px; height: 52px; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5)); }
.jb-kit-items li.wide img { width: 108px; height: 52px; }
.jb-kit-note { font-size: 12px; line-height: 1.45; color: var(--muted); }

/* Registry — the callsign field lives on the form itself. A dotted rule is its
   only border; it breathes while empty so it reads as "write here". */
.jb-reg {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px;
  background: var(--panel);
  border: 1px solid var(--line-3);
  border-top: 3px solid var(--gold);
  overflow: hidden;
}
.jb-reg-h { display: flex; justify-content: space-between; align-items: baseline; }
.jb-reg-field { position: relative; display: flex; flex-direction: column; gap: 6px; }
.jb-reg-label { display: inline-flex; align-items: center; gap: 6px; align-self: flex-start; color: var(--gold); cursor: text; }
.jb-reg-input {
  appearance: none;
  width: 100%;
  margin: 0;
  padding: 6px 2px 8px;
  background: transparent;
  border: 0;
  border-bottom: 2px dotted var(--gold);
  border-radius: 0;
  color: var(--text);
  caret-color: var(--gold);
  font-size: clamp(22px, 2.6vw, 30px);
  outline: none;
  transition: background-color var(--dur-fast), border-bottom-color var(--dur-fast);
}
.jb-reg-input::placeholder { color: var(--ghost-ink); opacity: 1; }
.jb-reg-field.empty .jb-reg-input { animation: regBreathe 1.8s ease-in-out infinite; }
.jb-reg-input:hover { background: rgba(255, 214, 66, 0.03); }
/* Focus is the gold rule going solid-bright with a lit wash beneath — the
   field's only border, so the focus cue rides it rather than a ring. */
.jb-reg-input:focus-visible,
.jb-reg-input:focus {
  outline: none;
  border-bottom-color: var(--gold-bright);
  background: linear-gradient(to top, rgba(255, 214, 66, 0.1), transparent 70%);
}
@keyframes regBreathe {
  0%, 100% { border-bottom-color: var(--gold); }
  50% { border-bottom-color: rgba(255, 214, 66, 0.35); }
}
.jb-reg-hint { display: flex; justify-content: space-between; gap: 8px; }
.jb-reg-hint kbd {
  padding: 1px 5px;
  margin-right: 6px;
  font: inherit;
  color: var(--gold);
  border: 1px solid var(--line-4);
}
.jb-reg-name { font-size: clamp(22px, 2.6vw, 30px); color: var(--text); overflow-wrap: anywhere; }

.jb-class { position: relative; display: flex; flex-direction: column; gap: 8px; }
.jb-class-h { display: flex; justify-content: space-between; align-items: baseline; }
.jb-class-word { color: var(--khaki); }
.jb-class-word.pending { color: var(--dim); }
.jb-class-word.e { color: var(--red); }
.jb-classes { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 4px; }
.jb-classes li {
  position: relative;
  display: grid;
  place-items: center;
  height: 46px;
  border: 1px solid var(--line-2);
  color: var(--muted);
  font-size: 20px;
  transition: color var(--dur-med), border-color var(--dur-med), background-color var(--dur-med);
}
.jb-classes li:not(.e)::after {
  content: '';
  position: absolute;
  left: 18%;
  right: 18%;
  top: 50%;
  height: 2px;
  background: var(--line-5);
  transform: rotate(-24deg) scaleX(0);
  transition: transform var(--dur-med) var(--ease-snap);
}
.jb-classes li.probe { border-color: var(--gold); color: var(--gold); background: rgba(255, 214, 66, 0.08); }
.jb-classes li.struck { color: var(--dim); }
.jb-classes li.struck::after { transform: rotate(-24deg) scaleX(1); }
.jb-classes li.e { border-style: dashed; border-color: var(--line-4); }
.jb-classes li.lit {
  border: 2px solid var(--red);
  color: var(--red);
  background: color-mix(in srgb, var(--red) 10%, transparent);
  font-size: 26px;
  animation: slam 0.5s var(--ease-impact) both;
}
.jb-reg-stamp {
  position: absolute;
  right: 24%;
  top: 22px;
  padding: 4px 10px;
  border: 3px solid var(--red);
  color: var(--red);
  font-size: 18px;
  letter-spacing: 0.08em;
  transform: rotate(-8deg);
  background: rgba(19, 21, 15, 0.88);
}

/* 02 · Loop */
.jb-loop { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 160px), 1fr)); }
.jb-beat {
  --who: var(--teal);
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  background: var(--panel);
  border: 1px solid var(--line-2);
  border-top: 3px solid var(--who);
}
.jb-beat[data-who='you'] {
  --who: var(--gold);
  background: color-mix(in srgb, var(--gold) 6%, var(--panel));
  border-color: color-mix(in srgb, var(--gold) 40%, var(--line-2));
  border-top-color: var(--gold);
}
.jb-beat[data-who='all'] { --who: var(--khaki); }
.jb-beat-h { display: flex; justify-content: space-between; align-items: center; }
.jb-who { font-size: 10px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: var(--who); }
.jb-beat-t { font-size: 15px; color: var(--text); }
.jb-beat-x { font-size: 13px; line-height: 1.45; color: var(--khaki); }
.jb-cues {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 8px 14px;
  align-items: center;
}
.jb-cue { display: inline-flex; align-items: center; gap: 8px; padding: 6px 10px; font-size: 11px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; border: 1px solid currentColor; }
.jb-cue.act { color: var(--gold); }
.jb-cue.wait { color: var(--teal); }
.jb-cue-x { font-size: 13px; color: var(--khaki); }
.jb-keep { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; grid-template-columns: minmax(0, 1fr); }
@container jb (min-width: 760px) {
  .jb-keep { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
.jb-keep li { display: flex; flex-direction: column; gap: 4px; padding: 12px; background: var(--panel); border: 1px solid var(--line-2); border-left: 3px solid var(--gold); font-size: 13px; line-height: 1.45; color: var(--khaki); }
.jb-keep b { font-family: var(--font-display); font-stretch: 125%; font-size: 13px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--text); }
.jb-foot { margin: 0; padding: 10px 12px; font-size: 13px; line-height: 1.5; color: var(--muted); border-left: 2px solid var(--red); background: color-mix(in srgb, var(--red) 5%, transparent); }

/* 03 · Chain + dial */
.jb-chain { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; grid-template-columns: minmax(0, 1fr); counter-reset: none; }
@container jb (min-width: 760px) {
  .jb-chain { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
.jb-chain li {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 22px 12px 14px;
  background: var(--panel);
  border: 1px solid var(--line-2);
  font-size: 13px;
  line-height: 1.45;
  color: var(--khaki);
}
.jb-chain li .disp { font-size: 17px; color: var(--gold); }
.jb-chain li:not(:last-child)::after {
  content: '';
  position: absolute;
  right: 8px;
  top: 16px;
  width: 8px;
  height: 8px;
  border-top: 2px solid var(--gold);
  border-right: 2px solid var(--gold);
  transform: rotate(45deg);
}
@container jb (max-width: 759px) {
  .jb-chain li:not(:last-child)::after { transform: rotate(135deg); }
}

.jb-dial {
  display: grid;
  gap: 14px 24px;
  padding: 16px;
  background: var(--rail);
  border: 1px solid var(--line-3);
  grid-template-columns: minmax(0, 1fr);
}
@container jb (min-width: 700px) {
  .jb-dial { grid-template-columns: minmax(220px, 0.8fr) minmax(0, 1.4fr); }
  .jb-dial-foot { grid-column: 1 / -1; }
}
.jb-dial-ctl { display: flex; flex-direction: column; gap: 14px; }
.jb-dial-h { display: grid; grid-template-columns: 1fr auto; align-items: end; gap: 6px 10px; }
.jb-dial-d { display: inline-flex; align-items: center; gap: 6px; }
.jb-dial-d img { width: 26px; height: 26px; }
.jb-dial-d .disp { font-size: 26px; color: var(--text); line-height: 0.85; }
.jb-dial-n { font-size: 48px; color: var(--gold); line-height: 0.85; }
.jb-range { grid-column: 1 / -1; width: 100%; accent-color: var(--gold); height: 28px; cursor: pointer; }
.jb-range.diff { accent-color: var(--khaki); }
.jb-odds { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 5px; }
.jb-odds li { display: grid; grid-template-columns: 34px minmax(0, 1fr) 48px; align-items: center; gap: 10px; }
.jb-odds li.none { opacity: 0.4; }
.jb-odds-t { font-size: 14px; }
.jb-odds-bar { height: 10px; background: var(--line-1); overflow: hidden; }
.jb-odds-bar i { display: block; height: 100%; background: currentColor; transition: width var(--dur-slow) var(--ease-out); }
.jb-odds-p { font-size: 12px; font-weight: 700; text-align: right; color: var(--text); font-variant-numeric: tabular-nums; }
.jb-dial-foot {
  margin: 0;
  padding-top: 12px;
  border-top: 1px dashed var(--line-2);
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 6px 16px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--muted);
}
.jb-dial-foot b { color: var(--text); }
.jb-dial-foot .tb { display: inline; font-size: 12px; }

/* 04 · Deck plan */
.jb-deck { display: grid; gap: 20px; grid-template-columns: minmax(0, 1fr); }
@container jb (min-width: 760px) {
  .jb-deck { grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); align-items: start; }
}
.jb-plan {
  --plan: color-mix(in srgb, var(--teal) 55%, transparent);
  position: relative;
  padding: 10px;
  background:
    linear-gradient(rgba(74, 215, 200, 0.05) 1px, transparent 1px) 0 0 / 14px 14px,
    linear-gradient(90deg, rgba(74, 215, 200, 0.05) 1px, transparent 1px) 0 0 / 14px 14px,
    var(--rail);
  border: 1px solid var(--line-3);
  display: grid;
  gap: 5px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}
.jb-plan.desk { grid-template-rows: 30px 20px minmax(170px, 1fr) 18px; }
.jb-plan.phone { width: min(100%, 300px); margin-inline: auto; grid-template-rows: 30px 20px minmax(200px, 1fr) 34px; border-radius: 18px; padding: 14px 10px; }
.jb-plan > div,
.pl-rail,
.pl-centre { border: 1px dashed var(--plan); }
.pl-top { display: flex; align-items: center; gap: 5px; padding: 0 5px; }
.pl-brand { width: 46px; height: 10px; background: var(--line-3); }
.pl-btn {
  position: relative;
  padding: 3px 7px;
  border: 1px solid var(--line-4);
  color: var(--khaki);
  transition: color var(--dur-fast), border-color var(--dur-fast), background-color var(--dur-fast);
}
.pl-btn.dots { padding: 1px 6px; }
.pl-strip { background: color-mix(in srgb, var(--gold) 6%, transparent); }
.pl-body { display: grid; grid-template-columns: 1fr; gap: 5px; border: 0 !important; }
.pl-rail, .pl-centre { position: relative; display: flex; flex-direction: column; gap: 4px; padding: 5px; }
.pl-lbl { color: var(--dim); }
.pl-chip { height: 12px; background: var(--line-2); }
.pl-centre { align-items: center; }
.pl-centre .pl-lbl { align-self: flex-start; }
.pl-wheel { width: 64%; max-width: 120px; aspect-ratio: 1; margin: auto; border-radius: 50%; border: 2px dashed var(--line-4); }
.pl-tabs { position: relative; display: flex; gap: 6px; padding-bottom: 3px; border-bottom: 1px solid var(--line-3); }
.pl-tabs b { color: var(--khaki); }
.pl-item { height: 14px; background: var(--line-1); }
.pl-phases { background: transparent; }
.pl-beats { justify-content: space-between; }
.pl-beats span { padding: 2px 7px; }
.pl-dock { display: flex; gap: 3px; border: 0 !important; }
.pl-dock .pl-chip { flex: 1; height: 12px; }
.pl-menu {
  display: flex;
  flex-direction: column;
  align-self: end;
  justify-self: end;
  width: 58%;
  border: 1px solid var(--line-4) !important;
  background: var(--panel);
}
.pl-menu > span { position: relative; padding: 5px 8px; color: var(--khaki); border-bottom: 1px solid var(--line-2); transition: color var(--dur-fast), background-color var(--dur-fast); }
.pl-squadbar { display: flex; gap: 4px; align-items: center; padding: 0 5px; }
.pl-squadbar .pl-chip { flex: 1; }
.pl-bar { background: color-mix(in srgb, var(--gold) 14%, transparent); }

.pl-mk,
.jb-mk {
  display: inline-grid;
  place-items: center;
  width: 18px;
  height: 18px;
  font-style: normal;
  font-family: var(--font-display);
  font-stretch: 125%;
  font-weight: 800;
  font-size: 10px;
  letter-spacing: 0;
  color: var(--on-gold);
  background: var(--gold);
  clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
}
.pl-mk { position: absolute; top: -9px; right: -9px; z-index: 1; }
/* A stratagem-beacon ping behind each marker, not a coach-mark arrow. */
.pl-btn::after,
.pl-tabs::after,
.pl-menu > span::after {
  content: '';
  position: absolute;
  top: -15px;
  right: -15px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 1px solid var(--gold);
  opacity: 0;
  pointer-events: none;
  animation: beacon 2.4s var(--ease-out) infinite;
}
.pl-btn.dots::after { display: none; }
.pl-menu > span:nth-child(2)::after,
.pl-top .pl-btn:nth-of-type(2)::after { animation-delay: 0.6s; }
.pl-menu > span:nth-child(3)::after,
.pl-top .pl-btn:nth-of-type(3)::after { animation-delay: 1.2s; }
.pl-tabs::after { animation-delay: 1.8s; }
.pl-btn.lit,
.pl-menu > span.lit { color: var(--on-gold); background: var(--gold); border-color: var(--gold); }
.pl-rail.lit { border-color: var(--gold); border-style: solid; background: color-mix(in srgb, var(--gold) 8%, transparent); }
.pl-rail.lit .pl-tabs b { color: var(--gold); }
@keyframes beacon {
  0% { transform: scale(0.35); opacity: 0.9; }
  70%, 100% { transform: scale(1.4); opacity: 0; }
}

.jb-legend { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.jb-legend li {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr);
  gap: 12px;
  padding: 12px;
  background: var(--panel);
  border: 1px solid var(--line-2);
  transition: border-color var(--dur-fast);
}
.jb-legend li:hover,
.jb-legend li:focus-within { border-color: var(--gold); }
.jb-mk { width: 22px; height: 22px; font-size: 12px; }
.jb-leg { display: flex; flex-direction: column; gap: 6px; font-size: 13px; line-height: 1.45; color: var(--khaki); }
.jb-leg-h { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.jb-leg-h b { color: var(--text); font-size: 14px; letter-spacing: 0.06em; text-transform: uppercase; }
.jb-leg-i { width: 16px; height: 16px; color: var(--gold); }
.jb-try { align-self: flex-start; }
.jb-wb { display: flex; flex-direction: column; gap: 4px; }
.jb-wb-bar { display: flex; gap: 2px; height: 6px; }
.jb-wb-bar i { flex: 1; background: var(--line-2); }
.jb-wb-bar i.on { background: var(--gold); }

/* ---- Closing bar ---------------------------------------------------- */
.jb-go {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 0 calc(-1 * var(--pad-page));
  padding: 12px var(--pad-page) max(12px, env(safe-area-inset-bottom));
  border-top: 1px solid var(--line-3);
}
.review .jb-go { margin: 0; padding: 12px 0 0; background: var(--panel); backdrop-filter: none; border-top-color: var(--line-3); }
.jb-go-who { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.jb-go-who .disp { font-size: 17px; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.jb-go-need { appearance: none; padding: 0; border: 0; background: none; text-align: left; font-size: 17px; color: var(--dim); cursor: pointer; text-decoration: underline dashed var(--line-5) 1px; text-underline-offset: 4px; }
.jb-exit { color: var(--muted); white-space: nowrap; }
@container jb (max-width: 480px) {
  .jb-exit { display: none; }
}
</style>
