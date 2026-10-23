<script setup lang="ts">
import { useIntervalFn } from '@vueuse/core'
import { RadioGroupItem, RadioGroupRoot } from 'reka-ui'
import { FRONTS } from '~~/shared/data/fronts'
import type { FrontId } from '~~/shared/data/fronts'
import { factionImageUrl } from '~~/shared/data/images'
import { MAJOR_ORDER_REROLL_BONUS } from '~~/shared/engine/config'
import { frontPlanRisk } from '~~/shared/engine/selectors'
import type { FrontPlan, MajorOrderSelection } from '~~/shared/engine/types'
import type { MajorOrderStatus } from '~/composables/useMajorOrder'

// The run's front plan, locked at launch. The live Major Order leads as the
// featured card — playing the war is the default — with locking one faction
// or rolling every operation as the quieter alternatives. State lives with the
// launcher (useFrontPlan); this only renders it.
const props = withDefaults(defineProps<{
  plan: FrontPlan
  lockedFront: FrontId
  order: MajorOrderSelection | null
  status: MajorOrderStatus
  pending?: boolean
  disabled?: boolean
}>(), { pending: false, disabled: false })

const emit = defineEmits<{
  'update:plan': [plan: FrontPlan]
  'update:lockedFront': [front: FrontId]
  'refresh': []
}>()

const now = ref(Date.now())
useIntervalFn(() => {
  now.value = Date.now()
}, 30_000)

// Skulls, never Valor numbers: each plan's fixed per-mission risk, read from
// the engine so the cards and the setup's skull total can't disagree.
const orderRisk = frontPlanRisk('majorOrder')
const rollRisk = frontPlanRisk('rolled')

const orderFronts = computed(() =>
  FRONTS.filter(front => props.order?.fronts.includes(front.id)))
const countdown = computed(() => orderCountdown(props.order?.expiresAt, now.value))

const orderMissing = computed(() => {
  if (props.pending) {
    return 'Checking the live war…'
  }
  return props.status === 'none'
    ? 'No active Major Order right now.'
    : props.status === 'no-front'
      ? 'The active order has no open front yet.'
      : 'Couldn’t reach the war feed.'
})

function pick(value: unknown): void {
  emit('update:plan', value as FrontPlan)
}
</script>

<template>
  <div class="fp">
    <RadioGroupRoot
      :model-value="plan"
      class="fp-group"
      aria-label="Front plan"
      :disabled="disabled"
      @update:model-value="pick"
    >
      <RadioGroupItem
        value="majorOrder"
        class="fp-mo cut"
        :class="{ on: plan === 'majorOrder', live: order }"
        :disabled="disabled || !order"
      >
        <span class="fp-top">
          <span class="fp-radio" />
          <span class="fp-title">Major Order</span>
          <span
            v-if="order"
            class="fp-rec"
          >Recommended</span>
        </span>
        <span
          v-if="order"
          class="fp-fronts"
          :style="{ '--fp-count': orderFronts.length }"
        >
          <span
            v-for="front in orderFronts"
            :key="front.id"
            class="fp-chip"
            :style="{ '--fp-accent': front.accent }"
          >
            <img
              :src="factionImageUrl(front.id)"
              alt=""
              draggable="false"
            >
            {{ front.displayName }}
          </span>
        </span>
        <span
          v-else
          class="fp-missing"
        >{{ orderMissing }}</span>
        <span class="fp-perks">
          <span class="fp-risk">
            <RiskPips
              :value="orderRisk"
              :max="orderRisk"
              tone="gold"
            />
            Every mission
          </span>
          <span>+{{ MAJOR_ORDER_REROLL_BONUS }} reroll / op</span>
          <span
            v-if="countdown"
            class="fp-ends"
          >Ends {{ countdown === 'ending' ? 'soon' : `in ${countdown}` }}</span>
        </span>
      </RadioGroupItem>

      <div class="fp-alts">
        <RadioGroupItem
          value="locked"
          class="fp-alt cut-sm"
          :class="{ on: plan === 'locked' }"
          :disabled="disabled"
        >
          <span class="fp-radio" />
          <span class="fp-alt-body">
            <span class="fp-title">Lock a faction</span>
            <span class="fp-alt-note">Same enemy all run · no risk</span>
          </span>
        </RadioGroupItem>
        <RadioGroupItem
          value="rolled"
          class="fp-alt cut-sm"
          :class="{ on: plan === 'rolled' }"
          :disabled="disabled"
        >
          <span class="fp-radio" />
          <span class="fp-alt-body">
            <span class="fp-title">Roll each op</span>
            <span class="fp-alt-note fp-risk">
              <RiskPips
                :value="rollRisk"
                :max="rollRisk"
                tone="gold"
              />
              Random enemy every op
            </span>
          </span>
        </RadioGroupItem>
      </div>
    </RadioGroupRoot>

    <div
      v-if="plan === 'locked'"
      class="fp-lock"
      role="group"
      aria-label="Locked faction"
    >
      <button
        v-for="front in FRONTS"
        :key="front.id"
        type="button"
        class="fp-faction cut-sm"
        :class="{ on: lockedFront === front.id }"
        :style="{ '--fp-accent': front.accent }"
        :aria-pressed="lockedFront === front.id"
        :aria-label="front.displayName"
        :disabled="disabled"
        @click="emit('update:lockedFront', front.id)"
      >
        <img
          :src="factionImageUrl(front.id)"
          alt=""
          draggable="false"
        >
        <span aria-hidden="true">{{ front.displayName }}</span>
      </button>
    </div>
    <button
      v-else-if="!order && !pending && status === 'unavailable' && !disabled"
      class="fp-retry"
      type="button"
      @click="emit('refresh')"
    >
      <IconRefresh aria-hidden="true" />
      Retry the war feed
    </button>
  </div>
</template>

<style scoped>
.fp { display: grid; gap: 8px; min-width: 0; container: fp / inline-size; }
.fp-group { display: grid; gap: 8px; min-width: 0; }

.fp-mo,
.fp-alt,
.fp-faction {
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color var(--dur-fast), background-color var(--dur-fast), opacity var(--dur-fast);
}

/* The radio well, shared by every plan card. */
.fp-radio {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border: 1px solid var(--line-5);
}
.on .fp-radio { border-color: var(--gold); }
.on .fp-radio::after { content: ''; width: 9px; height: 9px; background: var(--gold); }

.fp-title {
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text);
}
.on .fp-title { color: var(--gold); }

/* Featured: the live order ------------------------------------------------ */
.fp-mo {
  position: relative;
  display: grid;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--line-3);
  background:
    radial-gradient(420px 160px at 0% 0%, rgba(255, 214, 66, 0.07), transparent 70%),
    var(--panel);
}
.fp-mo:hover:not(:disabled) { border-color: var(--line-5); }
.fp-mo.on {
  border-color: var(--gold);
  background:
    radial-gradient(420px 180px at 0% 0%, rgba(255, 214, 66, 0.14), transparent 70%),
    var(--raised);
  box-shadow: inset 3px 0 0 var(--gold);
}
.fp-mo:disabled { cursor: not-allowed; }
.fp-top { display: flex; align-items: center; gap: 10px; min-width: 0; }
.fp-mo .fp-title { font-size: 0.95rem; }
.fp-rec {
  margin-left: auto;
  padding: 2px 7px;
  border: 1px solid var(--teal);
  color: var(--teal);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  white-space: nowrap;
}

.fp-fronts { display: flex; flex-wrap: wrap; gap: 6px; min-width: 0; }
.fp-chip {
  --fp-accent: var(--gold);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 3px 10px 3px 4px;
  border: 1px solid color-mix(in srgb, var(--fp-accent) 45%, var(--line-3));
  background: color-mix(in srgb, var(--fp-accent) 10%, var(--ground));
  color: var(--text);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}
.fp-chip img { width: 24px; height: 24px; object-fit: contain; }
.fp-missing { font-size: 0.8rem; color: var(--muted); }

.fp-perks {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--khaki);
}
.fp-mo.on .fp-perks { color: var(--gold); }
.fp-risk { display: inline-flex; align-items: center; gap: 6px; }
.fp-risk :deep(.pips) { flex-shrink: 0; }
.fp-mo .fp-perks .fp-ends { color: var(--muted); }
.fp-mo:disabled .fp-perks { color: var(--dim); }

/* Alternatives ------------------------------------------------------------ */
.fp-alts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.fp-alt {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 56px;
  padding: 10px 12px;
  border: 1px solid var(--line-2);
  background: var(--panel);
}
.fp-alt:hover:not(:disabled) { border-color: var(--line-4); }
.fp-alt.on { border-color: var(--gold); background: var(--raised); }
.fp-alt-body { display: grid; gap: 3px; min-width: 0; }
.fp-alt-note { font-size: 11px; line-height: 1.25; color: var(--muted); }
.fp-alt.on .fp-alt-note { color: var(--khaki); }
.fp-alt:disabled { opacity: 0.55; cursor: not-allowed; }
.fp-mo:disabled .fp-title { color: var(--muted); }

/* Locked faction ------------------------------------------------------------ */
.fp-lock { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.fp-faction {
  --fp-accent: var(--gold);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  padding: 6px 8px;
  border: 1px solid color-mix(in srgb, var(--fp-accent) 35%, var(--line-3));
  background: var(--ground);
  color: var(--khaki);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.fp-faction img { width: 26px; height: 26px; object-fit: contain; flex-shrink: 0; }
.fp-faction:hover:not(:disabled) { border-color: var(--fp-accent); }
.fp-faction.on {
  color: var(--fp-accent);
  border-color: var(--fp-accent);
  background: color-mix(in srgb, var(--fp-accent) 14%, var(--ground));
}
.fp-faction:disabled { opacity: 0.6; cursor: not-allowed; }

.fp-retry {
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 12px;
  border: 1px solid var(--line-4);
  background: none;
  color: var(--khaki);
  font: inherit;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
}
.fp-retry:hover { border-color: var(--gold); color: var(--gold); }
.fp-retry svg { width: 15px; height: 15px; }

/* Wide: the order is one big button, the alternatives stack beside it. */
@container fp (min-width: 640px) {
  .fp-group { grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr); }
  .fp-mo { align-content: space-between; }
  .fp-alts { grid-template-columns: 1fr; grid-auto-rows: 1fr; }
}
@container fp (max-width: 520px) {
  .fp-fronts { display: grid; grid-template-columns: repeat(var(--fp-count), minmax(0, 1fr)); }
  .fp-chip {
    flex-direction: column;
    justify-content: center;
    gap: 4px;
    min-width: 0;
    padding: 8px 4px 6px;
    font-size: 0.68rem;
    text-align: center;
  }
  .fp-chip img { width: 30px; height: 30px; }
}
@container fp (max-width: 420px) {
  .fp-alts { grid-template-columns: 1fr; }
  .fp-alt { min-height: 52px; }
  .fp-faction { flex-direction: column; gap: 4px; font-size: 0.65rem; }
}
</style>
