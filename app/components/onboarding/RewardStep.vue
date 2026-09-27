<script setup lang="ts">
import { ALL_ITEMS } from '~~/shared/data/catalog'
import type { Item, Tier } from '~~/shared/data/types'
import type { RewardTier } from '~~/shared/engine/types'
import { SPRING_SNAP } from '~/utils/motion'

function sample(tier: Tier): Item {
  const pool = ALL_ITEMS.filter(item =>
    item.tier === tier && item.category !== 'armor' && item.category !== 'armorPassive')
  return pool[0] ?? ALL_ITEMS[0]!
}

const CARDS: readonly { tier: Tier, label: RewardTier }[] = [
  { tier: 'c', label: 'C' },
  { tier: 'b', label: 'B' },
  { tier: 'a', label: 'A' },
]
const LADDER: readonly RewardTier[] = ['C', 'B', 'A', 'S']

const samples = CARDS.map(entry => ({ ...entry, item: sample(entry.tier) }))
const shown = ref(0)

onMounted(() => {
  const reduced = import.meta.client
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    shown.value = samples.length
    return
  }
  samples.forEach((_, index) => {
    setTimeout(() => {
      shown.value = index + 1
    }, 400 + index * 380)
  })
})
</script>

<template>
  <div class="reward-demo">
    <div class="reward-cards">
      <Motion
        v-for="(entry, index) in samples"
        :key="entry.tier"
        as="div"
        class="reward-card"
        :initial="{ opacity: 0, y: 22, scale: 0.9 }"
        :animate="{ opacity: 1, y: 0, scale: 1 }"
        :transition="{ ...SPRING_SNAP, delay: index * 0.18 }"
      >
        <TierBadge :tier="entry.label" />
        <ItemCard
          :item="entry.item"
          disabled
          compact
        />
      </Motion>
    </div>
    <div
      class="reward-ladder"
      role="img"
      aria-label="Reward ceiling climbs with Valor"
    >
      <template
        v-for="(tier, index) in LADDER"
        :key="tier"
      >
        <span
          v-if="index > 0"
          class="ladder-link"
          :class="{ lit: index < shown }"
          aria-hidden="true"
        />
        <TierBadge
          :tier="tier"
          size="sm"
          class="ladder-rung"
          :class="{ lit: index < shown }"
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
.reward-demo { display: grid; gap: 0.9rem; justify-items: center; }

.reward-cards {
  display: grid;
  gap: 0.6rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  width: 100%;
  max-width: 34rem;
}
.reward-card { display: grid; gap: 0.35rem; justify-items: center; }
.reward-card :deep(.item-card) { width: 100%; }

.reward-ladder { display: inline-flex; align-items: center; gap: 0.3rem; }
.ladder-rung {
  opacity: 0.3;
  filter: grayscale(1);
  transition: opacity var(--dur-med) var(--ease-out), filter var(--dur-med) var(--ease-out);
}
.ladder-rung.lit { opacity: 1; filter: none; }
.ladder-link {
  width: 0.6rem;
  height: 2px;
  background: var(--border);
  transition: background var(--dur-med) var(--ease-out);
}
.ladder-link.lit { background: color-mix(in srgb, var(--gold) 70%, var(--border)); }

@media (max-width: 520px) {
  .reward-cards { grid-template-columns: 1fr; max-width: 20rem; }
}
</style>
