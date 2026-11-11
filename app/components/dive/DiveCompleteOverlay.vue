<script setup lang="ts">
import { MAX_DIFFICULTY, MIN_DIFFICULTY, REWARD_TOKEN_CAP, baseTierFor } from '~~/shared/engine/config'
import { difficultyName } from '~~/shared/engine/progression'
import { TIER_RANK } from '~~/shared/data/catalog'
import { difficultyImageUrl, itemImageUrl } from '~~/shared/data/images'
import type { DiveState } from '~~/shared/engine/types'
import { buildRecap } from '~/utils/recap'
import { KIT_SECTIONS, earnedKitItems, kitSectionOf } from '~/utils/kit'

const props = defineProps<{
  state: DiveState
  crusadeLabel: string
  mode: 'local' | 'room'
  slotName: string
}>()

const emit = defineEmits<{ abandonSlot: [] }>()

const BEST_GEAR_SHOWN = 4

const recap = computed(() => buildRecap(props.state, props.crusadeLabel))
const achieved = computed(() => props.state.achieved)
const stage = ref<HTMLElement | null>(null)

const pardoned = computed(() =>
  props.state.debtSettled === true
  && !props.state.divers.some(diver => diver.penance?.status === 'owed'))

const notice = computed(() => achieved.value
  ? pardoned.value
    ? {
        label: 'Ministry notice · Pardon',
        copy: 'Your Penance was served or your directive tax paid. Your debt to Liberty is settled — restored to the franchise you squandered. Do not squander it again.',
      }
    : null
  : {
      label: 'Ministry notice · File closed',
      copy: `The Ministry closes your file at ${difficultyName(props.state.difficulty)}. Your service is recorded; the rung you reached stands. Report to the Bridge when liberty calls again.`,
    })

function listNames(names: readonly string[]): string {
  if (names.length <= 1) {
    return names[0] ?? 'The squad'
  }
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
}

const lede = computed(() => {
  const r = recap.value
  const who = listNames(r.squad.map(member => member.name))
  const missions = `${r.missionsFlown} mission${r.missionsFlown === 1 ? '' : 's'}`
  return achieved.value
    ? `${who} climbed from ${r.startName} to ${r.endName} in ${missions}. The ladder is done.`
    : `${who} reached ${r.endName} in ${missions}. That rung stays on the record.`
})

const rungs = computed(() => Array.from({ length: MAX_DIFFICULTY - MIN_DIFFICULTY + 1 }, (_, i) => {
  const n = MIN_DIFFICULTY + i
  const reached = props.state.difficulty
  const state = n < reached
    ? 'climbed'
    : n === reached
      ? achieved.value ? 'summit' : 'reached'
      : 'locked'
  return { n, i, tier: baseTierFor(n), state, name: difficultyName(n) }
}))

const summitLabel = computed(() => achieved.value
  ? `Summit: difficulty ${props.state.difficulty}, ${difficultyName(props.state.difficulty)}. Every rung from ${recap.value.startDifficulty} cleared.`
  : `Reached difficulty ${props.state.difficulty}, ${difficultyName(props.state.difficulty)}, of ${MAX_DIFFICULTY}.`)

const facts = computed(() => [
  { n: String(recap.value.missionsFlown), label: 'Missions flown' },
  { n: String(recap.value.operationsCleared), label: 'Operations cleared' },
  { n: `${recap.value.startDifficulty}→${recap.value.endDifficulty}`, label: 'Difficulty climbed' },
  { n: String(recap.value.gearEarned), label: 'Gear earned' },
  { n: String(recap.value.honorsHeld), label: 'Honors held' },
])

const ART_BY_SECTION = new Map(KIT_SECTIONS.map(section => [section.id, section.art]))

// Each diver's best earned gear leads their dossier: rarest tier first, the
// catalog name breaking ties so the pick reads the same on every client.
const dossiers = computed(() => recap.value.squad.map((member) => {
  const earned = [...earnedKitItems(props.state, member.id)]
    .sort((a, b) => TIER_RANK[b.tier] - TIER_RANK[a.tier] || a.displayName.localeCompare(b.displayName))
  return {
    ...member,
    initial: member.name.slice(0, 1),
    gear: earned.slice(0, BEST_GEAR_SHOWN).map(item => ({
      id: item.id,
      name: item.displayName,
      tier: item.tier,
      image: itemImageUrl(item),
      art: ART_BY_SECTION.get(kitSectionOf(item)) ?? 'gear',
    })),
    more: Math.max(0, earned.length - BEST_GEAR_SHOWN),
  }
}))

// Embers are laid out by index, not Math.random, so the scatter reads the same
// on every visit and every replay.
const embers = Array.from({ length: 22 }, (_, i) => ({
  left: `${(i * 37 + 11) % 100}%`,
  delay: `${((i * 0.83) % 6).toFixed(2)}s`,
  duration: `${(5 + ((i * 1.7) % 4)).toFixed(2)}s`,
  drift: `${((i % 5) - 2) * 14}px`,
  size: `${3 + (i % 3)}px`,
}))

const revealKey = ref(0)
function replay(): void {
  revealKey.value += 1
  nextTick(() => stage.value?.focus())
}

onMounted(() => {
  stage.value?.focus()
})
</script>

<template>
  <div
    class="finale"
    :class="achieved ? 'won' : 'closed'"
  >
    <BridgeField />

    <header class="fin-head">
      <NuxtLink
        to="/"
        class="fin-brand"
        aria-label="Griffdive bridge"
      >
        <AppBrandMark :size="26" />
        <span class="disp fin-brand-word">Griffdive</span>
      </NuxtLink>
      <span
        class="fin-div"
        aria-hidden="true"
      />
      <div class="fin-crusade">
        <span class="lbl">Crusade</span>
        <span class="fin-crusade-name">{{ crusadeLabel }}</span>
      </div>
      <div
        v-if="mode === 'room'"
        class="fin-room"
      >
        <span class="lbl">Room</span>
        <span class="fin-room-code">{{ slotName }}</span>
      </div>
      <button
        type="button"
        class="icon-btn fin-replay"
        :aria-label="achieved ? 'Replay the victory reveal' : 'Replay the final record'"
        @click="replay"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          aria-hidden="true"
        ><path d="M4 12a8 8 0 1 0 2.3-5.7" /><path d="M4 4v4h4" /></svg>
      </button>
    </header>

    <main
      id="main-content"
      ref="stage"
      :key="revealKey"
      class="fin"
      tabindex="-1"
    >
      <section
        class="fin-hero"
        aria-labelledby="fin-h"
      >
        <div class="fin-copy">
          <span class="lbl fin-k rise">
            <span
              class="hazard fin-k-bar"
              aria-hidden="true"
            />
            {{ recap.kicker }}
            <TierListTag :list="state.tierList" />
          </span>
          <h1
            id="fin-h"
            class="disp fin-title slam"
            :aria-label="recap.creed.join(' ')"
          >
            <span>{{ recap.creed[0] }}</span>
            <span class="fin-title-is">{{ recap.creed[1] }}</span>
            <span class="fin-title-last">{{ recap.creed[2] }}</span>
          </h1>
          <p class="fin-lede rise">
            {{ lede }}
          </p>
          <p
            v-if="notice"
            class="fin-notice rise"
          >
            <span class="lbl fin-notice-lbl">{{ notice.label }}</span>
            <span>{{ notice.copy }}</span>
          </p>
          <nav
            class="fin-actions rise"
            aria-label="Next"
          >
            <NuxtLink
              to="/"
              class="btn primary cut cta-sweep fin-next"
            >
              <span class="disp">Back to bridge</span>
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.4"
                aria-hidden="true"
              ><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </NuxtLink>
            <button
              v-if="mode === 'local'"
              type="button"
              class="btn ghost fin-delete"
              @click="emit('abandonSlot')"
            >
              Delete save
            </button>
            <button
              v-if="achieved"
              type="button"
              class="btn ghost fin-endless"
              disabled
              aria-label="Continue in endless mode, locked until after v1"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.9"
                aria-hidden="true"
              ><rect
                x="5"
                y="11"
                width="14"
                height="10"
              /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
              Endless · after v1
            </button>
          </nav>
        </div>

        <div
          class="fin-summit"
          role="img"
          :aria-label="summitLabel"
        >
          <div
            class="fin-backdrop"
            aria-hidden="true"
          >
            <span class="fin-rays fin-rays-a" />
            <span class="fin-rays fin-rays-b" />
            <span class="fin-halo" />
          </div>
          <div
            v-if="achieved"
            class="fin-embers"
            aria-hidden="true"
          >
            <span
              v-for="(ember, i) in embers"
              :key="i"
              class="fin-ember"
              :style="{
                'left': ember.left,
                'width': ember.size,
                'height': ember.size,
                'animationDelay': ember.delay,
                'animationDuration': ember.duration,
                '--drift': ember.drift,
              }"
            />
          </div>

          <img
            class="fin-emblem"
            :src="difficultyImageUrl(state.difficulty)"
            alt=""
            draggable="false"
          >
          <div class="fin-peak">
            <span class="disp fin-peak-n">{{ state.difficulty }}</span>
            <span class="fin-peak-name">{{ difficultyName(state.difficulty) }}</span>
          </div>

          <ol
            class="fin-stairs"
            aria-hidden="true"
          >
            <li
              v-for="rung in rungs"
              :key="rung.n"
              class="fin-step"
              :class="rung.state"
              :data-tier="rung.tier"
              :style="{ '--i': rung.i }"
            >
              <span class="fin-step-fill" />
              <span
                v-if="rung.state === 'summit'"
                class="fin-flag"
              >
                <span class="fin-flag-cloth"><AppBrandMark :size="12" /></span>
              </span>
              <span class="disp fin-step-n">{{ rung.n }}</span>
            </li>
          </ol>
        </div>
      </section>

      <section
        class="fin-record"
        aria-label="Run recap"
      >
        <ul class="fin-facts">
          <li
            v-for="(fact, i) in facts"
            :key="fact.label"
            class="fin-fact rise"
            :style="{ animationDelay: `${0.9 + i * 0.08}s` }"
          >
            <span class="disp fin-fact-n">{{ fact.n }}</span>
            <span class="cap">{{ fact.label }}</span>
          </li>
        </ul>
      </section>

      <section
        class="fin-squad"
        aria-labelledby="fin-squad-h"
      >
        <h2
          id="fin-squad-h"
          class="disp fin-h2"
        >
          The squad
        </h2>
        <ul class="fin-dossiers">
          <li
            v-for="(diver, i) in dossiers"
            :key="diver.id"
            class="fin-dossier rise"
            :class="{ host: diver.isHost }"
            :style="{ animationDelay: `${1.2 + i * 0.1}s` }"
          >
            <div class="fin-dos-head">
              <span class="cut-sm disp fin-dos-av">{{ diver.initial }}</span>
              <span class="fin-dos-id">
                <span class="fin-dos-name">{{ diver.name }}</span>
                <span class="lbl">{{ diver.isHost ? 'Host' : 'Diver' }}</span>
              </span>
            </div>

            <ul
              v-if="diver.gear.length"
              class="fin-gear"
              :aria-label="`Best gear: ${diver.gear.map(item => item.name).join(', ')}`"
            >
              <li
                v-for="item in diver.gear"
                :key="item.id"
                class="fin-gear-tile"
                :class="`art-${item.art}`"
                :style="{ '--tier': `var(--tier-${item.tier})` }"
                :title="item.name"
              >
                <img
                  v-if="item.image"
                  :src="item.image"
                  alt=""
                  loading="lazy"
                  draggable="false"
                >
                <span
                  class="tier-badge sm"
                  :data-tier="item.tier"
                >{{ item.tier.toUpperCase() }}</span>
              </li>
              <li
                v-if="diver.more"
                class="fin-gear-more"
              >
                +{{ diver.more }}
              </li>
            </ul>
            <p
              v-else
              class="fin-gear-none"
            >
              Finished on the starting kit.
            </p>

            <dl class="fin-dos-stats">
              <div>
                <dt class="lbl">
                  Gear earned
                </dt>
                <dd class="disp">
                  {{ diver.gearEarned }}
                </dd>
              </div>
              <div>
                <dt class="lbl">
                  Honors
                </dt>
                <dd>
                  <span
                    class="chits"
                    role="img"
                    :aria-label="`${diver.tokens} of ${REWARD_TOKEN_CAP}`"
                  >
                    <span
                      v-for="chit in REWARD_TOKEN_CAP"
                      :key="chit"
                      class="chit"
                      :class="{ on: chit <= diver.tokens }"
                    />
                  </span>
                </dd>
              </div>
              <div>
                <dt class="lbl">
                  Purse
                </dt>
                <dd>
                  <CreditAmount :value="diver.credits" />
                </dd>
              </div>
            </dl>
          </li>
        </ul>
      </section>

      <section
        class="fin-share"
        aria-labelledby="fin-share-h"
      >
        <div class="fin-share-copy">
          <h2
            id="fin-share-h"
            class="disp fin-h2"
          >
            Post the record
          </h2>
          <p>
            One image with the squad, the climb and the numbers, sized for a chat or a feed. It is
            drawn in this browser; nothing is uploaded.
          </p>
        </div>
        <DiveRecapCard
          class="fin-card"
          :state="state"
          :crusade-label="crusadeLabel"
          :slot-name="slotName"
        />
      </section>

      <footer class="fin-close">
        <AppBrandMark
          class="fin-close-mark"
          :size="44"
        />
        <p class="disp fin-close-title">
          {{ achieved ? 'The next crusade starts at the Bridge.' : 'The ladder will be there.' }}
        </p>
        <NuxtLink
          to="/"
          class="btn ghost fin-close-link"
        >
          Back to bridge
        </NuxtLink>
      </footer>
    </main>
  </div>
</template>

<style scoped>
.finale {
  position: relative;
  min-height: 100dvh;
  overflow-x: clip;
  /* Seats the fixed Bridge field above the body's ground. */
  isolation: isolate;
}

.fin-head {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: var(--sp-5);
  min-height: 56px;
  padding: 0 var(--pad-page);
  border-bottom: 1px solid var(--line-1);
  background: color-mix(in srgb, var(--ground) 82%, transparent);
}
.fin-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--gold);
  flex-shrink: 0;
}
.fin-brand:hover { text-decoration: none; }
.fin-brand-word { font-size: 17px; letter-spacing: 0.06em; }
.fin-div { width: 1px; height: 28px; background: var(--line-2); flex-shrink: 0; }
.fin-crusade { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.fin-crusade .lbl,
.fin-room .lbl { font-size: 10px; }
.fin-crusade-name {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fin-room {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 36px;
  margin-left: auto;
  padding: 0 var(--sp-4);
  border: 1px solid var(--line-2);
  flex-shrink: 0;
}
.fin-room-code { font-size: var(--fs-sm); font-weight: 700; letter-spacing: 0.32em; }
.fin-replay {
  width: 44px;
  height: 44px;
  margin-left: auto;
  flex-shrink: 0;
  display: grid;
  place-items: center;
}
.fin-room + .fin-replay { margin-left: 0; }

.fin {
  width: 100%;
  max-width: 1440px;
  margin-inline: auto;
  padding: 0 var(--pad-page) var(--sp-8);
}
.fin:focus { outline: none; }

/* Hero — the Bridge hero's frame, answering its creed ---------------------- */
.fin-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: clamp(8px, 3vw, 48px);
  align-items: center;
  min-height: min(calc(100svh - 56px), 860px);
  padding-block: clamp(16px, 3vw, 40px);
}
.fin-copy { order: 2; display: grid; gap: 18px; min-width: 0; }
.fin-summit { order: 1; }
@media (min-width: 1020px) {
  .fin-hero { grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); }
  .fin-copy { order: 0; }
  .fin-summit { order: 0; }
}

.fin-k {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  color: var(--gold);
}
.fin-k-bar { width: 44px; height: 6px; }
.closed .fin-k { color: var(--khaki); }

.fin-title {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: fit-content;
  max-width: 100%;
  margin: 0;
  font-size: clamp(42px, 6.4vw, 96px);
  line-height: 0.92;
  color: var(--text);
}
.fin-title-last { color: var(--gold); }
.closed .fin-title-last { color: var(--khaki); }
.fin-title-is {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: clamp(12px, 1.4vw, 20px);
  width: 100%;
  margin-block: 0.34em 0.3em;
  font-family: var(--font-body);
  font-size: clamp(14px, 1.5vw, 20px);
  font-weight: 700;
  letter-spacing: 0.4em;
  line-height: 1;
  color: var(--tier-a);
}
.fin-title-is::before,
.fin-title-is::after {
  content: '';
  flex: 1 1 0;
  height: 2px;
  transform-origin: left center;
  animation: growX 0.4s var(--ease-out) 0.5s both;
}
.fin-title-is::before {
  background: linear-gradient(90deg, var(--tier-c) 0 34%, var(--tier-b) 34% 67%, var(--tier-a) 67%);
}
.fin-title-is::after {
  background: linear-gradient(90deg, var(--tier-s) 0 50%, var(--tier-splus) 50%);
  animation-delay: 0.9s;
}
.closed .fin-title-is::after { background: var(--line-5); }

.fin-lede {
  max-width: 36rem;
  margin: 0;
  font-size: clamp(15px, 1.2vw, 18px);
  line-height: 1.6;
  color: var(--khaki);
  animation-delay: 0.6s;
}

.fin-notice {
  display: grid;
  gap: 6px;
  max-width: 36rem;
  margin: 0;
  padding: var(--sp-4) var(--sp-5);
  border-left: 3px solid var(--gold);
  background: color-mix(in srgb, var(--gold) 6%, transparent);
  font-size: var(--fs-sm);
  line-height: 1.5;
  color: var(--khaki);
  animation-delay: 0.75s;
}
.fin-notice-lbl { color: var(--gold); }
.closed .fin-notice { border-left-color: var(--khaki); background: color-mix(in srgb, var(--khaki) 6%, transparent); }
.closed .fin-notice-lbl { color: var(--khaki); }

.fin-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sp-3);
  margin-top: var(--sp-2);
  animation-delay: 0.9s;
}
.fin-next {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-6);
  min-height: 58px;
  padding: 0 22px;
}
.fin-next:hover { text-decoration: none; }
.fin-next .disp { font-size: 18px; }
.fin-delete,
.fin-endless {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 48px;
  padding: 0 16px;
  font-size: var(--fs-sm);
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.fin-delete:hover { color: var(--red); border-color: var(--red); }
.fin-endless { border-style: dashed; }
.fin-endless:disabled { opacity: 0.5; cursor: not-allowed; }

/* Summit — the run's last rung, alive ------------------------------------- */
.fin-summit {
  position: relative;
  display: grid;
  justify-items: center;
  gap: var(--sp-4);
  padding-block: var(--sp-6) var(--sp-7);
  min-width: 0;
}
.fin-backdrop {
  position: absolute;
  left: 50%;
  top: clamp(70px, 9vw, 120px);
  width: 0;
  height: 0;
  pointer-events: none;
}
.fin-rays {
  position: absolute;
  left: -650px;
  top: -650px;
  width: 1300px;
  height: 1300px;
  border-radius: 50%;
  mask-image: radial-gradient(circle, #000 0 8%, rgba(0, 0, 0, 0.5) 22%, transparent 48%);
}
.fin-rays-a {
  background: repeating-conic-gradient(from 0deg, rgba(255, 214, 66, 0.1) 0deg 3deg, transparent 3deg 10deg);
  animation: raysIn 1.2s var(--ease-out) both, fin-turn 90s linear 1.2s infinite;
}
.fin-rays-b {
  background: repeating-conic-gradient(from 5deg, rgba(255, 232, 138, 0.05) 0deg 1.5deg, transparent 1.5deg 17deg);
  animation: raysIn 1.6s var(--ease-out) both, fin-turn 140s linear 1.6s infinite reverse;
}
.closed .fin-rays-a { background: repeating-conic-gradient(from 0deg, rgba(184, 176, 141, 0.06) 0deg 3deg, transparent 3deg 10deg); }
.closed .fin-rays-b { display: none; }
@keyframes fin-turn { to { rotate: 360deg; } }
.fin-halo {
  position: absolute;
  left: -280px;
  top: -170px;
  width: 560px;
  height: 340px;
  background: radial-gradient(ellipse, rgba(255, 214, 66, 0.22), transparent 68%);
  animation: fin-breathe 4.5s ease-in-out infinite;
}
.closed .fin-halo { background: radial-gradient(ellipse, rgba(184, 176, 141, 0.12), transparent 68%); }
@keyframes fin-breathe {
  0%, 100% { opacity: 0.6; scale: 0.92; }
  50% { opacity: 1; scale: 1.08; }
}
.fin-embers {
  position: absolute;
  inset: -60px -10% 0;
  overflow: hidden;
  pointer-events: none;
  mask-image: linear-gradient(0deg, #000 55%, transparent);
}
.fin-ember {
  position: absolute;
  bottom: -8px;
  background: var(--gold-bright);
  box-shadow: 0 0 6px 1px var(--gold), 0 0 18px 3px rgba(255, 159, 67, 0.55);
  opacity: 0;
  animation: fin-ember linear infinite;
}
@keyframes fin-ember {
  0% { opacity: 0; translate: 0 0; }
  10% { opacity: 1; }
  75% { opacity: 0.7; }
  100% { opacity: 0; translate: var(--drift) -560px; }
}

.fin-emblem {
  position: relative;
  width: clamp(170px, 22vw, 300px);
  aspect-ratio: 190 / 92;
  object-fit: contain;
  filter: drop-shadow(0 0 28px rgba(255, 214, 66, 0.45)) drop-shadow(0 0 2px rgba(255, 255, 255, 0.6));
  animation: slamIn 0.6s var(--ease-impact) 0.2s both, fin-glow 3.2s ease-in-out 1s infinite;
}
.closed .fin-emblem {
  filter: drop-shadow(0 0 18px rgba(184, 176, 141, 0.3));
  animation: slamIn 0.6s var(--ease-impact) 0.2s both;
}
@keyframes fin-glow {
  50% { filter: drop-shadow(0 0 44px rgba(255, 214, 66, 0.75)) drop-shadow(0 0 3px rgba(255, 255, 255, 0.9)); }
}

.fin-peak {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 6px;
  animation: riseIn 0.5s var(--ease-out) 0.55s both;
}
.fin-peak-n { font-size: clamp(48px, 5.4vw, 80px); line-height: 0.9; color: var(--gold); }
.closed .fin-peak-n { color: var(--text); }
.fin-peak-name {
  font-size: clamp(12px, 1.1vw, 15px);
  font-weight: 700;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--text);
}

/* The climb as a staircase: each step fills in turn, then a light runs up the
   climbed steps on a loop — the route the squad took, replayed. */
.fin-stairs {
  position: relative;
  list-style: none;
  display: flex;
  align-items: flex-end;
  gap: clamp(4px, 0.6vw, 7px);
  width: min(100%, 440px);
  height: 150px;
  margin: var(--sp-5) 0 30px;
  padding: 0;
}
.fin-step {
  position: relative;
  flex: 1 1 0;
  height: calc(26px + var(--i) * 16px);
}
.fin-step::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -7px;
  height: 3px;
  background: var(--line-3);
}
.fin-step[data-tier='C']::after { --step-tier: var(--tier-c); }
.fin-step[data-tier='B']::after { --step-tier: var(--tier-b); }
.fin-step[data-tier='A']::after { --step-tier: var(--tier-a); }
.fin-step[data-tier='S']::after { --step-tier: var(--tier-s); }
.fin-step:not(.locked)::after {
  background: var(--step-tier, var(--gold));
  transform-origin: left center;
  animation: growX 0.3s var(--ease-out) both;
  animation-delay: calc(0.7s + var(--i) * 0.12s);
}
.fin-step-fill {
  position: absolute;
  inset: 0;
  border-top: 3px solid var(--gold);
  background: linear-gradient(180deg, color-mix(in srgb, var(--gold) 26%, transparent), transparent 85%);
  transform-origin: 50% 100%;
  animation: cellOn 0.34s var(--ease-out) both;
  animation-delay: calc(0.7s + var(--i) * 0.12s);
}
.fin-step-fill::after {
  content: '';
  position: absolute;
  left: -1px;
  right: -1px;
  top: -3px;
  height: 3px;
  background: var(--gold-bright);
  box-shadow: 0 0 14px 2px rgba(255, 214, 66, 0.75);
  opacity: 0;
  animation: fin-glint 4.2s linear infinite;
  animation-delay: calc(2.2s + var(--i) * 0.16s);
}
@keyframes fin-glint {
  0% { opacity: 0; }
  4% { opacity: 1; }
  14% { opacity: 0; }
  100% { opacity: 0; }
}
.fin-step.summit .fin-step-fill {
  background: linear-gradient(180deg, color-mix(in srgb, var(--gold) 48%, transparent), transparent 90%);
}
.fin-step.reached .fin-step-fill {
  border-top-color: var(--gold);
  background: linear-gradient(180deg, color-mix(in srgb, var(--khaki) 30%, transparent), transparent 85%);
}
.fin-step.reached .fin-step-fill::after { animation-name: pulse; animation-duration: 1.6s; animation-timing-function: ease-in-out; opacity: 1; }
.fin-step.locked .fin-step-fill {
  border: 1px dashed var(--line-4);
  background: none;
  animation: none;
}
.fin-step.locked .fin-step-fill::after { display: none; }
.fin-step-n {
  position: absolute;
  left: 0;
  right: 0;
  bottom: -30px;
  text-align: center;
  font-size: 13px;
  color: var(--khaki);
}
.fin-step.summit .fin-step-n,
.fin-step.reached .fin-step-n { color: var(--gold); }
.fin-step.locked .fin-step-n { color: var(--dim); }

.fin-flag {
  position: absolute;
  left: 50%;
  bottom: 100%;
  width: 2px;
  height: 46px;
  margin-bottom: 3px;
  background: var(--gold);
  transform-origin: 50% 100%;
  animation: flagIn 0.6s var(--ease-out) both;
  animation-delay: calc(0.9s + var(--i) * 0.12s);
}
.fin-flag-cloth {
  position: absolute;
  left: 2px;
  top: 0;
  display: grid;
  place-items: center;
  width: 34px;
  height: 22px;
  padding-right: 7px;
  background: var(--gold);
  color: var(--on-gold);
  clip-path: polygon(0 0, 100% 0, 80% 50%, 100% 100%, 0 100%);
  box-shadow: 0 0 24px rgba(255, 214, 66, 0.5);
  transform-origin: 0 50%;
  animation: fin-wave 2.4s ease-in-out 2s infinite;
}
@keyframes fin-wave {
  0%, 100% { transform: none; }
  50% { transform: scaleX(0.86) skewY(-4deg); }
}

/* Facts — the Bridge strip, filled in ------------------------------------- */
.fin-record { margin-block: var(--sp-4) clamp(40px, 6vw, 80px); }
.fin-facts {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 150px), 1fr));
  border: 1px solid var(--line-2);
  border-top: 3px solid var(--gold);
  background: color-mix(in srgb, var(--rail) 92%, transparent);
}
.closed .fin-facts { border-top-color: var(--khaki); }
.fin-fact {
  display: grid;
  gap: 6px;
  padding: 18px 22px;
  border-left: 1px solid var(--line-2);
}
.fin-fact:first-child { border-left: 0; }
.fin-fact-n { font-size: clamp(28px, 3vw, 44px); line-height: 1; color: var(--gold); }
.fin-fact .cap { color: var(--khaki); }

.fin-h2 {
  margin: 0 0 var(--sp-5);
  font-size: clamp(26px, 3.2vw, 44px);
  color: var(--text);
}

/* Squad dossiers ---------------------------------------------------------- */
.fin-squad { margin-bottom: clamp(48px, 7vw, 96px); }
.fin-dossiers {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
  gap: var(--gap-grid);
}
.fin-dossier {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  padding: var(--sp-5);
  border: 1px solid var(--line-2);
  border-top: 3px solid var(--line-4);
  background: color-mix(in srgb, var(--panel) 94%, transparent);
}
.fin-dossier.host { border-top-color: var(--gold); }
.fin-dos-head { display: flex; align-items: center; gap: var(--sp-4); min-width: 0; }
.fin-dos-av {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  font-size: 18px;
  background: var(--line-2);
  color: var(--text);
}
.host .fin-dos-av { background: var(--gold); color: var(--on-gold); }
.fin-dos-id { display: grid; gap: 4px; min-width: 0; }
.fin-dos-name {
  font-size: var(--fs-body);
  font-weight: 700;
  letter-spacing: 0.08em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fin-gear {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px;
}
.fin-gear-tile,
.fin-gear-more {
  position: relative;
  display: grid;
  place-items: center;
  aspect-ratio: 1;
  border: 1px solid var(--line-2);
  border-bottom: 2px solid var(--tier, var(--line-3));
  background: radial-gradient(circle at 50% 60%, color-mix(in srgb, var(--tier, transparent) 16%, transparent), transparent 70%), var(--ground);
}
.fin-gear-tile img { width: 76%; height: 76%; object-fit: contain; }
.fin-gear-tile.art-gear img { width: 92%; }
.fin-gear-tile .tier-badge { position: absolute; top: 3px; right: 3px; }
.fin-gear-more {
  font-size: var(--fs-sm);
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--khaki);
}
.fin-gear-none { margin: 0; font-size: var(--fs-sm); color: var(--dim); }

.fin-dos-stats {
  display: grid;
  grid-template-columns: repeat(3, auto);
  justify-content: space-between;
  gap: var(--sp-3);
  margin: auto 0 0;
  padding-top: var(--sp-4);
  border-top: 1px dashed var(--line-3);
}
.fin-dos-stats div { display: grid; gap: 6px; align-content: start; }
.fin-dos-stats .lbl { font-size: 10px; }
.fin-dos-stats dd { margin: 0; display: flex; align-items: center; min-height: 24px; }
.fin-dos-stats dd.disp { font-size: 22px; color: var(--gold); }

/* Share -------------------------------------------------------------------- */
.fin-share {
  display: grid;
  gap: var(--sp-6);
  align-items: center;
  margin-bottom: clamp(48px, 7vw, 96px);
}
@media (min-width: 900px) {
  .fin-share { grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr); }
}
.fin-share-copy p { max-width: 30rem; margin: 0; color: var(--khaki); line-height: 1.6; }
.fin-card { width: min(100%, 640px); justify-self: end; }

/* Close -------------------------------------------------------------------- */
.fin-close {
  display: grid;
  justify-items: center;
  gap: var(--sp-5);
  padding-block: clamp(24px, 5vw, 64px);
  text-align: center;
  border-top: 1px solid var(--line-2);
}
.fin-close-mark { color: var(--gold); filter: drop-shadow(0 0 22px rgba(255, 214, 66, 0.35)); }
.fin-close-title { margin: 0; max-width: 18em; font-size: clamp(22px, 3vw, 40px); line-height: 1; }
.fin-close-link {
  min-height: 48px;
  padding: 0 20px;
  font-size: var(--fs-sm);
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

@media (max-width: 640px) {
  .fin-head { gap: var(--sp-3); }
  .fin-brand-word,
  .fin-div,
  .fin-crusade .lbl { display: none; }
  .fin-room .lbl { display: none; }
  .fin-actions { flex-direction: column; align-items: stretch; }
  .fin-facts { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .fin-fact { border-top: 1px solid var(--line-2); }
  .fin-fact:nth-child(-n + 2) { border-top: 0; }
  .fin-fact:nth-child(odd) { border-left: 0; }
  .fin-fact:nth-child(3) { grid-column: 1 / -1; }
  .fin-fact:nth-child(n + 4) { grid-row: 3; }
  .fin-fact:nth-child(5) { border-left: 1px solid var(--line-2); }
  .fin-summit { padding-block: var(--sp-4) var(--sp-5); }
  .fin-next { justify-content: space-between; }
  .fin-stairs { height: 120px; }
  .fin-step { height: calc(20px + var(--i) * 13px); }
}
</style>
