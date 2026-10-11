<script setup lang="ts">
import { bonusIneligibilityReason } from '~~/shared/engine/selectors'
import type { RewardOption } from '~~/shared/engine/rewards'
import type { DiverState, DiveState } from '~~/shared/engine/types'

const props = withDefaults(defineProps<{
  state: DiveState
  selfId: string | null
  self: DiverState | null
  canControl: boolean
  // Whether the honors contest is due this mission (full-star clear on the
  // squad-size cadence). When false the screen still opens — the honors panel
  // shows disabled and the Requisition shelf stays available.
  bonusUp: boolean
  stock: RewardOption[]
  sampleBank?: number
  buyable?: Record<string, { allowed: boolean, reason: string | null }>
  compact?: boolean
  advanceLabel?: string
}>(), {
  sampleBank: 0,
  buyable: () => ({}),
  compact: false,
  advanceLabel: 'Next mission',
})

const emit = defineEmits<{
  spin: []
  award: [playerIds: string[]]
  advance: []
  buy: [itemId: string]
}>()

const reason = computed(() =>
  bonusIneligibilityReason(props.state) ?? 'Squad honors are not due this mission.')
</script>

<template>
  <div
    class="settlement"
    :class="{ compact }"
  >
    <template v-if="bonusUp">
      <BonusCeremony
        :state="state"
        :self-id="selfId"
        :self="self"
        :can-control="canControl"
        :compact="compact"
        @spin="emit('spin')"
        @award="playerIds => emit('award', playerIds)"
        @advance="emit('advance')"
      />
      <RequisitionStock
        v-if="stock.length > 0"
        :stock="stock"
        :sample-bank="sampleBank"
        :buyable="buyable"
        @buy="itemId => emit('buy', itemId)"
      />
    </template>

    <!-- Honors not due this turn: the bargains come first, the disabled honors
         panel sits below. -->
    <template v-else>
      <RequisitionStock
        v-if="stock.length > 0"
        :stock="stock"
        :sample-bank="sampleBank"
        :buyable="buyable"
        @buy="itemId => emit('buy', itemId)"
      />
      <section
        class="honors-off"
        aria-label="Squad honors unavailable"
      >
        <header class="off-head">
          <div class="off-l">
            <span class="lbl">Squad honors</span>
            <h1 class="disp off-title">
              Not this mission
            </h1>
          </div>
          <span class="off-badge">Unavailable</span>
        </header>
        <p class="muted off-note">
          {{ reason }}
        </p>
        <button
          v-if="!compact"
          class="btn primary cut off-advance cta-sweep"
          type="button"
          :disabled="!canControl"
          @click="emit('advance')"
        >
          <span class="disp">{{ advanceLabel }}</span>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.4"
            aria-hidden="true"
          ><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>
      </section>
    </template>

    <PhoneActionBar v-if="compact">
      <template #detail>
        <div
          class="purse"
          role="status"
        >
          <span class="lbl teal">Sample bank</span>
          <span class="disp purse-n">{{ sampleBank }}</span>
        </div>
      </template>

      <template
        v-if="!bonusUp"
        #primary
      >
        <button
          v-if="canControl"
          class="bar-cta cta-sweep"
          type="button"
          @click="emit('advance')"
        >
          <span class="disp">{{ advanceLabel }}</span>
        </button>
        <div
          v-else
          class="bar-gate"
          role="status"
        >
          <span
            class="hazard-soft bar-gate-edge"
            aria-hidden="true"
          />
          <span class="disp bar-gate-word">{{ advanceLabel }}</span>
          <span class="bar-gate-meta">Waiting for the host</span>
        </div>
      </template>
    </PhoneActionBar>
  </div>
</template>

<style scoped>
.settlement {
  display: flex;
  flex-direction: column;
  gap: var(--gap-panel);
  min-height: 0;
}
/* Keep each block at its natural height — a flex column would otherwise shrink
   the tall honors reel to nothing — and let the phone screen scroll. */
.settlement > * { flex-shrink: 0; }
.settlement.compact { gap: 12px; overflow-y: auto; }

.honors-off {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border: 1px dashed var(--line-3);
  background: color-mix(in srgb, var(--panel) 70%, transparent);
}
.off-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
}
.off-l { display: flex; flex-direction: column; gap: 6px; }
.off-title { margin: 0; font-size: var(--fs-h1); color: var(--dim); }
.off-badge {
  padding: 4px 10px;
  border: 1px solid var(--line-3);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
  white-space: nowrap;
}
.off-note { margin: 0; }
.off-advance {
  align-self: flex-end;
  display: flex;
  align-items: center;
  gap: 14px;
  height: 48px;
  padding: 0 18px;
}
.off-advance:disabled { opacity: 0.5; cursor: not-allowed; }

.purse { display: flex; align-items: baseline; gap: 10px; }
.purse .lbl { color: var(--teal); }
.purse-n { font-size: 22px; color: var(--teal); line-height: 1; }
</style>
