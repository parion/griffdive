<script setup lang="ts">
import { Motion } from 'motion-v'
import { DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { CATCHUP_CAP, MAX_DIFFICULTY, MIN_DIFFICULTY, baseTierFor, missionsPerOperation } from '~~/shared/engine/config'
import { STARTING_KITS, VARIANTS, difficultyName } from '~~/shared/engine/progression'
import { availableCaches, ceilingRangeForDifficulty, currentFront, teamRiskOf } from '~~/shared/engine/selectors'
import { ITEMS_BY_ID, WARBONDS } from '~~/shared/data/catalog'
import type { DiveState, DiverState, RewardTier } from '~~/shared/engine/types'
import { SPRING_SOFT, dealIn } from '~/utils/motion'

const props = withDefaults(defineProps<{
  state: DiveState
  self: DiverState | null
  selfId: string | null
  mode: 'local' | 'room'
  online?: string[]
}>(), { online: () => [] })

const emit = defineEmits<{ close: [] }>()

const { ownedWarbonds, setOwned } = useOwnedWarbonds()

type BeatKey = 'squad' | 'sentence' | 'file' | 'catchup' | 'deploy' | 'begin'
type RailState = 'done' | 'current' | 'locked'
type LadderState = 'cleared' | 'current' | 'locked' | 'goal'

interface Beat {
  key: BeatKey
  rail: string
  title: string
  caption: string
}

const EMPTY_BEAT: Beat = { key: 'begin', rail: 'Begin', title: 'Begin', caption: '' }

const variant = computed(() => VARIANTS.find(entry => entry.id === props.state.settings?.variant) ?? null)
const startDifficulty = computed(() =>
  props.state.settings
    ? STARTING_KITS[props.state.settings.variant].startDifficulty
    : MIN_DIFFICULTY)
const opLength = computed(() => missionsPerOperation(props.state.difficulty))
const teamRisk = computed(() => teamRiskOf(props.state))
const ceilingPreview = computed(() => ceilingRangeForDifficulty(props.state.difficulty, 0))
const ceilingOdds = computed(() => Math.round(ceilingPreview.value.odds * 100))
const catchUpTier = computed(() => baseTierFor(props.state.difficulty))
const catchUpBadges = computed(() =>
  Array.from({ length: Math.min(props.self?.catchUpOwed ?? 0, CATCHUP_CAP) }))
const caches = computed(() => availableCaches(props.state))
const showsCatchUp = computed(() => (props.self?.catchUpOwed ?? 0) > 0 || caches.value.length > 0)
const front = computed(() => currentFront(props.state))

const beats = computed<Beat[]>(() => {
  const list: Beat[] = [
    {
      key: 'squad',
      rail: 'Squad',
      title: 'The squad you are joining',
      caption: `${props.state.divers.length} of 4 hellpod bays seated`,
    },
    {
      key: 'sentence',
      rail: 'Sentence',
      title: 'Your sentence',
      caption: `Climb ${MIN_DIFFICULTY} → ${MAX_DIFFICULTY} · ${difficultyName(props.state.difficulty)}`,
    },
    {
      key: 'file',
      rail: 'File',
      title: 'Your file',
      caption: `${ownedWarbonds.value.length} of ${WARBONDS.length} warbonds declared`,
    },
  ]
  if (showsCatchUp.value) {
    list.push({
      key: 'catchup',
      rail: 'Catch-up',
      title: 'Your catch-up',
      caption: 'Field Promotion or a legacy cache',
    })
  }
  list.push(
    {
      key: 'deploy',
      rail: 'Deploy',
      title: 'Order of deployment',
      caption: 'The six beats of a mission',
    },
    {
      key: 'begin',
      rail: 'Begin',
      title: 'Begin',
      caption: 'Order cleared for drop',
    },
  )
  return list
})

const step = ref(0)
const reached = ref(0)

watch(step, (value) => {
  if (value > reached.value) {
    reached.value = value
  }
})

watch(beats, (list) => {
  if (step.value > list.length - 1) {
    step.value = Math.max(0, list.length - 1)
  }
})

const current = computed<Beat>(() => beats.value[step.value] ?? EMPTY_BEAT)
const isLast = computed(() => step.value === beats.value.length - 1)
const nextLabel = computed(() => beats.value[step.value + 1]?.rail ?? '')

function railState(index: number): RailState {
  if (index === step.value) {
    return 'current'
  }
  return index <= reached.value ? 'done' : 'locked'
}

function go(index: number): void {
  if (index <= reached.value) {
    step.value = index
  }
}

function back(): void {
  if (step.value > 0) {
    step.value -= 1
  }
}

function next(): void {
  if (step.value < beats.value.length - 1) {
    step.value += 1
  }
}

function onOpenChange(open: boolean): void {
  if (!open) {
    emit('close')
  }
}

const ladder = computed(() => {
  const rows: { n: number, name: string, tier: RewardTier, state: LadderState }[] = []
  for (let n = MIN_DIFFICULTY; n <= MAX_DIFFICULTY; n += 1) {
    let rowState: LadderState
    if (props.state.achieved) {
      rowState = n === MAX_DIFFICULTY ? 'goal' : 'cleared'
    }
    else if (n < props.state.difficulty) {
      rowState = 'cleared'
    }
    else if (n === props.state.difficulty) {
      rowState = 'current'
    }
    else {
      rowState = n === MAX_DIFFICULTY ? 'goal' : 'locked'
    }
    rows.push({ n, name: difficultyName(n), tier: baseTierFor(n), state: rowState })
  }
  return rows
})

interface DeployStep {
  n: number
  key: string
  label: string
  text: string
}

const DEPLOY: readonly DeployStep[] = [
  {
    n: 1,
    key: 'spin',
    label: 'Spin',
    text: 'The wheel draws one misfortune for the whole squad. The operation\'s first spin also draws the front and its strain.',
  },
  {
    n: 2,
    key: 'decide',
    label: 'Decide',
    text: 'Accept or decline the draw. Accepted misfortune risk rides every diver\'s Valor for the mission; an accepted strain commits for the whole operation.',
  },
  {
    n: 3,
    key: 'pacts',
    label: 'Pacts',
    text: 'Each diver gets a private 2–3-pact offer. Pick any subset — every sworn rule adds risk to your own Valor.',
  },
  {
    n: 4,
    key: 'dive',
    label: 'Dive',
    text: 'Play the mission in Helldivers 2. Main objectives complete and the squad extracts — a wipe is a failure.',
  },
  {
    n: 5,
    key: 'report',
    label: 'Report',
    text: 'Record the clear and its stars. Stars buy reward options; each failed pact voids its risk and costs one option.',
  },
  {
    n: 6,
    key: 'rewards',
    label: 'Rewards',
    text: 'Roll against your personal Valor ceiling and bank one item — into your inventory alone.',
  },
]

const summary = computed(() => {
  const rows: { label: string, value: string }[] = [
    { label: 'Griffdiver', value: props.self?.name ?? 'Diver' },
    { label: 'Squad', value: props.mode === 'local' ? 'Solo dive' : `${props.state.divers.length} of 4 seated` },
    { label: 'Altitude', value: `${props.state.difficulty} · ${difficultyName(props.state.difficulty)}` },
    { label: 'Mission', value: `${props.state.missionInOperation} of ${opLength.value} this operation` },
    { label: 'Warbonds declared', value: `${ownedWarbonds.value.length} / ${WARBONDS.length}` },
    { label: 'Team risk', value: `+${teamRisk.value}` },
    { label: 'Reroll tokens', value: `${props.state.rerollTokens}` },
  ]
  if ((props.self?.catchUpOwed ?? 0) > 0) {
    rows.push({ label: 'Field promotion', value: `${props.self?.catchUpOwed} picks owed` })
  }
  if (front.value) {
    rows.push({ label: 'Front', value: front.value.displayName })
  }
  return rows
})

const cacheViews = computed(() => caches.value.map(cache => ({
  ownerId: cache.ownerId,
  names: cache.itemIds.map(id => ITEMS_BY_ID.get(id)?.displayName ?? id),
})))

function diverAt(bay: number): DiverState | null {
  return props.state.divers[bay - 1] ?? null
}

function initial(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || '?'
}

function isOnline(id: string | null): boolean {
  if (!id) {
    return false
  }
  if (props.online.length > 0) {
    return props.online.includes(id)
  }
  return props.mode === 'local'
}

function onlineLabel(id: string | null): string {
  return isOnline(id) ? 'Online' : 'Reconnecting'
}
</script>

<template>
  <DialogRoot
    :open="true"
    modal
    @update:open="onOpenChange"
  >
    <DialogPortal>
      <DialogOverlay as-child>
        <Motion
          class="brf-overlay"
          :initial="{ opacity: 0 }"
          :animate="{ opacity: 1 }"
          :transition="{ duration: 0.18 }"
        />
      </DialogOverlay>
      <DialogContent
        as-child
        aria-modal="true"
      >
        <Motion
          class="brf"
          :initial="{ opacity: 0, y: 18 }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="SPRING_SOFT"
        >
          <DialogDescription class="sr-only">
            The first-run tour of a dive: the squad you are joining, your sentence, your file, your
            catch-up, and the order of deployment.
          </DialogDescription>

          <header class="brf-head">
            <span class="brf-brand">
              <span
                class="brf-mark"
                aria-hidden="true"
              ><BrandMark :size="24" /></span>
              <span class="disp brf-word">Griffdive</span>
            </span>
            <span
              class="brf-rule"
              aria-hidden="true"
            />
            <div class="brf-heading">
              <DialogTitle
                as="h2"
                class="disp brf-title"
              >
                Griffdiver briefing
              </DialogTitle>
              <span class="lbl">Ministry of Truth · Griffdiver processing</span>
            </div>
            <span class="grow" />
            <span
              class="brf-progress"
              role="status"
              aria-live="polite"
            >
              <span class="cap">Beat {{ step + 1 }} / {{ beats.length }}</span>
              <span
                class="brf-pips"
                aria-hidden="true"
              >
                <i
                  v-for="(beat, i) in beats"
                  :key="beat.key"
                  :class="{ on: i <= step }"
                />
              </span>
            </span>
            <button
              class="btn tiny ghost"
              type="button"
              @click="emit('close')"
            >
              Skip the tour
            </button>
          </header>

          <div class="brf-body">
            <nav
              class="brf-rail"
              aria-label="Briefing beats"
            >
              <ol class="rail-list">
                <li
                  v-for="(beat, i) in beats"
                  :key="beat.key"
                >
                  <button
                    class="rail-btn"
                    :class="{ ticks: railState(i) === 'current' }"
                    type="button"
                    :data-state="railState(i)"
                    :disabled="railState(i) === 'locked'"
                    :aria-current="railState(i) === 'current' ? 'step' : undefined"
                    @click="go(i)"
                  >
                    <span
                      class="lamp"
                      :class="railState(i) === 'locked' ? 'dim' : railState(i) === 'current' ? 'pulse gold' : 'gold'"
                      aria-hidden="true"
                    />
                    <span class="disp rail-num">{{ String(i + 1).padStart(2, '0') }}</span>
                    <span class="rail-text">
                      <span class="rail-label">{{ beat.rail }}</span>
                      <span class="cap rail-cap">{{
                        railState(i) === 'current' ? 'In progress'
                        : railState(i) === 'done' ? 'Reviewed'
                          : 'Locked'
                      }}</span>
                    </span>
                    <svg
                      v-if="railState(i) === 'done'"
                      class="rail-ic"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="3"
                      aria-hidden="true"
                    >
                      <path d="M5 12l5 5 9-10" />
                    </svg>
                    <svg
                      v-else-if="railState(i) === 'locked'"
                      class="rail-ic"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.2"
                      aria-hidden="true"
                    >
                      <path d="M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3" />
                    </svg>
                    <svg
                      v-else
                      class="rail-ic"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.4"
                      aria-hidden="true"
                    >
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </button>
                </li>
              </ol>
            </nav>

            <section
              class="brf-panel ticks scan"
              :aria-label="current.title"
            >
              <Motion
                :key="current.key"
                class="brf-beat"
                v-bind="dealIn(0)"
              >
                <header class="beat-head">
                  <span class="cap">Beat {{ step + 1 }} / {{ beats.length }}</span>
                  <h2 class="disp beat-title">
                    {{ current.title }}
                  </h2>
                  <span class="sub beat-cap">{{ current.caption }}</span>
                </header>

                <template v-if="current.key === 'squad'">
                  <div
                    class="bays"
                    role="list"
                    :aria-label="`Hellpod bays, ${state.divers.length} of 4 seated`"
                  >
                    <article
                      v-for="bay in 4"
                      :key="bay"
                      class="bay cut-sm"
                      :class="{ filled: diverAt(bay) }"
                      role="listitem"
                    >
                      <span class="cap bay-head">Bay {{ bay }}</span>
                      <div class="bay-body">
                        <svg
                          class="pod"
                          width="54"
                          height="80"
                          viewBox="0 0 84 126"
                          aria-hidden="true"
                        >
                          <path
                            d="M22 6 H62 L72 20 V88 L42 122 L12 88 V20 Z"
                            :fill="diverAt(bay) ? 'var(--raised)' : 'none'"
                            stroke="currentColor"
                            stroke-width="1.6"
                            :stroke-dasharray="diverAt(bay) ? undefined : '5 4'"
                            stroke-linejoin="round"
                          />
                          <rect
                            x="22.5"
                            y="18.5"
                            width="39"
                            height="39"
                            fill="var(--ground)"
                            stroke="var(--line-3)"
                          />
                          <path
                            v-if="!diverAt(bay)"
                            d="M42 30 V46 M34 38 H50"
                            stroke="currentColor"
                            stroke-width="2"
                          />
                        </svg>
                        <span
                          v-if="diverAt(bay)"
                          class="bay-init cut-sm disp"
                        >{{ initial(diverAt(bay)?.name ?? '') }}</span>
                        <span
                          v-if="diverAt(bay)?.id === state.hostId"
                          class="crown"
                          role="img"
                          aria-label="Host"
                        >★</span>
                        <span
                          v-if="diverAt(bay)"
                          class="lamp bay-lamp"
                          :class="isOnline(diverAt(bay)?.id ?? null) ? '' : 'dim'"
                          role="img"
                          :aria-label="onlineLabel(diverAt(bay)?.id ?? null)"
                        />
                      </div>
                      <span class="cap bay-status">{{ diverAt(bay)?.name ?? 'Awaiting diver' }}</span>
                    </article>
                  </div>

                  <ul class="seats">
                    <li
                      v-for="diver in state.divers"
                      :key="diver.id"
                      class="seat"
                    >
                      <span
                        class="lamp"
                        :class="isOnline(diver.id) ? '' : 'dim'"
                        aria-hidden="true"
                      />
                      <span class="seat-name">{{ diver.name }}</span>
                      <span
                        v-if="diver.id === state.hostId"
                        class="chip gold"
                      >Host</span>
                      <span
                        v-if="diver.id === selfId"
                        class="chip"
                      >You</span>
                      <span class="cap seat-state">{{ onlineLabel(diver.id) }}</span>
                    </li>
                  </ul>

                  <p class="beat-note">
                    {{ mode === 'local'
                      ? 'A solo crusade — the wheel rides with you. More divers can join later from the invite link.'
                      : 'Invite-link only: every hellpod bay that fills joins the same synced dive.' }}
                  </p>
                </template>

                <template v-else-if="current.key === 'sentence'">
                  <div
                    class="ladder"
                    role="list"
                    :aria-label="`Difficulty ladder, ${MIN_DIFFICULTY} to ${MAX_DIFFICULTY}`"
                  >
                    <div
                      v-for="rung in ladder"
                      :key="rung.n"
                      class="rung"
                      :data-state="rung.state"
                      role="listitem"
                    >
                      <span class="disp rung-n">{{ rung.n }}</span>
                      <span class="cap rung-name">{{ rung.name }}</span>
                      <span class="rung-trail">
                        <span
                          v-if="rung.n === startDifficulty"
                          class="chip gold rung-start"
                        >Start</span>
                        <svg
                          v-if="rung.state === 'cleared'"
                          class="rung-ic"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="3"
                          aria-hidden="true"
                        >
                          <path d="M5 12l5 5 9-10" />
                        </svg>
                        <svg
                          v-else-if="rung.state === 'goal'"
                          class="rung-ic"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          aria-hidden="true"
                        >
                          <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
                        </svg>
                        <TierBadge
                          :tier="rung.tier"
                          size="sm"
                          class="rung-tier"
                        />
                      </span>
                    </div>
                  </div>

                  <div class="kv">
                    <div class="kv-row">
                      <span class="lbl">Variant</span>
                      <span class="kv-v">{{ variant?.name ?? 'Crusade' }}</span>
                    </div>
                    <div class="kv-row">
                      <span class="lbl">Now</span>
                      <span class="kv-v">{{ state.difficulty }} · {{ difficultyName(state.difficulty) }}</span>
                    </div>
                    <div class="kv-row">
                      <span class="lbl">Operation</span>
                      <span class="kv-v">Mission {{ state.missionInOperation }} of {{ opLength }}</span>
                    </div>
                    <div class="kv-row">
                      <span class="lbl">Team risk</span>
                      <span class="kv-v">+{{ teamRisk }} accepted</span>
                    </div>
                  </div>

                  <p class="beat-note">
                    Complete every mission of an operation to climb one rung. A failure repeats the
                    rung and forfeits one item — a setback, never a wipe.
                  </p>
                </template>

                <template v-else-if="current.key === 'file'">
                  <div class="file-row">
                    <span class="lbl">Griffdiver</span>
                    <span class="disp file-name">{{ self?.name ?? 'Diver' }}</span>
                    <span class="chip warn">Class E</span>
                  </div>

                  <WarbondPicker
                    :warbond-codes="ownedWarbonds"
                    @update:warbond-codes="setOwned"
                  />

                  <p class="beat-note">
                    Rewards roll only from warbonds you own — a squadmate's purchases never change
                    your pool. Armor rewards are passives, never pieces, and you can declare again
                    any time from the Warbonds panel.
                  </p>
                </template>

                <template v-else-if="current.key === 'catchup'">
                  <div
                    v-if="(self?.catchUpOwed ?? 0) > 0"
                    class="promo"
                  >
                    <div class="promo-head">
                      <span class="lbl gold">Field promotion</span>
                      <span class="disp promo-n">×{{ self?.catchUpOwed }}</span>
                    </div>
                    <div class="promo-badges">
                      <TierBadge
                        v-for="(_, i) in catchUpBadges"
                        :key="i"
                        :tier="catchUpTier"
                        size="sm"
                      />
                      <span class="cap promo-zero">0 Valor · {{ catchUpTier }} tier floor</span>
                    </div>
                    <p class="beat-note">
                      The squad climbed without you, so the Ministry restores one pick per operation
                      behind. It buys altitude, never rarity — no promotion pick ever reaches S or S+.
                    </p>
                    <button
                      class="btn ghost cut-sm promo-cta"
                      type="button"
                      @click="emit('close')"
                    >
                      Claim it after the briefing
                    </button>
                  </div>

                  <div
                    v-if="cacheViews.length > 0"
                    class="caches"
                  >
                    <span class="lbl">Legacy caches</span>
                    <ul class="cache-list">
                      <li
                        v-for="cache in cacheViews"
                        :key="cache.ownerId"
                        class="cache cut-sm"
                      >
                        <span class="disp cache-title">A fallen Griffdiver's kit</span>
                        <span class="cap cache-items">{{ cache.names.join(' · ') }}</span>
                      </li>
                    </ul>
                    <p class="beat-note">
                      Claim one cache wholesale instead of rolling the promotion — the two never
                      stack, and a rejoining diver reclaims their own automatically.
                    </p>
                  </div>
                </template>

                <template v-else-if="current.key === 'deploy'">
                  <div class="deploy">
                    <div
                      v-for="entry in DEPLOY"
                      :key="entry.key"
                      class="deploy-row"
                    >
                      <span class="disp deploy-n">{{ entry.n }}</span>
                      <span class="deploy-label">{{ entry.label }}</span>
                      <span class="deploy-text">{{ entry.text }}</span>
                    </div>
                  </div>

                  <div class="odds">
                    <div class="odds-head">
                      <span class="lbl">Risk buys the ceiling</span>
                      <span class="cap">Never a guarantee</span>
                    </div>
                    <div class="odds-line">
                      <TierBadge
                        :tier="ceilingPreview.min"
                        size="sm"
                      />
                      <span
                        class="odds-arrow"
                        aria-hidden="true"
                      >→</span>
                      <TierBadge
                        :tier="ceilingPreview.max"
                        size="sm"
                      />
                      <span class="cap odds-pct">{{ ceilingOdds }}% with the wheel's full risk</span>
                    </div>
                    <p class="beat-note">
                      A misfortune is the whole squad's rule for one mission; the front and its
                      optional strain lock in for the operation. Personal pacts add their own risk.
                      Accepted risk raises Valor, and Valor is the only thing that reaches S and S+.
                    </p>
                  </div>
                </template>

                <template v-else>
                  <div class="summary">
                    <div
                      v-for="row in summary"
                      :key="row.label"
                      class="summary-row"
                    >
                      <span class="lbl">{{ row.label }}</span>
                      <span class="summary-v">{{ row.value }}</span>
                    </div>
                  </div>

                  <div class="begin">
                    <span class="stp stamp begin-stamp">Cleared for drop</span>
                    <p class="beat-note">
                      {{ mode === 'local'
                        ? 'The wheel is waiting. Spin when you are ready — the draw is an offer, not a verdict.'
                        : 'The squad syncs live: every action lands on every client, and the wheel waits for the whole squad.' }}
                    </p>
                    <p class="beat-note dim">
                      Reopen this briefing any time from the Field manual in the header.
                    </p>
                  </div>
                </template>
              </Motion>
            </section>
          </div>

          <footer class="brf-foot">
            <button
              class="btn ghost"
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
              >
                <path d="M19 12H5M11 6l-6 6 6 6" />
              </svg>
              Back
            </button>
            <div
              class="brf-foot-pips"
              aria-hidden="true"
            >
              <i
                v-for="(beat, i) in beats"
                :key="beat.key"
                :class="{ on: i <= step }"
              />
            </div>
            <span class="cap brf-foot-text">{{ current.rail }}</span>
            <span class="grow" />
            <button
              v-if="!isLast"
              class="btn"
              type="button"
              @click="next"
            >
              Next · {{ nextLabel }}
            </button>
            <button
              class="btn primary cut brf-begin"
              type="button"
              @click="emit('close')"
            >
              Begin dive
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.4"
                aria-hidden="true"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </footer>
        </Motion>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.brf-overlay {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgba(9, 10, 7, 0.82);
}

.brf {
  position: fixed;
  inset: 0;
  z-index: 41;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  background: var(--ground);
  color: var(--text);
  border-top: 3px solid var(--gold);
}

/* Header ------------------------------------------------------------------ */
.brf-head {
  display: flex;
  align-items: center;
  gap: var(--sp-5);
  min-height: 62px;
  padding: var(--sp-4) var(--pad-page);
  background: var(--rail);
  border-bottom: 1px solid var(--line-1);
}
.brf-brand {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  color: var(--gold);
}
.brf-mark {
  display: grid;
  place-items: center;
  padding: var(--sp-1);
  color: var(--gold);
  animation: seatGlow 3.4s ease-in-out infinite;
}
.brf-word {
  font-size: 17px;
  letter-spacing: 0.06em;
}
.brf-rule {
  width: 1px;
  height: 30px;
  background: var(--line-2);
}
.brf-heading {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.brf-title {
  margin: 0;
  font-size: clamp(14px, 1.3vw, 18px);
  color: var(--text);
}
.brf-progress {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--sp-2);
}
.brf-pips {
  display: flex;
  gap: var(--sp-1);
}
.brf-pips i,
.brf-foot-pips i {
  width: 20px;
  height: 5px;
  background: var(--line-2);
  transition: background-color var(--dur-fast);
}
.brf-pips i.on,
.brf-foot-pips i.on {
  background: var(--gold);
}

/* Body -------------------------------------------------------------------- */
.brf-body {
  display: grid;
  grid-template-columns: minmax(0, 232px) minmax(0, 1fr);
  min-height: 0;
}

.brf-rail {
  padding: var(--sp-5) var(--sp-4);
  background: var(--rail);
  border-right: 1px solid var(--line-1);
  overflow-y: auto;
  min-height: 0;
}
.rail-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--sp-2);
}
.rail-btn {
  width: 100%;
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-3) var(--sp-4);
  border: 1px solid var(--line-2);
  background-color: var(--ground);
  color: var(--muted);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color var(--dur-fast), background-color var(--dur-fast), color var(--dur-fast);
}
.rail-btn:hover:not(:disabled) {
  border-color: var(--line-4);
  color: var(--text);
}
.rail-btn:disabled {
  cursor: default;
  opacity: 0.55;
}
.rail-btn[data-state='current'] {
  border-color: var(--gold);
  background-color: rgba(255, 214, 66, 0.06);
  color: var(--text);
}
.rail-btn[data-state='done'] {
  color: var(--khaki);
}
.rail-num {
  font-size: 15px;
}
.rail-text {
  min-width: 0;
}
.rail-label {
  display: block;
  font-size: var(--fs-sm);
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.rail-cap {
  display: block;
  margin-top: 3px;
  color: var(--dim);
}
.rail-ic {
  width: 14px;
  height: 14px;
}

.brf-panel {
  position: relative;
  min-height: 0;
  padding: var(--pad-page);
  background-color: rgba(19, 21, 15, 0.9);
  overflow-y: auto;
}
.brf-beat {
  display: grid;
  gap: var(--sp-6);
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
  align-content: start;
}

.beat-head {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  padding-bottom: var(--sp-4);
  border-bottom: 1px solid var(--line-2);
}
.beat-title {
  margin: 0;
  font-size: var(--fs-h1);
  color: var(--text);
  animation: slam 0.5s var(--ease-impact) both, textGlow 4.2s ease-in-out infinite;
}
.beat-cap {
  white-space: normal;
  letter-spacing: 0.16em;
}
.beat-note {
  margin: 0;
  max-width: 64ch;
  font-size: var(--fs-body);
  line-height: 1.5;
  color: var(--khaki);
}

/* Beat 1 — squad ---------------------------------------------------------- */
.bays {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--gap-panel);
}
.bay {
  display: grid;
  gap: var(--sp-2);
  justify-items: center;
  padding: var(--sp-4) var(--sp-2) var(--sp-3);
  background: var(--ground);
  border: 1px dashed var(--line-4);
  color: var(--line-5);
}
.bay.filled {
  border-style: solid;
  border-color: var(--gold);
  background: rgba(255, 214, 66, 0.05);
  color: var(--gold);
}
.bay.filled .bay-head { color: var(--gold); }
.bay-body {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 84px;
}
.pod { color: inherit; }
.bay-init {
  position: absolute;
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  font-size: 13px;
  background: var(--raised);
  border: 1px solid currentColor;
  color: var(--text);
}
.crown {
  position: absolute;
  top: -6px;
  right: 2px;
  font-size: 13px;
  color: var(--gold);
}
.bay-lamp {
  position: absolute;
  right: 6px;
  bottom: 0;
}
.bay-status {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.seats {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--sp-2);
}
.seat {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  min-height: 36px;
  padding: 0 var(--sp-4);
  border: 1px solid var(--line-2);
  background: var(--ground);
}
.seat-name {
  font-weight: 700;
  letter-spacing: 0.06em;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.seat-state {
  margin-left: auto;
}

/* Beat 2 — sentence ------------------------------------------------------- */
.ladder {
  display: grid;
  gap: var(--sp-1);
}
.rung {
  display: grid;
  grid-template-columns: 2rem minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--sp-3);
  min-height: 40px;
  padding: 0 var(--sp-4) 0 var(--sp-3);
  border: 1px solid var(--line-2);
  background: var(--ground);
  color: var(--muted);
}
.rung-trail {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}
.rung[data-state='cleared'] { opacity: 0.6; }
.rung[data-state='locked'] { color: var(--dim); }
.rung[data-state='current'] {
  border-color: var(--gold);
  background: rgba(255, 214, 66, 0.06);
  color: var(--text);
}
.rung[data-state='current'] .rung-n { color: var(--gold); }
.rung[data-state='goal'] { border-color: var(--line-4); }
.rung-n { font-size: 17px; color: var(--text); }
.rung-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rung-ic { width: 14px; height: 14px; }
.rung-tier { width: 18px; padding: 0; }

.kv {
  display: grid;
  gap: var(--sp-2);
}
.kv-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--sp-4);
  min-height: 40px;
  padding: var(--sp-3) var(--sp-4);
  border: 1px dashed var(--line-2);
}
.kv-v {
  font-weight: 700;
  letter-spacing: 0.08em;
  text-align: right;
}

/* Beat 3 — file ----------------------------------------------------------- */
.file-row {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  min-height: 48px;
  padding: var(--sp-3) var(--sp-4);
  border: 1px solid var(--line-3);
  background: var(--ground);
}
.file-name {
  font-size: 20px;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Beat 4 — catch-up ------------------------------------------------------- */
.promo {
  display: grid;
  gap: var(--sp-4);
  padding: var(--sp-5);
  border: 1px solid rgba(255, 214, 66, 0.55);
  background: rgba(255, 214, 66, 0.05);
}
.promo-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--sp-4);
}
.promo-n {
  font-size: 26px;
  color: var(--gold);
}
.promo-badges {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}
.promo-zero { margin-left: var(--sp-2); }
.promo-cta { justify-self: start; }

.caches {
  display: grid;
  gap: var(--sp-3);
}
.cache-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--sp-2);
}
.cache {
  display: grid;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-4);
  background: var(--ground);
  border: 1px solid var(--line-2);
}
.cache-title { font-size: 14px; color: var(--text); }
.cache-items {
  white-space: normal;
  line-height: 1.4;
}

/* Beat 5 — deploy --------------------------------------------------------- */
.deploy {
  display: grid;
  gap: var(--sp-2);
}
.deploy-row {
  display: grid;
  grid-template-columns: 2rem 6.5rem minmax(0, 1fr);
  align-items: baseline;
  gap: var(--sp-4);
  padding: var(--sp-4);
  border: 1px solid var(--line-2);
  background: var(--ground);
}
.deploy-n { font-size: 18px; color: var(--gold); }
.deploy-label {
  font-size: var(--fs-sm);
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text);
}
.deploy-text { color: var(--khaki); line-height: 1.45; }

.odds {
  display: grid;
  gap: var(--sp-4);
  padding: var(--sp-5);
  border: 1px dashed var(--line-3);
}
.odds-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--sp-4);
}
.odds-line {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  flex-wrap: wrap;
}
.odds-arrow { color: var(--dim); }
.odds-pct { color: var(--gold); }

/* Beat 6 — begin ---------------------------------------------------------- */
.summary {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
  gap: var(--sp-2);
}
.summary-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--sp-4);
  min-height: 42px;
  padding: var(--sp-3) var(--sp-4);
  border: 1px dashed var(--line-2);
}
.summary-v {
  font-weight: 700;
  letter-spacing: 0.06em;
  text-align: right;
}
.begin {
  display: flex;
  align-items: center;
  gap: var(--sp-5);
  flex-wrap: wrap;
}
.begin-stamp {
  color: var(--gold);
  border-color: var(--gold);
  padding: 8px 14px;
  font-size: 18px;
}

/* Footer ------------------------------------------------------------------ */
.brf-foot {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  min-height: 68px;
  padding: var(--sp-3) var(--pad-page);
  background: var(--ground);
  border-top: 1px solid var(--line-1);
}
.brf-foot-pips {
  display: flex;
  gap: var(--sp-1);
  margin-left: var(--sp-2);
}
.brf-foot-text { color: var(--khaki); }
.brf-begin { min-width: min(15rem, 100%); justify-content: space-between; }

@media (max-width: 760px) {
  .brf-head {
    flex-wrap: wrap;
    gap: var(--sp-3);
    padding: var(--sp-3) var(--pad-page);
  }
  .brf-rule { display: none; }
  .brf-progress { align-items: flex-start; }
  .brf-body {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr);
  }
  .brf-rail {
    padding: var(--sp-3) var(--pad-page);
    border-right: 0;
    border-bottom: 1px solid var(--line-1);
    overflow-x: auto;
    overflow-y: hidden;
  }
  .rail-list {
    grid-auto-flow: column;
    grid-auto-columns: minmax(9rem, max-content);
  }
  .rail-btn { padding: var(--sp-2) var(--sp-3); }
  .rail-cap { display: none; }
  .bays { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .deploy-row { grid-template-columns: 2rem minmax(0, 1fr); }
  .deploy-text { grid-column: 2; }
  .brf-foot { flex-wrap: wrap; }
  .brf-foot-pips { display: none; }
  .brf-begin { flex-grow: 1; }
}
</style>
