<script setup lang="ts">
import { pactById } from '~~/shared/data/pacts'
import type { Pact } from '~~/shared/data/pacts'
import type { Accountability } from '~~/shared/data/types'
import { PACT_RISK } from '~~/shared/engine/config'
import type { DiverState } from '~~/shared/engine/types'
import { ACCOUNTABILITY_LABELS } from '~/utils/accountability'

const props = defineProps<{
  divers: DiverState[]
  selfId: string | null
  isHost: boolean
}>()

const emit = defineEmits<{ fail: [playerId: string, pactId: string] }>()

interface BriefedPact {
  pactId: string
  pact: Pact | null
  failed: boolean
}

function briefedPacts(diver: DiverState): BriefedPact[] {
  return diver.pactIds.map(pactId => ({
    pactId,
    pact: pactById(pactId),
    failed: diver.failedPactIds.includes(pactId),
  }))
}

const self = computed(() => props.divers.find(diver => diver.id === props.selfId) ?? null)
const squadmates = computed(() => props.divers.filter(diver => diver.id !== props.selfId))

function accountabilityLabel(pact: Pact | null): string | null {
  return pact ? ACCOUNTABILITY_LABELS[pact.accountability as Accountability] : null
}

// Marking a pact failed is one-way in the engine, so the button confirms
// before it commits.
const confirming = ref<string | null>(null)
function confirmKey(playerId: string, pactId: string): string {
  return `${playerId}:${pactId}`
}
function askConfirm(playerId: string, pactId: string): void {
  const key = confirmKey(playerId, pactId)
  confirming.value = confirming.value === key ? null : key
}
function markFailed(playerId: string, pactId: string): void {
  confirming.value = null
  emit('fail', playerId, pactId)
}
</script>

<template>
  <div class="pact-briefing">
    <div class="row spread pact-briefing-head">
      <h3>Your pacts</h3>
      <span class="muted small">a failed pact is voided — its risk stops counting, and it costs one reward option</span>
    </div>
    <ul
      v-if="self && self.pactIds.length"
      class="self-pacts"
    >
      <li
        v-for="entry in briefedPacts(self)"
        :key="entry.pactId"
        class="self-pact"
        :class="{ failed: entry.failed }"
      >
        <div class="pact-main">
          <span class="pact-head">
            <strong>{{ entry.pact?.name ?? entry.pactId }}</strong>
            <RiskPips
              :value="entry.pact ? (PACT_RISK[entry.pactId] ?? 0) : 0"
              :max="3"
            />
          </span>
          <p class="pact-rule">
            {{ entry.pact?.rule ?? entry.pactId }}
          </p>
          <p
            v-if="accountabilityLabel(entry.pact)"
            class="small muted"
          >
            {{ accountabilityLabel(entry.pact) }}
          </p>
        </div>
        <span
          v-if="entry.failed"
          class="failed-tag"
        >FAILED</span>
        <button
          v-else-if="confirming === confirmKey(self.id, entry.pactId)"
          class="btn danger tiny"
          type="button"
          @click="markFailed(self.id, entry.pactId)"
        >
          Confirm — void it?
        </button>
        <button
          v-else
          class="btn ghost tiny"
          type="button"
          title="I broke this pact in the field — void its risk and forfeit one reward option"
          @click="askConfirm(self.id, entry.pactId)"
        >
          Mark failed
        </button>
      </li>
    </ul>
    <p
      v-else
      class="muted small"
    >
      none — safe dive
    </p>

    <h3>Squad pacts</h3>
    <ul class="squad-pacts small">
      <li
        v-for="diver in squadmates"
        :key="diver.id"
      >
        <span class="muted">{{ diver.name }}</span>
        <template v-if="diver.pactIds.length">
          <span
            v-for="entry in briefedPacts(diver)"
            :key="entry.pactId"
            class="chip squad-chip"
            :class="{ failed: entry.failed }"
            :title="entry.pact ? `${entry.pact.name} — ${entry.pact.rule}` : entry.pactId"
          >
            {{ entry.pact?.name ?? entry.pactId }}
            <span
              v-if="entry.failed"
              class="failed-tag"
            >FAILED</span>
            <template v-else-if="isHost">
              <button
                v-if="confirming === confirmKey(diver.id, entry.pactId)"
                class="chip-fail sure"
                type="button"
                @click="markFailed(diver.id, entry.pactId)"
              >
                sure?
              </button>
              <button
                v-else
                class="chip-fail"
                type="button"
                :aria-label="`Mark ${entry.pact?.name ?? entry.pactId} failed for ${diver.name}`"
                title="Broken in the field — void its risk and forfeit one reward option"
                @click="askConfirm(diver.id, entry.pactId)"
              >
                ×
              </button>
            </template>
          </span>
        </template>
        <span
          v-else
          class="muted"
        >— no pacts</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.pact-briefing-head {
  align-items: baseline;
  flex-wrap: wrap;
}
.pact-briefing h3 {
  margin: 0.4rem 0 0.3rem;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--khaki);
}

.self-pacts {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.4rem;
}

.self-pact {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.7rem;
  padding: 0.55rem 0.7rem;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.self-pact .pact-main {
  min-width: 0;
}
.self-pact .pact-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.6rem;
}
.self-pact p {
  margin: 0.15rem 0 0;
}
/* The rule text is the objective — make it the readable core of the card. */
.pact-rule {
  font-size: 0.95rem;
}

.self-pact.failed {
  border-color: var(--red);
}
.self-pact.failed strong {
  text-decoration: line-through;
  opacity: 0.75;
}

.failed-tag {
  flex-shrink: 0;
  padding: 0.1rem 0.4rem;
  border: 1px solid var(--red);
  border-radius: 4px;
  color: var(--red);
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.1em;
}

.squad-pacts {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.35rem;
}
.squad-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}
.squad-chip.failed {
  border-color: var(--red);
  text-decoration: line-through;
}

.chip-fail {
  width: 1rem;
  height: 1rem;
  display: inline-grid;
  place-items: center;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: none;
  color: var(--red);
  font: inherit;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
}
.chip-fail.sure {
  width: auto;
  height: auto;
  padding: 0.05rem 0.3rem;
  border: 1px solid var(--red);
}

/* Pointer devices reveal the fail affordance on chip hover; touch devices
   always show it — there is no hover to rely on. */
@media (hover: hover) and (pointer: fine) {
  .chip-fail {
    width: 0;
    opacity: 0;
    overflow: hidden;
    transition:
      opacity var(--dur-fast) var(--ease-out),
      width var(--dur-fast) var(--ease-out);
  }

  .squad-chip:hover .chip-fail,
  .chip-fail:focus-visible,
  .chip-fail.sure {
    width: auto;
    min-width: 1rem;
    opacity: 1;
  }
}
</style>
