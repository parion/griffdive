<script setup lang="ts">
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'
import type { Component } from 'vue'
import { difficultyImageUrl, itemImageUrl } from '~~/shared/data/images'
import { MAX_NAME_LENGTH, SQUAD_SIZE_MAX } from '~~/shared/engine/config'
import { difficultyName } from '~~/shared/engine/progression'
import type { DiverState } from '~~/shared/engine/types'
import IconHellpod from '~/components/icon/IconHellpod.vue'
import IconLoot from '~/components/icon/IconLoot.vue'
import IconPact from '~/components/icon/IconPact.vue'
import IconStar from '~/components/icon/IconStar.vue'
import IconWheel from '~/components/icon/IconWheel.vue'
import type { BriefingStepId } from '~/utils/briefing'
import { REGISTRY_AUTOFILE, REGISTRY_BEAT, REGISTRY_HOLD, REGISTRY_STAMP } from '~/utils/motion'

// The first-run page shared by the host tutorial and the joiner's briefing.
// The name files a diver as Class E and unfolds the surplus kit they drop
// with; the mission is five boxes, one open at a time with its own live scene.
export interface BriefingStep {
  id: BriefingStepId
  who: 'host' | 'you' | 'all'
  text: string
}

export interface BriefingFact {
  title: string
  text: string
}

const props = withDefaults(defineProps<{
  review?: boolean
  roomCode: string
  kicker: string
  steps: readonly BriefingStep[]
  divers: readonly DiverState[]
  hostId: string | null
  difficulty: number
  status: string
  statusTone?: 'teal' | 'orange'
  // A joiner previews their own seat before they take it.
  ownSeat?: boolean
  ctaLabel: string
  canSubmit: boolean
  kitIds: readonly string[]
  kitNote?: string | null
  // Shown above the squad: why the way in is shut right now.
  warning?: string | null
  // Shown under the squad: what happens the moment the diver lands.
  note?: BriefingFact | null
}>(), { review: false, statusTone: 'teal', ownSeat: false, kitNote: null, warning: null, note: null })

const name = defineModel<string>('name', { required: true })
const emit = defineEmits<{ submit: [] }>()

const { openWarbonds } = useDrawers()

const reduced = import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const timers: ReturnType<typeof setTimeout>[] = []
function later(ms: number, run: () => void): void {
  timers.push(setTimeout(run, ms))
}
onBeforeUnmount(() => timers.forEach(clearTimeout))

const callsign = computed(() => name.value.trim())
const kitGroupList = computed(() => kitGroups(props.kitIds))
const openSeats = computed(() => Math.max(0, SQUAD_SIZE_MAX - props.divers.length))

// ---- Filing: the name rolls the class strike A→E, then the kit unfolds -----
// Presentation only: the way in never waits on it.
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
const kitOpen = ref(props.review)
const classWord = computed(() => CLASSES[Math.max(0, Math.min(classStep.value, CLASSES.length) - 1)]?.word ?? '')

function fileName(): void {
  if (!callsign.value || filing.value !== 'open') {
    return
  }
  if (reduced) {
    classStep.value = CLASSES.length
    stamped.value = true
    kitOpen.value = true
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
    kitOpen.value = true
    filing.value = 'filed'
  })
}

// Enter files the name first; once filed, Enter goes in like the CTA.
function onNameEnter(): void {
  if (filing.value === 'open') {
    fileName()
  }
  else {
    submit()
  }
}

// The name is the one thing the page needs, so the cursor starts there; a
// saved name files itself so the returning diver sees their kit.
const nameInput = ref<HTMLInputElement | null>(null)
onMounted(() => {
  if (props.review) {
    return
  }
  nameInput.value?.focus()
  if (callsign.value) {
    later(reduced ? 0 : REGISTRY_AUTOFILE, fileName)
  }
})

// ---- The mission: five boxes, one open --------------------------------------
const STEP_META: Record<BriefingStepId, { label: string, title: string, icon: Component }> = {
  spin: { label: 'Spin', title: 'Spin the wheel', icon: IconWheel },
  pacts: { label: 'Swear', title: 'Swear pacts', icon: IconPact },
  dive: { label: 'Dive', title: 'Dive', icon: IconHellpod },
  report: { label: 'Report', title: 'Report', icon: IconStar },
  loot: { label: 'Loot', title: 'Loot', icon: IconLoot },
}
const WHO_TAG: Record<BriefingStep['who'], string> = { host: 'Host', you: 'You', all: 'Everyone' }
const WHO_ORDER: readonly BriefingStep['who'][] = ['you', 'host', 'all']
const whoLegend = computed(() => WHO_ORDER.filter(who => props.steps.some(step => step.who === who)))
const activeStep = ref<string>(props.steps[0]?.id ?? 'spin')
const stepIndex = computed(() => Math.max(0, props.steps.findIndex(step => step.id === activeStep.value)))
// The outgoing scene leaves the way the diver is reading: forward slides
// left, back slides right.
const stepDir = ref<'fwd' | 'back'>('fwd')
watch(stepIndex, (next, prev) => {
  stepDir.value = next < prev ? 'back' : 'fwd'
})

const stepsSection = ref<HTMLElement | null>(null)
function goToStep(id: BriefingStepId, scroll: boolean): void {
  activeStep.value = id
  if (scroll) {
    stepsSection.value?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
  }
}

function submit(): void {
  if (props.canSubmit) {
    emit('submit')
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
    <BridgeField v-if="!review" />
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
          <AppBrandMark :size="22" />
          <span class="disp">Griffdive</span>
        </NuxtLink>
        <span class="grow" />
        <span class="cap jb-room">
          <span
            class="lamp teal pulse"
            aria-hidden="true"
          />
          Room <b class="mono">{{ roomCode }}</b>
        </span>
      </header>

      <section
        class="jb-hero"
        aria-labelledby="jb-title"
      >
        <div class="jb-head">
          <span
            v-if="!review"
            class="lbl jb-kicker rise"
          >
            <span
              class="hazard jb-kicker-bar"
              aria-hidden="true"
            />
            {{ kicker }}
          </span>
          <h1
            v-if="!review"
            id="jb-title"
            class="disp jb-title"
          >
            <slot name="title" />
          </h1>
          <h2
            v-else
            id="jb-title"
            class="disp jb-title sm"
          >
            <slot name="title" />
          </h2>
          <p class="jb-lede rise">
            <slot name="lede" />
          </p>
          <nav
            class="jb-beats rise"
            aria-label="How a mission goes"
          >
            <button
              v-for="(step, i) in steps"
              :key="step.id"
              type="button"
              class="jb-beat chev"
              :data-who="step.who"
              @click="goToStep(step.id, true)"
            >
              <span class="disp">{{ i + 1 }}</span>{{ STEP_META[step.id].label }}
            </button>
          </nav>
        </div>

        <div class="jb-card cut">
          <div
            v-if="!review"
            class="jb-name"
          >
            <label
              for="jb-callsign"
              class="lbl gold"
            >Your name</label>
            <input
              id="jb-callsign"
              ref="nameInput"
              v-model="name"
              class="disp jb-name-input"
              :class="{ empty: !callsign }"
              type="text"
              :maxlength="MAX_NAME_LENGTH"
              placeholder="Type your name"
              autocomplete="nickname"
              spellcheck="false"
              enterkeyhint="go"
              aria-describedby="jb-callsign-hint"
              aria-required="true"
              @keydown.enter.prevent="onNameEnter"
              @blur="fileName"
            >
            <span
              id="jb-callsign-hint"
              class="cap jb-name-hint"
            >
              <span>The name your squad sees</span>
              <span><kbd v-if="filing === 'open' && callsign">Enter</kbd> {{ name.length }} / {{ MAX_NAME_LENGTH }}</span>
            </span>
          </div>
          <div
            v-else
            class="jb-name"
          >
            <span class="lbl">Playing as</span>
            <span class="disp jb-name-shown">{{ callsign }}</span>
          </div>

          <!-- The class strike: why a Griffdiver drops with surplus gear. -->
          <div
            class="jb-reveal"
            :class="{ open: filing !== 'open' }"
            :inert="filing === 'open'"
          >
            <div class="jb-reveal-clip">
              <div class="jb-class">
                <span class="jb-class-h">
                  <span class="lbl">Class</span>
                  <span
                    class="cap jb-class-word"
                    :class="{ e: classStep >= CLASSES.length }"
                  >{{ classWord }}</span>
                </span>
                <ol
                  class="jb-classes"
                  aria-hidden="true"
                >
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
                  v-if="stamped"
                  class="disp jb-stamp stamp"
                  aria-hidden="true"
                >Griffdiver</span>
                <p
                  class="jb-class-x"
                  :class="{ shown: stamped }"
                >
                  Helldivers are Class A. You're <b>Class E</b>: surplus gear, no arsenal. Earn
                  the rest one mission at a time.
                </p>
              </div>
            </div>
          </div>

          <div
            class="jb-reveal"
            :class="{ open: kitOpen }"
            :inert="!kitOpen"
          >
            <div class="jb-reveal-clip">
              <div
                class="jb-kit"
                role="group"
                aria-labelledby="jb-kit-h"
              >
                <div class="jb-kit-h">
                  <span
                    id="jb-kit-h"
                    class="lbl gold"
                  >Starting gear</span>
                  <span class="cap"><b>{{ kitIds.length }}</b> items</span>
                </div>
                <div class="jb-kit-groups">
                  <div
                    v-for="(group, g) in kitGroupList"
                    :key="group.label"
                    class="jb-kit-g"
                    :style="{ '--g': g, '--accent': group.accent }"
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
                </div>
                <span
                  v-if="kitNote"
                  class="jb-kit-note"
                >{{ kitNote }}</span>
              </div>
            </div>
          </div>

          <p
            class="sr-only"
            aria-live="polite"
          >
            {{ filing === 'filed' && !review ? `Filed: ${callsign}, Class E. Starting gear shown.` : '' }}
          </p>

          <AppBanner
            v-if="warning"
            tone="warn"
          >
            {{ warning }}
          </AppBanner>

          <aside
            class="jb-squad"
            aria-label="The squad"
          >
            <div class="jb-squad-head">
              <span class="lbl">Squad</span>
              <span
                class="jb-status"
                :class="statusTone"
              ><span
                class="lamp pulse"
                :class="statusTone"
                aria-hidden="true"
              />{{ status }}</span>
            </div>
            <ul class="jb-seats">
              <li
                v-for="d in divers"
                :key="d.id"
                class="jb-seat"
                :class="{ host: d.id === hostId, away: d.away }"
              >
                <span class="disp jb-seat-l">{{ (d.name[0] ?? '?').toUpperCase() }}</span>
                <span class="jb-seat-n jb-callsign">{{ upperName(d.name) }}</span>
                <span
                  v-if="d.id === hostId"
                  class="jb-seat-tag"
                >Host</span>
              </li>
              <li
                v-for="i in openSeats"
                :key="`open-${i}`"
                class="jb-seat open"
                :class="{ you: i === 1 && ownSeat }"
              >
                <span class="disp jb-seat-l">{{ i === 1 && ownSeat ? (callsign[0] ?? '?').toUpperCase() : '+' }}</span>
                <span
                  class="jb-seat-n"
                  :class="{ 'jb-callsign': i === 1 && ownSeat && callsign }"
                >{{ i === 1 && ownSeat ? (upperName(callsign) || 'You') : 'Open' }}</span>
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
            <AppBanner
              v-if="note"
              :title="note.title"
            >
              {{ note.text }}
            </AppBanner>
          </aside>
        </div>
      </section>

      <section
        id="jb-steps"
        ref="stepsSection"
        class="jb-steps"
        aria-labelledby="jb-steps-h"
      >
        <div class="jb-steps-head">
          <h2
            id="jb-steps-h"
            class="disp jb-steps-title"
          >
            How a mission goes
          </h2>
          <ul
            class="jb-legend"
            aria-label="Who acts"
          >
            <li
              v-for="who in whoLegend"
              :key="who"
              :data-who="who"
            >
              {{ WHO_TAG[who] }}
            </li>
          </ul>
        </div>
        <TabsRoot
          v-model="activeStep"
          class="jb-tabs-root"
        >
          <TabsList
            class="jb-tabs"
            aria-label="Mission steps"
          >
            <TabsTrigger
              v-for="(step, i) in steps"
              :key="step.id"
              :value="step.id"
              class="jb-tab"
              :data-who="step.who"
            >
              <span class="jb-tab-n">{{ String(i + 1).padStart(2, '0') }}</span>
              <component
                :is="STEP_META[step.id].icon"
                class="jb-tab-i"
              />
              <span class="jb-tab-l">{{ STEP_META[step.id].label }}</span>
              <span class="jb-tab-who">{{ WHO_TAG[step.who] }}</span>
            </TabsTrigger>
          </TabsList>
          <div
            class="jb-stage"
            :data-dir="stepDir"
          >
            <TabsContent
              v-for="(step, i) in steps"
              :key="step.id"
              :value="step.id"
              class="jb-panel"
              :data-who="step.who"
            >
              <div class="jb-panel-copy">
                <span class="disp jb-panel-n">{{ String(i + 1).padStart(2, '0') }}</span>
                <span class="jb-who">{{ WHO_TAG[step.who] }}</span>
                <h3 class="disp jb-panel-t">
                  {{ STEP_META[step.id].title }}
                </h3>
                <p class="jb-panel-x">
                  {{ step.text }}
                </p>
                <button
                  v-if="steps[i + 1]"
                  type="button"
                  class="btn ghost small jb-next"
                  @click="goToStep(steps[i + 1]!.id, false)"
                >
                  Next · {{ STEP_META[steps[i + 1]!.id].label }}
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.6"
                    aria-hidden="true"
                  ><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </button>
              </div>
              <BriefingPreview
                class="jb-scene"
                :step="step.id"
                :difficulty="difficulty"
              />
            </TabsContent>
          </div>
        </TabsRoot>
      </section>

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
          :class="{ 'cta-sweep': canSubmit }"
          type="submit"
          :disabled="!canSubmit"
        >
          <span class="disp">{{ ctaLabel }}</span>
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

      <footer
        v-if="!review"
        class="jb-foot"
      >
        <NuxtLink
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
  /* Seats the fixed field above the page's ground, as on the Bridge. */
  isolation: isolate;
  overflow-x: clip;
}
.jb.review { min-height: 0; background: none; }

.jb-form {
  container: jb / inline-size;
  max-width: 1440px;
  margin-inline: auto;
  padding: 0 var(--pad-page) 24px;
  display: flex;
  flex-direction: column;
}
.review .jb-form { padding: 0; }

/* ---- Top bar ---------------------------------------------------------- */
.jb-top {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 52px;
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
.jb-room { display: inline-flex; align-items: center; gap: 6px; flex-shrink: 0; }
.jb-room b { color: var(--text); letter-spacing: 0.12em; }

/* ---- Hero ---------------------------------------------------------------
   The Bridge's hero grammar: the creed and the way through the mission on
   the left, the one thing the page needs — the name card — on the right.
   Phones read top-down. */
.jb-hero {
  display: grid;
  gap: 24px;
  grid-template-columns: minmax(0, 1fr);
  align-items: center;
  padding-block: clamp(20px, 4vw, 56px);
}
.review .jb-hero { padding-block: 0 8px; }
@container jb (min-width: 900px) {
  .jb-hero {
    grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
    gap: clamp(32px, 4vw, 72px);
    min-height: min(calc(100svh - 160px), 820px);
  }
}
.jb-head { display: flex; flex-direction: column; gap: 18px; min-width: 0; }
.jb-kicker { display: inline-flex; align-items: center; gap: 12px; color: var(--gold); }
.jb-kicker-bar { width: 44px; height: 6px; }
.jb-card { animation: riseIn 0.5s var(--ease-out) 0.12s both; }
.review .jb-card { animation: none; }

.jb-title { margin: 0; font-size: clamp(40px, 5.6vw, 84px); line-height: 0.92; color: var(--text); }
.jb-title.sm { font-size: clamp(26px, 4vw, 36px); line-height: 0.98; }
:slotted(.jb-drafted) {
  color: var(--gold);
  display: inline-block;
  animation: slam 0.5s var(--ease-impact) 0.25s both;
}
.jb-lede { margin: 0; max-width: 36rem; color: var(--khaki); font-size: clamp(15px, 1.2vw, 18px); line-height: 1.6; animation-delay: 0.08s; }
:slotted(b) { color: var(--text); }

/* The five beats as chevrons, like the Bridge's "how it plays" run; each
   opens its step below. */
.jb-beats { display: flex; flex-wrap: wrap; gap: 2px; animation-delay: 0.14s; }
.jb-beat {
  --who: var(--khaki);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 24px 0 20px;
  border: 0;
  background: var(--raised);
  color: var(--khaki);
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background-color var(--dur-fast), color var(--dur-fast);
}
.jb-beat[data-who='you'] { --who: var(--gold); }
.jb-beat[data-who='host'] { --who: var(--teal); }
.jb-beat:first-child { clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%); }
.jb-beat .disp { font-size: 11px; color: var(--who); }
.jb-beat:hover { background: var(--gold); color: var(--on-gold); }
.jb-beat:hover .disp { color: var(--on-gold); }
/* Phones reach the steps a thumb-scroll below; the run would only wrap. */
@container jb (max-width: 519px) {
  .jb-beats { display: none; }
}

/* Callsigns read in display type wherever a diver is named. */
.jb-callsign,
:slotted(.jb-callsign) {
  font-family: var(--font-display);
  font-stretch: 125%;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* ---- The card: name → class → kit → squad -------------------------------- */
.jb-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: var(--panel);
  border: 1px solid var(--line-3);
  border-top: 3px solid var(--gold);
}
.jb-name { display: flex; flex-direction: column; gap: 6px; }
.jb-name label { cursor: text; align-self: flex-start; }
/* A dotted rule is the field's only border; it breathes while empty so it
   reads as "write here", and goes solid-bright on focus. */
.jb-name-input {
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
  font-size: clamp(22px, 2.6vw, 28px);
  outline: none;
  transition: background-color var(--dur-fast), border-bottom-color var(--dur-fast);
}
.jb-name-input::placeholder { color: var(--ghost-ink); opacity: 1; }
.jb-name-input.empty { animation: nameBreathe 1.8s ease-in-out infinite; }
.jb-name-input:hover { background: rgba(255, 214, 66, 0.03); }
.jb-name-input:focus,
.jb-name-input:focus-visible {
  outline: none;
  border-bottom-color: var(--gold-bright);
  background: linear-gradient(to top, rgba(255, 214, 66, 0.1), transparent 70%);
}
@keyframes nameBreathe {
  0%, 100% { border-bottom-color: var(--gold); }
  50% { border-bottom-color: rgba(255, 214, 66, 0.35); }
}
.jb-name-hint { display: flex; justify-content: space-between; gap: 8px; }
.jb-name-hint kbd { padding: 1px 5px; margin-right: 6px; font: inherit; color: var(--gold); border: 1px solid var(--line-4); }
.jb-name-shown { font-size: clamp(22px, 2.6vw, 28px); color: var(--text); overflow-wrap: anywhere; }

/* Reveals unfold by grid row, so nothing below jumps by a fixed height. */
.jb-reveal {
  display: grid;
  grid-template-rows: 0fr;
  visibility: hidden;
  opacity: 0;
  margin-top: -12px;
  transition: grid-template-rows var(--dur-slow) var(--ease-out), opacity var(--dur-slow) var(--ease-out), margin-top var(--dur-slow) var(--ease-out), visibility 0s linear var(--dur-slow);
}
.jb-reveal.open { grid-template-rows: 1fr; visibility: visible; opacity: 1; margin-top: 0; transition-delay: 0s; }
.jb-reveal-clip { min-height: 0; overflow: hidden; }

.jb-class { position: relative; display: flex; flex-direction: column; gap: 8px; padding-top: 2px; }
.jb-class-h { display: flex; justify-content: space-between; align-items: baseline; }
.jb-class-word { color: var(--khaki); }
.jb-class-word.e { color: var(--red); }
.jb-classes { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 4px; }
.jb-classes li {
  position: relative;
  display: grid;
  place-items: center;
  height: 40px;
  border: 1px solid var(--line-2);
  color: var(--muted);
  font-size: 18px;
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
  font-size: 23px;
  animation: slam 0.5s var(--ease-impact) both;
}
.jb-stamp {
  position: absolute;
  right: 22%;
  top: 22px;
  padding: 3px 9px;
  border: 3px solid var(--red);
  color: var(--red);
  font-size: 16px;
  letter-spacing: 0.08em;
  transform: rotate(-8deg);
  background: rgba(19, 21, 15, 0.9);
  pointer-events: none;
}
.jb-class-x { margin: 0; font-size: 13px; line-height: 1.45; color: var(--khaki); opacity: 0; transition: opacity var(--dur-slow) var(--ease-out); }
.jb-class-x.shown { opacity: 1; }
.jb-class-x b { color: var(--red); }

.jb-kit { display: flex; flex-direction: column; gap: 8px; padding-top: 10px; border-top: 1px dashed var(--line-2); }
.jb-kit-h { display: flex; justify-content: space-between; align-items: baseline; }
/* Groups flow side by side and wrap, so a short group never takes a row. */
.jb-kit-groups { display: flex; flex-wrap: wrap; gap: 10px 14px; }
.jb-kit-g { display: flex; flex-direction: column; gap: 4px; padding-left: 7px; border-left: 2px solid var(--accent); }
.jb-reveal.open .jb-kit-g { animation: kitIn var(--dur-slow) var(--ease-out) both; animation-delay: calc(var(--g) * 80ms); }
@keyframes kitIn { from { opacity: 0; transform: translateY(6px); } }
.jb-kit-items { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 4px; }
.jb-kit-items li {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  background: var(--raised);
  border: 1px solid var(--line-2);
}
.jb-kit-items li.wide { width: 86px; }
.jb-kit-items img { width: 36px; height: 36px; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5)); }
.jb-kit-items li.wide img { width: 78px; }
.jb-kit-note { font-size: 12px; line-height: 1.45; color: var(--muted); }

.jb-squad { display: flex; flex-direction: column; gap: 10px; padding-top: 12px; border-top: 1px dashed var(--line-2); }
.jb-squad-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.jb-status { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--teal); }
.jb-status.orange { color: var(--orange); }
.jb-seats { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px; }
.jb-seat { display: flex; align-items: center; gap: 8px; min-width: 0; height: 34px; padding: 0 8px 0 0; background: var(--raised); border: 1px solid var(--line-2); }
.jb-seat-l { display: grid; place-items: center; width: 32px; height: 100%; flex-shrink: 0; background: var(--line-2); color: var(--text); font-size: 14px; }
.jb-seat-n { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; font-weight: 600; }
.jb-seat-n.jb-callsign { font-size: 12px; font-weight: 800; }
.jb-seat-tag { margin-left: auto; font-size: 9px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--teal); }
.jb-seat.host .jb-seat-l { background: var(--teal); color: var(--on-gold); }
.jb-seat.away { opacity: 0.55; }
.jb-seat.open { background: transparent; border-style: dashed; border-color: var(--line-4); color: var(--muted); }
.jb-seat.open .jb-seat-l { background: transparent; color: var(--dim); }
.jb-seat.you { border: 1px solid var(--gold); color: var(--gold); }
.jb-seat.you .jb-seat-l { background: var(--gold); color: var(--on-gold); }
.jb-alt { display: flex; align-items: center; gap: 10px; }
.jb-alt img { width: 28px; height: 28px; }
.jb-alt > span { display: flex; flex-direction: column; gap: 3px; }
.jb-alt-n { font-size: 14px; color: var(--text); }

/* ---- Actions ------------------------------------------------------------
   The way in sits last in the page and sticks to the bottom edge, so it
   stays in reach from the name card through every mission step. */
.jb-acts {
  position: sticky;
  bottom: 0;
  z-index: 2;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-inline: calc(-1 * var(--pad-page));
  padding: 10px var(--pad-page) calc(10px + env(safe-area-inset-bottom));
  background: linear-gradient(to top, var(--ground) 72%, transparent);
}
.review .jb-acts { margin-inline: 0; padding-inline: 0; }
.jb-acts .btn { gap: 10px; justify-content: center; white-space: nowrap; min-height: 52px; }
.jb-acts-wb { flex: 0 0 auto; padding: 0 14px; }
.jb-acts-i { width: 18px; height: 18px; }
.jb-cta { flex: 1 1 auto; padding: 0 20px; font-size: 16px; }
/* On phones the warbonds button drops to its glyph beside the CTA. */
@container jb (max-width: 459px) {
  .jb-acts-wb .disp { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  .jb-acts-wb { width: 52px; padding: 0; }
}
@container jb (min-width: 900px) {
  .jb-acts { padding-top: 16px; padding-bottom: calc(16px + env(safe-area-inset-bottom)); }
  .jb-acts .btn { min-height: 58px; }
  .jb-acts-wb { padding: 0 22px; }
  .jb-cta { flex: 0 1 clamp(300px, 30cqi, 440px); font-size: 18px; }
}

/* ---- The mission: five boxes over one lit stage --------------------------- */
.jb-steps {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
  padding-block: clamp(28px, 5vw, 72px) 8px;
  border-top: 1px solid var(--line-1);
  scroll-margin-top: 12px;
}
.review .jb-steps { padding-top: 20px; }
.jb-steps-head { display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; gap: 12px 24px; }
.jb-steps-title { margin: 0; font-size: clamp(26px, 4cqi, 52px); line-height: 0.98; color: var(--text); }
.jb-legend { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px 18px; }
.jb-legend li {
  --who: var(--khaki);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--khaki);
}
.jb-legend li::before { content: ''; width: 18px; height: 3px; background: var(--who); }

[data-who='you'] { --who: var(--gold); }
[data-who='host'] { --who: var(--teal); }

.jb-tabs { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 4px; }
.jb-tab {
  --who: var(--khaki);
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 14px 2px 10px;
  border: 1px solid var(--line-2);
  border-bottom: 3px solid color-mix(in srgb, var(--who) 60%, transparent);
  background: var(--panel);
  color: var(--khaki);
  font: inherit;
  cursor: pointer;
  transition: background-color var(--dur-fast), color var(--dur-fast), border-color var(--dur-fast);
}
.jb-tab[data-who='you'] { --who: var(--gold); }
.jb-tab[data-who='host'] { --who: var(--teal); }
.jb-tab:hover { color: var(--text); border-color: var(--line-4); border-bottom-color: var(--who); }
.jb-tab-n { position: absolute; top: 5px; left: 7px; font-size: 10px; font-weight: 700; color: var(--dim); }
.jb-tab-i { width: clamp(24px, 3.2cqi, 38px); height: clamp(24px, 3.2cqi, 38px); }
.jb-tab-l { max-width: 100%; overflow: hidden; text-overflow: ellipsis; font-size: clamp(11px, 1.2cqi, 14px); font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; }
.jb-tab-who { font-size: 9px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--who); }
@container jb (max-width: 459px) {
  .jb-tab-who { display: none; }
}
.jb-tab[data-state='active'] {
  color: var(--on-gold);
  background: var(--gold);
  border-color: var(--gold);
}
.jb-tab[data-state='active'] .jb-tab-n,
.jb-tab[data-state='active'] .jb-tab-who { color: var(--on-gold); opacity: 0.7; }
/* The open box points down into the stage. */
.jb-tab[data-state='active']::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -11px;
  width: 16px;
  height: 9px;
  margin-left: -8px;
  background: var(--gold);
  clip-path: polygon(0 0, 100% 0, 50% 100%);
}

/* Panels share one grid cell, so the outgoing step slides out over the
   incoming one instead of stacking below it. */
.jb-stage {
  --from: 56px;
  --to: -56px;
  display: grid;
  margin-top: 10px;
  overflow: clip;
}
.jb-stage[data-dir='back'] { --from: -56px; --to: 56px; }
.jb-panel[hidden] { display: none; }
.jb-panel {
  --who: var(--khaki);
  grid-area: 1 / 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
  min-width: 0;
  padding: clamp(14px, 2.2cqi, 28px);
  background: var(--panel);
  border: 1px solid var(--line-2);
  border-top: 2px solid var(--gold);
}
.jb-panel[data-state='active'] { animation: stepIn var(--dur-slow) var(--ease-out) both; }
.jb-panel[data-state='inactive'] { animation: stepOut var(--dur-med) ease-in both; pointer-events: none; }
@keyframes stepIn { from { opacity: 0; transform: translateX(var(--from)); } }
@keyframes stepOut { to { opacity: 0; transform: translateX(var(--to)); } }
@container jb (min-width: 760px) {
  .jb-panel {
    grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
    align-items: center;
    gap: clamp(24px, 3cqi, 48px);
  }
}

.jb-panel-copy { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: end; gap: 10px 14px; }
.jb-panel-copy > :not(.jb-panel-n, .jb-who) { grid-column: 1 / -1; }
.jb-panel-n {
  font-size: clamp(40px, 5.6cqi, 80px);
  line-height: 0.82;
  color: transparent;
  -webkit-text-stroke: 1.5px var(--who);
}
.jb-who { padding-bottom: 2px; font-size: 11px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: var(--who); }
.jb-panel-t { margin: 4px 0 0; font-size: clamp(24px, 3.4cqi, 46px); line-height: 0.98; color: var(--text); }
.jb-panel-x { margin: 0; max-width: 34rem; font-size: clamp(15px, 1.4cqi, 18px); line-height: 1.55; color: var(--khaki); }
.jb-next { justify-self: start; gap: 8px; margin-top: 4px; }

/* The scene keeps its drawn proportions and scales with the stage. */
.jb-scene { --pv-zoom: 1.15; }
@container jb (min-width: 520px) { .jb-scene { --pv-zoom: 1.5; } }
@container jb (min-width: 760px) { .jb-scene { --pv-zoom: 1.4; } }
@container jb (min-width: 1000px) { .jb-scene { --pv-zoom: 1.7; } }
@container jb (min-width: 1240px) { .jb-scene { --pv-zoom: 2; } }

.jb-foot { display: flex; justify-content: flex-end; }
.jb-exit { color: var(--muted); }
.jb-exit:hover { color: var(--gold); }
.gold { color: var(--gold); }

@media (prefers-reduced-motion: reduce) {
  .jb-name-input.empty,
  .jb-panel[data-state],
  .jb-reveal.open .jb-kit-g { animation: none; }
}
</style>
