<script setup lang="ts">
import { CEILING_DOCK, CEILING_HOLD } from '~/utils/motion'
import { REWARD_TOKEN_CAP, maxStarsFor } from '~~/shared/engine/config'
import { valorOf } from '~~/shared/engine/rewards'
import { ITEMS_BY_ID, TIER_RANK } from '~~/shared/data/catalog'
import { itemImageUrl } from '~~/shared/data/images'
import type { Item } from '~~/shared/data/types'
import type { RewardOption } from '~~/shared/engine/rewards'
import type { DraftSummary } from '~~/shared/engine/selectors'
import type { RewardTier } from '~~/shared/engine/types'

interface SquadDraft {
  id: string
  name: string
  summary: DraftSummary
}

const props = withDefaults(defineProps<{
  options: RewardOption[]
  pickedId: string | null
  pool: Item[]
  ownedIds: string[]
  // How many reward slots failed pacts forfeited — explains a thinner draft.
  optionsLost?: number
  // The rest of the squad's drafts — their offers, ceilings and picks — shown
  // once this diver's own pods land. Presentation only.
  squadDrafts?: SquadDraft[]
  // Bonus-honors reward tokens: spend one to reroll this offer, or to ban
  // offered items (which forfeits the reward pick). `bannableIds` is the
  // parent's engine-gated allow-list.
  tokenCount?: number
  canReroll?: boolean
  canBan?: boolean
  bannableIds?: string[]
  // The draft is resolved when the diver picked or spent it on bans.
  resolved?: boolean
  banned?: boolean
  bannedIds?: string[]
  // The ceiling this diver's Valor rolled (engine-derived; null when sat out)
  // and the mission report facts behind the header readout.
  ceiling?: RewardTier | null
  stars?: number
  difficulty?: number
  teamRisk?: number
  pactRisk?: number
  // Squad-draft state: whether the full-star honors ceremony is due (the CTA
  // label follows it) and that everyone has picked.
  ready?: boolean
  bonusUp?: boolean
  canControl?: boolean
  kicker?: string
  // The Field Promotion reuses the draft cabinet: no ceiling roll, stars,
  // tokens, squad board or footer — a picks readout in the header instead,
  // and a fresh offer drops after every claim.
  variant?: 'reward' | 'promotion'
  title?: string
  picksLeft?: number
  picksTotal?: number
  baseTier?: RewardTier | null
}>(), {
  squadDrafts: () => [],
  tokenCount: 0,
  canReroll: false,
  canBan: false,
  bannableIds: () => [],
  resolved: false,
  banned: false,
  bannedIds: () => [],
  ceiling: null,
  stars: 0,
  difficulty: 3,
  teamRisk: 0,
  pactRisk: 0,
  ready: false,
  bonusUp: false,
  canControl: false,
  kicker: 'Reward draft',
  variant: 'reward',
  title: 'Reward Draft',
  picksLeft: 0,
  picksTotal: 0,
  baseTier: null,
})

const promotion = computed(() => props.variant === 'promotion')

const emit = defineEmits<{
  pick: [optionId: string, choiceItemId?: string]
  reroll: []
  ban: [optionIds: string[]]
  openHonors: []
}>()

// The engine freezes the offer at the deal; holding a local copy as well keeps
// pre-snapshot saves (whose offer re-derives minus the pick) from reshuffling
// the pods under the diver's finger.
const lockedOptions = ref<RewardOption[]>(props.options.length > 0 ? [...props.options] : [])
const settledCount = ref(0)
// Once the pods have revealed, remounting them must not replay the drop.
const podsDone = ref(false)
// Bumped on every redraw: a reroll can reuse option ids, and Vue would patch
// the existing pods in place — their `settled` would already be true and never
// re-emit, leaving `allSettled` false and the draft deadlocked. A fresh key
// remounts the pods so the drop replays and the settle count can rebuild.
const draftGeneration = ref(0)

function sameOffer(a: RewardOption[], b: RewardOption[]): boolean {
  return a.length === b.length && a.every((option, i) => option.optionId === b[i]?.optionId)
}

// A reroll redraws the offer: adopt it and replay the drops. Inventory churn
// while resolved is ignored — the draft is frozen at that point.
watch(() => props.options, (next) => {
  if (props.resolved || props.pickedId) {
    return
  }
  if (lockedOptions.value.length === 0) {
    lockedOptions.value = [...next]
    return
  }
  if (!sameOffer(lockedOptions.value, next)) {
    claiming.value = false
    lockedOptions.value = [...next]
    settledCount.value = 0
    podsDone.value = false
    draftGeneration.value++
    startIntro()
  }
})

// A promotion claim re-rolls the offer; until the new one arrives the old pods
// stay locked so a second tap can't spend a pick against a stale offer.
const claiming = ref(false)

function onPick(optionId: string, choiceItemId?: string): void {
  if (promotion.value) {
    claiming.value = true
  }
  emit('pick', optionId, choiceItemId)
}

// The pod that banked the reward: a rolled option matches by id, while
// Liberty's Cross banks a named item that was never among the options.
const pickedPodId = computed(() => {
  if (!props.pickedId) {
    return null
  }
  const match = lockedOptions.value.find(option => option.optionId === props.pickedId)
  return match?.optionId ?? lockedOptions.value.find(option => option.choice)?.optionId ?? null
})

// The cabinet keeps its order, but the pods land worst-to-best so the reveal
// builds to the top pull.
const TIER_ORDER = ['c', 'b', 'a', 's']
const revealRanks = computed(() => {
  const score = (option: RewardOption) => option.choice ? TIER_ORDER.length : TIER_ORDER.indexOf(option.item.tier)
  const order = lockedOptions.value
    .map((option, index) => ({ index, score: score(option) }))
    .sort((a, b) => a.score - b.score || a.index - b.index)
  const ranks: number[] = []
  order.forEach((entry, rank) => {
    ranks[entry.index] = rank
  })
  return ranks
})

// Liberty's Cross opens as its own band above the rolled pods.
const crossOption = computed(() => lockedOptions.value.find(option => option.choice) ?? null)
const podOptions = computed(() => lockedOptions.value.filter(option => !option.choice))

// Liberty's Cross banks the picked item's id, which is not among the rolled
// options — resolve it from the catalog for the banked banner.
const pickedItem = computed(() =>
  lockedOptions.value.find(option => option.optionId === props.pickedId)?.item
  ?? (props.pickedId ? ITEMS_BY_ID.get(props.pickedId) ?? null : null),
)
// The advance sweep takes the colour of what the diver banked, so a Liberty's
// Cross or S-tier pull keeps glowing on the way out.
const bankedTier = computed(() => {
  const pod = lockedOptions.value.find(option => option.optionId === pickedPodId.value)
  if (!pod) {
    return null
  }
  return pod.choice ? 'S+' : pod.item.tier.toUpperCase()
})
const bankedSweep = computed(() => {
  if (!bankedTier.value) {
    return undefined
  }
  const tier = bankedTier.value === 'S+' ? 'splus' : bankedTier.value.toLowerCase()
  return { '--sweep': `color-mix(in srgb, var(--tier-${tier}) 70%, white)` }
})

const pickedImage = computed(() =>
  pickedItem.value ? itemImageUrl(pickedItem.value) : undefined)

const reduced = import.meta.client
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const instant = computed(() => reduced || props.pickedId !== null)

// Pods land left to right; the cards only become claimable once the last one
// has locked, so the pick always follows the full reveal.
const allSettled = computed(() =>
  instant.value || settledCount.value >= lockedOptions.value.length)
function onSettled(): void {
  settledCount.value++
}

watch(allSettled, (settled) => {
  if (settled) {
    podsDone.value = true
  }
}, { immediate: true })

// The intro: the ceiling roll climbs centre stage, holds its verdict, then
// docks into the header corner — and only then does the cabinet mount and the
// pods drop. The track lives in its header slot throughout; while it rolls it
// is lifted into the stage with a measured transform and docks by releasing
// it (FLIP). Presentation only — the ceiling is already rolled.
type IntroPhase = 'rolling' | 'docking' | 'done'
const intro = ref<IntroPhase>('done')
const landed = ref(false)
const skipped = ref(false)
const trackSlot = ref<HTMLElement | null>(null)
const introStage = ref<HTMLElement | null>(null)
const trackLift = ref<string | undefined>(undefined)
let introTimers: ReturnType<typeof setTimeout>[] = []

function clearIntroTimers(): void {
  introTimers.forEach(clearTimeout)
  introTimers = []
}

function liftTrack(): void {
  const slot = trackSlot.value
  const stage = introStage.value
  if (!slot || !stage) {
    return
  }
  const from = slot.getBoundingClientRect()
  const to = stage.getBoundingClientRect()
  const scale = Math.min(1.8, (to.width * 0.86) / Math.max(from.width, 1))
  const dx = to.left + to.width / 2 - (from.left + from.width / 2)
  const dy = to.top + to.height * 0.42 - (from.top + from.height / 2)
  trackLift.value = `translate(${dx}px, ${dy}px) scale(${scale})`
}

function startIntro(): void {
  clearIntroTimers()
  landed.value = false
  skipped.value = false
  if (instant.value || lockedOptions.value.length === 0 || !props.ceiling) {
    intro.value = 'done'
    trackLift.value = undefined
    return
  }
  intro.value = 'rolling'
  nextTick(liftTrack)
}

function dock(): void {
  clearIntroTimers()
  intro.value = 'docking'
  trackLift.value = undefined
  introTimers.push(setTimeout(() => {
    intro.value = 'done'
  }, CEILING_DOCK))
}

function onClimbed(): void {
  if (intro.value !== 'rolling') {
    return
  }
  landed.value = true
  introTimers.push(setTimeout(dock, skipped.value ? 250 : CEILING_HOLD))
}

// Skipping lands the bar at once (the track goes instant and reports in), or
// docks straight away when it has already landed.
function skipIntro(): void {
  if (intro.value !== 'rolling') {
    return
  }
  if (landed.value) {
    dock()
    return
  }
  skipped.value = true
}

function onResize(): void {
  if (intro.value === 'rolling') {
    trackLift.value = undefined
    nextTick(liftTrack)
  }
}

onMounted(() => {
  startIntro()
  window.addEventListener('resize', onResize)
})
onBeforeUnmount(() => {
  clearIntroTimers()
  window.removeEventListener('resize', onResize)
})

const valor = computed(() => valorOf(props.teamRisk, props.pactRisk))
const ceilingVar = computed(() =>
  props.ceiling === 'S+' ? 'var(--tier-splus)' : `var(--tier-${(props.ceiling ?? 'C').toLowerCase()})`)

const maxStars = computed(() => maxStarsFor(props.difficulty))
const optionCount = computed(() => lockedOptions.value.length)

const leadOptionId = computed<string | null>(() => {
  if (promotion.value) {
    return null
  }
  const rolled = lockedOptions.value.filter(option => !option.choice)
  if (rolled.length === 0) {
    return null
  }
  return rolled.reduce((top, option) =>
    TIER_RANK[option.item.tier] > TIER_RANK[top.item.tier] ? option : top, rolled[0]!).optionId
})

// Banning is its own flow: once open, the offered rewards toggle a purge
// selection instead of picking, and confirming spends the token and the pick.
const banMode = ref(false)
const selectedBanIds = ref<string[]>([])

function toggleBan(optionId: string): void {
  const selected = new Set(selectedBanIds.value)
  if (selected.has(optionId)) {
    selected.delete(optionId)
  }
  else {
    selected.add(optionId)
  }
  selectedBanIds.value = [...selected]
}

function startBan(): void {
  banMode.value = true
  selectedBanIds.value = []
}

function cancelBan(): void {
  banMode.value = false
  selectedBanIds.value = []
}

function confirmBan(): void {
  if (selectedBanIds.value.length === 0) {
    return
  }
  emit('ban', [...selectedBanIds.value])
  cancelBan()
}

// Hold-to-confirm, matching the pacts CTA: the token and the forfeited pick
// are irreversible, so the ban commits on a press-and-hold, not a tap.
const HOLD_MS = 900
const holding = ref(false)
let holdTimer: ReturnType<typeof setTimeout> | undefined

function banDown(): void {
  if (selectedBanIds.value.length === 0) {
    return
  }
  holding.value = true
  clearTimeout(holdTimer)
  holdTimer = setTimeout(() => {
    holding.value = false
    confirmBan()
  }, HOLD_MS)
}

function banEnd(): void {
  holding.value = false
  clearTimeout(holdTimer)
}
onBeforeUnmount(() => clearTimeout(holdTimer))

const selfResolved = computed(() =>
  props.resolved || props.pickedId !== null || props.banned)
const choosing = computed(() =>
  props.squadDrafts.find(draft => draft.summary.status === 'choosing') ?? null)
// The squad's offers reveal once this diver's own pods have landed, so
// nobody's roll steals the moment from yours.
const showSquad = computed(() =>
  props.squadDrafts.length > 0 && !banMode.value && (allSettled.value || lockedOptions.value.length === 0))
const statusKind = computed<'honors' | 'wait' | 'pick'>(() => {
  // Once every diver has picked, the draft hands off to the settlement screen
  // (Squad Honors + the Requisition shelf) — that screen advances, whatever the
  // honors verdict.
  if (props.ready) {
    return 'honors'
  }
  if (selfResolved.value || lockedOptions.value.length === 0) {
    return 'wait'
  }
  return 'pick'
})
</script>

<template>
  <section
    class="draft"
    :class="{ banning: banMode, promotion }"
  >
    <header class="draft-head">
      <div class="head-l">
        <span
          v-if="kicker"
          class="lbl"
        >{{ kicker }}</span>
        <h1 class="disp draft-title">
          {{ title }}
        </h1>
        <span class="head-meta">
          <span
            v-if="promotion && baseTier"
            class="meta-base"
          >Base tier <span
            class="tb meta-tier"
            :data-tier="baseTier"
          >{{ baseTier }}</span></span>
          <span
            v-if="!promotion"
            class="meta-stars"
            role="img"
            :aria-label="`${stars} of ${maxStars} stars`"
          >
            <svg
              v-for="i in maxStars"
              :key="i"
              viewBox="0 0 24 24"
              class="meta-star"
              :class="{ on: i <= stars }"
              aria-hidden="true"
            ><path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6l-5.4 2.9 1.2-6-4.5-4.2 6.1-.7z" /></svg>
          </span>
          <span
            v-if="optionCount"
            class="meta-count"
          >{{ optionCount }} option{{ optionCount === 1 ? '' : 's' }}</span>
          <span
            v-if="optionsLost && !banMode"
            class="meta-lost"
          >−{{ optionsLost }} · failed pact{{ optionsLost === 1 ? '' : 's' }}</span>
        </span>
      </div>
      <div
        v-if="promotion"
        class="head-picks"
      >
        <span
          class="chits"
          role="img"
          :aria-label="`${picksLeft} of ${picksTotal} promotion picks left`"
        >
          <span
            v-for="i in picksTotal"
            :key="i"
            class="hex tok"
            :class="{ on: i <= picksLeft }"
          />
        </span>
        <span class="tok-count picks-count">{{ picksLeft }}<span class="dim">/{{ picksTotal }} left</span></span>
        <slot name="head-actions" />
      </div>
      <div
        v-if="ceiling && lockedOptions.length"
        ref="trackSlot"
        class="head-track"
      >
        <CeilingTrack
          class="track-lift"
          :class="intro"
          :style="{ 'transform': trackLift, '--dock-dur': `${CEILING_DOCK}ms` }"
          :difficulty="difficulty"
          :ceiling="ceiling"
          :team-risk="teamRisk"
          :pact-risk="pactRisk"
          :instant="instant || skipped"
          :replay-key="draftGeneration"
          :settled="intro === 'done'"
          @climbed="onClimbed"
        />
      </div>
    </header>

    <div
      v-if="lockedOptions.length && intro !== 'done'"
      ref="introStage"
      class="intro-stage"
      :class="[intro, { landed }]"
      :style="{ '--ceil': ceilingVar }"
    >
      <span class="lbl intro-kicker">Ceiling roll · Valor {{ Number.isInteger(valor) ? valor : valor.toFixed(2) }}</span>
      <span
        v-if="landed"
        class="disp intro-verdict"
        aria-live="polite"
      >{{ ceiling }} Tier</span>
      <button
        class="intro-skip"
        type="button"
        @click="skipIntro"
      >
        <span class="intro-hint">Tap to skip</span>
      </button>
    </div>
    <div
      v-else-if="lockedOptions.length"
      class="cabinet"
      :class="{ 'banning': banMode, 'has-cross': crossOption }"
      :style="{ '--cols': Math.max(podOptions.length, 1) }"
    >
      <LibertyCrossBand
        v-if="crossOption"
        :key="`${draftGeneration}-${crossOption.optionId}`"
        class="cabinet-cross"
        :pool="pool"
        :owned-ids="ownedIds"
        :reveal-rank="revealRanks[lockedOptions.indexOf(crossOption)]"
        :instant="instant || podsDone"
        :can-pick="allSettled && !resolved && !claiming"
        :picked="pickedPodId === crossOption.optionId"
        :dimmed="pickedPodId !== null && pickedPodId !== crossOption.optionId"
        :ban-mode="banMode"
        :stamp="pickedPodId === crossOption.optionId && resolved ? 'Banked' : null"
        @choose="itemId => onPick(crossOption!.optionId, itemId)"
        @settled="onSettled"
      />
      <RewardPod
        v-for="(option, index) in podOptions"
        :key="`${draftGeneration}-${option.optionId}`"
        :option="option"
        :index="index"
        :reveal-rank="revealRanks[lockedOptions.indexOf(option)]"
        :instant="instant || podsDone"
        :can-pick="allSettled && !resolved && !claiming"
        :picked="pickedPodId === option.optionId"
        :dimmed="pickedPodId !== null && pickedPodId !== option.optionId"
        :lead="option.optionId === leadOptionId"
        :ban-mode="banMode"
        :bannable="bannableIds.includes(option.optionId)"
        :selected="selectedBanIds.includes(option.optionId)"
        :stamp="pickedPodId === option.optionId && resolved ? 'Banked' : (bannedIds.includes(option.optionId) ? 'Banned' : null)"
        @pick="optionId => onPick(optionId)"
        @ban="toggleBan"
        @settled="onSettled"
      />
    </div>
    <p
      v-else-if="!resolved"
      class="muted small sat-out"
    >
      You sat out this mission's draft — the squad dives without your pick.
    </p>

    <SquadDraftBoard
      v-if="showSquad"
      :drafts="squadDrafts"
    />

    <footer
      v-if="!promotion"
      class="token-bar"
      :class="{ banning: banMode }"
    >
      <span
        v-if="banMode"
        class="hazard-red bar-edge"
        aria-hidden="true"
      />

      <template v-if="!banMode && selfResolved">
        <div
          class="banked"
          :class="{ purged: banned }"
        >
          <template v-if="banned">
            <span class="lbl ban-lbl">Draft resolved</span>
            <strong class="banked-name">Rewards banned</strong>
          </template>
          <template v-else>
            <img
              v-if="pickedImage"
              class="banked-art"
              :src="pickedImage"
              alt=""
              draggable="false"
            >
            <span class="banked-copy">
              <span class="lbl">Reward banked</span>
              <strong
                class="banked-name"
                :data-tier="bankedTier ?? undefined"
              >{{ pickedItem?.displayName ?? 'Draft resolved' }}</strong>
            </span>
          </template>
        </div>
      </template>

      <template v-if="!banMode && !selfResolved">
        <div class="tok-readout">
          <span class="lbl tok-lbl">Reward tokens</span>
          <span
            class="chits"
            role="img"
            :aria-label="`${tokenCount} of ${REWARD_TOKEN_CAP} reward tokens`"
          >
            <span
              v-for="i in REWARD_TOKEN_CAP"
              :key="i"
              class="hex tok"
              :class="{ on: i <= tokenCount }"
            />
          </span>
          <span class="tok-count">{{ tokenCount }}<span class="dim">/{{ REWARD_TOKEN_CAP }}</span></span>
        </div>
        <span
          class="bar-sep"
          aria-hidden="true"
        />
        <button
          class="ghost bar-btn"
          type="button"
          aria-label="Reroll offer"
          :disabled="!canReroll || !allSettled"
          @click="emit('reroll')"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            aria-hidden="true"
          ><rect
            x="3.5"
            y="3.5"
            width="17"
            height="17"
            rx="2"
          /><circle
            cx="8.5"
            cy="8.5"
            r="1.3"
            fill="currentColor"
          /><circle
            cx="15.5"
            cy="15.5"
            r="1.3"
            fill="currentColor"
          /><circle
            cx="12"
            cy="12"
            r="1.3"
            fill="currentColor"
          /></svg>
          <span class="bar-word">Reroll</span>
          <span class="bar-cost">−1<span class="hex cost-chit" /></span>
        </button>
        <button
          class="ghost bar-btn danger"
          type="button"
          aria-label="Ban items"
          :disabled="!canBan || !allSettled"
          @click="startBan"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            aria-hidden="true"
          ><circle
            cx="12"
            cy="12"
            r="8.5"
          /><path d="M6 6l12 12" /></svg>
          <span class="bar-word">Ban</span>
          <span class="bar-cost">−1<span class="hex cost-chit" /></span>
        </button>
      </template>

      <template v-if="!banMode">
        <div
          class="bar-status"
          aria-live="polite"
        >
          <button
            v-if="statusKind === 'honors'"
            class="btn gold honors-link cut cta-sweep"
            type="button"
            :data-banked="bankedTier ?? undefined"
            :style="bankedSweep"
            @click="emit('openHonors')"
          >
            <span class="disp honors-word">{{ bonusUp ? 'Squad Honors' : 'Continue' }}</span>
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
          <span
            v-else-if="statusKind === 'wait'"
            class="hazard-soft wait-pill"
          >
            <span class="pulse wait-dot-lg" />
            {{ choosing ? `${choosing.name} choosing` : 'Choosing' }}
          </span>
          <span
            v-else
            class="pick-pill"
          >
            <span class="pulse pick-dot" />
            Pick 1 of {{ optionCount }}
          </span>
        </div>
      </template>

      <template v-else>
        <div class="ban-copy">
          <span
            class="lbl ban-lbl"
            :aria-live="'polite'"
          >Ban · purge from your pool</span>
          <strong class="ban-count">
            {{ selectedBanIds.length === 0
              ? 'Select items above'
              : `${selectedBanIds.length} of ${lockedOptions.length} selected` }}
          </strong>
        </div>
        <div class="ban-actions">
          <button
            class="ghost bar-btn"
            type="button"
            @click="cancelBan"
          >
            <span class="bar-word">Cancel</span>
          </button>
          <button
            class="hold-ban cut-sm"
            type="button"
            :disabled="selectedBanIds.length === 0"
            :aria-label="`Ban ${selectedBanIds.length} items and forfeit this pick. Press and hold.`"
            @pointerdown="banDown"
            @pointerup="banEnd"
            @pointerleave="banEnd"
          >
            <span
              class="hazard-dark crawl ban-fill"
              :class="{ on: holding }"
              aria-hidden="true"
            />
            <span class="hold-copy">
              <span class="disp hold-word">Ban {{ selectedBanIds.length || '' }} · forfeit this pick</span>
              <span class="hold-sub">Hold to confirm</span>
            </span>
          </button>
        </div>
      </template>
    </footer>
  </section>
</template>

<style scoped>
.draft {
  display: flex;
  flex-direction: column;
  gap: var(--gap-panel);
  min-height: 0;
}

.draft-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem 1.5rem;
  flex-wrap: wrap;
}
.head-l { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.draft-title { margin: 0; font-size: var(--fs-h1); color: var(--text); }
.head-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 10px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.meta-stars { display: flex; gap: 2px; }
.meta-star { width: 12px; height: 12px; fill: var(--line-3); }
.meta-star.on { fill: var(--gold); }
.meta-count { color: var(--khaki); }
.meta-base { display: inline-flex; align-items: center; gap: 6px; color: var(--khaki); }
.meta-tier { min-width: 20px; height: 18px; padding: 0 3px; font-size: 10px; border: 1px solid currentColor; }
.meta-lost { color: var(--red); }
.head-track { flex: 0 1 380px; margin-left: auto; }
/* While rolling, the track is lifted into the stage (no transition, so it
   never visibly starts in the corner); docking releases the transform. */
.track-lift {
  position: relative;
  z-index: 6;
  transform-origin: center;
}
.track-lift.docking { transition: transform var(--dock-dur, 720ms) cubic-bezier(0.7, 0, 0.2, 1); }

.intro-stage {
  position: relative;
  flex: 1 1 auto;
  min-height: 280px;
  border: 1px dashed var(--line-2);
  background:
    radial-gradient(ellipse 48% 38% at 50% 42%, color-mix(in srgb, var(--glow, var(--gold)) 10%, transparent), transparent 70%),
    var(--ground);
  overflow: hidden;
  transition: opacity 0.4s var(--ease-out), border-color 0.4s var(--ease-out);
}
.intro-stage.landed { --glow: var(--ceil); border-color: color-mix(in srgb, var(--ceil) 35%, var(--line-2)); }
.intro-stage.landed::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 40% 30% at 50% 42%, color-mix(in srgb, var(--ceil) 45%, transparent), transparent 70%);
  animation: fadeOut 0.9s var(--ease-out) both;
  pointer-events: none;
}
.intro-stage.docking { opacity: 0; border-color: transparent; }
.intro-kicker {
  position: absolute;
  left: 50%;
  top: calc(42% - 96px);
  transform: translateX(-50%);
  white-space: nowrap;
  color: var(--khaki);
  animation: riseIn 0.5s var(--ease-out) both;
}
.intro-verdict {
  position: absolute;
  left: 50%;
  top: calc(42% + 78px);
  translate: -50% 0;
  padding: 8px 18px;
  font-size: 1.6rem;
  white-space: nowrap;
  color: var(--ceil);
  border: 3px solid var(--ceil);
  background: color-mix(in srgb, var(--ceil) 8%, transparent);
  animation: slam 0.55s var(--ease-out) both;
}
.intro-skip {
  position: absolute;
  inset: 0;
  z-index: 7;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0 0 14px;
  background: transparent;
  border: 0;
  cursor: pointer;
}
.intro-hint {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--dim);
}

.cabinet {
  display: grid;
  /* Exactly one equal column per rolled option, so the pods fill the centre
     column (the design's `repeat(4, 1fr)`); `auto-fit` left empty tracks. */
  grid-template-columns: repeat(var(--cols, 4), minmax(0, 1fr));
  grid-auto-rows: minmax(280px, 1fr);
  gap: 16px;
  flex: 1 1 auto;
  min-height: 280px;
}
/* Liberty's Cross takes the whole top row; the pods keep their equal columns. */
.cabinet.has-cross { grid-template-rows: auto; grid-auto-rows: minmax(260px, 1fr); }
.cabinet-cross { grid-column: 1 / -1; }

.sat-out { margin: 0; }

/* In the promotion dialog the cabinet centres capped pods (one pick never
   stretches across the dialog) and folds to two columns when narrow. */
.draft.promotion { container-type: inline-size; }
.promotion .cabinet {
  grid-template-columns: repeat(auto-fit, minmax(9rem, 13.5rem));
  grid-auto-rows: 290px;
  justify-content: center;
  flex: 0 0 auto;
}
.promotion .draft-head { flex-wrap: nowrap; }
.head-picks { display: flex; align-items: center; gap: 4px 12px; margin-left: auto; }
.head-picks .chits { gap: 4px; }
.head-picks .tok { width: 16px; height: 18px; }
@container (max-width: 36rem) {
  .promotion .cabinet {
    grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr));
    grid-auto-rows: 236px;
    gap: 10px;
  }
  /* Phones keep just the chits. */
  .picks-count { display: none; }
}

/* Compact "choosing" indicators (the pods own their own glow). */

.pick-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--gold);
  display: inline-block;
}
.wait-dot-lg {
  width: 7px;
  height: 7px;
  background: var(--gold);
  display: inline-block;
}

.token-bar {
  position: sticky;
  bottom: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
  min-height: 64px;
  padding: 8px 10px 8px 16px;
  border: 1px solid var(--line-2);
  background: var(--panel);
}
.token-bar.banning { border-color: color-mix(in srgb, var(--red) 60%, var(--line-3)); }
.bar-edge {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 6px;
}

.tok-readout { display: flex; flex-direction: column; gap: 5px; }
.tok-lbl { font-size: 10px; white-space: nowrap; }
.chits { display: flex; align-items: center; gap: 4px; }
.tok { width: 13px; height: 15px; background: var(--line-2); }
.tok.on { background: var(--gold); }
.tok-count {
  margin-left: 6px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
}
.tok-count .dim { color: var(--dim); }

.bar-sep { width: 1px; height: 36px; background: var(--line-2); }

.bar-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 44px;
  padding: 0 14px;
  color: var(--text);
  flex-shrink: 0;
}
.bar-btn.danger { color: var(--red); border-color: color-mix(in srgb, var(--red) 50%, transparent); }
.bar-word { font-size: 12px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; }
.bar-cost {
  display: flex;
  align-items: center;
  gap: 4px;
  padding-left: 10px;
  border-left: 1px solid var(--line-2);
  font-size: 12px;
  font-weight: 700;
  color: var(--khaki);
}
.cost-chit { width: 8px; height: 10px; background: var(--gold); }

.bar-status { margin-left: auto; display: flex; align-items: center; }

.honors-link {
  display: flex;
  align-items: center;
  gap: 18px;
  height: 46px;
  padding: 0 18px 0 20px;
  background: var(--gold);
  color: var(--on-gold);
  border: 0;
  cursor: pointer;
}
.honors-word { font-size: 1rem; }
.cta-sweep[data-banked='S']::after { animation-duration: 2.2s; }
.cta-sweep[data-banked='S+']::after { animation-duration: 1.6s; }

.wait-pill,
.pick-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 44px;
  padding: 0 14px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  white-space: nowrap;
}
.wait-pill { color: var(--gold); }
.pick-pill { color: var(--gold); }

/* Ban mode */
.ban-copy { display: flex; flex-direction: column; gap: 4px; padding-left: 4px; }
.ban-lbl { font-size: 10px; color: var(--red); }
.ban-count { font-size: 15px; font-weight: 700; letter-spacing: 0.1em; color: var(--text); }
.ban-actions { margin-left: auto; display: flex; align-items: center; gap: 10px; }
.hold-ban {
  position: relative;
  overflow: hidden;
  width: 300px;
  max-width: 46vw;
  height: 48px;
  border: 0;
  background: var(--red);
  color: var(--on-gold);
  touch-action: none;
  user-select: none;
  cursor: pointer;
}
.hold-ban:disabled { opacity: 0.4; cursor: not-allowed; }
.ban-fill {
  position: absolute;
  inset: 0;
  opacity: 0.4;
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 900ms linear;
}
.ban-fill.on { transform: scaleX(1); }
.ban-fill:not(.on) { transition: none; }
.hold-copy {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}
.hold-word { font-size: 0.85rem; }
.hold-sub { font-size: 9px; font-weight: 700; letter-spacing: 0.24em; text-transform: uppercase; }

.banked {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  min-width: 0;
  padding-left: 4px;
}
.banked-art {
  width: 2.75rem;
  height: 2.75rem;
  object-fit: contain;
  flex-shrink: 0;
}
.banked-copy { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.banked-name {
  font-size: 15px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.banked-name:not([data-tier]) { color: var(--gold); }
.banked.purged .banked-name { color: var(--red); }
.banked.purged { flex-direction: column; align-items: flex-start; gap: 4px; }

@media (prefers-reduced-motion: reduce) {

  .pick-dot,
  .wait-dot-lg {
    animation: none;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--gold) 35%, transparent);
  }
}
</style>
