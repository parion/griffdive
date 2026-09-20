<script setup lang="ts">
import { ITEMS_BY_ID } from '~~/shared/data/catalog'
import type { Item } from '~~/shared/data/types'
import type { RewardOption } from '~~/shared/engine/rewards'
import { SPRING_SNAP, SPRING_SOFT } from '~/utils/motion'

const props = defineProps<{
  options: RewardOption[]
  pickedId: string | null
  pool: Item[]
  ownedIds: string[]
  // How many reward slots failed pacts forfeited — explains a thinner draft.
  optionsLost?: number
}>()

const emit = defineEmits<{ pick: [optionId: string, choiceItemId?: string] }>()

// Liberty's Cross banks the picked item's id, which is not among the rolled
// options — resolve it from the catalog for the banked banner.
const pickedItem = computed(() =>
  props.options.find(option => option.optionId === props.pickedId)?.item
  ?? (props.pickedId ? ITEMS_BY_ID.get(props.pickedId) ?? null : null),
)
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
.banked {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding: 0.25rem 0;
}
</style>
