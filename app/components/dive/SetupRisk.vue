<script setup lang="ts">
import { setupRiskOf } from '~~/shared/engine/selectors'
import type { CrusadeSettings, RewardTier } from '~~/shared/engine/types'

// The setup's total skulls and what they buy: the same team risk the run
// charges every mission, read as "more skulls, better loot" — the trade the
// whole game runs on — instead of a Valor number or an odds table.
const props = withDefaults(defineProps<{
  settings: CrusadeSettings
  compact?: boolean
}>(), { compact: false })

const LADDER: readonly RewardTier[] = ['C', 'B', 'A', 'S']
const MAX_SETUP_SKULLS = 5

const risk = computed(() => setupRiskOf(props.settings))
</script>

<template>
  <div
    class="sr"
    :class="{ compact }"
  >
    <span class="sr-total">
      <span class="lbl">Risk / mission</span>
      <RiskPips
        :value="risk"
        :max="MAX_SETUP_SKULLS"
        tone="gold"
      />
    </span>
    <p class="sr-rule">
      <span>More skulls, higher-tier rewards</span>
      <span
        class="sr-ladder"
        aria-hidden="true"
      >
        <span
          v-for="tier in LADDER"
          :key="tier"
          class="tier-badge sm"
          :data-tier="tier"
        >{{ tier }}</span>
      </span>
    </p>
  </div>
</template>

<style scoped>
.sr {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 24px;
  padding: 12px 14px;
  border: 1px solid var(--line-2);
  background: var(--panel);
}
.sr.compact { padding: 0; border: 0; background: none; }
.sr-total { display: inline-flex; align-items: center; gap: 10px; }
.sr-total :deep(.pips i) { width: 20px; height: 20px; }
.sr-rule {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  min-width: 0;
  margin: 0;
  font-size: clamp(9.5px, 2.8vw, 11px);
  font-weight: 700;
  letter-spacing: clamp(0.04em, 0.6vw, 0.1em);
  white-space: nowrap;
  text-transform: uppercase;
  color: var(--khaki);
}
.sr-ladder { display: inline-flex; align-items: center; gap: 3px; }
.sr-ladder .tier-badge { min-width: 1.35rem; font-size: 0.66rem; letter-spacing: 0; }
/* The ladder brightens as it climbs, so the eye reads it as an upgrade. */
.sr-ladder .tier-badge:nth-child(1) { opacity: 0.4; }
.sr-ladder .tier-badge:nth-child(2) { opacity: 0.6; }
.sr-ladder .tier-badge:nth-child(3) { opacity: 0.8; }
</style>
