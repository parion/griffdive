<script setup lang="ts">
import { RadioGroupItem, RadioGroupRoot } from 'reka-ui'
import { FRONTS } from '~~/shared/data/fronts'
import type { FrontId } from '~~/shared/data/fronts'
import { factionImageUrl } from '~~/shared/data/images'
import { FRONT_ROLL_RISK, MAJOR_ORDER_REROLL_BONUS, MAJOR_ORDER_RISK } from '~~/shared/engine/config'
import type { FrontPlan } from '~~/shared/engine/types'

// The run's front plan, locked at launch: follow the live Major Order, lock one
// faction, or roll a fresh front every operation. The live order is fetched
// here (shared with the parent through useMajorOrder's key) and the parent
// hands it to START_DIVE.
const props = withDefaults(defineProps<{
  plan: FrontPlan
  lockedFront: FrontId
  disabled?: boolean
}>(), { disabled: false })

const emit = defineEmits<{
  'update:plan': [plan: FrontPlan]
  'update:lockedFront': [front: FrontId]
}>()

const { order, status, pending, refresh } = useMajorOrder()

// The order can vanish under a selected plan (a refresh that fails, an order
// that ends): fall back to rolling so the launch never claims an order it lacks.
watch(order, (next) => {
  if (!next && props.plan === 'majorOrder') {
    emit('update:plan', 'rolled')
  }
})

const orderFronts = computed(() =>
  (order.value?.fronts ?? []).map(id => FRONTS.find(front => front.id === id)).filter(front => front !== undefined))

const orderLine = computed(() => {
  if (orderFronts.value.length) {
    return orderFronts.value.map(front => front.displayName).join(' / ')
  }
  if (pending.value) {
    return 'Checking the live war…'
  }
  return status.value === 'none'
    ? 'No active Major Order'
    : status.value === 'no-front'
      ? 'The active order targets no front'
      : 'Failed to retrieve active MO'
})

function pick(value: unknown): void {
  emit('update:plan', value as FrontPlan)
}
</script>

<template>
  <div class="fp">
    <RadioGroupRoot
      :model-value="plan"
      class="fp-grid"
      aria-label="Front plan"
      :disabled="disabled"
      @update:model-value="pick"
    >
      <RadioGroupItem
        value="majorOrder"
        class="fp-card cut-sm"
        :class="{ on: plan === 'majorOrder' }"
        :disabled="disabled || !order"
      >
        <span class="fp-head">
          <span class="fp-name">Major Order</span>
          <span
            v-if="orderFronts.length"
            class="fp-emblems"
            aria-hidden="true"
          >
            <img
              v-for="front in orderFronts"
              :key="front.id"
              :src="factionImageUrl(front.id)"
              alt=""
              draggable="false"
            >
          </span>
        </span>
        <span class="fp-blurb">{{ orderLine }}</span>
        <span class="fp-valor">+{{ MAJOR_ORDER_RISK }} Valor / mission · +{{ MAJOR_ORDER_REROLL_BONUS }} reroll / op</span>
      </RadioGroupItem>

      <RadioGroupItem
        value="locked"
        class="fp-card cut-sm"
        :class="{ on: plan === 'locked' }"
        :disabled="disabled"
      >
        <span class="fp-head">
          <span class="fp-name">Lock a faction</span>
        </span>
        <span class="fp-blurb">Same front every operation. No strain.</span>
        <span class="fp-valor muted">+0 Valor</span>
      </RadioGroupItem>

      <RadioGroupItem
        value="rolled"
        class="fp-card cut-sm"
        :class="{ on: plan === 'rolled' }"
        :disabled="disabled"
      >
        <span class="fp-head">
          <span class="fp-name">Roll each operation</span>
          <IconDice
            class="fp-dice"
            aria-hidden="true"
          />
        </span>
        <span class="fp-blurb">A fresh front and strain every operation.</span>
        <span class="fp-valor">+{{ FRONT_ROLL_RISK }} Valor / mission</span>
      </RadioGroupItem>
    </RadioGroupRoot>

    <div
      v-if="plan === 'locked'"
      class="fp-fronts"
      role="group"
      aria-label="Locked faction"
    >
      <button
        v-for="front in FRONTS"
        :key="front.id"
        type="button"
        class="fp-front cut-sm"
        :class="{ on: lockedFront === front.id }"
        :style="{ '--fp-accent': front.accent }"
        :aria-pressed="lockedFront === front.id"
        :disabled="disabled"
        @click="emit('update:lockedFront', front.id)"
      >
        <img
          :src="factionImageUrl(front.id)"
          alt=""
          draggable="false"
        >
        <span>{{ front.displayName }}</span>
      </button>
    </div>
    <MajorOrderCard
      v-else-if="plan === 'majorOrder' && order"
      :order="order"
    />
    <p
      v-else-if="status === 'unavailable' && !pending && !disabled"
      class="fp-retry small muted"
    >
      <span>The war feed is down — retry to follow the order.</span>
      <button
        class="fp-refresh"
        type="button"
        aria-label="Refresh Major Order"
        title="Refresh Major Order"
        @click="refresh()"
      >
        <IconRefresh />
      </button>
    </p>
  </div>
</template>

<style scoped>
.fp { display: grid; gap: 0.5rem; }
.fp-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr)); gap: 0.5rem; }

.fp-card {
  display: grid;
  align-content: start;
  gap: 0.25rem;
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--line-2);
  background: var(--panel);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color var(--dur-fast), background-color var(--dur-fast);
}
.fp-card:hover:not(:disabled) { border-color: var(--line-4); }
.fp-card.on { border-color: var(--gold); background: rgba(255, 214, 66, 0.05); }
.fp-card:disabled { opacity: 0.5; cursor: not-allowed; }
.fp-head { display: flex; align-items: center; gap: 0.5rem; min-height: 1.5rem; }
.fp-name { font-size: 0.82rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
.fp-card.on .fp-name { color: var(--gold); }
.fp-emblems { display: inline-flex; margin-left: auto; }
.fp-emblems img {
  width: 1.5rem;
  height: 1.5rem;
  object-fit: contain;
  filter: drop-shadow(-2px 0 0 var(--panel));
}
.fp-emblems img + img { margin-left: -0.5rem; }
.fp-dice { width: 1rem; height: 1rem; margin-left: auto; color: var(--khaki); }
.fp-blurb { font-size: 11px; line-height: 1.3; color: var(--khaki); }
.fp-valor { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; color: var(--khaki); text-transform: uppercase; }
.fp-card.on .fp-valor:not(.muted) { color: var(--gold); }

.fp-fronts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.5rem; }
.fp-front {
  --fp-accent: var(--gold);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.75rem;
  padding: 0.3rem 0.6rem;
  border: 1px solid color-mix(in srgb, var(--fp-accent) 35%, var(--line-3));
  background: var(--ground);
  color: var(--khaki);
  font: inherit;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  transition: border-color var(--dur-fast), background-color var(--dur-fast), color var(--dur-fast);
}
.fp-front img { width: 1.75rem; height: 1.75rem; object-fit: contain; flex-shrink: 0; }
.fp-front:hover:not(:disabled) { border-color: var(--fp-accent); }
.fp-front.on {
  color: var(--fp-accent);
  border-color: var(--fp-accent);
  background: color-mix(in srgb, var(--fp-accent) 14%, var(--ground));
}
.fp-front:disabled { opacity: 0.6; cursor: not-allowed; }

.fp-retry { display: flex; align-items: center; gap: 0.5rem; margin: 0; }
.fp-refresh {
  display: inline-grid;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  padding: 0;
  flex-shrink: 0;
  background: none;
  border: 1px solid var(--line-4);
  color: var(--khaki);
  cursor: pointer;
}
.fp-refresh:hover { border-color: var(--gold); color: var(--gold); }
.fp-refresh svg { width: 1rem; height: 1rem; }
</style>
