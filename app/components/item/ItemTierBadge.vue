<script setup lang="ts">
import type { RewardTier } from '~~/shared/engine/types'

defineProps<{ tier: RewardTier, size?: 'sm' | 'md' }>()
</script>

<template>
  <span
    class="tier-badge"
    :class="{ sm: size === 'sm' }"
    :data-tier="tier"
  >{{ tier }}</span>
</template>

<style scoped>
.tier-badge { background: var(--ground); }
</style>
