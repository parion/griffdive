<script setup lang="ts">
import { CheckboxRoot } from 'reka-ui'
import type { Pact } from '~~/shared/data/pacts'
import { PACT_RISK } from '~~/shared/engine/config'
import { ACCOUNTABILITY_LABELS } from '~/utils/accountability'

const props = defineProps<{
  offer: Pact[]
  selected: string[]
  // Offered pacts the current selection rules out: pactId → reason to show.
  blocked?: Record<string, string>
}>()
defineEmits<{ toggle: [pactId: string], lock: [] }>()
</script>

<template>
  <section class="panel">
    <h2 class="pact-title">
      <WaitingLight label="Waiting on your pact picks" />
      <AppTooltip
        content="Rolled from the wheel decision — take any, all, or none. Every pact you carry raises your reward ceiling; a pact you break in the field is voided and costs one reward option. Restrictions that tax the same strength can't be stacked, and reserve utility (smoke, EMS, shields) is always available as loadout filler."
      >
        <button
          class="pacts-term"
          type="button"
        >
          Pacts
        </button>
      </AppTooltip>
      <span class="muted small">(personal risk, personal rewards)</span>
    </h2>
    <div class="pact-list">
      <CheckboxRoot
        v-for="pact in props.offer"
        :key="pact.id"
        :model-value="selected.includes(pact.id)"
        :disabled="Boolean(props.blocked?.[pact.id])"
        class="pact"
        :class="{ on: selected.includes(pact.id) }"
        @update:model-value="$emit('toggle', pact.id)"
      >
        <span class="pact-head">
          <strong>{{ pact.name }}</strong>
          <RiskPips
            :value="PACT_RISK[pact.id] ?? 0"
            :max="3"
          />
        </span>
        <span class="line small">{{ pact.rule }}</span>
        <span
          v-if="props.blocked?.[pact.id]"
          class="line small covered-note"
        >{{ props.blocked[pact.id] }}</span>
        <span
          v-else
          class="line small muted"
        >{{ ACCOUNTABILITY_LABELS[pact.accountability] }}</span>
      </CheckboxRoot>
    </div>
    <div class="row spread">
      <span class="muted small">{{ selected.length }}/{{ offer.length }} offered taken</span>
      <button
        class="btn primary"
        type="button"
        @click="$emit('lock')"
      >
        Lock in & dive
      </button>
    </div>
  </section>
</template>

<style scoped>
.pact-title { display: flex; align-items: center; gap: 0.45rem; flex-wrap: wrap; }
.pacts-term {
  padding: 0;
  border: none;
  border-bottom: 1px dashed color-mix(in srgb, var(--khaki) 60%, transparent);
  border-radius: 0;
  background: none;
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  color: inherit;
  cursor: help;
  transition: color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out);
}
.pacts-term:hover,
.pacts-term:focus-visible {
  border-bottom-color: var(--gold);
  color: var(--gold);
}

.pact-list {
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.4rem;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
}

.pact {
  width: 100%;
  height: 100%;
  text-align: left;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.55rem 0.7rem;
  color: var(--text);
  font: inherit;
  cursor: pointer;
  transition: border-color var(--dur-fast) ease, transform var(--dur-fast) var(--ease-out);
}

.pact:hover:not(:disabled) {
  border-color: var(--khaki);
  transform: translateY(-1px);
}
.pact:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.covered-note {
  color: var(--khaki);
}
.pact.on {
  border-color: var(--red);
  outline: 1px solid var(--red);
  animation: pact-pulse 320ms var(--ease-out);
}
.pact-head { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
.line { display: block; margin-top: 0.15rem; }

@keyframes pact-pulse {
  0% { transform: scale(1); }
  45% { transform: scale(1.02); }
  100% { transform: scale(1); }
}
</style>
