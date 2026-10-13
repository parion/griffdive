<script setup lang="ts">
import { WARBONDS } from '~~/shared/data/catalog'
import { difficultyImageUrl } from '~~/shared/data/images'
import { MAX_DIFFICULTY, MAX_NAME_LENGTH, MIN_DIFFICULTY, SQUAD_SIZE_MAX, VALOR_METER_MAX } from '~~/shared/engine/config'
import { STARTING_KITS, difficultyName } from '~~/shared/engine/progression'
import { ceilingOddsPercent } from '~~/shared/engine/rewards'
import { seatingBlocked } from '~~/shared/engine/room'
import type { DivePhase, DiveState, RewardTier } from '~~/shared/engine/types'
import { storedDiverName } from '~/composables/useGameSocket'

// The joiner's whole onboarding on one page: a callsign, what being Class E
// means, the little a non-host actually does, and where their gear lives.
// The host drives the table, so nothing here teaches the host's controls.
const props = withDefaults(defineProps<{
  // The room as it stands before seating (a pre-join snapshot), or the live
  // dive when replayed from the Tutorial control.
  state: DiveState | null
  roomCode: string
  // Replayed from inside the dive: the diver is already seated and named.
  review?: boolean
  selfName?: string
}>(), { review: false, selfName: '' })

const emit = defineEmits<{ confirm: [name: string], close: [] }>()

const { ownedWarbonds } = useOwnedWarbonds()
const { openCodex, openWarbonds } = useDrawers()
const { isPhone } = usePhoneShell()

const saved = storedDiverName()
const name = ref(props.review ? props.selfName : saved === 'Diver' ? '' : saved)
const callsign = computed(() => name.value.trim())

// The callsign comes first, but a phone keyboard would bury the briefing, so
// only roomier screens land the cursor in it.
const nameInput = ref<HTMLInputElement | null>(null)
function focusName(): void {
  nameInput.value?.scrollIntoView({ block: 'center' })
  nameInput.value?.focus({ preventScroll: true })
}
onMounted(() => {
  if (!isPhone.value) {
    nameInput.value?.focus()
  }
})

const host = computed(() =>
  props.state?.divers.find(diver => diver.id === props.state?.hostId) ?? props.state?.divers[0] ?? null)
const divers = computed(() => props.state?.divers ?? [])
const difficulty = computed(() => props.state?.difficulty ?? MIN_DIFFICULTY)
const blocked = computed(() => (!props.review && props.state ? seatingBlocked(props.state) : null))
const canJoin = computed(() => callsign.value.length > 0 && !blocked.value)

// A squad already above its starting rung means the joiner owes a catch-up.
const promoted = computed(() => {
  const settings = props.state?.settings
  return !!settings && difficulty.value > STARTING_KITS[settings.variant].startDifficulty
})

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
const status = computed(() => (props.state ? PHASE_STATUS[props.state.phase] : 'Raising the squad…'))

// ---- 02 · the mission loop, split by who acts ------------------------------
type Who = 'host' | 'you' | 'all'
const LOOP: readonly { who: Who, beat: string, text: string }[] = [
  { who: 'host', beat: 'Spin', text: 'Spins the Wheel of Adversity — one Squad Directive the whole squad plays under.' },
  { who: 'host', beat: 'Squad call', text: 'Locks the directive in or opts out. Weigh in on voice — it\'s your risk too.' },
  { who: 'you', beat: 'Swear pacts', text: 'You\'re dealt a hand of personal pacts. Swear any, all or none, then hold to lock in.' },
  { who: 'all', beat: 'Dive', text: 'Play the mission in Helldivers 2. Finish the objectives and extract to win it.' },
  { who: 'host', beat: 'Report', text: 'Files the stars, the time left and the samples you brought home.' },
  { who: 'you', beat: 'Draft', text: 'Claim one reward from your own pods, then spend samples at Requisition.' },
]
const WHO_TAG: Record<Who, string> = { host: 'Host', you: 'You', all: 'Squad' }

// ---- 03 · what Valor buys, at this squad's altitude ------------------------
const TIERS: readonly RewardTier[] = ['C', 'B', 'A', 'S', 'S+']
const valor = ref(4)
const odds = computed(() => TIERS.map(tier => ({
  tier,
  pct: ceilingOddsPercent(difficulty.value, valor.value, tier),
})))
const baseTier = computed(() => [...odds.value].reverse().find(row => row.pct === 100)?.tier ?? 'C')

// ---- 04 · where everything lives -------------------------------------------
type Spot = 'kit' | 'codex' | 'warbonds' | 'tutorial'
const lit = ref<Spot | null>(null)
const SPOTS: readonly Spot[] = ['kit', 'codex', 'warbonds', 'tutorial']
const spotNo = (spot: Spot): number => SPOTS.indexOf(spot) + 1

function submit(): void {
  if (props.review) {
    emit('close')
    return
  }
  if (canJoin.value) {
    emit('confirm', callsign.value)
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
        <span class="chip jb-form-no">Form 5-E · Induction</span>
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
          >Incoming transmission</span>
          <h1
            v-if="!review"
            id="jb-title"
            class="disp jb-title"
          >
            You've been <span class="jb-drafted">drafted.</span>
          </h1>
          <h2
            v-else
            id="jb-title"
            class="disp jb-title sm"
          >
            Everything a squadmate needs.
          </h2>
          <p class="jb-lede">
            <template v-if="host">
              <b>{{ host.name }}</b> is leading
            </template>
            <template v-else>
              A host is leading
            </template>
            a squad up the Helldivers 2 difficulty ladder. Griffdive keeps the rules and the host runs
            the table — your part is small, and all of it is on this page.
          </p>
        </div>

        <aside
          class="jb-squad cut"
          aria-label="The squad"
        >
          <div class="jb-squad-head">
            <span class="lbl">Squad</span>
            <span class="jb-status"><span
              class="lamp pulse"
              :class="blocked ? 'orange' : 'teal'"
              aria-hidden="true"
            />{{ status }}</span>
          </div>
          <ul class="jb-seats">
            <li
              v-for="d in divers"
              :key="d.id"
              class="jb-seat"
              :class="{ host: d.id === state?.hostId, away: d.away }"
            >
              <span class="disp jb-seat-l">{{ (d.name[0] ?? '?').toUpperCase() }}</span>
              <span class="jb-seat-n">{{ d.name }}</span>
              <span
                v-if="d.id === state?.hostId"
                class="jb-seat-tag"
              >Host</span>
            </li>
            <li
              v-for="i in Math.max(0, SQUAD_SIZE_MAX - divers.length)"
              :key="`open-${i}`"
              class="jb-seat open"
              :class="{ you: i === 1 && !review }"
            >
              <span class="disp jb-seat-l">{{ i === 1 && !review ? (callsign[0] ?? '?').toUpperCase() : '+' }}</span>
              <span class="jb-seat-n">{{ i === 1 && !review ? (callsign || 'You') : 'Open' }}</span>
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
          <p
            v-if="blocked"
            class="jb-note warn"
            role="status"
          >
            {{ blocked }}. Keep this page open and try again in a moment.
          </p>
          <p
            v-else-if="promoted && !review"
            class="jb-note"
          >
            <b>Field Promotion waiting.</b> The squad has already climbed, so you'll be offered catch-up
            gear the moment you land.
          </p>
        </aside>
      </section>

      <!-- 01 · IDENTIFY -->
      <section
        class="jb-sec rise"
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
              Helldivers are Class <span class="gold">A</span>.<br>
              You are Class <span class="red">E</span>.
            </p>
            <p>
              A <b>Griffdiver</b>: shipped to the front with surplus kit and no arsenal. You earn your
              gear back one dive at a time — every reward you bank stays yours for the whole crusade.
            </p>
            <label
              v-if="!review"
              class="jb-name"
            >
              <span class="jb-name-h">
                <span class="lbl gold">Callsign</span>
                <span class="cap">{{ name.length }} / {{ MAX_NAME_LENGTH }}</span>
              </span>
              <input
                ref="nameInput"
                v-model="name"
                class="nb"
                type="text"
                :maxlength="MAX_NAME_LENGTH"
                placeholder="Birdie"
                aria-label="Your name"
                autocomplete="nickname"
                spellcheck="false"
              >
              <span class="cap">The name your squad sees</span>
            </label>
          </div>

          <div
            class="jb-reg cut"
            aria-hidden="true"
          >
            <div class="jb-reg-h">
              <span class="lbl">Citizen registry</span>
              <span class="cap">Form 5-E</span>
            </div>
            <span class="disp jb-reg-name">{{ callsign || 'Unnamed' }}<span
              v-if="!callsign"
              class="blinkc jb-caret"
            /></span>
            <ol class="jb-classes">
              <li
                v-for="c in ['A', 'B', 'C', 'D']"
                :key="c"
              >
                <span class="disp">{{ c }}</span>
              </li>
              <li class="e">
                <span class="disp">E</span>
              </li>
            </ol>
            <span
              v-if="callsign"
              class="disp jb-reg-stamp stamp"
            >Griffdiver</span>
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
            The host drives. You dive.
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
          <span class="jb-cue-x">It's on you — swear your pacts, draft your reward.</span>
          <span class="jb-cue wait"><span class="lamp teal" />Stand by</span>
          <span class="jb-cue-x">The host has it. The cue sits by the squad list on every beat.</span>
        </div>
        <p class="jb-foot">
          Fail a mission and the squad replays the operation — and you surrender one item you earned,
          picked from a dealt offer. Your surplus starter kit is never at stake.
        </p>
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
            <span class="disp">Valor</span>
            <span>Your risk, added up. The meter tops out at {{ VALOR_METER_MAX }}.</span>
          </li>
          <li>
            <span class="disp">Ceiling</span>
            <span>Valor rolls how high your reward tier climbs — from {{ baseTier }} up to S+.</span>
          </li>
          <li>
            <span class="disp">Loot</span>
            <span>Clear the mission and draft one item at that ceiling.</span>
          </li>
        </ol>

        <div class="jb-dial cut">
          <label class="jb-dial-h">
            <span class="lbl gold">Try it · Valor</span>
            <span class="disp jb-dial-n">{{ valor }}</span>
            <input
              v-model.number="valor"
              class="jb-range"
              type="range"
              min="0"
              :max="VALOR_METER_MAX"
              step="1"
              aria-label="Valor"
            >
          </label>
          <ul
            class="jb-odds"
            :aria-label="`Ceiling odds at difficulty ${difficulty}`"
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
              <span class="jb-odds-p">{{ row.tier === baseTier ? 'Base' : `${row.pct}%` }}</span>
            </li>
          </ul>
          <span class="cap">Odds at difficulty {{ difficulty }} — the climb runs {{ MIN_DIFFICULTY }} → {{ MAX_DIFFICULTY }}, and the base tier rises with it</span>
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
                <span
                  class="pl-btn"
                  :class="{ lit: lit === 'tutorial' }"
                >Tutorial<i class="pl-mk">{{ spotNo('tutorial') }}</i></span>
                <span
                  class="pl-btn"
                  :class="{ lit: lit === 'codex' }"
                >Codex<i class="pl-mk">{{ spotNo('codex') }}</i></span>
                <span
                  class="pl-btn"
                  :class="{ lit: lit === 'warbonds' }"
                >Warbonds<i class="pl-mk">{{ spotNo('warbonds') }}</i></span>
              </div>
              <div class="pl-strip" />
              <div class="pl-body">
                <div class="pl-rail">
                  <span class="pl-lbl">Squad</span>
                  <span
                    v-for="i in 3"
                    :key="i"
                    class="pl-chip"
                  />
                </div>
                <div class="pl-centre">
                  <span class="pl-lbl">Mission</span>
                  <span class="pl-wheel" />
                </div>
                <div
                  class="pl-rail right"
                  :class="{ lit: lit === 'kit' }"
                >
                  <span class="pl-tabs"><b>Kit</b><span>Valor</span><i class="pl-mk">{{ spotNo('kit') }}</i></span>
                  <span
                    v-for="i in 6"
                    :key="i"
                    class="pl-item"
                  />
                </div>
              </div>
              <div class="pl-phases" />
            </template>
            <template v-else>
              <div class="pl-top">
                <span class="pl-brand" />
                <span class="grow" />
                <span
                  class="pl-btn"
                  :class="{ lit: lit === 'kit' }"
                >Kit<i class="pl-mk">{{ spotNo('kit') }}</i></span>
                <span class="pl-btn dots">⋮</span>
              </div>
              <div class="pl-menu">
                <span :class="{ lit: lit === 'codex' }">Codex<i class="pl-mk">{{ spotNo('codex') }}</i></span>
                <span :class="{ lit: lit === 'warbonds' }">Warbonds<i class="pl-mk">{{ spotNo('warbonds') }}</i></span>
                <span :class="{ lit: lit === 'tutorial' }">Tutorial<i class="pl-mk">{{ spotNo('tutorial') }}</i></span>
              </div>
              <div class="pl-squadbar">
                <span
                  v-for="i in 3"
                  :key="i"
                  class="pl-chip"
                />
              </div>
              <div class="pl-centre">
                <span class="pl-wheel" />
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
                <span class="jb-leg-h"><IconKit class="jb-leg-i" /><b>Kit</b><span class="cap">{{ isPhone ? 'Header · Kit' : 'Right rail · Kit tab' }}</span></span>
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
                <span class="jb-leg-h"><IconBook class="jb-leg-i" /><b>Codex</b><span class="cap">{{ isPhone ? '⋮ menu' : 'Header' }}</span></span>
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
                <span class="jb-leg-h"><IconWarbond class="jb-leg-i" /><b>Warbonds</b><span class="cap">{{ isPhone ? '⋮ menu' : 'Header' }}</span></span>
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
                <span class="jb-leg-h"><b>Tutorial</b><span class="cap">{{ isPhone ? '⋮ menu' : 'Header' }}</span></span>
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
        <button
          class="btn primary cut jb-cta"
          :class="{ 'cta-sweep': review || canJoin }"
          type="submit"
          :disabled="!review && !canJoin"
        >
          <span class="disp">{{ review ? 'Back to the dive' : 'Join the dive' }}</span>
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
  .jb-hero { grid-template-columns: minmax(0, 1.35fr) minmax(280px, 1fr); align-items: end; }
}
.jb-hero-copy { display: flex; flex-direction: column; gap: 14px; }
.jb-title { margin: 0; font-size: clamp(38px, 7vw, 76px); color: var(--text); }
.jb-title.sm { font-size: clamp(26px, 4vw, 40px); }
.jb-drafted {
  color: var(--gold);
  display: inline-block;
  animation: slam 0.5s var(--ease-impact) 0.25s both;
}
.jb-lede { margin: 0; max-width: 46ch; color: var(--khaki); font-size: clamp(15px, 1.4vw, 18px); line-height: 1.5; }
.jb-lede b { color: var(--text); }

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
  .jb-id { grid-template-columns: minmax(0, 1.3fr) minmax(240px, 1fr); align-items: start; }
}
.jb-id-copy { display: flex; flex-direction: column; gap: 14px; }
.jb-id-copy p { margin: 0; max-width: 52ch; color: var(--khaki); line-height: 1.55; }
.jb-id-copy b { color: var(--text); }
.jb-big { font-family: var(--font-display); font-stretch: 125%; font-weight: 800; text-transform: uppercase; font-size: clamp(22px, 3vw, 32px); line-height: 1.05 !important; color: var(--text) !important; }
.jb-name { display: flex; flex-direction: column; gap: 6px; max-width: 420px; }
.jb-name-h { display: flex; justify-content: space-between; align-items: baseline; }

.jb-reg {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  background: var(--panel);
  border: 1px solid var(--line-3);
  overflow: hidden;
}
.jb-reg-h { display: flex; justify-content: space-between; align-items: baseline; }
.jb-reg-name { display: flex; align-items: center; gap: 6px; min-height: 28px; font-size: 22px; color: var(--text); overflow-wrap: anywhere; }
.jb-caret { width: 10px; height: 20px; background: var(--gold); }
.jb-classes { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 4px; }
.jb-classes li { position: relative; display: grid; place-items: center; height: 46px; border: 1px solid var(--line-2); color: var(--dim); font-size: 20px; }
.jb-classes li:not(.e)::after {
  content: '';
  position: absolute;
  left: 18%;
  right: 18%;
  top: 50%;
  height: 2px;
  background: var(--line-4);
  transform: rotate(-24deg);
}
.jb-classes li.e { border: 2px solid var(--red); color: var(--red); background: color-mix(in srgb, var(--red) 10%, transparent); font-size: 26px; }
.jb-reg-stamp {
  position: absolute;
  right: 12px;
  bottom: 70px;
  padding: 4px 10px;
  border: 3px solid var(--red);
  color: var(--red);
  font-size: 18px;
  letter-spacing: 0.08em;
  transform: rotate(-8deg);
  background: rgba(19, 21, 15, 0.85);
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
  .jb-dial { grid-template-columns: minmax(200px, 0.8fr) minmax(0, 1.4fr); }
  .jb-dial > .cap { grid-column: 1 / -1; }
}
.jb-dial-h { display: grid; grid-template-columns: 1fr auto; align-items: end; gap: 10px; }
.jb-dial-n { font-size: 48px; color: var(--gold); line-height: 0.85; }
.jb-range { grid-column: 1 / -1; width: 100%; accent-color: var(--gold); height: 28px; cursor: pointer; }
.jb-odds { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 5px; }
.jb-odds li { display: grid; grid-template-columns: 34px minmax(0, 1fr) 48px; align-items: center; gap: 10px; }
.jb-odds li.none { opacity: 0.4; }
.jb-odds-t { font-size: 14px; }
.jb-odds-bar { height: 10px; background: var(--line-1); overflow: hidden; }
.jb-odds-bar i { display: block; height: 100%; background: currentColor; transition: width var(--dur-slow) var(--ease-out); }
.jb-odds-p { font-size: 12px; font-weight: 700; text-align: right; color: var(--text); font-variant-numeric: tabular-nums; }
.jb-dial > .cap { white-space: normal; line-height: 1.4; }

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
.jb-plan.desk { grid-template-rows: 30px 18px minmax(170px, 1fr) 14px; }
.jb-plan.phone { width: min(100%, 300px); margin-inline: auto; grid-template-rows: 30px auto 22px minmax(200px, 1fr) 34px; border-radius: 18px; padding: 14px 10px; }
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
.pl-body { display: grid; grid-template-columns: 1fr 2.6fr 1.2fr; gap: 5px; border: 0 !important; }
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

/* ---- Sticky go bar ---------------------------------------------------- */
.jb-go {
  position: sticky;
  bottom: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 0 calc(-1 * var(--pad-page));
  padding: 12px var(--pad-page) max(12px, env(safe-area-inset-bottom));
  background: rgba(11, 12, 9, 0.94);
  backdrop-filter: blur(6px);
  border-top: 1px solid var(--gold);
}
.review .jb-go { margin: 0; padding: 12px 0 0; background: var(--panel); backdrop-filter: none; border-top-color: var(--line-3); }
.jb-go-who { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.jb-go-who .disp { font-size: 17px; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.jb-go-need { appearance: none; padding: 0; border: 0; background: none; text-align: left; font-size: 17px; color: var(--dim); cursor: pointer; text-decoration: underline dashed var(--line-5) 1px; text-underline-offset: 4px; }
.jb-exit { color: var(--muted); white-space: nowrap; }
.jb-cta { min-height: 50px; padding: 0 22px; font-size: 15px; gap: 10px; }
@container jb (max-width: 480px) {
  .jb-exit { display: none; }
  .jb-cta { flex: 1 1 auto; }
}
</style>
