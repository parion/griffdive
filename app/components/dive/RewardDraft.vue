<script setup lang="ts">
import { ITEMS_BY_ID, TIER_RANK } from '~~/shared/data/catalog'
import { itemImageUrl } from '~~/shared/data/images'
import type { Item } from '~~/shared/data/types'
import { REWARD_TOKEN_CAP } from '~~/shared/engine/config'
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
}>(), {
  squadPicks: () => [],
  tokenCount: 0,
  canReroll: false,
  canBan: false,
  bannableIds: () => [],
  resolved: false,
  banned: false,
})

const emit = defineEmits<{
  pick: [optionId: string, choiceItemId?: string]
  reroll: []
  ban: [optionIds: string[]]
}>()

// A reload lands on a resolved draft whose offer can no longer be re-derived
// (the banked item is already owned), so the reels can't be rebuilt — show the
// banner alone. A draft resolved mid-session keeps its frozen reels.
const wasResolvedOnMount = props.resolved || props.pickedId !== null

// The offer is derived, and claiming an item adds it to the diver's inventory —
// which re-derives the offer minus the new item. Freeze the draft when it opens
// so a pick never reshuffles the reels under the diver's finger.
const lockedOptions = ref<RewardOption[]>(props.options.length > 0 ? [...props.options] : [])
const settledCount = ref(0)
const reelEpoch = ref(0)
// Ban mode keeps the settled reels and turns them into a purge selector; once
// the reels have revealed, remounting them must not replay the spin.
const reelsDone = ref(false)

function sameOffer(a: RewardOption[], b: RewardOption[]): boolean {
  return a.length === b.length && a.every((option, i) => option.optionId === b[i]?.optionId)
}

// A reroll redraws the offer: adopt it and replay the reels. Inventory churn
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
    reelsDone.value = false
    reelEpoch.value++
  }
})

// The reel that banked the reward: a rolled option matches by id, while
// Liberty's Cross banks a named item that was never among the options.
const pickedReelId = computed(() => {
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

// Reels stop left to right; the cards only become claimable once the last one
// has locked, so the pick always follows the full reveal.
const allSettled = computed(() =>
  instant.value || settledCount.value >= lockedOptions.value.length)
function onSettled(): void {
  settledCount.value++
}

watch(allSettled, (settled) => {
  if (settled) {
    reelsDone.value = true
  }
}, { immediate: true })

// The symbols a reel rolls are the diver's own catalog, narrowed to the band
// the offer landed in — the spin never teases gear the draft can't pay out.
const reelPool = computed<Item[]>(() => {
  const owned = new Set(props.ownedIds)
  const optionIds = new Set(lockedOptions.value.map(option => option.optionId))
  const base = props.pool.filter(item => !owned.has(item.id) && !optionIds.has(item.id))
  const tiers = lockedOptions.value
    .filter(option => !option.choice)
    .map(option => TIER_RANK[option.item.tier])
  if (tiers.length > 0) {
    const lo = Math.min(...tiers)
    const hi = Math.max(...tiers)
    const band = base.filter(item => TIER_RANK[item.tier] >= lo && TIER_RANK[item.tier] <= hi)
    if (band.length >= 4) {
      return band
    }
  }
  return base
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

function squadPickLabel(pick: SquadPick): string {
  if (pick.skipped) {
    return `${pick.name} skips this draft`
  }
  return pick.item ? `${pick.name} picked ${pick.item.displayName}` : `${pick.name} is choosing`
}

// Presentation only: the rolled ceiling is the best tier the frozen offer
// landed on (the S+ sentinel is Liberty's Cross). The readout lights the ladder
// from the band floor to that ceiling; it never rolls anything itself.
const LADDER: readonly RewardTier[] = ['C', 'B', 'A', 'S', 'S+']

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

function minTierOf(options: RewardOption[]): RewardTier {
  const rolled = options.filter(option => !option.choice)
  if (rolled.length === 0) {
    return options.some(option => option.choice) ? 'S+' : 'C'
  }
  const low = rolled.reduce((bottom, option) =>
    TIER_RANK[option.item.tier] < TIER_RANK[bottom.item.tier] ? option : bottom, rolled[0]!)
  return low.item.tier.toUpperCase() as RewardTier
}

const ceilingTier = computed(() => maxTierOf(lockedOptions.value))
const floorTier = computed(() => minTierOf(lockedOptions.value))
const ceilingIndex = computed(() => LADDER.indexOf(ceilingTier.value))
const floorIndex = computed(() => LADDER.indexOf(floorTier.value))
const leadOptionId = computed<string | null>(() => {
  const rolled = lockedOptions.value.filter(option => !option.choice)
  if (rolled.length === 0) {
    return null
  }
  return rolled.reduce((top, option) =>
    TIER_RANK[option.item.tier] > TIER_RANK[top.item.tier] ? option : top, rolled[0]!).optionId
})
</script>

<template>
  <section
    class="cabinet panel scan"
    :class="{ banning: banMode }"
  >
    <span
      v-if="banMode"
      class="hazard-red ban-edge"
      aria-hidden="true"
    />

    <header class="cabinet-head">
      <div class="head-copy">
        <span class="lbl">Reward draft</span>
        <h2 class="disp cabinet-title">
          <WaitingLight
            v-if="!resolved && !banMode"
            label="Waiting on your reward pick"
          />
          {{ banMode ? 'Ban offered rewards' : 'Rewards — choose one' }}
        </h2>
        <p class="cabinet-sub muted small">
          <template v-if="banMode">
            Pick any or all of the offered rewards to ban from your future
            offers — this spends a token and forfeits this mission's reward.
          </template>
          <template v-else>
            Every reward is yours alone — stratagems included.
          </template>
        </p>
      </div>
      <span
        v-if="lockedOptions.length && !banMode"
        class="chip gold nowrap"
      >{{ lockedOptions.length }} option{{ lockedOptions.length === 1 ? '' : 's' }}</span>
    </header>

    <p
      v-if="props.optionsLost && !banMode"
      class="options-lost small"
    >
      {{ props.optionsLost }} pact{{ props.optionsLost === 1 ? '' : 's' }} failed —
      {{ props.optionsLost === 1 ? 'one reward option forfeited' : `${props.optionsLost} reward options forfeited` }}.
    </p>

    <section
      v-if="lockedOptions.length && !banned && !wasResolvedOnMount"
      class="ceiling"
      aria-label="Ceiling roll"
    >
      <div class="ceiling-head">
        <span class="lbl">Ceiling roll</span>
        <span
          class="ceiling-ladder"
          role="img"
          :aria-label="allSettled ? `Rolled ceiling ${ceilingTier}` : 'Rolling the ceiling'"
        >
          <template
            v-for="(tier, i) in LADDER"
            :key="tier"
          >
            <span
              v-if="i > 0"
              class="ceiling-link"
              :class="{ lit: i > floorIndex && i <= ceilingIndex }"
            />
            <TierBadge
              :tier="tier"
              size="sm"
              class="ceiling-rung"
              :class="{ lit: i >= floorIndex && i <= ceilingIndex, top: i === ceilingIndex }"
            />
          </template>
        </span>
        <Transition
          name="phase"
          mode="out-in"
        >
          <span
            v-if="allSettled"
            class="stamp disp ceiling-stamp"
            :data-tier="ceilingTier"
          >Ceiling · {{ ceilingTier }}</span>
          <span
            v-else
            class="lbl pulse climbing"
          >Climbing…</span>
        </Transition>
      </div>
    </section>

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
            class="wait-dot"
          />
        </span>
      </AppTooltip>
    </div>

    <div
      v-if="tokenCount > 0 && !banMode && !resolved"
      class="token-bar"
    >
      <div class="tok-readout">
        <span class="lbl">Reward tokens</span>
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
      <div class="tok-actions">
        <button
          class="btn tiny ghost"
          type="button"
          :disabled="!canReroll || !allSettled"
          @click="emit('reroll')"
        >
          Reroll offer
        </button>
        <button
          class="btn tiny danger"
          type="button"
          :disabled="!canBan || !allSettled"
          @click="startBan"
        >
          Ban items
        </button>
      </div>
    </div>

    <div
      v-if="lockedOptions.length && !banned && !wasResolvedOnMount"
      class="reels"
      :class="{ settled: allSettled }"
    >
      <div
        v-for="(option, index) in lockedOptions"
        :key="`${reelEpoch}-${option.optionId}`"
        class="reel-slot"
        :class="{ lead: option.optionId === leadOptionId && !option.choice && !banMode }"
      >
        <span
          v-if="option.optionId === leadOptionId && !option.choice && !banMode && allSettled"
          class="lead-flag lbl"
        >Ceiling</span>
        <RewardReel
          :option="option"
          :candidates="reelPool"
          :choice-pool="pool"
          :owned-ids="ownedIds"
          :index="index"
          :instant="instant || reelsDone"
          :can-pick="allSettled && !resolved"
          :picked="pickedReelId === option.optionId"
          :dimmed="pickedReelId !== null && pickedReelId !== option.optionId"
          :ban-mode="banMode"
          :bannable="bannableIds.includes(option.optionId)"
          :selected="selectedBanIds.includes(option.optionId)"
          @pick="(optionId, choiceItemId) => emit('pick', optionId, choiceItemId)"
          @ban="toggleBan"
          @settled="onSettled"
        />
      </div>
    </div>
    <p
      v-else-if="!lockedOptions.length && !resolved"
      class="muted small"
    >
      You sat out this mission's draft — the squad dives without your pick.
    </p>

    <div
      v-if="banMode"
      class="ban-footer"
    >
      <span
        class="hazard-red"
        aria-hidden="true"
      />
      <div class="ban-copy">
        <span class="lbl ban-lbl">Ban · purge from your pool</span>
        <strong class="ban-count">
          {{ selectedBanIds.length === 0
            ? 'Select offered items'
            : `${selectedBanIds.length} item${selectedBanIds.length === 1 ? '' : 's'} selected` }}
        </strong>
      </div>
      <div class="ban-actions">
        <button
          class="btn ghost"
          type="button"
          @click="cancelBan"
        >
          Cancel
        </button>
        <button
          class="btn danger"
          type="button"
          :disabled="selectedBanIds.length === 0"
          @click="confirmBan"
        >
          {{ selectedBanIds.length === 0
            ? 'Ban selected items'
            : `Ban ${selectedBanIds.length} item${selectedBanIds.length === 1 ? '' : 's'}` }}
        </button>
      </div>
    </div>

    <Transition name="phase">
      <p
        v-if="allSettled && !resolved && !banMode && lockedOptions.length && !wasResolvedOnMount"
        class="hint muted small"
      >
        Reels locked — tap a card to claim it.
      </p>
    </Transition>

    <Transition name="phase">
      <div
        v-if="resolved"
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
    </Transition>
  </section>
</template>

<style scoped>
.cabinet {
  position: relative;
  display: grid;
  gap: 0.85rem;
  padding: 1rem 0.9rem 0.9rem;
  border-color: color-mix(in srgb, var(--gold) 38%, var(--line-3));
  background:
    radial-gradient(120% 70% at 50% -12%, color-mix(in srgb, var(--gold) 12%, transparent), transparent 62%),
    var(--panel);
}
.cabinet.banning { border-color: color-mix(in srgb, var(--red) 55%, var(--line-3)); }
.ban-edge {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 5px;
}

.cabinet-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}
.head-copy { display: grid; gap: 0.2rem; min-width: 0; }
.cabinet-title { display: flex; align-items: center; gap: 0.45rem; margin: 0; color: var(--text); }
.cabinet-sub { margin: 0; }
.options-lost {
  margin: 0;
  color: var(--red);
}

.ceiling {
  border: 1px solid var(--line-1);
  background: var(--ground);
  padding: 0.5rem 0.7rem;
}
.ceiling-head { display: flex; align-items: center; gap: 0.7rem; flex-wrap: wrap; }
.ceiling-ladder { display: inline-flex; align-items: center; gap: 0.28rem; }
.ceiling-rung {
  opacity: 0.3;
  filter: grayscale(1);
  transition: opacity var(--dur-med) var(--ease-out), filter var(--dur-med) var(--ease-out), scale var(--dur-med) var(--ease-snap);
}
.ceiling-rung.lit { opacity: 1; filter: none; }
.ceiling-rung.top { scale: 1.12; }
.ceiling-link {
  width: 0.5rem;
  height: 2px;
  background: var(--line-3);
  transition: background var(--dur-med) var(--ease-out);
}
.ceiling-link.lit { background: color-mix(in srgb, var(--gold) 70%, var(--line-3)); }
.ceiling-stamp { margin-left: auto; padding: 0.2rem 0.5rem; border: 2px solid currentColor; font-size: 1rem; }
.climbing { margin-left: auto; }

.reels {
  display: flex;
  justify-content: safe center;
  gap: 0.75rem;
  padding: 0.15rem 0.1rem 0.4rem;
  overflow-x: auto;
  scrollbar-width: thin;
}
.reel-slot { position: relative; }
.lead-flag {
  position: absolute;
  top: -0.15rem;
  left: 50%;
  z-index: 4;
  translate: -50% 0;
  padding: 0.1rem 0.45rem;
  color: var(--gold);
  background: var(--ground);
  border: 1px solid var(--gold);
}
.reel-slot.lead :deep(.reel-window) {
  box-shadow: 0 0 24px color-mix(in srgb, var(--gold) 22%, transparent), inset 0 0 26px rgba(0, 0, 0, 0.6);
}

.hint { text-align: center; margin: 0; }

.token-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 0.5rem 0.65rem;
  border: 1px solid var(--line-2);
  background: var(--ground);
}
.tok-readout { display: flex; align-items: center; gap: 0.5rem; }
.tok { width: 0.8rem; height: 0.95rem; background: var(--line-2); border: 1px solid var(--line-3); }
.tok.on { background: var(--gold); border-color: var(--gold); }
.tok-count { font-weight: 700; font-size: 0.95rem; }
.tok-actions { display: flex; gap: 0.4rem; }

.ban-footer {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 0.6rem 0.75rem 0.6rem 1rem;
  border: 1px solid color-mix(in srgb, var(--red) 50%, var(--line-3));
  background: color-mix(in srgb, var(--red) 8%, transparent);
}
.ban-footer > .hazard-red {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 5px;
}
.ban-copy { display: grid; gap: 0.1rem; min-width: 0; }
.ban-lbl { color: var(--red); }
.ban-count { font-size: 0.95rem; }
.ban-actions { display: flex; gap: 0.5rem; margin-left: auto; flex-wrap: wrap; }

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
.wait-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--gold);
  animation: wait-dot 2s ease-in-out infinite;
}
@keyframes wait-dot {
  0%, 100% {
    opacity: 0.55;
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--gold) 55%, transparent);
  }
  50% {
    opacity: 1;
    box-shadow: 0 0 0 4px transparent;
  }
}
@media (prefers-reduced-motion: reduce) {
  .wait-dot {
    animation: none;
    opacity: 1;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--gold) 35%, transparent);
  }
}

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
</style>
