<script setup lang="ts">
import { ITEMS_BY_ID } from '~~/shared/data/catalog'
import type { Item } from '~~/shared/data/types'
import type { RewardOption } from '~~/shared/engine/rewards'
import { SPRING_SNAP, riseIn } from '~/utils/motion'

const props = defineProps<{
  options: RewardOption[]
  pickedId: string | null
  pool: Item[]
  ownedIds: string[]
}>()

const emit = defineEmits<{ pick: [optionId: string, choiceItemId?: string] }>()

// Diver's Choice banks the picked item's id, which is not among the rolled
// options — resolve it from the catalog for the banked banner.
const pickedItem = computed(() =>
  props.options.find(option => option.optionId === props.pickedId)?.item
  ?? (props.pickedId ? ITEMS_BY_ID.get(props.pickedId) ?? null : null),
)
</script>

<template>
  <section class="panel">
    <AnimatePresence>
      <div
        v-if="!pickedId"
        key="draft"
      >
        <h2>Rewards — choose one</h2>
        <p class="muted small">
          Every reward is yours alone — stratagems included.
        </p>
        <div class="grid">
          <Motion
            v-for="(option, index) in options"
            :key="option.optionId"
            as="div"
            class="draft-slot"
            :initial="{ opacity: 0, y: 18, scale: 0.9 }"
            :animate="{ opacity: 1, y: 0, scale: 1 }"
            :exit="{ opacity: 0, y: -12, scale: 0.92 }"
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
      </div>
      <Motion
        v-else
        key="banked"
        as="div"
        class="banked"
        v-bind="riseIn(0)"
      >
        <span class="muted small">Reward banked</span>
        <strong>{{ pickedItem?.displayName }}</strong>
        <span class="muted small">— see the squad inventory below.</span>
      </Motion>
    </AnimatePresence>
  </section>
</template>

<style scoped>
.banked {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding: 0.25rem 0;
}
</style>
