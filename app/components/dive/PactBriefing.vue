<script setup lang="ts">
import { pactById } from '~~/shared/data/pacts'
import type { Pact } from '~~/shared/data/pacts'
import type { Accountability } from '~~/shared/data/types'
import { PACT_RISK } from '~~/shared/engine/config'
import { pactRiskOf } from '~~/shared/engine/selectors'
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

// Where the squad checks each pact — the card's channel chip names it.
const CHANNEL_NAME: Record<Accountability, string> = {
  loadout: 'Loadout',
  field: 'Field',
  stats: 'Stats',
}
const CHANNEL_ICON: Record<Accountability, string> = {
  loadout: 'M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13.5 17.5l2.5 2.5 5-5.5',
  field: 'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
  stats: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
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

function riskOf(pactId: string): number {
  return PACT_RISK[pactId] ?? 0
}

function accountabilityLabel(pact: Pact | null): string | null {
  return pact ? ACCOUNTABILITY_LABELS[pact.accountability as Accountability] : null
}

function initial(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || '?'
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
    <h3 class="row spread brief-head">
      <span class="lbl gold">Your pacts</span>
      <span class="cap muted">a failed pact is voided — its risk stops counting and it costs one reward option</span>
    </h3>

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
        <div class="pact-body">
          <div class="row spread pact-top">
            <span
              v-if="entry.pact"
              class="chan"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path :d="CHANNEL_ICON[entry.pact.accountability]" />
              </svg>
              {{ CHANNEL_NAME[entry.pact.accountability] }}
            </span>
            <RiskPips
              :value="riskOf(entry.pactId)"
              :max="3"
            />
          </div>
          <span class="pact-name disp">{{ entry.pact?.name ?? entry.pactId }}</span>
          <p class="pact-rule">
            {{ entry.pact?.rule ?? entry.pactId }}
          </p>
          <span
            v-if="accountabilityLabel(entry.pact)"
            class="cap muted watch"
          >watch · {{ accountabilityLabel(entry.pact) }}</span>
          <div class="pact-foot">
            <span class="disp pact-valor">{{ riskOf(entry.pactId) }}</span>
            <span class="lbl">Valor</span>
            <span
              v-if="entry.failed"
              class="pact-void cap"
            >risk voided</span>
          </div>
        </div>

        <span
          v-if="entry.failed"
          class="void-flash"
          aria-hidden="true"
        />
        <span
          v-if="entry.failed"
          class="disp stamp voided-stamp"
        >Voided</span>

        <button
          v-else-if="confirming === confirmKey(self.id, entry.pactId)"
          class="btn danger tiny armed"
          type="button"
          :aria-label="`Confirm voiding ${entry.pact?.name ?? entry.pactId} — this cannot be undone`"
          @click="markFailed(self.id, entry.pactId)"
        >
          Confirm — void it?
          <span class="armed-hint">can't be undone</span>
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
      class="cap muted"
    >
      none — safe dive
    </p>

    <h3 class="row spread brief-head squad-head">
      <span class="lbl">Squad pacts</span>
      <span
        v-if="isHost"
        class="cap muted host-tag"
      >
        <svg
          viewBox="0 0 24 24"
          fill="var(--gold)"
          aria-hidden="true"
        ><path d="M3 18h18v2H3zM4 16l2-9 4 4 2-6 2 6 4-4 2 9z" /></svg>
        host referee
      </span>
    </h3>

    <ul class="squad-pacts">
      <li
        v-for="diver in squadmates"
        :key="diver.id"
        class="squad-row"
      >
        <div class="squad-row-head">
          <span class="cut-sm disp avatar">{{ initial(diver.name) }}</span>
          <span class="squad-name">{{ diver.name }}</span>
          <span class="squad-valor">
            <span class="lbl">Valor</span>
            <span class="disp valor-num">{{ pactRiskOf(diver) }}</span>
          </span>
        </div>
        <div
          v-if="diver.pactIds.length"
          class="squad-chips"
        >
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
            >void</span>
            <template v-else-if="isHost">
              <button
                v-if="confirming === confirmKey(diver.id, entry.pactId)"
                class="chip-fail sure armed"
                type="button"
                :aria-label="`Confirm voiding ${entry.pact?.name ?? entry.pactId} for ${diver.name} — this cannot be undone`"
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
        </div>
        <span
          v-else
          class="cap muted team-only"
        >team risk only</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.pact-briefing {
  display: grid;
  gap: 0.5rem;
}

.brief-head {
  align-items: baseline;
  margin: 0;
  border-bottom: 1px solid var(--line-1);
  padding-bottom: 0.3rem;
}

.gold { color: var(--gold); }

.self-pacts {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.6rem;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.self-pact {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  padding: 0.8rem 0.85rem;
  background: var(--panel);
  border: 1px solid var(--line-3);
  transition: border-color var(--dur-fast) var(--ease-out);
}

.self-pact.failed {
  border-color: color-mix(in srgb, var(--red) 55%, var(--line-2));
}

.pact-body {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  min-width: 0;
}

.pact-top {
  min-height: 22px;
}

.pact-name {
  font-size: 1.2rem;
  color: var(--text);
}

.self-pact.failed .pact-name {
  text-decoration: line-through;
  text-decoration-color: var(--red);
  text-decoration-thickness: 2px;
  opacity: 0.7;
}

.pact-rule {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.3;
}

.watch { white-space: normal; }

.pact-foot {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  margin-top: 0.15rem;
  padding-top: 0.5rem;
  border-top: 1px dashed var(--line-2);
}

.pact-valor {
  font-size: 1.9rem;
  line-height: 1;
  color: var(--red);
}

.self-pact.failed .pact-valor {
  color: var(--dim);
  text-decoration: line-through;
  text-decoration-thickness: 3px;
  text-decoration-color: var(--red);
}

.pact-void {
  margin-left: auto;
  color: var(--red);
}

.void-flash {
  position: absolute;
  inset: 0;
  background: var(--red);
  pointer-events: none;
  animation: void-flash 0.6s ease-out both;
}

.voided-stamp {
  position: absolute;
  left: 0;
  right: 0;
  top: 44%;
  margin: 0 auto;
  width: max-content;
  padding: 7px 15px;
  font-size: 1.4rem;
  color: var(--red);
  border: 3px solid var(--red);
  background: color-mix(in srgb, var(--ground) 82%, transparent);
}

@keyframes void-flash {
  from { opacity: 0.55; }
  to { opacity: 0; }
}

.squad-head {
  margin-top: 0.35rem;
}

.host-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.host-tag svg,
.chan svg {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
}

.chan svg { color: var(--khaki); }

.squad-pacts {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.4rem;
}

.squad-row {
  display: grid;
  gap: 0.4rem;
  padding: 0.55rem 0.65rem;
  background: var(--rail);
  border: 1px solid var(--line-1);
}

.squad-row-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.avatar {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  background: var(--raised);
  color: var(--text);
  font-size: 13px;
}

.squad-name {
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.squad-valor {
  margin-left: auto;
  display: inline-flex;
  align-items: baseline;
  gap: 0.35rem;
}

.valor-num {
  font-size: 1.1rem;
  color: var(--gold);
}

.squad-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  padding-left: 34px;
}

.squad-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.squad-chip.failed {
  border-color: var(--red);
  color: var(--red);
  text-decoration: line-through;
  text-decoration-thickness: 2px;
}

.failed-tag {
  flex-shrink: 0;
  padding: 0.05rem 0.3rem;
  border: 1px solid var(--red);
  color: var(--red);
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-decoration: none;
}

.team-only { padding-left: 34px; }

.chip-fail {
  width: 1rem;
  height: 1rem;
  display: inline-grid;
  place-items: center;
  padding: 0;
  border: none;
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

/* The confirm step is a one-way void: make the armed button read as a live,
   destructive choice rather than an inert label. */
.armed {
  background: color-mix(in srgb, var(--red) 24%, transparent);
  border-color: var(--red);
  color: var(--red);
  animation: armed-pulse 1.4s ease-in-out infinite;
}

.armed-hint {
  margin-left: 0.3rem;
  font-size: 0.65rem;
  letter-spacing: 0.02em;
  opacity: 0.85;
}

@keyframes armed-pulse {
  0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--red) 45%, transparent); }
  50% { box-shadow: 0 0 0 4px transparent; }
}

@media (prefers-reduced-motion: reduce) {
  .armed { animation: none; }
}

/* Pointer devices reveal the fail affordance on chip hover; touch devices
   always show it — there is no hover to rely on. */
@media (hover: hover) and (pointer: fine) {
  .chip-fail {
    width: 0;
    opacity: 0;
    overflow: hidden;
    transition: opacity var(--dur-fast) var(--ease-out), width var(--dur-fast) var(--ease-out);
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
