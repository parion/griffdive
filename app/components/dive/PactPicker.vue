<script setup lang="ts">
import { CheckboxRoot } from 'reka-ui'
import type { Pact } from '~~/shared/data/pacts'
import type { Accountability } from '~~/shared/data/types'
import { PACT_RISK } from '~~/shared/engine/config'
import { ACCOUNTABILITY_LABELS } from '~/utils/accountability'

const props = withDefaults(defineProps<{
  offer: Pact[]
  selected: string[]
  // Offered pacts the current selection rules out: pactId → reason to show.
  blocked?: Record<string, string>
  // The diver has locked: the hand is read-only, so a toggle can't show a
  // loadout that was never sworn.
  disabled?: boolean
}>(), { blocked: undefined, disabled: false })
defineEmits<{ toggle: [pactId: string] }>()

// Where the squad verifies each pact — the chip reads as the check channel,
// not a rule (AGENTS.md: accountability rule).
const CHANNEL_ICON: Record<Accountability, string> = {
  loadout: 'M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13.5 17.5l2.5 2.5 5-5.5',
  field: 'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
  stats: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
}

function riskOf(pactId: string): number {
  return PACT_RISK[pactId] ?? 0
}

function isOn(pactId: string): boolean {
  return props.selected.includes(pactId)
}

function isRuled(pactId: string): boolean {
  return Boolean(props.blocked?.[pactId])
}

// Deal-in direction: the left card slides in from the right, the right from
// the left, the middle drops straight down — a hand dealt onto the table.
function dealClass(index: number): string {
  const last = props.offer.length - 1
  if (last < 1 || index === 0) {
    return 'deal-l'
  }
  if (index === last) {
    return 'deal-r'
  }
  return 'deal-c'
}

function dealDelay(index: number): string {
  return `${0.08 + index * 0.14}s`
}

// Presentation of the parent-supplied reason string — never a rules decision.
function stampLabel(reason: string): string {
  if (reason.startsWith('Covered')) {
    return 'Covered'
  }
  if (reason.startsWith('Conflicts')) {
    return 'Conflict'
  }
  return 'No slots'
}
</script>

<template>
  <section class="panel pacts">
    <div
      class="hand"
      role="group"
      aria-label="Pact offer, dealt. Toggle to swear."
    >
      <CheckboxRoot
        v-for="(pact, index) in offer"
        :key="pact.id"
        :model-value="isOn(pact.id)"
        :disabled="props.disabled || isRuled(pact.id)"
        class="pact pact-card cut-sm"
        :class="[dealClass(index), { on: isOn(pact.id), ruled: isRuled(pact.id) }]"
        :style="{ animationDelay: dealDelay(index) }"
        @update:model-value="$emit('toggle', pact.id)"
      >
        <span class="pact-top">
          <RiskPips
            :value="riskOf(pact.id)"
            :max="3"
          />
          <span
            class="pact-risk disp"
            aria-hidden="true"
          >+{{ riskOf(pact.id) }}</span>
        </span>

        <span
          class="pact-glyph grid-bg"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M6 3h12v14l-6 4-6-4zM9 8h6M9 12h6" />
          </svg>
        </span>

        <span class="pact-name disp">{{ pact.name }}</span>
        <span class="pact-rule">{{ pact.rule }}</span>

        <span
          class="pact-dash"
          aria-hidden="true"
        />

        <span class="pact-chan">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path :d="CHANNEL_ICON[pact.accountability]" />
          </svg>
          <span>{{ ACCOUNTABILITY_LABELS[pact.accountability] }}</span>
        </span>

        <span
          v-if="props.blocked?.[pact.id]"
          class="pact-blocked cap"
        >
          {{ props.blocked[pact.id] }}
        </span>

        <span
          v-if="isRuled(pact.id)"
          class="pact-stamp ruled-stamp"
          aria-hidden="true"
        >{{ stampLabel(props.blocked?.[pact.id] ?? '') }}</span>

        <span
          v-if="isOn(pact.id)"
          class="pact-flash"
          aria-hidden="true"
        />
        <span
          v-if="isOn(pact.id)"
          class="pact-stamp sworn-stamp stamp"
          aria-hidden="true"
        >Sworn</span>
      </CheckboxRoot>
    </div>
  </section>
</template>

<style scoped>
.pacts-head {
  align-items: baseline;
  margin: 0;
}

.pacts-term {
  padding: 0;
  border: none;
  border-bottom: 1px dashed color-mix(in srgb, var(--khaki) 60%, transparent);
  border-radius: 0;
  background: none;
  font-size: 1.05rem;
  letter-spacing: 0.06em;
  color: var(--text);
  cursor: help;
  transition: color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out);
}

.pacts-term:hover,
.pacts-term:focus-visible {
  border-bottom-color: var(--gold);
  color: var(--gold);
}

.offer-tally {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.6rem;
  border: 1px solid var(--line-2);
  background: var(--rail);
}

.hand {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 22px;
}

.pact-card {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: min(264px, 100%);
  min-height: 100%;
  padding: 0.85rem 0.9rem 0.95rem;
  text-align: left;
  background: var(--panel);
  border: 1px solid var(--line-3);
  color: var(--text);
  font: inherit;
  cursor: pointer;
  animation-duration: 0.55s;
  animation-timing-function: var(--ease-out);
  animation-fill-mode: both;
  transition: border-color var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out), opacity var(--dur-fast);
}

.pact-card:hover:not(:disabled) {
  border-color: var(--khaki);
  transform: translateY(-2px);
}

.pact-card:disabled,
.pact-card.ruled {
  cursor: not-allowed;
  opacity: 0.5;
  filter: grayscale(0.55);
}

.pact-card.on {
  border-color: var(--red);
  box-shadow: inset 0 0 0 1px var(--red);
  animation: pact-pulse 320ms var(--ease-out);
}

.pact-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  min-height: 22px;
}

.pact-risk {
  font-size: 2rem;
  color: var(--red);
}

.pact-glyph {
  display: grid;
  place-items: center;
  height: 128px;
  background-color: var(--rail);
  background-size: 16px 16px;
  border: 1px solid var(--line-2);
  color: var(--dim);
  transition: color var(--dur-med), border-color var(--dur-med);
}

.pact-card.on .pact-glyph {
  color: var(--red);
  border-color: color-mix(in srgb, var(--red) 45%, var(--line-2));
}

.pact-glyph svg {
  width: 66px;
  height: 66px;
}

.pact-name {
  font-size: 1.3rem;
  color: var(--text);
}

.pact-rule {
  font-size: 0.94rem;
  line-height: 1.3;
  color: var(--text);
}

.pact-dash {
  height: 1px;
  margin-top: auto;
  background: repeating-linear-gradient(90deg, var(--line-4) 0 6px, transparent 6px 10px);
}

.pact-chan {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  height: 26px;
  padding: 0 0.55rem;
  border: 1px solid var(--line-2);
  color: var(--khaki);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
}

.pact-chan svg {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
}

.pact-blocked {
  color: var(--red);
  white-space: normal;
  line-height: 1.3;
}

.pact-stamp {
  position: absolute;
  left: 0;
  right: 0;
  top: 96px;
  margin: 0 auto;
  width: max-content;
  padding: 5px 12px;
  font-family: var(--font-display);
  font-stretch: 125%;
  font-weight: 800;
  font-size: 1rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  border: 2px solid currentColor;
  transform: rotate(-7deg);
}

.sworn-stamp {
  color: var(--red);
  background: color-mix(in srgb, var(--ground) 82%, transparent);
}

.ruled-stamp {
  color: var(--red);
  border-style: dashed;
  background: color-mix(in srgb, var(--ground) 78%, transparent);
  animation: ghost-in 0.18s var(--ease-out) both;
}

.pact-flash {
  position: absolute;
  inset: 0;
  background: var(--red);
  pointer-events: none;
  opacity: 0;
  animation: sworn-flash 0.5s ease-out forwards;
}

.pacts-foot {
  align-items: center;
  border-top: 1px dashed var(--line-2);
  padding-top: 0.65rem;
}

.pacts-foot .cap {
  white-space: normal;
}

.deal-l {
  animation-name: deal-l;
}
.deal-c {
  animation-name: deal-c;
}
.deal-r {
  animation-name: deal-r;
}

@keyframes deal-l {
  0% { transform: translate(54px, 44px) rotate(7deg) scale(0.78); opacity: 0; }
  60% { opacity: 1; }
  100% { transform: none; opacity: 1; }
}
@keyframes deal-c {
  0% { transform: translate(0, 52px) scale(0.8); opacity: 0; }
  60% { opacity: 1; }
  100% { transform: none; opacity: 1; }
}
@keyframes deal-r {
  0% { transform: translate(-54px, 44px) rotate(-7deg) scale(0.78); opacity: 0; }
  60% { opacity: 1; }
  100% { transform: none; opacity: 1; }
}
@keyframes ghost-in {
  from { opacity: 0; transform: rotate(-7deg) scale(1.08); }
  to { opacity: 1; transform: rotate(-7deg); }
}
@keyframes sworn-flash {
  from { opacity: 0.38; }
  to { opacity: 0; }
}
@keyframes pact-pulse {
  0% { transform: scale(1); }
  45% { transform: scale(1.02); }
  100% { transform: scale(1); }
}

@media (min-width: 760px) {
  .pact-card {
    min-height: 340px;
  }
}
</style>
