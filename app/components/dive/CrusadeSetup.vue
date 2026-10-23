<script setup lang="ts">
import { RadioGroupItem, RadioGroupRoot } from 'reka-ui'
import { PENANCE_VALOR, SEAF_SUPPORT_VALOR, baseTierFor, missionsPerOperation } from '~~/shared/engine/config'
import { STARTING_KITS, VARIANTS, difficultyName } from '~~/shared/engine/progression'
import type { FrontId } from '~~/shared/data/fronts'
import type { CrusadeMode, CrusadeVariant, FrontPlan } from '~~/shared/engine/types'

const props = withDefaults(defineProps<{
  variant: CrusadeVariant
  mode?: CrusadeMode
  frontPlan: FrontPlan
  lockedFront: FrontId
  startLabel?: string
  showStart?: boolean
}>(), { mode: 'seaf', startLabel: 'Start crusade', showStart: true })

const emit = defineEmits<{
  'update:variant': [variant: CrusadeVariant]
  'update:mode': [mode: CrusadeMode]
  'update:frontPlan': [plan: FrontPlan]
  'update:lockedFront': [front: FrontId]
  'start': []
}>()

const MODES: readonly { id: CrusadeMode, name: string, blurb: string }[] = [
  { id: 'seaf', name: 'SEAF Support Package', blurb: 'Assisted ride: extra gear + a small Valor boost.' },
  { id: 'penance', name: 'Super Penance', blurb: 'No aid. A larger Valor stake, for the wicked.' },
]

const cards = computed(() => VARIANTS.map((entry) => {
  const start = STARTING_KITS[entry.id].startDifficulty
  return {
    ...entry,
    start,
    tier: baseTierFor(start),
    missions: missionsPerOperation(start),
    hasMode: start >= 5,
  }
}))

const selected = computed(() => cards.value.find(card => card.id === props.variant) ?? cards.value[0]!)
const modeActive = computed(() => selected.value.hasMode)

function select(value: unknown): void {
  emit('update:variant', value as CrusadeVariant)
}

function pickMode(id: CrusadeMode): void {
  emit('update:mode', id)
}

function modeValor(id: CrusadeMode): number {
  const table = id === 'penance' ? PENANCE_VALOR : SEAF_SUPPORT_VALOR
  return table[selected.value.start] ?? 0
}
</script>

<template>
  <div class="setup">
    <RadioGroupRoot
      :model-value="variant"
      class="variant-grid"
      aria-label="Variant"
      @update:model-value="select"
    >
      <RadioGroupItem
        v-for="entry in cards"
        :key="entry.id"
        :value="entry.id"
        class="variant-card cut-sm"
        :class="{ on: variant === entry.id }"
      >
        <span class="vl">{{ entry.start }} START</span>
        <span class="vc-body">
          <span class="vc-head">
            <strong class="vc-name disp">{{ entry.name }}</strong>
            <span
              class="tb vc-tier"
              :data-tier="entry.tier"
            >{{ entry.tier }}</span>
          </span>
          <span class="vc-diff cap">{{ difficultyName(entry.start) }}</span>
          <span class="vc-meta odl">OP {{ entry.missions }} MISSIONS</span>
          <span class="vc-pips">
            <i
              v-for="k in entry.missions"
              :key="k"
            />
          </span>
          <span class="vc-desc muted small">{{ entry.description }}</span>
        </span>
      </RadioGroupItem>
    </RadioGroupRoot>

    <div
      v-if="modeActive"
      class="mode-pick"
      role="radiogroup"
      aria-label="Starting mode"
    >
      <button
        v-for="m in MODES"
        :key="m.id"
        type="button"
        role="radio"
        class="mode-card cut-sm"
        :class="{ on: mode === m.id, penance: m.id === 'penance', lit: m.id === 'penance' && mode === m.id }"
        :aria-checked="mode === m.id"
        @click="pickMode(m.id)"
      >
        <span class="mode-head">
          <span class="mode-name">{{ m.name }}</span>
          <span
            v-if="m.id === 'penance'"
            class="flames"
            aria-hidden="true"
          ><i /><i /><i /></span>
          <span
            v-else
            class="mode-badge"
          >ASSIST</span>
        </span>
        <span class="mode-blurb">{{ m.blurb }}</span>
        <span class="mode-valor">+{{ modeValor(m.id) }} Valor / mission</span>
      </button>
    </div>

    <section
      class="front-plan"
      aria-labelledby="front-plan-h"
    >
      <span
        id="front-plan-h"
        class="lbl"
      >Front · locks at launch</span>
      <FrontPlanPicker
        :plan="frontPlan"
        :locked-front="lockedFront"
        @update:plan="emit('update:frontPlan', $event)"
        @update:locked-front="emit('update:lockedFront', $event)"
      />
    </section>

    <button
      v-if="showStart"
      class="btn primary block cut-sm"
      type="button"
      @click="emit('start')"
    >
      {{ startLabel }}
    </button>
  </div>
</template>

<style scoped>
.setup { display: grid; gap: 0.85rem; }
.front-plan { display: grid; gap: 0.4rem; }

.variant-grid {
  display: grid;
  gap: 0.5rem;
  grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
}

.variant-card {
  display: flex;
  gap: 0.5rem;
  padding: 0.55rem 0.6rem;
  border: 1px solid var(--line-2);
  background: var(--rail);
  cursor: pointer;
  text-align: left;
  color: inherit;
  font: inherit;
  transition: border-color var(--dur-fast), background-color var(--dur-fast);
}
.variant-card:hover { border-color: var(--line-4); }
.variant-card.on {
  border-color: var(--gold);
  background: rgba(255, 214, 66, 0.05);
}

.vc-body { display: grid; gap: 0.2rem; min-width: 0; flex-grow: 1; }
.vc-head { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
.vc-name { font-size: 0.9rem; color: var(--text); }
.vc-tier { font-size: 0.68rem; min-width: 1.3rem; padding: 0.05rem 0.25rem; }
.vc-diff { color: var(--gold); }
.vc-meta { color: var(--dim); }
.vc-pips { display: flex; gap: 3px; }
.vc-pips i {
  width: 14px;
  height: 4px;
  border: 1px solid var(--line-4);
}
.variant-card.on .vc-pips i { border-color: var(--gold); }
.vc-desc { line-height: 1.3; }

/* Starting mode (hard/suicide) ------------------------------------------ */
.mode-pick { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.5rem; }
.mode-card {
  display: grid;
  gap: 0.25rem;
  padding: 0.55rem 0.6rem;
  border: 1px solid var(--line-2);
  background: var(--rail);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color var(--dur-fast), background-color var(--dur-fast);
}
.mode-card:hover { border-color: var(--line-4); }
.mode-card.on { border-color: var(--gold); background: rgba(255, 214, 66, 0.05); }
.mode-card.penance.on { border-color: var(--orange); background: rgba(255, 108, 61, 0.06); }
.mode-head { display: flex; align-items: center; gap: 0.5rem; }
.mode-name { font-size: 0.82rem; font-weight: 700; letter-spacing: 0.04em; }
.mode-card.penance.on .mode-name { color: var(--orange); }
.mode-badge {
  margin-left: auto;
  padding: 1px 6px;
  border: 1px solid var(--teal);
  color: var(--teal);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.16em;
}
.mode-blurb { font-size: 11px; line-height: 1.3; color: var(--muted); }
.mode-valor { font-size: 10px; font-weight: 700; letter-spacing: 0.12em; color: var(--khaki); text-transform: uppercase; }
</style>
