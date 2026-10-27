<script setup lang="ts">
import { WARBONDS } from '~~/shared/data/catalog'
import { difficultyImageUrl, itemImageUrl } from '~~/shared/data/images'
import { MAX_NAME_LENGTH, SQUAD_SIZE_MAX } from '~~/shared/engine/config'
import { difficultyName } from '~~/shared/engine/progression'
import type { DiverState } from '~~/shared/engine/types'

// The one-screen first-run page shared by the host tutorial and the joiner's
// briefing: the name, the squad and the way in sit beside a five-step mission
// loop, and everything a first dive can do without folds into "More".
export interface BriefingStep {
  who: 'host' | 'you' | 'all'
  beat: string
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
  kitNote: string
  guideName: string
  // Shown above the squad: why the way in is shut right now.
  warning?: string | null
  // Shown under the squad: what happens the moment the diver lands.
  note?: BriefingFact | null
  // Role-specific lines for the More fold.
  facts?: readonly BriefingFact[]
}>(), { review: false, statusTone: 'teal', ownSeat: false, warning: null, note: null, facts: () => [] })

const name = defineModel<string>('name', { required: true })
const emit = defineEmits<{ submit: [] }>()

const { ownedWarbonds } = useOwnedWarbonds()
const { openCodex, openWarbonds } = useDrawers()

const callsign = computed(() => name.value.trim())
const kitGroupList = computed(() => kitGroups(props.kitIds))
const openSeats = computed(() => Math.max(0, SQUAD_SIZE_MAX - props.divers.length))
const WHO_TAG: Record<BriefingStep['who'], string> = { host: 'Host', you: 'You', all: 'Everyone' }

// The name is the one thing the page needs, so the cursor starts there.
const nameInput = ref<HTMLInputElement | null>(null)
onMounted(() => {
  if (!props.review) {
    nameInput.value?.focus()
  }
})

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
        class="jb-hero rise"
        aria-labelledby="jb-title"
      >
        <div class="jb-head">
          <span
            v-if="!review"
            class="lbl gold"
          >{{ kicker }}</span>
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
          <p class="jb-lede">
            <slot name="lede" />
          </p>
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
            >
            <span
              id="jb-callsign-hint"
              class="cap jb-name-hint"
            >
              <span>The name your squad sees</span>
              <span>{{ name.length }} / {{ MAX_NAME_LENGTH }}</span>
            </span>
          </div>
          <div
            v-else
            class="jb-name"
          >
            <span class="lbl">Playing as</span>
            <span class="disp jb-name-shown">{{ callsign }}</span>
          </div>

          <p
            v-if="warning"
            class="jb-note warn"
            role="status"
          >
            {{ warning }}
          </p>

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
            <p
              v-if="note"
              class="jb-note"
            >
              <b>{{ note.title }}</b> {{ note.text }}
            </p>
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
        </div>

        <section
          class="jb-loop-wrap"
          aria-labelledby="jb-loop-h"
        >
          <h2
            id="jb-loop-h"
            class="lbl"
          >
            How a mission goes
          </h2>
          <ol class="jb-loop">
            <li
              v-for="(step, i) in steps"
              :key="step.beat"
              class="jb-beat"
              :data-who="step.who"
            >
              <span class="disp jb-beat-n">{{ i + 1 }}</span>
              <span class="jb-beat-body">
                <span class="jb-beat-h">
                  <b class="disp jb-beat-t">{{ step.beat }}</b>
                  <span class="jb-who">{{ WHO_TAG[step.who] }}</span>
                </span>
                <span class="jb-beat-x">{{ step.text }}</span>
              </span>
            </li>
          </ol>
        </section>
      </section>

      <details
        class="jb-more"
        :open="review"
      >
        <summary class="jb-more-sum">
          <span class="disp">More</span>
          <span class="jb-more-hint">Starting gear, where things are, failed missions</span>
          <svg
            class="jb-more-chev"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.4"
            aria-hidden="true"
          ><path d="m6 9 6 6 6-6" /></svg>
        </summary>

        <div class="jb-more-body">
          <div
            class="jb-kit"
            aria-labelledby="jb-kit-h"
            role="group"
          >
            <div class="jb-kit-h">
              <span
                id="jb-kit-h"
                class="lbl gold"
              >Starting gear</span>
              <span class="cap"><b>{{ kitIds.length }}</b> items</span>
            </div>
            <ul class="jb-kit-items">
              <template
                v-for="group in kitGroupList"
                :key="group.label"
              >
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
              </template>
            </ul>
            <span class="jb-kit-note">{{ kitNote }}</span>
          </div>

          <ul class="jb-facts">
            <li>
              <b>Kit</b>
              <span>Everything you own. Anything the mission's rules ban is greyed out.</span>
            </li>
            <li>
              <b>Armory</b>
              <span>Every item that can drop, sorted by tier.</span>
              <button
                class="btn ghost jb-fact-btn"
                type="button"
                aria-haspopup="dialog"
                @click="openCodex"
              >
                Open the armory
              </button>
            </li>
            <li>
              <b>Warbonds</b>
              <span>
                Rewards only come from warbonds you own
                ({{ ownedWarbonds.length }} of {{ WARBONDS.length }} ticked).
              </span>
              <button
                class="btn ghost jb-fact-btn"
                type="button"
                aria-haspopup="dialog"
                @click="openWarbonds"
              >
                Edit warbonds
              </button>
            </li>
            <li
              v-for="fact in facts"
              :key="fact.title"
            >
              <b>{{ fact.title }}</b>
              <span>{{ fact.text }}</span>
            </li>
            <li>
              <b>This guide</b>
              <span>Reopen it any time from the ⋯ menu ({{ guideName }}).</span>
            </li>
          </ul>
        </div>
      </details>

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
}
.jb.review { min-height: 0; background: none; }

.jb-form {
  container: jb / inline-size;
  max-width: 1080px;
  margin-inline: auto;
  padding: 0 var(--pad-page) 24px;
  display: flex;
  flex-direction: column;
  gap: clamp(20px, 3vw, 32px);
}
.review .jb-form { padding: 0; gap: 20px; }

/* ---- Top bar ---------------------------------------------------------- */
.jb-top {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 56px;
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

/* ---- Hero: heading + loop on the left, the way in on the right --------- */
.jb-hero {
  display: grid;
  gap: 20px;
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas: 'head' 'card' 'loop';
}
@container jb (min-width: 760px) {
  .jb-hero {
    grid-template-columns: minmax(0, 1.25fr) minmax(300px, 1fr);
    grid-template-areas: 'head card' 'loop card';
    grid-template-rows: auto 1fr;
    gap: 20px 36px;
    align-items: start;
  }
}
.jb-head { grid-area: head; display: flex; flex-direction: column; gap: 10px; }
.jb-card { grid-area: card; }
.jb-loop-wrap { grid-area: loop; display: flex; flex-direction: column; gap: 10px; }
.jb-loop-wrap h2 { margin: 0; }

.jb-title { margin: 0; font-size: clamp(36px, 6vw, 64px); color: var(--text); }
.jb-title.sm { font-size: clamp(26px, 4vw, 38px); }
:slotted(.jb-drafted) {
  color: var(--gold);
  display: inline-block;
  animation: slam 0.5s var(--ease-impact) 0.25s both;
}
.jb-lede { margin: 0; max-width: 48ch; color: var(--khaki); font-size: clamp(15px, 1.3vw, 17px); line-height: 1.5; }
:slotted(b) { color: var(--text); }

/* Callsigns read in display type wherever a diver is named. */
.jb-callsign,
:slotted(.jb-callsign) {
  font-family: var(--font-display);
  font-stretch: 125%;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* ---- The card: name, squad, actions ------------------------------------ */
.jb-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
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
@media (prefers-reduced-motion: reduce) {
  .jb-name-input.empty { animation: none; }
}
.jb-name-hint { display: flex; justify-content: space-between; gap: 8px; }
.jb-name-shown { font-size: clamp(22px, 2.6vw, 28px); color: var(--text); overflow-wrap: anywhere; }

.jb-squad {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px dashed var(--line-2);
}
.jb-squad-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.jb-status { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--teal); }
.jb-status.orange { color: var(--orange); }
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
.jb-alt { display: flex; align-items: center; gap: 10px; }
.jb-alt img { width: 30px; height: 30px; }
.jb-alt > span { display: flex; flex-direction: column; gap: 3px; }
.jb-alt-n { font-size: 15px; color: var(--text); }
.jb-note { margin: 0; padding: 8px 10px; font-size: 13px; line-height: 1.4; color: var(--khaki); background: color-mix(in srgb, var(--teal) 7%, transparent); border-left: 2px solid var(--teal); }
.jb-note b { color: var(--teal); }
.jb-note.warn { color: var(--orange); background: color-mix(in srgb, var(--orange) 8%, transparent); border-left-color: var(--orange); }

/* The way in leads; warbonds is the optional stop beneath it. */
.jb-acts { display: flex; flex-direction: column-reverse; gap: 8px; }
.jb-acts .btn { gap: 10px; justify-content: center; white-space: nowrap; }
.jb-acts-wb { min-height: 42px; padding: 0 16px; }
.jb-acts-i { width: 18px; height: 18px; }
.jb-cta { min-height: 54px; padding: 0 22px; font-size: 16px; }

/* ---- The loop: five numbered beats, the reader's own lit gold ----------- */
.jb-loop { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.jb-beat {
  --who: var(--teal);
  display: flex;
  gap: 12px;
  padding: 10px 12px;
  background: var(--panel);
  border: 1px solid var(--line-2);
  border-left: 3px solid var(--who);
}
.jb-beat[data-who='you'] {
  --who: var(--gold);
  background: color-mix(in srgb, var(--gold) 6%, var(--panel));
}
.jb-beat[data-who='all'] { --who: var(--khaki); }
.jb-beat-n { flex-shrink: 0; width: 1.2em; font-size: 20px; line-height: 1.1; color: var(--who); }
.jb-beat-body { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.jb-beat-h { display: flex; align-items: baseline; gap: 10px; }
.jb-beat-t { font-size: 15px; color: var(--text); }
.jb-who { font-size: 10px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: var(--who); }
.jb-beat-x { font-size: 13px; line-height: 1.45; color: var(--khaki); }

/* ---- More: one fold for everything a first dive can skip ---------------- */
.jb-more { border: 1px solid var(--line-2); background: var(--rail); }
.jb-more-sum {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 14px 16px;
  cursor: pointer;
  list-style: none;
}
.jb-more-sum::-webkit-details-marker { display: none; }
.jb-more-sum .disp { font-size: 16px; color: var(--text); }
.jb-more-hint { flex: 1; min-width: 0; font-size: 13px; color: var(--muted); }
.jb-more-chev { align-self: center; flex-shrink: 0; color: var(--gold); transition: transform var(--dur-fast) var(--ease-out); }
.jb-more[open] .jb-more-chev { transform: rotate(180deg); }
.jb-more-sum:hover .disp { color: var(--gold); }
.jb-more-body {
  display: grid;
  gap: 16px;
  padding: 0 16px 16px;
  grid-template-columns: minmax(0, 1fr);
}
@container jb (min-width: 760px) {
  .jb-more-body { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: start; }
}

.jb-kit { display: flex; flex-direction: column; gap: 10px; }
.jb-kit-h { display: flex; justify-content: space-between; align-items: baseline; }
.jb-kit-items { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 4px; }
.jb-kit-items li {
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  background: var(--raised);
  border: 1px solid var(--line-2);
}
.jb-kit-items li.wide { width: 96px; }
.jb-kit-items img { width: 42px; height: 42px; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5)); }
.jb-kit-items li.wide img { width: 86px; }
.jb-kit-note { font-size: 12px; line-height: 1.45; color: var(--muted); }

.jb-facts { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.jb-facts > li {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
  padding: 10px 12px;
  background: var(--panel);
  border: 1px solid var(--line-2);
  font-size: 13px;
  line-height: 1.45;
  color: var(--khaki);
}
.jb-facts b {
  flex: 0 0 100%;
  font-family: var(--font-display);
  font-stretch: 125%;
  font-size: 13px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text);
}
.jb-fact-btn { min-height: 32px; padding: 0 12px; font-size: 12px; }

.jb-foot { display: flex; justify-content: flex-end; }
.jb-exit { color: var(--muted); }
.jb-exit:hover { color: var(--gold); }
.gold { color: var(--gold); }
</style>
