<script setup lang="ts">
import { RadioGroupItem, RadioGroupRoot } from 'reka-ui'
import type { FrontId } from '~~/shared/data/fronts'
import { baseTierFor } from '~~/shared/engine/config'
import { STARTING_KITS, VARIANTS } from '~~/shared/engine/progression'
import { modeValorAt } from '~~/shared/engine/selectors'
import type { CrusadeMode, CrusadeSettings, CrusadeVariant, FrontPlan, MajorOrderSelection } from '~~/shared/engine/types'
import type { MajorOrderStatus } from '~/composables/useMajorOrder'

// The crusade's setup, shared by the Bridge's solo dialog and the room lobby:
// where to fight (the front plan, Major Order first), where to start (the
// difficulty) and, on the hard/suicide starts, how (SEAF or Penance), then the
// kit it issues and the skulls the whole setup carries — risk shows as skulls,
// never a Valor number.
const props = withDefaults(defineProps<{
  variant: CrusadeVariant
  mode?: CrusadeMode
  frontPlan: FrontPlan
  lockedFront: FrontId
  order: MajorOrderSelection | null
  orderStatus: MajorOrderStatus
  orderPending?: boolean
  disabled?: boolean
  // The lobby pins the total in its launch bar instead.
  showRisk?: boolean
}>(), { mode: 'seaf', orderPending: false, disabled: false, showRisk: true })

const emit = defineEmits<{
  'update:variant': [variant: CrusadeVariant]
  'update:mode': [mode: CrusadeMode]
  'update:frontPlan': [plan: FrontPlan]
  'update:lockedFront': [front: FrontId]
  'refreshOrder': []
}>()

const MODES: readonly { id: CrusadeMode, name: string, note: string }[] = [
  { id: 'seaf', name: 'SEAF Support', note: 'Extra gear' },
  { id: 'penance', name: 'Super Penance', note: 'No aid' },
]

const cards = computed(() => VARIANTS.map((entry) => {
  const start = STARTING_KITS[entry.id].startDifficulty
  return {
    id: entry.id,
    name: entry.name,
    start,
    tier: baseTierFor(start),
    hasMode: start >= 5,
  }
}))

const selected = computed(() => cards.value.find(card => card.id === props.variant) ?? cards.value[0]!)

const activeMode = computed(() => (selected.value.hasMode ? props.mode : undefined))
const settings = computed<CrusadeSettings>(() => ({
  variant: props.variant,
  ...(activeMode.value ? { mode: activeMode.value } : {}),
  front: props.frontPlan,
}))
</script>

<template>
  <div class="setup-wrap">
    <div class="setup">
      <section
        class="block"
        aria-labelledby="setup-front-h"
      >
        <h2
          id="setup-front-h"
          class="lbl block-h"
        >
          Where to fight
        </h2>
        <FrontPlanPicker
          :plan="frontPlan"
          :locked-front="lockedFront"
          :order="order"
          :status="orderStatus"
          :pending="orderPending"
          :disabled="disabled"
          @update:plan="emit('update:frontPlan', $event)"
          @update:locked-front="emit('update:lockedFront', $event)"
          @refresh="emit('refreshOrder')"
        />
      </section>

      <section
        class="block"
        aria-labelledby="setup-start-h"
      >
        <h2
          id="setup-start-h"
          class="lbl block-h"
        >
          Starting difficulty
        </h2>
        <RadioGroupRoot
          :model-value="variant"
          class="variants"
          aria-labelledby="setup-start-h"
          :disabled="disabled"
          @update:model-value="emit('update:variant', $event as CrusadeVariant)"
        >
          <RadioGroupItem
            v-for="entry in cards"
            :key="entry.id"
            :value="entry.id"
            class="variant cut-sm"
            :class="{ on: variant === entry.id }"
            :aria-label="`${entry.name}, start at difficulty ${entry.start}, base tier ${entry.tier}`"
          >
            <span class="v-num disp">{{ entry.start }}</span>
            <span class="v-name">{{ entry.name }}</span>
            <span class="v-meta">
              <span class="v-base">Base tier</span>
              <span
                class="tb v-tier"
                :data-tier="entry.tier"
              >{{ entry.tier }}</span>
            </span>
          </RadioGroupItem>
        </RadioGroupRoot>

        <RadioGroupRoot
          v-if="selected.hasMode"
          :model-value="mode"
          class="modes"
          aria-label="Starting mode"
          :disabled="disabled"
          @update:model-value="emit('update:mode', $event as CrusadeMode)"
        >
          <RadioGroupItem
            v-for="m in MODES"
            :key="m.id"
            :value="m.id"
            class="mode cut-sm"
            :class="{ on: mode === m.id, penance: m.id === 'penance' }"
          >
            <span class="m-name">{{ m.name }}</span>
            <span class="m-note">
              <RiskPips
                :value="modeValorAt(m.id, selected.start)"
                :max="modeValorAt(m.id, selected.start)"
                tone="gold"
              />
              {{ m.note }}
            </span>
          </RadioGroupItem>
        </RadioGroupRoot>
      </section>

      <section
        class="block"
        aria-labelledby="setup-kit-h"
      >
        <h2
          id="setup-kit-h"
          class="lbl block-h"
        >
          Starting kit
        </h2>
        <KitStarting
          :variant="variant"
          :mode="activeMode"
          compact
        />
      </section>

      <section
        v-if="showRisk"
        class="block risk"
        aria-label="Setup risk"
      >
        <RiskSetup :settings="settings" />
      </section>
    </div>
  </div>
</template>

<style scoped>
.setup-wrap { min-width: 0; container: setup / inline-size; }
.setup {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 20px;
}
.block { display: grid; align-content: start; gap: 8px; min-width: 0; }
.block-h { margin: 0; }

.variants { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.variant,
.mode {
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  border: 1px solid var(--line-2);
  background: var(--panel);
  transition: border-color var(--dur-fast), background-color var(--dur-fast);
}
.variant:hover:not(:disabled),
.mode:hover:not(:disabled) { border-color: var(--line-4); }
.variant:disabled,
.mode:disabled { cursor: not-allowed; opacity: 0.6; }

.variant {
  display: grid;
  align-content: start;
  gap: 4px;
  min-height: 96px;
  padding: 10px 12px;
}
.variant.on { border-color: var(--gold); background: var(--raised); box-shadow: inset 0 -3px 0 var(--gold); }
.v-num { font-size: 2.1rem; line-height: 1; color: var(--text); }
.variant.on .v-num { color: var(--gold); }
.v-name {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  line-height: 1.2;
  text-transform: uppercase;
  color: var(--khaki);
}
.variant.on .v-name { color: var(--text); }
.v-meta { display: flex; align-items: center; gap: 8px; margin-top: auto; }
.v-base { font-size: 9px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; white-space: nowrap; color: var(--muted); }
.v-tier { font-size: 0.68rem; min-width: 1.3rem; padding: 0.05rem 0.25rem; }

.modes { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.mode {
  display: grid;
  gap: 3px;
  min-height: 52px;
  padding: 8px 12px;
}
.mode.on { border-color: var(--gold); background: var(--raised); }
.mode.penance.on { border-color: var(--orange); }
.m-name { font-size: 0.78rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.mode.on .m-name { color: var(--gold); }
.mode.penance.on .m-name { color: var(--orange); }
.m-note { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; line-height: 1.25; color: var(--muted); }
.mode.on .m-note { color: var(--khaki); }

/* Wide: the front plan and the starting difficulty share a top row; the kit
   spans the full width beneath so its sections can pack across instead of
   leaving the left column empty. */
@container setup (min-width: 960px) {
  .setup {
    grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
    column-gap: 24px;
    align-items: stretch;
  }
  .block:first-child { grid-column: 1; }
  .block:nth-child(2) { grid-column: 2; }
  .block:nth-child(3),
  .risk { grid-column: 1 / -1; }
  /* The difficulty column sits beside a tall front plan, so its cards become
     horizontal bars rather than three stretched tiles with dead space. */
  .variants { grid-template-columns: 1fr; gap: 6px; }
  .variant {
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px;
    min-height: 56px;
    padding: 8px 14px;
  }
  .v-num { font-size: 1.8rem; }
  .v-meta { margin-top: 0; }
}
@container setup (max-width: 420px) {
  .v-meta { gap: 5px; }
  .v-base { font-size: 8px; letter-spacing: 0.08em; }
}
@container setup (max-width: 360px) {
  .variant { min-height: 88px; padding: 8px; }
  .v-num { font-size: 1.8rem; }
}
</style>
