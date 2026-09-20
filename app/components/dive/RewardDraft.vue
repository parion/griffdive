<script setup lang="ts">
import { ITEMS_BY_ID } from '~~/shared/data/catalog'
import { itemImageUrl } from '~~/shared/data/images'
import type { Item } from '~~/shared/data/types'
import type { RewardOption } from '~~/shared/engine/rewards'
import { SPRING_SNAP, SPRING_SOFT } from '~/utils/motion'

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
  // Bonus-honors reward tokens: spend one to reroll this offer or ban an
  // offered item. `bannableIds` is the parent's engine-gated allow-list.
  tokenCount?: number
  canReroll?: boolean
  bannableIds?: string[]
}>(), {
  squadPicks: () => [],
  tokenCount: 0,
  canReroll: false,
  bannableIds: () => [],
})

const emit = defineEmits<{
  pick: [optionId: string, choiceItemId?: string]
  reroll: []
  ban: [optionId: string]
}>()

// Liberty's Cross banks the picked item's id, which is not among the rolled
// options — resolve it from the catalog for the banked banner.
const pickedItem = computed(() =>
  props.options.find(option => option.optionId === props.pickedId)?.item
  ?? (props.pickedId ? ITEMS_BY_ID.get(props.pickedId) ?? null : null),
)

function squadPickLabel(pick: SquadPick): string {
  if (pick.skipped) {
    return `${pick.name} skips this draft`
  }
  return pick.item ? `${pick.name} picked ${pick.item.displayName}` : `${pick.name} is choosing`
}
</script>

<template>
  <section class="panel">
    <AnimatePresence mode="wait">
      <Motion
        v-if="!pickedId"
        key="draft"
        as="div"
        :initial="{ opacity: 0 }"
        :animate="{ opacity: 1 }"
        :exit="{ opacity: 0, scale: 0.94 }"
        :transition="SPRING_SOFT"
      >
        <h2 class="draft-title">
          <WaitingLight label="Waiting on your reward pick" />
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
        <div
          v-if="squadPicks.length"
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
          v-if="tokenCount > 0"
          class="token-bar"
        >
          <span class="muted small">Reward tokens: {{ tokenCount }}</span>
          <button
            class="btn tiny ghost"
            type="button"
            :disabled="!canReroll"
            @click="emit('reroll')"
          >
            Reroll offer
          </button>
        </div>
        <div class="grid">
          <Motion
            v-for="(option, index) in options"
            :key="option.optionId"
            as="div"
            class="draft-slot"
            :initial="{ opacity: 0, y: 18, scale: 0.9 }"
            :animate="{ opacity: 1, y: 0, scale: 1 }"
            :transition="{ ...SPRING_SNAP, delay: index * 0.07 }"
          >
            <DiversChoiceCard
              v-if="option.choice"
              :pool="pool"
              :owned-ids="ownedIds"
              @choose="choiceItemId => emit('pick', option.optionId, choiceItemId)"
            />
            <ItemCard
              v-else
              :item="option.item"
              @select="emit('pick', option.optionId)"
            />
            <button
              v-if="bannableIds.includes(option.optionId)"
              class="ban-btn"
              type="button"
              @click="emit('ban', option.optionId)"
            >
              Ban from future offers
            </button>
          </Motion>
        </div>
      </Motion>
      <Motion
        v-else
        key="banked"
        as="div"
        class="banked"
        :initial="{ opacity: 0, scale: 0.94 }"
        :animate="{ opacity: 1, scale: 1 }"
        :transition="SPRING_SOFT"
      >
        <span class="muted small">Reward banked</span>
        <strong>{{ pickedItem?.displayName }}</strong>
        <span class="muted small">— see the squad inventory below.</span>
      </Motion>
    </AnimatePresence>
  </section>
</template>

<style scoped>
.draft-title { display: flex; align-items: center; gap: 0.45rem; }
.options-lost {
  margin: 0.25rem 0 0;
  color: var(--red);
}
.token-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.5rem 0 0.25rem;
}
.draft-slot { display: grid; gap: 0.3rem; }
.ban-btn {
  padding: 0.15rem 0.4rem;
  border: 1px dashed color-mix(in srgb, var(--red) 45%, var(--border));
  border-radius: 4px;
  background: none;
  color: var(--red);
  font: inherit;
  font-size: 0.65rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
}
.ban-btn:hover,
.ban-btn:focus-visible {
  border-color: var(--red);
  background: color-mix(in srgb, var(--red) 12%, transparent);
}
.squad-picks {
  display: flex;
  align-items: center;
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
  align-items: baseline;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding: 0.25rem 0;
}
</style>
