<script setup lang="ts">
import { MAX_PACTS, PACT_RISK } from '~~/shared/engine/config'
import { pactChoices } from '~~/shared/engine/selectors'

const props = defineProps<{ misfortuneId: string | null, selected: string[] }>()
const emit = defineEmits<{ toggle: [pactId: string], lock: [] }>()

const choices = computed(() => pactChoices(props.misfortuneId))

function toggle(pactId: string, selectable: boolean): void {
  if (!selectable) {
    return
  }
  emit('toggle', pactId)
}
</script>

<template>
  <section class="panel">
    <h2>Pacts <span class="muted small">(personal risk, personal rewards)</span></h2>
    <ul class="pact-list">
      <li
        v-for="{ pact, selectable, blockedReason } in choices"
        :key="pact.id"
      >
        <button
          class="pact"
          :class="{ on: selected.includes(pact.id), off: !selectable }"
          type="button"
          :disabled="!selectable"
          @click="toggle(pact.id, selectable)"
        >
          <span class="pact-head">
            <strong>{{ pact.name }}</strong>
            <RiskPips
              :value="PACT_RISK[pact.id] ?? 0"
              :max="3"
            />
          </span>
          <p
            class="small"
            :class="blockedReason ? 'muted' : ''"
          >
            {{ blockedReason ?? pact.rule }}
          </p>
        </button>
      </li>
    </ul>
    <div class="row spread">
      <span class="muted small">{{ selected.length }}/{{ MAX_PACTS }} pacts taken</span>
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
.pact-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.4rem;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
}

.pact {
  width: 100%;
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

.pact:hover:not(:disabled):not(.off) {
  border-color: var(--khaki);
  transform: translateY(-1px);
}
.pact.on {
  border-color: var(--red);
  outline: 1px solid var(--red);
  animation: pact-pulse 320ms var(--ease-out);
}
.pact.off { opacity: 0.45; cursor: not-allowed; }
.pact-head { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
.pact p { margin: 0.15rem 0 0; }

@keyframes pact-pulse {
  0% { transform: scale(1); }
  45% { transform: scale(1.02); }
  100% { transform: scale(1); }
}
</style>
