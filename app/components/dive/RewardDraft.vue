<script setup lang="ts">
import { ITEMS_BY_ID, TIER_RANK } from '~~/shared/data/catalog'
import { itemImageUrl } from '~~/shared/data/images'
import type { Item } from '~~/shared/data/types'
import type { RewardOption } from '~~/shared/engine/rewards'

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
</script>

<template>
  <section class="panel slot-machine">
    <header class="cabinet-head">
      <h2 class="draft-title">
        <WaitingLight
          v-if="!resolved && !banMode"
          label="Waiting on your reward pick"
        />
        {{ banMode ? 'Ban offered rewards' : 'Rewards — choose one' }}
      </h2>
      <p class="muted small">
        <template v-if="banMode">
          Pick any or all of the offered rewards to ban from your future
          offers — this spends a token and forfeits this mission's reward.
        </template>
        <template v-else>
          Every reward is yours alone — stratagems included.
        </template>
      </p>
      <p
        v-if="props.optionsLost && !banMode"
        class="small options-lost"
      >
        {{ props.optionsLost }} pact{{ props.optionsLost === 1 ? '' : 's' }} failed —
        {{ props.optionsLost === 1 ? 'one reward option forfeited' : `${props.optionsLost} reward options forfeited` }}.
      </p>
    </header>

    <div
      v-if="squadPicks.length && !banMode && !resolved"
      class="squad-picks"
    >
      <span class="muted small">Squad</span>
      <AppTooltip
        v-for="pick in squadPicks"
        :key="pick.id"
        :content="squadPickLabel(pick)"
      >
        <span
          class="squad-pick"
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
      <span class="muted small">Reward tokens: {{ tokenCount }}</span>
      <button
        class="btn tiny ghost"
        type="button"
        :disabled="!canReroll || !allSettled"
        @click="emit('reroll')"
      >
        Reroll offer
      </button>
      <button
        class="btn tiny ghost"
        type="button"
        :disabled="!canBan || !allSettled"
        @click="startBan"
      >
        Ban items
      </button>
    </div>

    <div
      v-if="lockedOptions.length && !banned && !wasResolvedOnMount"
      class="reels"
      :class="{ settled: allSettled }"
    >
      <RewardReel
        v-for="(option, index) in lockedOptions"
        :key="`${reelEpoch}-${option.optionId}`"
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
      <div class="row">
        <button
          class="btn primary"
          type="button"
          :disabled="selectedBanIds.length === 0"
          @click="confirmBan"
        >
          {{ selectedBanIds.length === 0
            ? 'Ban selected items'
            : `Ban ${selectedBanIds.length} item${selectedBanIds.length === 1 ? '' : 's'}` }}
        </button>
        <button
          class="btn ghost"
          type="button"
          @click="cancelBan"
        >
          Cancel
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
        class="banked"
      >
        <template v-if="banned">
          <span class="muted small">Draft resolved</span>
          <strong>Rewards banned</strong>
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
            <span class="muted small">Reward banked</span>
            <strong>{{ pickedItem?.displayName }}</strong>
            <span class="muted small">— see the squad inventory below.</span>
          </div>
        </template>
      </div>
    </Transition>
  </section>
</template>

<style scoped>
.slot-machine {
  position: relative;
  display: grid;
  gap: 0.85rem;
  padding: 1rem 0.9rem 0.9rem;
  border-color: color-mix(in srgb, var(--gold) 35%, var(--border));
  background:
    radial-gradient(120% 70% at 50% -12%, color-mix(in srgb, var(--gold) 12%, transparent), transparent 62%),
    var(--bg-raised);
}

.cabinet-head { display: grid; gap: 0.25rem; text-align: center; }
.draft-title { display: flex; align-items: center; justify-content: center; gap: 0.45rem; }
.options-lost {
  margin: 0.25rem 0 0;
  color: var(--red);
}

.reels {
  display: flex;
  justify-content: safe center;
  gap: 0.75rem;
  padding: 0.15rem 0.1rem 0.4rem;
  overflow-x: auto;
  scrollbar-width: thin;
}

.hint { text-align: center; margin: 0; }

.token-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin: 0.5rem 0 0.25rem;
}
.ban-footer {
  margin-top: 0.6rem;
  padding-top: 0.6rem;
  border-top: 1px dashed color-mix(in srgb, var(--red) 40%, var(--border));
}
.squad-picks {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  margin: 0.5rem 0 0.25rem;
}
.squad-pick {
  display: inline-grid;
  place-items: center;
  width: 1.9rem;
  height: 1.9rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
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
  justify-content: center;
  gap: 0.7rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid color-mix(in srgb, var(--gold) 45%, var(--border));
  border-radius: 10px;
  background: color-mix(in srgb, var(--gold) 8%, transparent);
}
.banked-art {
  width: 2.5rem;
  height: 2.5rem;
  object-fit: contain;
}
.banked-copy {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.banked-copy strong { color: var(--gold); }
</style>
