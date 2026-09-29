<script setup lang="ts">
import { DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { MISFORTUNES } from '~~/shared/data/misfortunes'
import { PACTS } from '~~/shared/data/pacts'
import { ITEMS_BY_ID, WARBONDS } from '~~/shared/data/catalog'
import { itemImageUrl } from '~~/shared/data/images'
import {
  MAX_DIFFICULTY,
  MIN_DIFFICULTY,
  baseTierFor,
  conditionRiskAt,
  missionsPerOperation,
} from '~~/shared/engine/config'
import { STARTING_KITS, VARIANTS, difficultyName } from '~~/shared/engine/progression'
import { oddsToReach } from '~~/shared/engine/rewards'
import { currentFront, rewardPoolFor } from '~~/shared/engine/selectors'
import { deriveMisfortune } from '~~/shared/engine/wheel'
import type { DiveState, DiverState, RewardTier } from '~~/shared/engine/types'

const props = withDefaults(defineProps<{
  state: DiveState
  self: DiverState | null
  selfId: string | null
  mode: 'local' | 'room'
  online?: string[]
}>(), { online: () => [] })

const emit = defineEmits<{ close: [] }>()

const { ownedWarbonds, setOwned } = useOwnedWarbonds()

// ---- Beats -----------------------------------------------------------------
type BeatKey = 'identify' | 'spin' | 'pact' | 'reward' | 'warbonds' | 'deploy'

interface Beat {
  key: BeatKey
  title: string
  cap: string
}

const BEATS: readonly Beat[] = [
  { key: 'identify', title: 'Identify', cap: 'Enter the name the squad will see.' },
  { key: 'spin', title: 'Spin', cap: 'One rule per mission. Lock it in for risk — or opt out.' },
  { key: 'pact', title: 'Pact', cap: 'Personal risk becomes Valor. Valor buys your ceiling.' },
  { key: 'reward', title: 'Reward', cap: 'Clear it, draft one. Higher Valor, higher odds.' },
  { key: 'warbonds', title: 'Warbonds', cap: 'Rewards only come from warbonds you own.' },
  { key: 'deploy', title: 'Deploy', cap: 'Surplus kit. Earn the rest.' },
]

// Reveal timelines (ms per tick). The last tick is the settled frame.
const TL: Record<BeatKey, number[]> = {
  identify: [0, 400, 700, 1000, 1350, 1650],
  spin: [0, 120, 2600, 3000, 3600],
  pact: [0, 450, 700, 1000, 1400, 1800],
  reward: [0, 400, 800, 1200, 1600, 2100, 2600],
  warbonds: [0, 1100],
  deploy: [0, 900, 1300],
}

const step = ref(0)
const reached = ref(0)
const tick = ref(0)
const name = ref(props.self?.name ?? '')
const reduced = import.meta.client
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches

let timers: ReturnType<typeof setTimeout>[] = []
function clearTimers(): void {
  timers.forEach(clearTimeout)
  timers = []
}
function play(): void {
  clearTimers()
  const tl = TL[BEATS[step.value]!.key]
  const last = tl.length - 1
  if (reduced) {
    tick.value = last
    return
  }
  tick.value = 0
  tl.forEach((ms, k) => {
    if (k === 0) return
    timers.push(setTimeout(() => {
      tick.value = k
    }, ms))
  })
}
function replay(): void {
  play()
}
onMounted(play)
onBeforeUnmount(clearTimers)

watch(step, (value) => {
  reached.value = Math.max(reached.value, value)
  play()
})

const current = computed(() => BEATS[step.value]!)
const isLast = computed(() => step.value === BEATS.length - 1)
const nameRequired = computed(() => step.value === 0 && name.value.trim().length === 0)

function go(index: number): void {
  if (index < 0 || index >= BEATS.length || index === step.value || index > reached.value) {
    return
  }
  step.value = index
}
function next(): void {
  if (nameRequired.value || isLast.value) {
    return
  }
  step.value++
}
function back(): void {
  if (step.value > 0) {
    step.value--
  }
}

// ---- Dossier / state-derived ----------------------------------------------
const variant = computed(() =>
  VARIANTS.find(entry => entry.id === props.state.settings?.variant) ?? VARIANTS[0]!)
const startDifficulty = computed(() =>
  props.state.settings ? STARTING_KITS[props.state.settings.variant].startDifficulty : MIN_DIFFICULTY)
const opLength = computed(() => missionsPerOperation(props.state.difficulty))
const front = computed(() => currentFront(props.state))
const isJoin = computed(() => props.mode === 'room' && props.state.divers.length > 1)
const warbondCount = computed(() => ownedWarbonds.value.length)

// A representative misfortune for the spin demo (difficulty 3, fixed seed).
const demoSegment = computed(() => {
  const drawn = deriveMisfortune(42)
  return MISFORTUNES.find(m => m.id === drawn.id) ?? MISFORTUNES[0]!
})
const demoRisk = computed(() => conditionRiskAt(demoSegment.value.id, MIN_DIFFICULTY))

// The two pacts the tour offers, and the local "sworn" picks.
const demoPacts = computed(() => [PACTS.find(p => p.id === 'thirsty')!, PACTS.find(p => p.id === 'packLight')!])
const sworn = ref<string[]>([])
function toggleSworn(id: string): void {
  sworn.value = sworn.value.includes(id)
    ? sworn.value.filter(x => x !== id)
    : [...sworn.value, id]
}
const pactRisk = computed(() =>
  demoPacts.value
    .filter(p => sworn.value.includes(p.id))
    .reduce((sum, p) => sum + conditionRiskAt(p.id, MIN_DIFFICULTY), 0))

// The three reward candidates, from the diver's own pool.
const draft = computed(() => rewardPoolFor(props.self?.warbondCodes ?? []).slice(0, 3))
const picked = ref<string | null>(null)

// Warbond ownership for the grid.
const ownedSet = computed(() => new Set(ownedWarbonds.value))
function toggleWarbond(code: string): void {
  const next = new Set(ownedWarbonds.value)
  if (next.has(code)) {
    next.delete(code)
  }
  else {
    next.add(code)
  }
  setOwned([...next])
}
function selectAll(): void {
  setOwned(WARBONDS.map(w => w.code))
}
function clearAll(): void {
  setOwned([])
}

// ---- Beat-specific reveal state -------------------------------------------
const classIndex = computed(() => Math.min(tick.value, 4))
const classed = computed(() => tick.value >= 5 || step.value > 0)
const spinLanded = computed(() => step.value !== 1 || tick.value >= 2)
const spinLocked = computed(() => step.value !== 1 || tick.value >= 4)
const pactRevealed = computed(() => step.value !== 2 || tick.value >= 2)
// The wheel contributes a fixed 3 for the tour; each sworn pact adds 1.
const valor = computed(() => (pactRevealed.value ? 3 : 0) + pactRisk.value)
const rewardClimb = computed(() => step.value !== 3 || tick.value >= 3)
const rewardPods = computed(() => step.value !== 3 || tick.value >= 5)

const TIER_LADDER: readonly RewardTier[] = ['C', 'B', 'A', 'S', 'S+']
const oddsRungs = computed(() => {
  const v = step.value === 2 ? valor.value : 5
  const base = baseTierFor(MIN_DIFFICULTY)
  const baseIndex = TIER_LADDER.indexOf(base)
  return [...TIER_LADDER].reverse().map((tier) => {
    const index = TIER_LADDER.indexOf(tier)
    const odds = index < baseIndex ? 0 : index === baseIndex ? 1 : oddsToReach(MIN_DIFFICULTY, v, tier)
    return { tier, pct: Math.round(odds * 1000) / 10, base: index === baseIndex, below: index < baseIndex }
  })
})

const kit = computed(() => STARTING_KITS[props.state.settings?.variant ?? 'standard'])
const rewardTierLabel = computed(() => (rewardClimb.value ? 'A' : 'B'))

function close(): void {
  emit('close')
}
</script>

<template>
  <DialogRoot
    :open="true"
    @update:open="value => { if (!value) close() }"
  >
    <DialogPortal>
      <DialogOverlay class="brief-overlay" />
      <DialogContent class="brief">
        <DialogTitle class="sr-only">
          Griffdiver briefing
        </DialogTitle>
        <DialogDescription class="sr-only">
          A six-beat tour of how a Griffdive mission works.
        </DialogDescription>

        <header class="brief-head">
          <div class="brief-brand">
            <BrandMark
              :size="26"
              class="brief-mark"
            />
            <span class="disp brief-word">Griffdive</span>
            <span class="brief-sep" />
            <span class="lbl">Griffdiver briefing</span>
          </div>
          <div class="brief-head-r">
            <button
              v-if="!isLast"
              class="btn ghost brief-skip"
              type="button"
              @click="go(BEATS.length - 1)"
            >
              Skip the tour
            </button>
            <button
              class="btn ghost brief-skip"
              type="button"
              @click="close"
            >
              Back to base
            </button>
          </div>
        </header>

        <div class="brief-grid">
          <aside
            class="brief-dossier"
            aria-label="Dossier"
          >
            <section
              v-if="isJoin"
              class="dsec"
              aria-label="The squad you are joining"
            >
              <div class="dsec-head">
                <span class="lbl teal">You're joining</span>
                <span class="dsec-live"><span class="pulse dsec-dot" />LIVE</span>
              </div>
              <span class="disp dsec-squad">SQUAD</span>
              <span class="dsec-sub">{{ front?.displayName ?? 'Unknown front' }} · {{ variant.name }}</span>
              <div class="dsec-seats">
                <span
                  v-for="d in state.divers"
                  :key="d.id"
                  class="dsec-seat"
                  :class="{ you: d.id === selfId }"
                >{{ (d.name[0] ?? '?').toUpperCase() }}</span>
                <span
                  v-for="i in Math.max(0, 4 - state.divers.length)"
                  :key="`e${i}`"
                  class="dsec-seat empty"
                >+</span>
              </div>
              <span class="dsec-note"><span class="pulse dsec-dot" />AT THE WHEEL · SEATING OPEN</span>
            </section>

            <section
              v-else
              class="dsec"
              aria-label="Your sentence"
            >
              <div class="dsec-head">
                <span class="lbl gold">Your sentence</span>
                <span class="disp dsec-range">{{ MIN_DIFFICULTY }} → {{ MAX_DIFFICULTY }}</span>
              </div>
              <ol class="dsec-ladder">
                <li
                  v-for="n in [10, 9, 8, 7, 6, 5, 4, 3]"
                  :key="n"
                  :class="{ start: n === startDifficulty, goal: n === MAX_DIFFICULTY }"
                >
                  <span class="disp dsec-n">{{ n }}</span>
                  <span class="dsec-name">{{ difficultyName(n) }}</span>
                  <span
                    class="tb dsec-tier"
                    :data-tier="baseTierFor(n)"
                  >{{ baseTierFor(n) }}</span>
                </li>
              </ol>
            </section>

            <section
              class="dsec file"
              aria-label="Your file"
            >
              <div class="dsec-head">
                <span class="lbl">Your file</span>
                <span class="dsec-fileno">FORM 5-E</span>
              </div>
              <div class="dfile-row">
                <span class="lbl">Name</span>
                <span class="dfile-name">{{ name.trim() || '—' }}<span
                  v-if="!name.trim()"
                  class="blinkc dfile-cursor"
                /></span>
              </div>
              <div class="dfile-row">
                <span class="lbl">Class</span>
                <span
                  v-if="classed"
                  class="disp dfile-class"
                >Class E</span>
                <span
                  v-else
                  class="hazard-soft dfile-pending"
                >PENDING</span>
              </div>
              <div class="dfile-wb">
                <div class="dfile-wb-head">
                  <span class="lbl">Warbonds</span>
                  <span><b class="disp">{{ warbondCount }}</b> / {{ WARBONDS.length }}</span>
                </div>
                <div class="dfile-bar">
                  <span
                    v-for="w in WARBONDS"
                    :key="w.code"
                    :style="{ background: ownedSet.has(w.code) ? 'var(--gold)' : 'var(--line-2)' }"
                  />
                </div>
              </div>
            </section>

            <div class="brief-spacer" />
            <p class="dsec-notice">
              <span class="lbl">Ministry notice</span>
              {{ isJoin
                ? 'Their mercy: the Wheel of Misfortune. Chosen risk raises your Valor, and Valor buys rarer armaments — nothing here is free.'
                : 'Your sentence: a crusade. Climb from difficulty 3 to 10 and the Ministry will consider your debt to liberty settled.' }}
            </p>
          </aside>

          <div class="brief-main">
            <nav
              class="brief-rail"
              aria-label="Briefing progress"
            >
              <button
                v-for="(b, i) in BEATS"
                :key="b.key"
                class="railbtn"
                :class="[i === 0 ? 'chev-first' : 'chev', { cur: i === step, done: i < step, ahead: i > step && i <= reached }]"
                type="button"
                :disabled="i > reached"
                :aria-current="i === step ? 'step' : undefined"
                :aria-label="`Beat ${i + 1} of 6, ${b.title}`"
                @click="go(i)"
              >
                <span class="disp rail-num">0{{ i + 1 }}</span>
                <span class="rail-label">{{ b.title }}</span>
                <svg
                  v-if="i < step"
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="3"
                  aria-hidden="true"
                ><path d="M5 12l5 5 9-10" /></svg>
                <svg
                  v-else-if="i > reached"
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.2"
                  aria-hidden="true"
                ><path d="M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3" /></svg>
              </button>
            </nav>

            <main class="brief-panel grid-bg scan">
              <div class="brief-panel-head">
                <div aria-live="polite">
                  <span class="lbl">Beat 0{{ step + 1 }} / 06</span>
                  <h1 class="disp brief-title">
                    {{ current.title }}
                  </h1>
                  <p class="brief-cap">
                    {{ current.cap }}
                  </p>
                </div>
                <button
                  class="btn ghost brief-replay"
                  type="button"
                  aria-label="Replay this beat"
                  @click="replay"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    aria-hidden="true"
                  ><path d="M4 12a8 8 0 1 0 2.4-5.7" /><path d="M4 4v4.6h4.6" /></svg>
                  REPLAY
                </button>
              </div>

              <!-- 01 IDENTIFY -->
              <section
                v-if="current.key === 'identify'"
                class="beat beat-identify"
              >
                <div class="reg cut">
                  <header class="reg-head">
                    <span class="lbl">Super Earth Citizen Registry</span>
                    <span class="reg-form">FORM 5-E</span>
                  </header>
                  <div class="reg-subject">
                    <span class="lbl">Subject</span>
                    <span class="reg-dot">·</span>
                    <span class="disp reg-subject-name">{{ name.trim() || 'UNNAMED' }}</span>
                    <span class="blinkc reg-cursor" />
                  </div>
                  <div class="reg-body">
                    <div class="reg-class">
                      <span class="lbl">Class</span>
                      <div class="reg-letter">
                        <span class="disp reg-letter-g">{{ ['A', 'B', 'C', 'D', 'E'][classIndex] }}</span>
                      </div>
                      <span class="reg-class-word">{{ ['CITIZENS', 'RESIDENTS', 'CONSCRIPTS', 'DEBTORS', 'GRIFFDIVERS'][classIndex] }}</span>
                    </div>
                    <ul class="reg-list">
                      <li
                        v-for="(c, i) in [
                          { g: 'A', label: 'Citizens' },
                          { g: 'B', label: 'Residents' },
                          { g: 'C', label: 'Conscripts' },
                          { g: 'D', label: 'Debtors' },
                        ]"
                        :key="c.g"
                        :class="{ on: i === classIndex, done: i < classIndex }"
                      >
                        <span class="disp reg-badge">{{ c.g }}</span>
                        <span class="reg-item">{{ c.label }}</span>
                        <span
                          v-if="i === 0"
                          class="reg-tag"
                          :class="{ on: classIndex === 0 }"
                        >HELLDIVERS</span>
                      </li>
                      <li
                        class="on"
                        :class="{ done: classIndex < 4 }"
                      >
                        <span class="disp reg-badge e">E</span>
                        <span class="reg-item">Griffdivers</span>
                        <span
                          v-if="classIndex === 4"
                          class="reg-tag you"
                        >YOU</span>
                      </li>
                    </ul>
                  </div>
                  <span
                    v-if="classed"
                    class="disp reg-stamp stamp"
                  >Griffdiver</span>
                </div>
                <div class="beat-copy">
                  <p class="disp beat-line">
                    Helldivers are Class <span class="gold">A</span>.
                  </p>
                  <p
                    class="disp beat-line big"
                    :class="{ on: classed }"
                  >
                    You are Class <span class="red">E</span>.
                  </p>
                  <p
                    class="beat-note"
                    :class="{ on: classed }"
                  >
                    — a Griffdiver, cast to the front to earn your arsenal back one dive at a time.
                  </p>
                  <div class="name-field">
                    <div class="name-head">
                      <label
                        for="diver-name"
                        class="lbl gold"
                      >Diver name</label>
                      <span class="name-count">{{ name.length }} / 32</span>
                    </div>
                    <input
                      id="diver-name"
                      v-model="name"
                      class="nb name-input"
                      type="text"
                      maxlength="32"
                      autocomplete="nickname"
                      spellcheck="false"
                      placeholder="Birdie"
                      aria-required="true"
                    >
                    <span class="name-hint"><b>ENTER</b> the name the squad will see</span>
                  </div>
                </div>
              </section>

              <!-- 02 SPIN -->
              <section
                v-else-if="current.key === 'spin'"
                class="beat beat-spin"
              >
                <div class="spin-wheel">
                  <WheelOfMisfortune
                    :difficulty="MIN_DIFFICULTY"
                    :seed="42"
                    :spinning="tick === 0 && !reduced"
                  />
                </div>
                <div class="spin-side">
                  <article
                    class="spin-card cut"
                    :class="{ landed: spinLanded }"
                  >
                    <header class="spin-head">
                      <span class="lbl">Misfortune · whole squad</span>
                      <span class="chip">LOADOUT</span>
                    </header>
                    <div
                      v-if="!spinLanded"
                      class="spin-drawing"
                    >
                      <span class="disp pulse spin-drawing-word">Drawing</span>
                      <span class="lbl">{{ MISFORTUNES.length }} misfortunes on the wheel</span>
                    </div>
                    <template v-else>
                      <span class="disp spin-name">{{ demoSegment.name }}</span>
                      <span class="spin-rule">{{ demoSegment.rule }}</span>
                      <span class="spin-risk"><RiskPips
                        :value="demoRisk"
                        :max="5"
                      />+{{ demoRisk }} TEAM RISK</span>
                      <div class="spin-actions">
                        <span
                          class="spin-accept cut"
                          :class="{ locked: spinLocked }"
                        >
                          <span class="disp">{{ spinLocked ? 'Locked in' : 'Lock it in' }}</span>
                          <span class="spin-sub">{{ spinLocked ? `+${demoRisk} TEAM RISK` : 'HOLD TO LOCK' }}</span>
                        </span>
                        <span class="spin-opt">Opt out<span class="spin-sub">+0</span></span>
                      </div>
                    </template>
                  </article>
                  <div class="teamrisk">
                    <span class="lbl">Team risk</span>
                    <div class="teamrisk-cells">
                      <span
                        v-for="i in 11"
                        :key="i"
                        :class="{ on: spinLocked && i <= demoRisk }"
                      />
                    </div>
                    <span class="disp teamrisk-n">{{ spinLocked ? demoRisk : 0 }}</span>
                  </div>
                </div>
              </section>

              <!-- 03 PACT -->
              <section
                v-else-if="current.key === 'pact'"
                class="beat beat-pact"
              >
                <div class="pact-valor">
                  <span class="lbl gold">Valor</span>
                  <div class="pact-valor-n">
                    <span class="disp pact-big">{{ valor }}</span>
                    <span class="pact-max">/ 11</span>
                  </div>
                  <div class="pact-cells">
                    <span
                      v-for="i in 11"
                      :key="i"
                      :class="{ wheel: i <= 3, pact: i > 3 && i <= 3 + pactRisk }"
                    />
                  </div>
                  <span class="pact-src"><b class="gold">WHEEL</b> +{{ 3 }}</span>
                  <span
                    v-if="pactRisk"
                    class="pact-src"
                  ><b class="red">PACTS</b> +{{ pactRisk }}</span>
                </div>
                <div class="pact-cards">
                  <article
                    v-for="p in demoPacts"
                    :key="p.id"
                    class="pact-card cut"
                    :class="{ shown: pactRevealed, sworn: sworn.includes(p.id) }"
                    role="button"
                    tabindex="0"
                    :aria-label="`${p.name}: ${p.rule}`"
                    :aria-pressed="sworn.includes(p.id)"
                    @click="toggleSworn(p.id)"
                    @keydown.enter.prevent="toggleSworn(p.id)"
                    @keydown.space.prevent="toggleSworn(p.id)"
                  >
                    <header class="pact-card-head">
                      <RiskPips
                        :value="1"
                        :max="3"
                      />
                      <span class="disp pact-risk">+1</span>
                    </header>
                    <span class="pact-glyph grid-bg">
                      <svg
                        width="52"
                        height="52"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.45"
                        aria-hidden="true"
                      ><path d="M6 3h12v14l-6 4-6-4zM9 8h6M9 12h6" /></svg>
                    </span>
                    <span class="disp pact-name">{{ p.name }}</span>
                    <span class="pact-rule">{{ p.rule }}</span>
                    <span class="pact-chan">{{ p.accountability.toUpperCase() }}</span>
                    <span
                      v-if="sworn.includes(p.id)"
                      class="disp pact-sworn stamp"
                    >Sworn</span>
                  </article>
                </div>
                <div class="pact-odds">
                  <div class="pact-odds-head">
                    <span class="lbl">Ceiling odds</span>
                    <span class="pact-odds-diff">DIFF 3 · MEDIUM</span>
                  </div>
                  <div
                    v-for="r in oddsRungs"
                    :key="r.tier"
                    class="odds-row"
                    :class="{ dim: r.below }"
                  >
                    <span
                      class="disp odds-tier"
                      :data-tier="r.tier"
                    >{{ r.tier }}</span>
                    <div class="odds-track">
                      <span
                        class="odds-fill"
                        :data-tier="r.tier"
                        :style="{ width: `${r.base ? 100 : Math.max(r.pct, r.pct > 0 ? 2 : 0)}%` }"
                      />
                    </div>
                    <span class="odds-pct">{{ r.base ? 'BASE' : `${r.pct}%` }}</span>
                  </div>
                </div>
              </section>

              <!-- 04 REWARD -->
              <section
                v-else-if="current.key === 'reward'"
                class="beat beat-reward"
              >
                <section class="ceiling cut">
                  <div class="ceiling-copy">
                    <span class="lbl">Ceiling roll</span>
                    <span class="ceiling-sub">VALOR 5 · CHANCE PER STEP</span>
                  </div>
                  <div class="ceiling-track">
                    <div
                      v-for="(t, i) in ['C', 'B', 'A', 'S']"
                      :key="t"
                      class="ceiling-node"
                      :class="{
                        ok: i <= 2 && rewardClimb,
                        base: i === 0,
                        miss: i === 3 && rewardClimb,
                      }"
                      :data-tier="t"
                      :style="{ left: `${i * 25}%` }"
                    >
                      <span class="disp">{{ t }}</span>
                    </div>
                  </div>
                  <span
                    v-if="rewardClimb"
                    class="disp ceiling-stamp stamp"
                  >Ceiling · {{ rewardTierLabel }}</span>
                  <span
                    v-else
                    class="lbl pulse ceiling-climb"
                  >Climbing</span>
                </section>
                <div class="draft-cards">
                  <article
                    v-for="(item, i) in draft"
                    :key="item.id"
                    class="draft-card cut"
                    :class="{ dropped: rewardPods, picked: picked === item.id }"
                    role="button"
                    tabindex="0"
                    :aria-label="`Draft ${item.displayName}`"
                    @click="picked = item.id"
                    @keydown.enter.prevent="picked = item.id"
                    @keydown.space.prevent="picked = item.id"
                  >
                    <header class="draft-head">
                      <span
                        class="tb"
                        :data-tier="item.tier"
                      >{{ item.tier.toUpperCase() }}</span>
                      <span class="draft-lead">{{ i === 0 ? 'CEILING' : `POD 0${i + 1}` }}</span>
                    </header>
                    <span class="draft-art grid-bg">
                      <img
                        :src="itemImageUrl(item)"
                        :alt="item.displayName"
                      >
                    </span>
                    <span class="draft-name">{{ item.displayName }}</span>
                    <span class="draft-cat">{{ item.category.toUpperCase() }}</span>
                    <span
                      v-if="picked === item.id"
                      class="disp draft-banked stamp"
                    >Banked</span>
                  </article>
                </div>
                <div
                  v-if="rewardPods"
                  class="draft-hint"
                >
                  <span class="pulse draft-dot" />DRAFT ONE<span class="draft-hint-sub">· PICK 1 OF 3</span>
                </div>
              </section>

              <!-- 05 WARBONDS -->
              <section
                v-else-if="current.key === 'warbonds'"
                class="beat beat-warbonds"
              >
                <header class="wb-head">
                  <div class="wb-count">
                    <span class="disp wb-n">{{ warbondCount }}</span>
                    <span class="wb-max">/ {{ WARBONDS.length }}</span>
                    <span class="lbl">Declared</span>
                  </div>
                  <div class="wb-bar">
                    <span
                      v-for="w in WARBONDS"
                      :key="w.code"
                      :style="{ background: ownedSet.has(w.code) ? 'var(--gold)' : 'var(--line-2)' }"
                    />
                  </div>
                  <div class="wb-actions">
                    <button
                      class="btn ghost"
                      type="button"
                      @click="selectAll"
                    >
                      SELECT ALL
                    </button>
                    <button
                      class="btn ghost"
                      type="button"
                      @click="clearAll"
                    >
                      CLEAR ALL
                    </button>
                  </div>
                </header>
                <div class="wb-grid">
                  <button
                    v-for="w in WARBONDS"
                    :key="w.code"
                    class="wb-card"
                    type="button"
                    :class="{ on: ownedSet.has(w.code), special: w.code === 'warbond0' || w.code === 'warbond1' }"
                    :aria-pressed="ownedSet.has(w.code)"
                    :aria-label="`${w.displayName}, tier ${w.tier ?? ''}`"
                    @click="toggleWarbond(w.code)"
                  >
                    <span class="wb-img" />
                    <span class="wb-check">
                      <svg
                        v-if="ownedSet.has(w.code)"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="3.4"
                        aria-hidden="true"
                      ><path d="M5 12l5 5 9-10" /></svg>
                    </span>
                    <span class="wb-name">{{ w.displayName }}</span>
                    <span class="wb-tier tb">{{ w.tier?.toUpperCase() ?? '' }}</span>
                  </button>
                </div>
              </section>

              <!-- 06 DEPLOY -->
              <section
                v-else
                class="beat beat-deploy"
              >
                <article class="order cut">
                  <header class="order-head">
                    <BrandMark
                      :size="30"
                      class="brief-mark"
                    />
                    <div>
                      <span class="lbl">Super Earth · Ministry of Truth</span>
                      <span class="disp order-title">Order of Deployment</span>
                    </div>
                    <span class="order-file">FORM 5-E</span>
                  </header>
                  <div class="order-body">
                    <div class="order-col">
                      <div class="order-row">
                        <span class="lbl">Griffdiver</span>
                        <span class="order-val">
                          <span class="disp order-name">{{ name.trim() || 'UNNAMED' }}</span>
                          <span class="disp order-class">Class E</span>
                        </span>
                      </div>
                      <div class="order-row">
                        <span class="lbl">Warbonds declared</span>
                        <span><b class="disp gold">{{ warbondCount }}</b> / {{ WARBONDS.length }}</span>
                      </div>
                      <div class="order-row kit">
                        <span class="lbl">Kit</span>
                        <span class="order-kit">
                          <span class="order-kit-title">SURPLUS CAST-OFFS · {{ kit.stratagems.length }} STRATAGEMS</span>
                          <span class="order-kit-icons">
                            <span
                              v-for="id in kit.stratagems.slice(0, 4)"
                              :key="id"
                              class="order-kit-icon"
                            >
                              <img
                                v-if="ITEMS_BY_ID.get(id)"
                                :src="itemImageUrl(ITEMS_BY_ID.get(id)!)"
                                :alt="ITEMS_BY_ID.get(id)!.displayName"
                              >
                              <template v-else>{{ id }}</template>
                            </span>
                          </span>
                        </span>
                      </div>
                      <p class="order-note">
                        Your kit is surplus cast-offs — you earn the rest one dive at a time.
                      </p>
                    </div>
                    <div class="order-col alt">
                      <div class="order-row">
                        <span class="lbl">Destination</span>
                        <span class="order-val">
                          <span class="order-name">{{ isJoin ? 'SQUAD' : 'NEW CRUSADE' }}</span>
                          <span class="order-sub">{{ difficultyName(props.state.difficulty) }} · {{ props.state.difficulty }}</span>
                        </span>
                      </div>
                      <div class="order-row">
                        <span class="lbl">Sentence</span>
                        <span class="order-ladder">
                          <span
                            v-for="n in [3, 4, 5, 6, 7, 8, 9, 10]"
                            :key="n"
                            :class="{ on: n === startDifficulty, cleared: n < startDifficulty }"
                          >{{ n }}</span>
                        </span>
                      </div>
                      <div class="order-row">
                        <span class="lbl">Operation 1</span>
                        <span class="order-val">{{ opLength }} MISSIONS · BASE TIER <span
                          class="tb"
                          :data-tier="baseTierFor(startDifficulty)"
                        >{{ baseTierFor(startDifficulty) }}</span></span>
                      </div>
                    </div>
                  </div>
                  <span class="disp order-stamp stamp">Cleared for drop</span>
                </article>
              </section>
            </main>

            <footer class="brief-foot">
              <button
                class="btn ghost brief-back"
                type="button"
                :disabled="step === 0"
                @click="back"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.2"
                  aria-hidden="true"
                ><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
                BACK
              </button>
              <span class="brief-pips">
                <i
                  v-for="(b, i) in BEATS"
                  :key="b.key"
                  :class="{ on: i === step, done: i <= reached && i !== step }"
                />
              </span>
              <span class="brief-step">Beat 0{{ step + 1 }} of 06 · {{ current.title }}</span>
              <span class="brief-foot-spacer" />
              <span
                v-if="nameRequired"
                class="brief-lock"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.2"
                  aria-hidden="true"
                ><path d="M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3" /></svg>
                NAME REQUIRED
              </span>
              <button
                v-if="!isLast"
                class="btn primary cut brief-next"
                type="button"
                :disabled="nameRequired"
                @click="next"
              >
                <span class="disp">Next</span>
                <span class="brief-next-to">· {{ BEATS[step + 1]?.title }}</span>
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
              <button
                v-else
                class="btn primary cut brief-next cta"
                type="button"
                aria-label="Begin dive"
                @click="close"
              >
                <span class="disp">{{ isJoin ? 'Join the dive' : 'Enter Griffdive' }}</span>
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
            </footer>
          </div>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.brief-overlay { position: fixed; inset: 0; background: rgba(11, 12, 9, 0.9); z-index: 60; }
.brief {
  position: fixed;
  inset: 0;
  z-index: 61;
  display: flex;
  flex-direction: column;
  background: var(--ground);
  color: var(--text);
  overflow: hidden;
}

.brief-head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 1rem;
  height: 60px;
  padding: 0 1.5rem;
  border-bottom: 1px solid var(--line-1);
  background: var(--ground);
}
.brief-brand { display: flex; align-items: center; gap: 0.6rem; }
.brief-mark { color: var(--gold); }
.brief-word { font-size: 1rem; color: var(--gold); letter-spacing: 0.06em; }
.brief-sep { width: 1px; height: 1.75rem; background: var(--line-2); margin: 0 0.4rem; }
.brief-head-r { margin-left: auto; display: flex; gap: 0.5rem; }
.brief-skip { display: flex; align-items: center; height: 2.75rem; padding: 0 1rem; font-size: 12px; font-weight: 700; letter-spacing: 0.16em; white-space: nowrap; }

.brief-grid {
  flex-grow: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
}

/* Dossier */
.brief-dossier {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  padding: 1.25rem 1rem;
  border-right: 1px solid var(--line-1);
  background: var(--rail);
  min-height: 0;
  overflow-y: auto;
}
.dsec { display: flex; flex-direction: column; gap: 0.8rem; padding: 0.85rem; background: var(--panel); border: 1px solid var(--line-2); }
.dsec-head { display: flex; align-items: center; justify-content: space-between; }
.teal { color: var(--teal); }
.gold { color: var(--gold); }
.red { color: var(--red); }
.dsec-live { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 10px; font-weight: 700; letter-spacing: 0.16em; color: var(--teal); }
.dsec-dot { width: 6px; height: 6px; background: var(--teal); }
.dsec-squad { font-size: 1.9rem; letter-spacing: 0.14em; color: var(--text); }
.dsec-sub { font-size: 0.8rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--khaki); }
.dsec-seats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px; }
.dsec-seat { height: 2.1rem; display: grid; place-items: center; font-size: 0.85rem; font-weight: 700; background: var(--line-2); color: var(--text); }
.dsec-seat.you { background: var(--gold); color: var(--on-gold); }
.dsec-seat.empty { background: transparent; border: 1px dashed var(--line-4); color: var(--muted); }
.dsec-note { display: flex; align-items: center; gap: 0.45rem; font-size: 10px; font-weight: 700; letter-spacing: 0.14em; color: var(--gold); }
.dsec-range { font-size: 0.95rem; color: var(--text); }
.dsec-ladder { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 3px; }
.dsec-ladder li { display: flex; align-items: center; gap: 0.6rem; height: 2rem; padding: 0 0.5rem 0 0.6rem; border: 1px solid var(--line-1); color: var(--muted); }
.dsec-ladder li.start { background: color-mix(in srgb, var(--gold) 8%, transparent); border-color: var(--gold); color: var(--gold); }
.dsec-ladder li.goal { border-color: var(--line-3); }
.dsec-n { width: 1.5rem; font-size: 0.95rem; }
.dsec-name { font-size: 10px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; white-space: nowrap; }
.dsec-tier { margin-left: auto; font-size: 11px; }
.dsec-fileno { font-size: 10px; font-weight: 700; letter-spacing: 0.16em; color: var(--dim); }
.dsec.file .dsec-head .lbl { color: var(--text); }
.reg-head .lbl { color: var(--text); }
.dfile-row { display: flex; align-items: center; justify-content: space-between; gap: 0.6rem; min-height: 2.6rem; border-bottom: 1px dashed var(--line-1); }
.dfile-name { display: flex; align-items: center; gap: 0.35rem; font-size: 0.95rem; font-weight: 700; letter-spacing: 0.08em; color: var(--text); }
.dfile-cursor { width: 8px; height: 15px; background: var(--gold); }
.dfile-class { padding: 0.3rem 0.5rem; font-size: 0.75rem; border: 2px solid var(--red); color: var(--red); background: color-mix(in srgb, var(--red) 8%, transparent); }
.dfile-pending { padding: 0.25rem 0.5rem; font-size: 10px; font-weight: 700; letter-spacing: 0.16em; color: var(--khaki); }
.dfile-wb { display: flex; flex-direction: column; gap: 0.5rem; padding-top: 0.6rem; }
.dfile-wb-head { display: flex; align-items: center; justify-content: space-between; font-size: 0.75rem; font-weight: 700; color: var(--muted); }
.dfile-wb-head b { font-size: 1.05rem; color: var(--gold); }
.dfile-bar { display: grid; grid-template-columns: repeat(26, minmax(0, 1fr)); gap: 2px; }
.dfile-bar span { height: 8px; }
.brief-spacer { flex-grow: 1; }
.dsec-notice { margin: 0; padding: 0.75rem 0.85rem; border: 1px dashed var(--line-2); font-size: 0.75rem; line-height: 1.5; color: var(--khaki); }
.dsec-notice .lbl { display: block; margin-bottom: 0.4rem; font-size: 9px; }

/* Main column */
.brief-main { display: grid; grid-template-rows: 68px minmax(0, 1fr) 76px; min-height: 0; }
.brief-rail { display: flex; gap: 4px; padding: 12px 1.5rem; border-bottom: 1px solid var(--line-1); background: var(--rail); }
.railbtn {
  flex: 1 1 0;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  border: 0;
  background: var(--panel);
  color: var(--dim);
  cursor: pointer;
  transition: background-color var(--dur-fast), color var(--dur-fast);
}
.railbtn:disabled { cursor: not-allowed; }
.railbtn.done { background: var(--line-1); color: var(--khaki); }
.railbtn.ahead { background: #1f2219; color: var(--text); }
.railbtn.cur { background: var(--gold); color: var(--on-gold); }
.rail-num { font-size: 0.85rem; }
.rail-label { font-size: 12px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; }
.chev-first { clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%); }
.chev { clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%, 14px 50%); }

.brief-panel {
  position: relative;
  overflow: hidden;
  padding: 1.25rem 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: 0;
}
.brief-panel-head { position: relative; display: flex; align-items: flex-end; justify-content: space-between; gap: 1.25rem; }
.brief-title { margin: 0.35rem 0 0; font-size: 2.75rem; color: var(--text); }
.brief-cap { margin: 0.35rem 0 0; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--khaki); }
.brief-replay { display: flex; align-items: center; gap: 0.5rem; height: 2.75rem; padding: 0 0.9rem; font-size: 11px; font-weight: 700; letter-spacing: 0.18em; text-transform: none; color: var(--khaki); }

.beat { position: relative; flex-grow: 1; min-height: 0; }

/* Identify */
.beat-identify { display: grid; grid-template-columns: 440px minmax(0, 1fr); gap: 2.75rem; align-content: start; }
.reg { position: relative; display: flex; flex-direction: column; background: var(--rail); border: 1px solid var(--line-4); min-height: 0; }
.reg-head { display: flex; align-items: center; gap: 0.6rem; height: 2.5rem; padding: 0 1rem; border-bottom: 1px solid var(--line-1); }
.reg-form { margin-left: auto; font-size: 10px; font-weight: 700; letter-spacing: 0.16em; color: var(--dim); }
.reg-subject { display: flex; align-items: center; gap: 0.6rem; height: 3.25rem; padding: 0 1rem; border-bottom: 1px dashed var(--line-2); }
.reg-dot { color: var(--line-5); }
.reg-subject-name { font-size: 1.25rem; color: var(--text); }
.reg-cursor { width: 10px; height: 19px; background: var(--gold); }
.reg-body { flex-grow: 1; display: grid; grid-template-columns: 116px minmax(0, 1fr); gap: 1.4rem; padding: 1rem; min-height: 0; }
.reg-class { display: flex; flex-direction: column; gap: 0.6rem; }
.reg-letter { position: relative; height: 9rem; display: grid; place-items: center; border: 2px solid var(--red); background: color-mix(in srgb, var(--red) 8%, transparent); overflow: hidden; }
.reg-letter-g { font-size: 6rem; line-height: 1; color: var(--red); }
.reg-class-word { display: grid; place-items: center; height: 1.75rem; font-size: 10px; font-weight: 700; letter-spacing: 0.14em; color: var(--red); border: 1px solid var(--red); }
.reg-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.reg-list li { display: flex; align-items: center; gap: 0.6rem; height: 3rem; padding: 0 0.75rem 0 0.85rem; border-bottom: 1px solid var(--line-1); color: var(--muted); }
.reg-list li.on { background: color-mix(in srgb, var(--red) 8%, transparent); color: var(--text); }
.reg-list li.done .reg-item { text-decoration: line-through; text-decoration-color: var(--red); text-decoration-thickness: 2px; }
.reg-badge { display: inline-grid; place-items: center; width: 1.6rem; height: 1.6rem; font-size: 0.85rem; border: 1px solid var(--line-4); }
.reg-list li.on .reg-badge { background: var(--red); color: var(--on-gold); border-color: var(--red); }
.reg-badge.e { border-color: var(--red); color: var(--red); }
.reg-item { font-size: 0.75rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; }
.reg-tag { margin-left: auto; padding: 0.2rem 0.45rem; font-size: 9px; font-weight: 700; letter-spacing: 0.16em; border: 1px solid var(--line-4); color: var(--muted); }
.reg-tag.on { background: var(--gold); color: var(--on-gold); border-color: var(--gold); }
.reg-tag.you { background: var(--red); color: var(--on-gold); border-color: var(--red); }
.reg-stamp { position: absolute; left: 9rem; top: 10rem; padding: 0.5rem 0.9rem; font-size: 1.75rem; border: 4px solid var(--red); color: var(--red); background: color-mix(in srgb, var(--ground) 86%, transparent); z-index: 2; }
.beat-copy { display: flex; flex-direction: column; justify-content: center; gap: 1.4rem; min-width: 0; }
.beat-line { margin: 0; font-size: 1.6rem; color: var(--text); }
.beat-line.big { margin-top: 0.6rem; font-size: 2.6rem; opacity: 0; transform: translateY(8px); transition: opacity 0.4s, transform 0.4s var(--ease-out); }
.beat-line.big.on { opacity: 1; transform: none; }
.beat-note { margin: 0; max-width: 32rem; font-size: 1.1rem; line-height: 1.45; color: var(--khaki); opacity: 0; transition: opacity 0.45s; }
.beat-note.on { opacity: 1; }
.name-field { display: flex; flex-direction: column; gap: 0.5rem; }
.name-head { display: flex; align-items: baseline; justify-content: space-between; }
.name-count { font-size: 11px; font-weight: 700; letter-spacing: 0.14em; color: var(--muted); }
.name-input { height: 3.25rem; padding: 0 0.9rem; font-size: 1rem; font-weight: 600; letter-spacing: 0.06em; }
.name-hint { display: flex; align-items: center; gap: 0.6rem; font-size: 11px; font-weight: 700; letter-spacing: 0.14em; color: var(--muted); }
.name-hint b { padding: 0.2rem 0.45rem; border: 1px solid var(--line-4); font-weight: 700; color: var(--text); }

/* Spin */
.beat-spin { display: grid; grid-template-columns: 396px minmax(0, 1fr); gap: 3rem; align-items: center; }
.spin-wheel { width: 368px; height: 368px; }
.spin-side { display: flex; flex-direction: column; gap: 1rem; min-width: 0; }
.spin-card { min-height: 20rem; padding: 1.25rem 1.4rem; background: var(--panel); border: 1px solid var(--line-4); display: flex; flex-direction: column; gap: 0.9rem; }
.spin-card.landed { border-color: var(--gold); }
.spin-head { display: flex; align-items: center; justify-content: space-between; }
.spin-drawing { flex-grow: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.75rem; }
.spin-drawing-word { font-size: 1.9rem; color: var(--gold); }
.spin-name { font-size: 2.25rem; line-height: 1; color: var(--gold); }
.spin-rule { font-size: 1.05rem; line-height: 1.35; color: var(--text); }
.spin-risk { display: flex; align-items: center; gap: 0.6rem; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.1em; color: var(--red); }
.spin-actions { display: flex; gap: 0.5rem; margin-top: 0.25rem; }
.spin-accept { flex-grow: 1; height: 3.6rem; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.2rem; background: var(--gold); color: var(--on-gold); }
.spin-accept.locked { background: color-mix(in srgb, var(--gold) 12%, var(--panel)); color: var(--gold); border: 1px solid var(--gold); }
.spin-opt { width: 8rem; height: 3.6rem; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.2rem; border: 1px solid var(--line-4); color: var(--text); }
.spin-sub { font-size: 10px; font-weight: 700; letter-spacing: 0.2em; }
.teamrisk { display: flex; align-items: center; gap: 0.9rem; height: 3.1rem; padding: 0 1rem; border: 1px dashed var(--line-2); }
.teamrisk-cells { flex-grow: 1; display: grid; grid-template-columns: repeat(11, minmax(0, 1fr)); gap: 3px; }
.teamrisk-cells span { height: 14px; background: var(--panel); border: 1px solid var(--line-2); }
.teamrisk-cells span.on { background: var(--gold); border-color: var(--gold); }
.teamrisk-n { width: 2.5rem; text-align: right; font-size: 1.25rem; color: var(--text); }

/* Pact */
.beat-pact { display: grid; grid-template-columns: 178px minmax(0, 1fr) 290px; gap: 2.5rem; align-items: center; }
.pact-valor { display: flex; flex-direction: column; gap: 0.75rem; }
.pact-valor-n { display: flex; align-items: baseline; gap: 0.4rem; }
.pact-big { font-size: 4.1rem; line-height: 0.95; color: var(--gold); }
.pact-max { font-size: 0.85rem; font-weight: 700; color: var(--muted); }
.pact-cells { display: flex; flex-direction: column; gap: 3px; padding: 3px; border: 1px solid var(--line-2); }
.pact-cells span { height: 1.35rem; background: var(--panel); border: 1px solid var(--line-2); }
.pact-cells span.wheel { background: var(--gold); border-color: var(--gold); }
.pact-cells span.pact { background: var(--red); border-color: var(--red); }
.pact-src { font-size: 10px; font-weight: 700; letter-spacing: 0.12em; color: var(--muted); }
.pact-cards { display: flex; justify-content: center; gap: 1.75rem; }
.pact-card { position: relative; width: 13.9rem; height: 21rem; flex-shrink: 0; display: flex; flex-direction: column; padding: 1rem; background: var(--panel); border: 1px solid var(--line-4); opacity: 0; transition: opacity 0.3s, border-color 0.2s; cursor: pointer; }
.pact-card.shown { opacity: 1; }
.pact-card.sworn { border-color: var(--red); }
.pact-card-head { display: flex; align-items: center; justify-content: space-between; }
.pact-risk { font-size: 1.75rem; color: var(--red); }
.pact-glyph { margin-top: 0.75rem; height: 6.5rem; display: grid; place-items: center; background-color: var(--rail); border: 1px solid var(--line-2); color: var(--khaki); }
.pact-name { margin-top: 1rem; font-size: 1.25rem; color: var(--text); }
.pact-rule { margin-top: 0.5rem; font-size: 0.85rem; line-height: 1.3; color: var(--text); }
.pact-chan { margin-top: auto; align-self: flex-start; padding: 0.35rem 0.55rem; border: 1px solid var(--line-2); font-size: 10px; font-weight: 700; letter-spacing: 0.14em; color: var(--khaki); }
.pact-sworn { position: absolute; left: 0; right: 0; top: 5.5rem; margin: 0 auto; width: max-content; padding: 0.45rem 0.9rem; font-size: 1.6rem; border: 3px solid var(--red); color: var(--red); background: color-mix(in srgb, var(--ground) 90%, transparent); }
.pact-odds { display: flex; flex-direction: column; gap: 0.7rem; }
.pact-odds-head { display: flex; align-items: baseline; justify-content: space-between; }
.pact-odds-diff { font-size: 10px; font-weight: 700; letter-spacing: 0.14em; color: var(--muted); }

/* Reward */
.beat-reward { display: flex; flex-direction: column; gap: 1.1rem; }
.ceiling { flex-shrink: 0; display: flex; align-items: center; gap: 1.5rem; height: 8.5rem; padding: 0 1.5rem; background: var(--panel); border: 1px solid var(--line-2); }
.ceiling-copy { display: flex; flex-direction: column; gap: 0.5rem; }
.ceiling-sub { font-size: 11px; font-weight: 700; letter-spacing: 0.14em; color: var(--muted); }
.ceiling-track { position: relative; width: 32rem; height: 5.25rem; flex-shrink: 0; }
.ceiling-node { position: absolute; top: 0; width: 4rem; height: 4rem; display: grid; place-items: center; border: 2px solid var(--line-3); background: transparent; color: var(--muted); }
.ceiling-node.ok { border-color: var(--teal); background: color-mix(in srgb, var(--teal) 10%, transparent); color: var(--teal); }
.ceiling-node.base { border-style: solid; }
.ceiling-node.miss { border-style: dashed; border-color: var(--red); color: var(--muted); }
.ceiling-node.base::after { content: 'BASE'; position: absolute; bottom: -0.6rem; left: 50%; transform: translateX(-50%); padding: 0 0.3rem; background: var(--panel); font-size: 9px; font-weight: 700; letter-spacing: 0.18em; color: var(--khaki); }
.ceiling-stamp { padding: 0.6rem 1rem; font-size: 1.75rem; border: 3px solid var(--teal); color: var(--teal); background: color-mix(in srgb, var(--teal) 6%, transparent); }
.ceiling-climb { color: var(--khaki); }
.draft-cards { flex-grow: 1; min-height: 0; display: flex; justify-content: center; gap: 1.4rem; }
.draft-card { position: relative; width: 15.6rem; flex-shrink: 0; display: flex; flex-direction: column; background: var(--panel); border: 1px solid var(--line-4); opacity: 0; transform: translateY(-1rem); transition: opacity 0.35s, transform 0.35s var(--ease-out); cursor: pointer; }
.draft-card.dropped { opacity: 1; transform: none; }
.draft-card.picked { border-color: var(--gold); }
.draft-head { display: flex; align-items: center; gap: 0.5rem; height: 2.6rem; padding: 0 0.75rem; }
.draft-lead { margin-left: auto; font-size: 10px; font-weight: 700; letter-spacing: 0.16em; color: var(--muted); }
.draft-art { margin: 0 0.75rem; height: 8.9rem; display: grid; place-items: center; background-color: var(--ground); border: 1px solid var(--line-1); overflow: hidden; }
.draft-art img { max-width: 85%; max-height: 85%; object-fit: contain; }
.draft-name { padding: 0.7rem 0.75rem 0; font-size: 1rem; font-weight: 700; text-transform: uppercase; }
.draft-cat { padding: 0.45rem 0.75rem; font-size: 10px; font-weight: 700; letter-spacing: 0.14em; color: var(--khaki); }
.draft-banked { position: absolute; left: 0; right: 0; top: 2.9rem; margin: 0 auto; width: max-content; padding: 0.5rem 0.9rem; font-size: 1.5rem; border: 3px solid var(--gold); color: var(--gold); background: color-mix(in srgb, var(--ground) 88%, transparent); }
.draft-hint { flex-shrink: 0; height: 1.75rem; display: flex; align-items: center; justify-content: center; gap: 0.75rem; font-size: 12px; font-weight: 700; letter-spacing: 0.22em; color: var(--gold); }
.draft-hint-sub { color: var(--muted); }
.draft-dot { width: 8px; height: 8px; background: var(--gold); }

/* Warbonds */
.beat-warbonds { display: flex; flex-direction: column; gap: 0.9rem; }
.wb-head { flex-shrink: 0; display: flex; align-items: center; gap: 1.1rem; }
.wb-count { display: flex; align-items: baseline; gap: 0.5rem; }
.wb-n { font-size: 2.25rem; color: var(--gold); }
.wb-max { font-size: 1rem; font-weight: 700; color: var(--muted); }
.wb-bar { flex-grow: 1; max-width: 22rem; display: grid; grid-template-columns: repeat(26, minmax(0, 1fr)); gap: 3px; }
.wb-bar span { height: 12px; }
.wb-actions { margin-left: auto; display: flex; gap: 0.5rem; }
.wb-actions .btn { height: 2.75rem; padding: 0 1rem; font-size: 12px; font-weight: 700; letter-spacing: 0.14em; }
.wb-grid { flex-grow: 1; min-height: 0; overflow-y: auto; display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 0.6rem; padding-right: 0.5rem; }
.wb-card { position: relative; display: flex; flex-direction: column; gap: 0.5rem; padding: 0.6rem; background: var(--panel); border: 1px solid var(--line-2); color: var(--text); cursor: pointer; text-align: left; }
.wb-card.on { border-color: var(--gold); }
.wb-card.special { opacity: 0.7; }
.wb-img { height: 3.5rem; background: var(--raised); border-bottom: 1px dashed var(--line-3); }
.wb-check { position: absolute; top: 0.45rem; right: 0.45rem; width: 1.4rem; height: 1.4rem; display: grid; place-items: center; background: var(--panel); border: 1px solid var(--line-4); color: var(--on-gold); }
.wb-card.on .wb-check { background: var(--gold); border-color: var(--gold); }
.wb-name { font-size: 0.75rem; font-weight: 700; letter-spacing: 0.05em; line-height: 1.2; text-transform: uppercase; }
.wb-tier { align-self: flex-start; font-size: 11px; }

/* Deploy */
.beat-deploy { display: flex; }
.order { position: relative; flex-grow: 1; display: flex; flex-direction: column; background: var(--rail); border: 1px solid var(--line-4); min-height: 0; }
.order-head { flex-shrink: 0; display: flex; align-items: center; gap: 0.9rem; height: 4.1rem; padding: 0 1.4rem; border-bottom: 2px solid var(--line-2); }
.order-title { font-size: 1.5rem; color: var(--text); }
.order-file { margin-left: auto; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.2em; color: var(--text); }
.order-body { flex-grow: 1; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
.order-col { display: flex; flex-direction: column; padding: 0.5rem 1.4rem 1.1rem; }
.order-col.alt { border-left: 1px dashed var(--line-2); }
.order-row { display: grid; grid-template-columns: 132px minmax(0, 1fr); align-items: center; gap: 0.75rem; min-height: 3.4rem; border-bottom: 1px dashed var(--line-2); }
.order-row.kit { align-items: start; padding: 1rem 0; }
.order-val { display: flex; align-items: center; gap: 0.6rem; }
.order-name { font-size: 1.4rem; color: var(--text); }
.order-class { padding: 0.25rem 0.45rem; font-size: 11px; border: 2px solid var(--red); color: var(--red); }
.order-sub { font-size: 11px; font-weight: 700; letter-spacing: 0.14em; color: var(--gold); }
.order-kit { display: flex; flex-direction: column; gap: 0.75rem; }
.order-kit-title { font-size: 0.8rem; font-weight: 700; letter-spacing: 0.12em; color: var(--text); }
.order-kit-icons { display: flex; gap: 0.4rem; }
.order-kit-icon { width: 3.1rem; height: 3.1rem; display: grid; place-items: center; font-size: 11px; font-weight: 700; background: var(--ground); border: 1px solid var(--line-2); color: var(--khaki); }
.order-kit-icon img { max-width: 82%; max-height: 82%; object-fit: contain; }
.order-note { margin: 1rem 0 0; font-size: 0.85rem; line-height: 1.45; color: var(--khaki); }
.order-ladder { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 3px; }
.order-ladder span { height: 1.5rem; display: grid; place-items: center; font-size: 11px; font-weight: 700; background: transparent; border: 1px solid var(--line-2); color: var(--muted); }
.order-ladder span.cleared { background: var(--line-2); border-color: var(--line-3); color: var(--khaki); }
.order-ladder span.on { background: var(--gold); border-color: var(--gold); color: var(--on-gold); }
.order-stamp { position: absolute; left: 9rem; top: 16rem; display: flex; flex-direction: column; align-items: center; padding: 0.6rem 1.1rem; border: 4px solid var(--gold); color: var(--gold); background: color-mix(in srgb, var(--ground) 84%, transparent); font-size: 1.9rem; }

/* Odds (shared) */
.odds-row { display: flex; align-items: center; gap: 0.6rem; }
.odds-row.dim { opacity: 0.5; }
.odds-tier { display: inline-grid; place-items: center; min-width: 2.4rem; height: 1.9rem; padding: 0 0.25rem; font-size: 0.85rem; border: 1px solid currentColor; }
.odds-tier[data-tier='C'] { color: var(--tier-c); }
.odds-tier[data-tier='B'] { color: var(--tier-b); }
.odds-tier[data-tier='A'] { color: var(--tier-a); }
.odds-tier[data-tier='S'] { color: var(--tier-s); }
.odds-tier[data-tier='S+'] { color: var(--tier-splus); }
.odds-track { flex-grow: 1; height: 5px; background: var(--raised); }
.odds-fill { display: block; height: 5px; animation: growX 0.6s var(--ease-out) both; transform-origin: left center; }
.odds-fill[data-tier='C'] { background: var(--tier-c); }
.odds-fill[data-tier='B'] { background: var(--tier-b); }
.odds-fill[data-tier='A'] { background: var(--tier-a); }
.odds-fill[data-tier='S'] { background: var(--tier-s); }
.odds-fill[data-tier='S+'] { background: var(--tier-splus); }
.odds-pct { width: 3.5rem; text-align: right; font-size: 9px; font-weight: 700; color: var(--khaki); }

/* Footer */
.brief-foot { display: flex; align-items: center; gap: 1rem; padding: 0 1.75rem; border-top: 1px solid var(--line-1); background: var(--ground); }
.brief-back { display: flex; align-items: center; gap: 0.6rem; height: 3rem; padding: 0 1.25rem; font-size: 12px; font-weight: 700; letter-spacing: 0.18em; }
.brief-pips { display: flex; gap: 4px; margin-left: 0.5rem; }
.brief-pips i { width: 22px; height: 6px; background: var(--line-2); }
.brief-pips i.done { background: var(--line-5); }
.brief-pips i.on { background: var(--gold); }
.brief-step { font-size: 11px; font-weight: 700; letter-spacing: 0.16em; color: var(--muted); }
.brief-foot-spacer { flex-grow: 1; }
.brief-lock { display: flex; align-items: center; gap: 0.5rem; font-size: 11px; font-weight: 700; letter-spacing: 0.16em; color: var(--muted); }
.brief-next { display: flex; align-items: center; justify-content: space-between; gap: 1.4rem; min-width: 16.5rem; height: 3.25rem; padding: 0 1.25rem 0 1.5rem; }
.brief-next .disp { font-size: 18px; }
.brief-back { text-transform: none; }
.brief-next-to { font-size: 11px; font-weight: 700; letter-spacing: 0.18em; }
.brief-next.cta { min-width: 18.75rem; height: 3.5rem; }

@media (max-width: 1020px) {
  .brief-grid { grid-template-columns: minmax(0, 1fr); }
  .brief-dossier { display: none; }
  .brief-title { font-size: 1.75rem; }
  .beat-identify,
  .beat-spin,
  .beat-pact { grid-template-columns: minmax(0, 1fr); }
  .brief-rail { overflow-x: auto; }
  .railbtn { flex: 0 0 9rem; }
}
</style>
