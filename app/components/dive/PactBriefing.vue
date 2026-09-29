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

function channelIcon(pact: Pact | null): string {
  return pact ? CHANNEL_ICON[pact.accountability as Accountability] : CHANNEL_ICON.loadout
}

function initial(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || '?'
}

const selfSummary = computed(() => {
  const diver = self.value
  if (!diver || !diver.pactIds.length) {
    return 'SAFE DIVE'
  }
  return `${diver.pactIds.length} SWORN · +${pactRiskOf(diver)} VALOR`
})

// Marking a pact failed is one-way in the engine. The diver's own cards use a
// two-tap confirm; the host's squad rows use a hold (a field call is a
// deliberate press, not a stray click).
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
  holding.value = null
  emit('fail', playerId, pactId)
}

const reduced = import.meta.client
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const holding = ref<string | null>(null)
let holdTimer: ReturnType<typeof setTimeout> | undefined
function holdStart(playerId: string, pactId: string): void {
  if (reduced) {
    markFailed(playerId, pactId)
    return
  }
  holding.value = confirmKey(playerId, pactId)
  clearTimeout(holdTimer)
  holdTimer = setTimeout(() => markFailed(playerId, pactId), 650)
}
function holdEnd(): void {
  holding.value = null
  clearTimeout(holdTimer)
}
onBeforeUnmount(() => clearTimeout(holdTimer))
</script>

<template>
  <div class="pact-briefing">
    <section
      class="pact-col"
      aria-label="Your pacts"
    >
      <div class="col-head">
        <span class="lbl gold">Your pacts</span>
        <span class="col-sum">{{ selfSummary }}</span>
      </div>

      <div
        v-if="self && self.pactIds.length"
        class="self-pacts"
      >
        <article
          v-for="entry in briefedPacts(self)"
          :key="entry.pactId"
          class="self-pact"
          :class="{ failed: entry.failed }"
        >
          <div class="pact-top">
            <span class="chan">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path :d="channelIcon(entry.pact)" />
              </svg>
              {{ entry.pact ? CHANNEL_NAME[entry.pact.accountability] : 'Loadout' }}
            </span>
            <RiskPips
              :value="riskOf(entry.pactId)"
              :max="3"
            />
          </div>

          <div class="pact-mid">
            <span class="pact-glyph">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path :d="channelIcon(entry.pact)" />
              </svg>
            </span>
            <span class="pact-name disp">{{ entry.pact?.name ?? entry.pactId }}</span>
            <span class="pact-rule">{{ entry.pact?.rule ?? entry.pactId }}</span>
          </div>

          <div class="pact-spacer" />
          <span class="pact-divider" />

          <div class="pact-foot">
            <span class="pact-valor disp">{{ riskOf(entry.pactId) }}</span>
            <span class="pact-valor-lbl lbl">Valor</span>
            <span class="pact-watch">
              <template v-if="accountabilityLabel(entry.pact)">watch · {{ accountabilityLabel(entry.pact) }}</template>
            </span>
          </div>

          <button
            v-if="!entry.failed && confirming === confirmKey(self.id, entry.pactId)"
            class="btn danger tiny armed pact-fail"
            type="button"
            :aria-label="`Confirm voiding ${entry.pact?.name ?? entry.pactId} — this cannot be undone`"
            @click="markFailed(self.id, entry.pactId)"
          >
            Confirm — void it?
          </button>
          <button
            v-else-if="!entry.failed"
            class="pact-fail"
            type="button"
            title="I broke this pact in the field — void its risk and forfeit one reward option"
            @click="askConfirm(self.id, entry.pactId)"
          >
            Mark failed
          </button>

          <span
            v-if="entry.failed"
            class="void-flash"
            aria-hidden="true"
          />
          <span
            v-if="entry.failed"
            class="disp stamp voided-stamp"
          >Voided</span>
        </article>
      </div>
      <p
        v-else
        class="self-empty"
      >
        none — safe dive
      </p>
    </section>

    <section
      class="pact-col squad-col"
      aria-label="Squad pacts"
    >
      <div class="col-head">
        <span class="lbl">Squad pacts</span>
        <span
          v-if="isHost"
          class="host-tag"
        >
          <svg
            viewBox="0 0 24 24"
            fill="var(--gold)"
            aria-hidden="true"
          ><path d="M3 18h18v2H3zM4 16l2-9 4 4 2-6 2 6 4-4 2 9z" /></svg>
          HOST REFEREE
        </span>
      </div>

      <div class="squad-panel">
        <div
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
            v-for="entry in briefedPacts(diver)"
            :key="entry.pactId"
            class="squad-pact"
          >
            <svg
              class="squad-chan"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              role="img"
              :aria-label="entry.pact ? CHANNEL_NAME[entry.pact.accountability] : 'Loadout'"
            >
              <path :d="channelIcon(entry.pact)" />
            </svg>
            <div class="squad-pact-copy">
              <span
                class="squad-pact-name"
                :class="{ failed: entry.failed }"
              >{{ entry.pact?.name ?? entry.pactId }}</span>
              <div class="squad-pact-risk">
                <RiskPips
                  :value="riskOf(entry.pactId)"
                  :max="3"
                />
                <span
                  class="squad-risk-txt"
                  :class="{ failed: entry.failed }"
                >+{{ riskOf(entry.pactId) }}</span>
              </div>
            </div>

            <span
              v-if="entry.failed"
              class="disp stamp squad-void"
            >Void</span>
            <button
              v-else-if="isHost"
              class="squad-hold"
              :class="{ holding: holding === confirmKey(diver.id, entry.pactId) }"
              type="button"
              :aria-label="`Hold to void ${entry.pact?.name ?? entry.pactId} for ${diver.name}`"
              @pointerdown="holdStart(diver.id, entry.pactId)"
              @pointerup="holdEnd"
              @pointerleave="holdEnd"
              @pointercancel="holdEnd"
            >
              <span
                aria-hidden="true"
                class="hazard-red crawl squad-hold-fill"
              />
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              ><path d="M6 3h12v14l-6 4-6-4zM3 3l18 18" /></svg>
            </button>
          </div>

          <div
            v-if="!diver.pactIds.length"
            class="squad-none"
          >
            <span>TEAM RISK ONLY</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.pact-briefing {
  display: grid;
  grid-template-columns: minmax(0, 540px) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.pact-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.col-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  height: 16px;
}
.col-sum {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--red);
  white-space: nowrap;
}

/* Your pacts — a two-column card hand ------------------------------------- */
.self-pacts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.self-pact {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  background: var(--panel);
  border: 1px solid var(--line-2);
  transition: border-color var(--dur-fast) var(--ease-out);
}
.self-pact.failed { border-color: color-mix(in srgb, var(--red) 55%, var(--line-2)); }

.pact-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.chan {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border: 1px solid var(--line-2);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--khaki);
}
.chan svg { width: 14px; height: 14px; flex-shrink: 0; }

.pact-mid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.pact-glyph {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border: 1px solid var(--line-2);
  background: var(--rail);
  color: var(--khaki);
}
.pact-glyph svg { width: 38px; height: 38px; }
.pact-name { font-size: 22px; color: var(--text); }
.self-pact.failed .pact-name {
  text-decoration: line-through;
  text-decoration-color: var(--red);
  text-decoration-thickness: 2px;
  opacity: 0.7;
}
.pact-rule { font-size: 15px; line-height: 1.3; color: var(--text); }

.pact-spacer { flex-grow: 1; min-height: 4px; }
.pact-divider {
  height: 1px;
  background: repeating-linear-gradient(90deg, var(--line-4) 0 6px, transparent 6px 10px);
}

.pact-foot { display: flex; align-items: baseline; gap: 8px; }
.pact-valor { font-size: 34px; line-height: 1; color: var(--red); }
.self-pact.failed .pact-valor {
  color: var(--dim);
  text-decoration: line-through;
  text-decoration-thickness: 3px;
  text-decoration-color: var(--red);
}
.pact-valor-lbl { font-size: 10px; }
.pact-watch {
  margin-left: auto;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--muted);
  white-space: normal;
  text-align: right;
}

.pact-fail {
  align-self: flex-start;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--red);
  cursor: pointer;
}
.pact-fail.armed { padding: 4px 8px; }

.self-empty {
  margin: 0;
  padding: 10px 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
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
  padding: 8px 16px;
  font-size: 30px;
  color: var(--red);
  border: 3px solid var(--red);
  background: color-mix(in srgb, var(--ground) 82%, transparent);
}
@keyframes void-flash {
  from { opacity: 0.55; }
  to { opacity: 0; }
}

/* Squad pacts — a bordered referee panel ---------------------------------- */
.host-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.16em;
  color: var(--muted);
}
.host-tag svg { width: 12px; height: 12px; flex-shrink: 0; }

.squad-panel {
  border: 1px solid var(--line-1);
  background: var(--panel);
  display: flex;
  flex-direction: column;
}

.squad-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--line-1);
}
.squad-row:last-child { border-bottom: 0; }

.squad-row-head {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 30px;
}
.avatar {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  background: var(--line-2);
  color: var(--text);
  font-size: 13px;
}
.squad-name {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.squad-valor {
  margin-left: auto;
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
}
.squad-valor .lbl { font-size: 9px; }
.valor-num { font-size: 18px; color: var(--gold); }

.squad-pact {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  padding-left: 38px;
}
.squad-chan { width: 16px; height: 16px; flex-shrink: 0; color: var(--khaki); }
.squad-pact-copy {
  flex-grow: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.squad-pact-name {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
  color: var(--text);
}
.squad-pact-name.failed {
  text-decoration: line-through;
  text-decoration-color: var(--red);
  text-decoration-thickness: 2px;
  color: var(--dim);
}
.squad-pact-risk { display: flex; align-items: center; gap: 6px; }
.squad-pact-risk :deep(.pips i) { width: 12px; height: 12px; }
.squad-risk-txt { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: var(--red); }
.squad-risk-txt.failed { color: var(--dim); }

.squad-void {
  flex-shrink: 0;
  padding: 4px 7px;
  font-size: 12px;
  border: 2px solid var(--red);
  color: var(--red);
}

.squad-hold {
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  background: transparent;
  border: 1px solid var(--line-3);
  color: var(--red);
  cursor: pointer;
}
.squad-hold svg { width: 18px; height: 18px; position: relative; }
.squad-hold-fill {
  position: absolute;
  inset: 0;
  opacity: 0.6;
  transform-origin: bottom;
  transform: scaleY(0);
  transition: transform 650ms linear;
}
.squad-hold.holding .squad-hold-fill { transform: scaleY(1); }

.squad-none {
  display: flex;
  align-items: center;
  min-height: 40px;
  padding-left: 38px;
}
.squad-none span {
  padding: 5px 9px;
  border: 1px dashed var(--line-4);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: var(--muted);
}

@media (prefers-reduced-motion: reduce) {
  .void-flash { animation: none; opacity: 0; }
  .squad-hold-fill { transition: none; }
}

@media (max-width: 1180px) {
  .pact-briefing { grid-template-columns: minmax(0, 1fr); }
}
</style>
