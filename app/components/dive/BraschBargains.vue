<script setup lang="ts">
import { itemImageUrl } from '~~/shared/data/images'
import type { Item } from '~~/shared/data/types'
import { catchUpOpsBehind } from '~~/shared/engine/progression'
import { itemPrice } from '~~/shared/engine/rewards'
import type { BargainSlot } from '~~/shared/engine/rewards'
import { bargainPurchaseOf, bargainShelfFor, bargainsClosedReason, canBuyItem } from '~~/shared/engine/selectors'
import type { BargainSlotKind, DiverState, DiveState, RewardTier } from '~~/shared/engine/types'

const props = defineProps<{
  state: DiveState
  self: DiverState | null
}>()

const emit = defineEmits<{ buy: [itemId: string] }>()

const credits = computed(() => props.self?.credits ?? 0)
const opNumber = computed(() =>
  catchUpOpsBehind(props.state.difficulty, props.state.settings?.variant ?? 'medium') + 1)
const closed = computed(() => bargainsClosedReason(props.state))
const purchase = computed(() => (props.self ? bargainPurchaseOf(props.self) : null))
const shelf = computed(() => (props.self ? bargainShelfFor(props.state, props.self) : []))
const heldBack = computed(() => [...new Set(props.self?.bargain?.boughtKinds ?? [])].map(slotLabel))

function slotLabel(kind: BargainSlotKind): string {
  return kind === 'stratagem' ? 'Stratagem' : categoryLabel(kind)
}

function tierOf(item: Item): RewardTier {
  return item.tier.toUpperCase() as RewardTier
}

// The engine's verdict (canBuyItem): the panel never invents a reason.
function verdict(slot: BargainSlot): { allowed: boolean, reason: string | null } {
  if (!props.self || !slot.item) {
    return { allowed: false, reason: null }
  }
  return canBuyItem(props.state, props.self, slot.item.id)
}
</script>

<template>
  <section
    class="bb"
    aria-label="Brasch's Bargains"
  >
    <header class="bb-head">
      <div class="bb-title">
        <span class="lbl">Operation {{ opNumber }} · Mission {{ state.missionInOperation }} stock</span>
        <span class="muted small">Brasch restocks every mission.</span>
      </div>
      <div class="bb-purse">
        <span class="lbl">Credits</span>
        <CreditAmount
          class="disp bb-purse-val"
          :value="credits"
        />
      </div>
    </header>

    <p
      v-if="closed"
      class="bb-closed"
      role="status"
    >
      <IconLock class="bb-lock" />
      {{ closed }}
    </p>

    <p
      v-if="heldBack.length > 0"
      class="bb-held"
    >
      <span class="lbl">Back next operation</span>
      <span
        v-for="label in heldBack"
        :key="label"
        class="chip"
      >{{ label }}</span>
    </p>

    <div
      v-if="purchase"
      class="bb-bought cut-sm"
      :data-edge="purchase.tier"
    >
      <div class="bb-stage grid-bg">
        <img
          v-if="itemImageUrl(purchase)"
          class="bb-art"
          :src="itemImageUrl(purchase)"
          alt=""
          draggable="false"
        >
      </div>
      <div class="bb-info">
        <span class="lbl bb-stamp">Requisitioned</span>
        <span class="bb-item">{{ purchase.displayName }}</span>
        <span class="muted small">Brasch restocks next mission.</span>
      </div>
      <TierBadge :tier="tierOf(purchase)" />
    </div>

    <p
      v-else-if="self?.bargain && shelf.length === 0"
      class="muted bb-empty"
    >
      You've bought from every category this operation.
    </p>

    <ul
      v-else
      class="bb-grid"
    >
      <li
        v-for="slot in shelf"
        :key="slot.slotId"
        class="bb-card cut-sm"
        :class="{ empty: !slot.item }"
        :data-edge="slot.item?.tier"
      >
        <header class="bb-card-head">
          <span class="lbl">{{ slotLabel(slot.kind) }}</span>
          <TierBadge
            v-if="slot.item"
            :tier="tierOf(slot.item)"
            size="sm"
          />
        </header>

        <template v-if="slot.item">
          <div class="bb-stage grid-bg">
            <img
              v-if="itemImageUrl(slot.item)"
              class="bb-art"
              :src="itemImageUrl(slot.item)"
              alt=""
              loading="lazy"
              draggable="false"
            >
          </div>
          <span class="bb-item">{{ slot.item.displayName }}</span>
          <button
            class="btn primary cut bb-buy"
            type="button"
            :disabled="!verdict(slot).allowed"
            :aria-label="`Buy ${slot.item.displayName} for ${itemPrice(slot.item)} credits`"
            @click="emit('buy', slot.item.id)"
          >
            <span class="disp">Buy</span>
            <CreditAmount
              class="bb-cost"
              :value="itemPrice(slot.item)"
            />
          </button>
          <span
            v-if="!closed && verdict(slot).reason"
            class="muted small bb-reason"
          >{{ verdict(slot).reason }}</span>
        </template>
        <p
          v-else
          class="muted small bb-sold"
        >
          Nothing left in your warbonds.
        </p>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.bb {
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.bb-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
}
.bb-title { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.bb-purse {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  padding: 6px 12px;
  border: 1px solid var(--gold);
  color: var(--gold);
}
.bb-purse .lbl { color: var(--gold); }
.bb-purse-val { font-size: 1.4rem; line-height: 1; }

.bb-closed {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 8px 12px;
  border: 1px dashed var(--line-3);
  color: var(--khaki);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.bb-lock { width: 16px; height: 16px; }
.bb-held { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 0; }
.bb-empty { margin: 0; padding: 16px 12px; border: 1px dashed var(--line-3); }

.bb-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
@container (min-width: 560px) {
  .bb-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
.bb-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  padding: 10px;
  border: 1px solid var(--line-3);
  border-top: 2px solid var(--tier-edge, var(--line-3));
  background: var(--rail);
}
.bb-card[data-edge='c'],
.bb-bought[data-edge='c'] { --tier-edge: var(--tier-c); }
.bb-card[data-edge='b'],
.bb-bought[data-edge='b'] { --tier-edge: var(--tier-b); }
.bb-card[data-edge='a'],
.bb-bought[data-edge='a'] { --tier-edge: var(--tier-a); }
.bb-card[data-edge='s'],
.bb-bought[data-edge='s'] { --tier-edge: var(--tier-s); }
.bb-card.empty { border-style: dashed; background: transparent; }
.bb-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.bb-stage {
  display: grid;
  place-items: center;
  min-height: 76px;
  border: 1px solid var(--line-2);
}
.bb-art { width: 60px; height: 60px; object-fit: contain; }
.bb-item {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bb-buy {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 44px;
  margin-top: auto;
  padding: 0 12px;
}
.bb-buy:disabled { opacity: 0.45; cursor: not-allowed; }
.bb-cost { font-size: 13px; font-weight: 700; letter-spacing: 0.04em; }
.bb-sold { margin: 0; }

.bb-bought {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--line-3);
  border-left: 3px solid var(--tier-edge);
  background: var(--rail);
}
.bb-bought .bb-stage { min-height: 88px; }
.bb-info { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.bb-stamp { color: var(--gold); }
</style>
