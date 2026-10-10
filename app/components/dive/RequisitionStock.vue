<script setup lang="ts">
import { itemPrice } from '~~/shared/engine/rewards'
import type { RewardOption } from '~~/shared/engine/rewards'
import type { RewardTier } from '~~/shared/engine/types'
import { itemImageUrl } from '~~/shared/data/images'

const props = withDefaults(defineProps<{
  stock: RewardOption[]
  sampleBank?: number
  // The engine's per-item verdict (canBuyItem): the UI never invents a reason.
  buyable?: Record<string, { allowed: boolean, reason: string | null }>
}>(), { sampleBank: 0, buyable: () => ({}) })

const emit = defineEmits<{ buy: [itemId: string] }>()

function priceOf(option: RewardOption): number {
  return itemPrice(option.item)
}

function tierOf(option: RewardOption): RewardTier {
  return option.item.tier.toUpperCase() as RewardTier
}

function verdict(option: RewardOption): { allowed: boolean, reason: string | null } {
  return props.buyable[option.item.id] ?? { allowed: false, reason: 'Unavailable' }
}
</script>

<template>
  <section
    class="req"
    aria-label="Brasch's bargains"
  >
    <header class="req-head">
      <div class="req-title">
        <span class="lbl">Rotating stock · spend samples</span>
        <h1 class="disp req-name-title">
          Brasch's Bargains
        </h1>
      </div>
      <div
        class="req-purse"
        role="img"
        :aria-label="`${sampleBank} sample points banked`"
      >
        <span class="lbl">Bank</span>
        <span class="disp req-purse-val">{{ sampleBank }}</span>
        <span class="muted small">pts</span>
      </div>
    </header>

    <ul class="req-grid">
      <li
        v-for="option in stock"
        :key="option.optionId"
        class="req-card cut-sm"
        :data-tier="option.item.tier"
      >
        <header class="req-card-head">
          <TierBadge
            :tier="tierOf(option)"
            size="sm"
          />
          <span class="lbl req-price">{{ priceOf(option) }} pts</span>
        </header>

        <div class="req-stage grid-bg">
          <img
            v-if="itemImageUrl(option.item)"
            class="req-art"
            :src="itemImageUrl(option.item)"
            alt=""
            loading="lazy"
            draggable="false"
          >
        </div>

        <div class="req-info">
          <span class="req-name">{{ option.item.displayName }}</span>
          <span class="muted small">{{ option.item.category }}</span>
        </div>

        <button
          class="btn primary cut req-buy"
          type="button"
          :disabled="!verdict(option).allowed"
          :aria-label="`Buy ${option.item.displayName} for ${priceOf(option)} samples`"
          @click="emit('buy', option.item.id)"
        >
          <span class="disp">Buy</span>
          <span class="req-cost">{{ priceOf(option) }} pts</span>
        </button>
        <span
          v-if="!verdict(option).allowed && verdict(option).reason"
          class="muted small req-reason"
        >{{ verdict(option).reason }}</span>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.req {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--line-3);
  background: color-mix(in srgb, var(--panel) 80%, transparent);
}
.req-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
}
.req-title { display: flex; flex-direction: column; gap: 4px; }
.req-name-title { margin: 0; font-size: var(--fs-h1); color: var(--text); }
.req-purse {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--teal);
  color: var(--teal);
}
.req-purse-val { font-size: 1.4rem; }

.req-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.req-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--line-3);
  background: var(--rail);
}
.req-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.req-price { color: var(--gold); white-space: nowrap; }
.req-stage {
  display: grid;
  place-items: center;
  min-height: 84px;
  border: 1px solid var(--line-2);
}
.req-art {
  width: 64px;
  height: 64px;
  object-fit: contain;
}
.req-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.req-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.req-buy {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  height: 40px;
  padding: 0 12px;
}
.req-buy:disabled { opacity: 0.45; cursor: not-allowed; }
.req-cost { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; }
.req-reason { min-height: 1rem; }

@media (max-width: 1020px) {
  .req-grid { grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); }
}
</style>
