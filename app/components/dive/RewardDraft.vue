<script setup lang="ts">
import { ITEMS_BY_ID, TIER_RANK } from '~~/shared/data/catalog'
import { itemImageUrl } from '~~/shared/data/images'
import type { Item } from '~~/shared/data/types'
import type { RewardOption } from '~~/shared/engine/rewards'

const props = defineProps<{
  options: RewardOption[]
  pickedId: string | null
  pool: Item[]
  ownedIds: string[]
  // How many reward slots failed pacts forfeited — explains a thinner draft.
  optionsLost?: number
}>()

const emit = defineEmits<{ pick: [optionId: string, choiceItemId?: string] }>()

// The offer is derived, and claiming an item adds it to the diver's inventory —
// which re-derives the offer minus the new item. Freeze the draft when it opens
// so a pick never reshuffles the reels under the diver's finger.
const lockedOptions = ref<RewardOption[]>(props.options.length > 0 ? [...props.options] : [])
watch(() => props.options, (next) => {
  if (lockedOptions.value.length === 0 && next.length > 0) {
    lockedOptions.value = [...next]
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
const settledCount = ref(0)
const allSettled = computed(() =>
  instant.value || settledCount.value >= lockedOptions.value.length)
function onSettled(): void {
  settledCount.value++
}

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
</script>

<template>
  <section class="panel slot-machine">
    <div
      class="bulbs"
      aria-hidden="true"
    >
      <span
        v-for="n in 11"
        :key="n"
        class="bulb"
        :style="{ animationDelay: `${(n % 3) * 0.25}s` }"
      />
    </div>
    <header class="cabinet-head">
      <h2 class="draft-title">
        <WaitingLight
          v-if="!pickedId"
          label="Waiting on your reward pick"
        />
        Rewards — choose one
      </h2>
      <p class="muted small">
        Every reward is yours alone — stratagems included.
      </p>
      <p
        v-if="props.optionsLost"
        class="small options-lost"
      >
        {{ props.optionsLost }} pact{{ props.optionsLost === 1 ? '' : 's' }} failed —
        {{ props.optionsLost === 1 ? 'one reward option forfeited' : `${props.optionsLost} reward options forfeited` }}.
      </p>
    </header>

    <div
      v-if="lockedOptions.length"
      class="reels"
      :class="{ settled: allSettled }"
    >
      <RewardReel
        v-for="(option, index) in lockedOptions"
        :key="option.optionId"
        :option="option"
        :candidates="reelPool"
        :choice-pool="pool"
        :owned-ids="ownedIds"
        :index="index"
        :instant="instant"
        :can-pick="allSettled && !pickedId"
        :picked="pickedReelId === option.optionId"
        :dimmed="pickedReelId !== null && pickedReelId !== option.optionId"
        @pick="(optionId, choiceItemId) => emit('pick', optionId, choiceItemId)"
        @settled="onSettled"
      />
    </div>
    <p
      v-else
      class="muted small"
    >
      You sat out this mission's draft — the squad dives without your pick.
    </p>

    <Transition name="phase">
      <p
        v-if="allSettled && !pickedId && lockedOptions.length"
        class="hint muted small"
      >
        Reels locked — tap a card to claim it.
      </p>
    </Transition>

    <Transition name="phase">
      <div
        v-if="pickedId"
        class="banked"
      >
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
      </div>
    </Transition>
  </section>
</template>

<style scoped>
.slot-machine {
  position: relative;
  display: grid;
  gap: 0.85rem;
  padding: 1.1rem 0.9rem 0.9rem;
  border-color: color-mix(in srgb, var(--gold) 35%, var(--border));
  background:
    radial-gradient(120% 70% at 50% -12%, color-mix(in srgb, var(--gold) 12%, transparent), transparent 62%),
    var(--bg-raised);
}

/* Marquee bulbs along the cabinet's top edge. */
.bulbs {
  position: absolute;
  top: -0.35rem;
  left: 0.75rem;
  right: 0.75rem;
  display: flex;
  justify-content: space-between;
  pointer-events: none;
}
.bulb {
  width: 0.4rem;
  height: 0.4rem;
  border-radius: 50%;
  background: var(--gold);
  box-shadow: 0 0 6px color-mix(in srgb, var(--gold) 70%, transparent);
  animation: bulb-blink 1.5s ease-in-out infinite;
}
@keyframes bulb-blink {
  0%, 100% { opacity: 0.35; }
  50% { opacity: 1; }
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

@media (prefers-reduced-motion: reduce) {
  .bulb { animation: none; opacity: 0.7; }
}
</style>
