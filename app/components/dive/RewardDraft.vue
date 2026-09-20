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

// Liberty's Cross banks the picked item's id, which is not among the rolled
// options — resolve it from the catalog for the banked banner.
const pickedItem = computed(() =>
  props.options.find(option => option.optionId === props.pickedId)?.item
  ?? (props.pickedId ? ITEMS_BY_ID.get(props.pickedId) ?? null : null),
)

// Banning is its own flow: once open, the reward cards toggle a purge
// selection instead of picking, and confirming spends the token and the pick.
const banMode = ref(false)
const selectedBanIds = ref<string[]>([])

const displayOptions = computed(() =>
  banMode.value ? props.options.filter(option => !option.choice) : props.options)

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
  <section class="panel">
    <AnimatePresence mode="wait">
      <Motion
        v-if="!resolved"
        key="draft"
        as="div"
        :initial="{ opacity: 0 }"
        :animate="{ opacity: 1 }"
        :exit="{ opacity: 0, scale: 0.94 }"
        :transition="SPRING_SOFT"
      >
        <h2 class="draft-title">
          <WaitingLight label="Waiting on your reward pick" />
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
        <div
          v-if="squadPicks.length && !banMode"
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
          v-if="tokenCount > 0 && !banMode"
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
          <button
            class="btn tiny ghost"
            type="button"
            :disabled="!canBan"
            @click="startBan"
          >
            Ban items
          </button>
        </div>
        <div class="grid">
          <Motion
            v-for="(option, index) in displayOptions"
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
              :selected="banMode && selectedBanIds.includes(option.optionId)"
              :disabled="banMode && !bannableIds.includes(option.optionId)"
              @select="banMode ? toggleBan(option.optionId) : emit('pick', option.optionId)"
            />
          </Motion>
        </div>
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
        <template v-if="banned">
          <span class="muted small">Draft resolved</span>
          <strong>Rewards banned</strong>
          <span class="muted small">— no reward this mission. Your future offers are cleaner.</span>
        </template>
        <template v-else>
          <span class="muted small">Reward banked</span>
          <strong>{{ pickedItem?.displayName }}</strong>
          <span class="muted small">— see the squad inventory below.</span>
        </template>
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
.ban-footer {
  margin-top: 0.6rem;
  padding-top: 0.6rem;
  border-top: 1px dashed color-mix(in srgb, var(--red) 40%, var(--border));
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
