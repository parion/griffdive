<script setup lang="ts">
import { REWARD_TOKEN_CAP, maxStarsFor } from '~~/shared/engine/config'
import { optionsForStars } from '~~/shared/engine/rewards'
import { ITEMS_BY_ID, TIER_RANK } from '~~/shared/data/catalog'
import { itemImageUrl } from '~~/shared/data/images'
import type { Item } from '~~/shared/data/types'
import type { RewardOption } from '~~/shared/engine/rewards'
import type { RewardTier } from '~~/shared/engine/types'

interface SquadPick {
  id: string
  name: string
  item: Item | null
  skipped: boolean
}

const props = withDefaults(defineProps<{
  options: RewardOption[]
  pickedId: string | null
  pool: Item[]
  ownedIds: string[]
  // How many reward slots failed pacts forfeited — explains a thinner draft.
  optionsLost?: number
  // The rest of the squad's draft state: what they banked or that they are
  // still choosing. Presentation only — the squad strip owns moderation.
  squadPicks?: SquadPick[]
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
  // Mission report facts for the ceiling preview and the options badge.
  stars?: number
  difficulty?: number
  teamRisk?: number
  pactRisk?: number
  performance?: number
  rerolled?: boolean
  // Squad-draft state: everyone has picked, and whether the full-star honors
  // ceremony is due. `advanceLabel` is the host's next-mission CTA.
  ready?: boolean
  bonusUp?: boolean
  canControl?: boolean
  advanceLabel?: string
  kicker?: string
}>(), {
  squadPicks: () => [],
  tokenCount: 0,
  canReroll: false,
  canBan: false,
  bannableIds: () => [],
  resolved: false,
  banned: false,
  bannedIds: () => [],
  stars: 0,
  difficulty: 3,
  teamRisk: 0,
  pactRisk: 0,
  performance: 0,
  rerolled: false,
  ready: false,
  bonusUp: false,
  canControl: false,
  advanceLabel: 'Next mission',
  kicker: 'Reward draft',
})

const emit = defineEmits<{
  pick: [optionId: string, choiceItemId?: string]
  reroll: []
  ban: [optionIds: string[]]
  advance: []
  openHonors: []
}>()

// A reload lands on a resolved draft whose offer can no longer be re-derived
// (the banked item is already owned), so the pods can't be rebuilt — show the
// banner alone. A draft resolved mid-session keeps its frozen pods.
const wasResolvedOnMount = props.resolved || props.pickedId !== null

// The offer is derived, and claiming an item adds it to the diver's inventory —
// which re-derives the offer minus the new item. Freeze the draft when it opens
// so a pick never reshuffles the pods under the diver's finger.
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
    lockedOptions.value = [...next]
    settledCount.value = 0
    podsDone.value = false
    draftGeneration.value++
  }
})

// The pod that banked the reward: a rolled option matches by id, while
// Liberty's Cross banks a named item that was never among the options.
const pickedPodId = computed(() => {
  if (!props.pickedId) {
    return null
  }
  const match = lockedOptions.value.find(option => option.optionId === props.pickedId)
  return match?.optionId ?? lockedOptions.value.find(option => option.choice)?.optionId ?? null
})

// Liberty's Cross banks the picked item's id, which is not among the rolled
// options — resolve it from the catalog for the banked banner.
const pickedItem = computed(() =>
  lockedOptions.value.find(option => option.optionId === props.pickedId)?.item
  ?? (props.pickedId ? ITEMS_BY_ID.get(props.pickedId) ?? null : null),
)
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

// Presentation only: the rolled ceiling is the best tier the frozen offer
// landed on (the S+ sentinel is Liberty's Cross). The track lights the climb
// from the band floor to that ceiling; it never rolls anything itself.
function maxTierOf(options: RewardOption[]): RewardTier {
  const rolled = options.filter(option => !option.choice)
  if (options.some(option => option.choice)) {
    return 'S+'
  }
  if (rolled.length === 0) {
    return 'C'
  }
  const best = rolled.reduce((top, option) =>
    TIER_RANK[option.item.tier] > TIER_RANK[top.item.tier] ? option : top, rolled[0]!)
  return best.item.tier.toUpperCase() as RewardTier
}

const ceilingTier = computed(() => maxTierOf(lockedOptions.value))
const maxStars = computed(() => maxStarsFor(props.difficulty))
const optionCount = computed(() =>
  lockedOptions.value.length > 0
    ? lockedOptions.value.length
    : optionsForStars(props.stars, ceilingTier.value))

const leadOptionId = computed<string | null>(() => {
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

function squadPickLabel(pick: SquadPick): string {
  if (pick.skipped) {
    return `${pick.name} skips this draft`
  }
  return pick.item ? `${pick.name} picked ${pick.item.displayName}` : `${pick.name} is choosing`
}

const selfResolved = computed(() =>
  props.resolved || props.pickedId !== null || props.banned)
const choosing = computed(() =>
  props.squadPicks.find(pick => !pick.item && !pick.skipped) ?? null)
const statusKind = computed<'honors' | 'advance' | 'wait' | 'pick'>(() => {
  if (props.ready) {
    return props.bonusUp ? 'honors' : 'advance'
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
    :class="{ banning: banMode }"
  >
    <header class="draft-head">
      <div class="head-l">
        <span class="lbl">{{ kicker }}</span>
        <h1 class="disp draft-title">
          Reward Draft
        </h1>
      </div>
      <div
        class="options-badge"
        role="img"
        :aria-label="`${stars} of ${maxStars} stars earns ${optionCount} options`"
      >
        <span
          class="badge-stars"
          aria-hidden="true"
        >
          <svg
            v-for="i in maxStars"
            :key="i"
            viewBox="0 0 24 24"
            class="badge-star"
            :class="{ on: i <= stars }"
          ><path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6l-5.4 2.9 1.2-6-4.5-4.2 6.1-.7z" /></svg>
        </span>
        <svg
          class="badge-arrow"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        ><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        <span
          class="badge-slots"
          aria-hidden="true"
        >
          <span
            v-for="i in optionCount"
            :key="i"
            class="badge-slot"
          />
        </span>
        <span class="badge-count">{{ optionCount }} Options</span>
      </div>
    </header>

    <CeilingTrack
      v-if="lockedOptions.length && !wasResolvedOnMount"
      :difficulty="difficulty"
      :ceiling="ceilingTier"
      :settled="allSettled"
      :team-risk="teamRisk"
      :pact-risk="pactRisk"
      :performance="performance"
      :rerolled="rerolled"
    />

    <p
      v-if="optionsLost && !banMode"
      class="options-lost small"
    >
      {{ optionsLost }} pact{{ optionsLost === 1 ? '' : 's' }} failed —
      {{ optionsLost === 1 ? 'one reward option forfeited' : `${optionsLost} reward options forfeited` }}.
    </p>

    <div
      v-if="squadPicks.length && !banMode && !resolved"
      class="squad-row"
    >
      <span class="lbl">Squad</span>
      <AppTooltip
        v-for="pick in squadPicks"
        :key="pick.id"
        :content="squadPickLabel(pick)"
      >
        <span
          class="squad-pick cut-sm"
          :class="{ done: pick.item !== null, skipped: pick.skipped }"
          role="img"
          :aria-label="squadPickLabel(pick)"
        >
          <img
            v-if="pick.item"
            :src="itemImageUrl(pick.item)"
            alt=""
            loading="lazy"
            draggable="false"
          >
          <span
            v-else-if="pick.skipped"
            class="skip-mark"
          >–</span>
          <span
            v-else
            class="wait-dot pulse"
          />
        </span>
      </AppTooltip>
    </div>

    <div
      v-if="lockedOptions.length && !wasResolvedOnMount"
      class="cabinet"
      :class="{ banning: banMode }"
      :style="{ '--cols': lockedOptions.length }"
    >
      <RewardPod
        v-for="(option, index) in lockedOptions"
        :key="`${draftGeneration}-${option.optionId}`"
        :option="option"
        :choice-pool="pool"
        :owned-ids="ownedIds"
        :index="index"
        :instant="instant || podsDone"
        :can-pick="allSettled && !resolved"
        :picked="pickedPodId === option.optionId"
        :dimmed="pickedPodId !== null && pickedPodId !== option.optionId"
        :lead="option.optionId === leadOptionId && !option.choice"
        :ban-mode="banMode"
        :bannable="bannableIds.includes(option.optionId)"
        :selected="selectedBanIds.includes(option.optionId)"
        :stamp="pickedPodId === option.optionId && resolved ? 'Banked' : (bannedIds.includes(option.optionId) ? 'Banned' : null)"
        @pick="(optionId, choiceItemId) => emit('pick', optionId, choiceItemId)"
        @ban="toggleBan"
        @settled="onSettled"
      />
    </div>
    <p
      v-else-if="!lockedOptions.length && !resolved"
      class="muted small sat-out"
    >
      You sat out this mission's draft — the squad dives without your pick.
    </p>

    <Transition name="phase">
      <div
        v-if="resolved && !wasResolvedOnMount"
        class="banked cut-sm"
      >
        <template v-if="banned">
          <span class="lbl ban-lbl">Draft resolved</span>
          <strong class="banked-name">Rewards banned</strong>
          <span class="muted small">— no reward this mission. Your future offers are cleaner.</span>
        </template>
        <template v-else>
          <img
            v-if="pickedImage"
            class="banked-art"
            :src="pickedImage"
            alt=""
            draggable="false"
          >
          <div class="banked-copy">
            <span class="lbl">Reward banked</span>
            <strong class="banked-name">{{ pickedItem?.displayName }}</strong>
            <span class="muted small">— see the squad inventory below.</span>
          </div>
        </template>
      </div>
      <div
        v-else-if="wasResolvedOnMount"
        class="banked cut-sm"
      >
        <span class="lbl">Reward banked</span>
        <strong class="banked-name">{{ pickedItem?.displayName ?? 'Draft resolved' }}</strong>
      </div>
    </Transition>

    <footer
      class="token-bar"
      :class="{ banning: banMode }"
    >
      <span
        v-if="banMode"
        class="hazard-red bar-edge"
        aria-hidden="true"
      />

      <template v-if="!banMode">
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

        <div
          class="bar-status"
          aria-live="polite"
        >
          <button
            v-if="statusKind === 'honors'"
            class="btn gold honors-link cut"
            type="button"
            @click="emit('openHonors')"
          >
            <span class="disp honors-word">Squad Honors</span>
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
          <button
            v-else-if="statusKind === 'advance'"
            class="btn primary cut advance-btn"
            type="button"
            :disabled="!canControl"
            @click="emit('advance')"
          >
            <span class="disp advance-label">{{ advanceLabel }}</span>
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
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
.head-l { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.draft-title { margin: 0; font-size: var(--fs-h1); color: var(--text); }

.options-badge {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 44px;
  padding: 0 14px;
  border: 1px solid var(--line-2);
  background: color-mix(in srgb, var(--panel) 80%, transparent);
  flex-shrink: 0;
}
.badge-stars { display: flex; gap: 2px; }
.badge-star { width: 14px; height: 14px; fill: var(--line-3); }
.badge-star.on { fill: var(--gold); }
.badge-arrow { width: 18px; height: 18px; color: var(--dim); }
.badge-slots { display: flex; gap: 3px; }
.badge-slot {
  width: 11px;
  height: 15px;
  border: 1px solid var(--khaki);
}
.badge-count {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text);
  white-space: nowrap;
}

.options-lost { margin: 0; color: var(--red); }

.squad-row { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; }
.squad-pick {
  display: inline-grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid var(--line-3);
  background: var(--ground);
  overflow: hidden;
}
.squad-pick img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 0.15rem;
}
.squad-pick.done { border-color: var(--teal); }
.squad-pick.skipped { opacity: 0.5; }
.skip-mark { color: var(--muted); font-weight: 700; line-height: 1; }

.cabinet {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  grid-auto-rows: minmax(280px, 1fr);
  gap: 16px;
  flex: 1 1 auto;
  min-height: 300px;
}

.sat-out { margin: 0; }

/* Compact "choosing" indicators (the pods own their own glow). */
.wait-dot,
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
  gap: 12px;
  min-height: 64px;
  padding: 0 10px 0 16px;
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
.advance-btn {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  height: 46px;
  padding: 0 1.1rem;
}
.advance-label { font-size: 0.95rem; letter-spacing: 0.04em; white-space: nowrap; }
.advance-btn:disabled { opacity: 0.5; cursor: not-allowed; }

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
  padding: 0.6rem 0.75rem;
  border: 1px solid color-mix(in srgb, var(--gold) 45%, var(--line-3));
  background: color-mix(in srgb, var(--gold) 8%, transparent);
}
.banked-art {
  width: 2.5rem;
  height: 2.5rem;
  object-fit: contain;
}
.banked-copy { display: flex; align-items: baseline; gap: 0.5rem; flex-wrap: wrap; }
.banked-name { color: var(--gold); }

@media (prefers-reduced-motion: reduce) {
  .wait-dot,
  .pick-dot,
  .wait-dot-lg {
    animation: none;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--gold) 35%, transparent);
  }
}
</style>
