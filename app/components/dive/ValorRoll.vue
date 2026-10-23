<script setup lang="ts">
import type { TierZone } from '~~/shared/engine/rewards'
import type { RewardTier } from '~~/shared/engine/types'

const props = withDefaults(defineProps<{
  zones: TierZone[]
  // The d100 faces that landed. At loot each option has one; on the call/pact
  // screens there are none and the strip is purely the odds line.
  markers?: { roll: number, tier?: RewardTier }[]
  // Percentage-point movement from the current baseline (a hovered pact, a
  // picked directive). Gains light a gold chunk; losses mark a red hatch.
  deltas?: Partial<Record<RewardTier, number>>
  label?: string
  note?: string
  locked?: boolean
  compact?: boolean
}>(), {
  markers: () => [],
  deltas: () => ({}),
  label: 'Valor roll',
  note: '',
  locked: false,
  compact: false,
})

const inspected = ref<string | null>(null)

function pct(value: number): string {
  if (value > 0 && value < 0.5) {
    return '<1%'
  }
  return `${Math.round(value)}%`
}

function zoneLabel(zone: TierZone): string {
  const delta = props.deltas[zone.tier] ?? 0
  // Only a gain is worth calling out. A shrinking tier reads as the plain
  // preview odds; a red "−22" made the whole line feel like a penalty.
  if (delta >= 0.5) {
    return `${zone.tier} +${Math.round(delta)}`
  }
  return `${zone.tier} ${pct(zone.chance * 100)}`
}

interface DeltaChunk {
  kind: 'gain' | 'loss'
  left: string
  width: string
}

// The bar-level echo of the label delta: a tier that grows lights the chunk it
// gained on its leading edge, a tier that shrinks marks the chunk it lost at
// its trailing edge. Widths are the movement itself, so two adjacent chunks
// meet exactly on the boundary that moved.
const chunks = computed<Partial<Record<RewardTier, DeltaChunk>>>(() => {
  const result: Partial<Record<RewardTier, DeltaChunk>> = {}
  // The ladder's overall direction decides which edge each chunk belongs to:
  // with more Valor, higher tiers take ground on their leading edge and lower
  // tiers give it up on their trailing edge; less Valor mirrors both.
  const direction = props.zones.reduce(
    (sum, zone, index) => sum + (props.deltas[zone.tier] ?? 0) * index,
    0,
  )
  for (const zone of props.zones) {
    const delta = props.deltas[zone.tier] ?? 0
    const width = zone.end - zone.start
    if (Math.abs(delta) < 0.5 || width <= 0.01) {
      continue
    }
    const chunk = Math.min(Math.abs(delta), width)
    const leading = (delta > 0) === (direction >= 0)
    result[zone.tier] = {
      kind: delta > 0 ? 'gain' : 'loss',
      left: leading ? '0%' : `${((width - chunk) / width) * 100}%`,
      width: `${(chunk / width) * 100}%`,
    }
  }
  return result
})

function tooltip(zone: TierZone): string {
  const delta = props.deltas[zone.tier] ?? 0
  const base = `${zone.tier} · ${pct(zone.chance * 100)}`
  return delta === 0 ? base : `${base} · ${delta > 0 ? '+' : ''}${Math.round(delta)} pts`
}

function showLabel(zone: TierZone): boolean {
  return zone.chance * 100 >= (props.compact ? 7 : 5)
}

function isGain(zone: TierZone): boolean {
  return (props.deltas[zone.tier] ?? 0) > 0
}

function isLoss(zone: TierZone): boolean {
  return (props.deltas[zone.tier] ?? 0) < 0
}

function inspect(zone: TierZone): void {
  inspected.value = inspected.value === zone.tier ? null : zone.tier
}

function markerTone(marker: { roll: number, tier?: RewardTier }): RewardTier {
  return marker.tier ?? 'C'
}
</script>

<template>
  <div
    class="roll"
    :class="{ compact, locked }"
  >
    <div class="roll-head">
      <span class="roll-title">
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          aria-hidden="true"
        >
          <path
            d="M8 1 15 7 8 15 1 7z"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linejoin="round"
          />
          <path
            d="M1 7h14M8 1v14"
            stroke="currentColor"
            stroke-opacity=".45"
            stroke-width="1"
          />
        </svg>
        {{ label }}
      </span>
      <span
        v-if="note"
        class="roll-note"
      >{{ note }}</span>
      <span
        v-if="locked"
        class="roll-locked"
      >Locked in</span>
    </div>

    <div
      class="roll-stage"
      :class="{ pinned: markers.length > 0 }"
    >
      <div
        class="roll-pins"
        aria-hidden="true"
      >
        <span
          v-for="(marker, index) in markers"
          :key="`${marker.roll}-${index}`"
          class="pin"
          :data-tier="markerTone(marker)"
          :style="{ left: `${marker.roll}%`, animationDelay: `${index * 180}ms` }"
        >
          <span class="pin-flag disp">{{ marker.roll }}</span>
          <span class="pin-needle" />
        </span>
      </div>

      <div
        class="roll-ruler"
        aria-hidden="true"
      />

      <div
        class="roll-strip"
        role="group"
        :aria-label="`${label}. ${zones.map(zone => `${zone.tier} ${pct(zone.chance * 100)}`).join(', ')}`"
      >
        <button
          v-for="zone in zones"
          :key="zone.tier"
          class="zone"
          :class="{ gain: isGain(zone), loss: isLoss(zone), silent: zone.chance === 0 }"
          :data-tier="zone.tier"
          type="button"
          :style="{ left: `${zone.start}%`, width: `${Math.max(0.5, zone.end - zone.start)}%` }"
          :aria-label="tooltip(zone)"
          :title="tooltip(zone)"
          @click="inspect(zone)"
          @blur="inspected = null"
        >
          <span
            v-if="chunks[zone.tier]"
            class="zone-delta"
            :class="chunks[zone.tier]?.kind"
            :style="{ left: chunks[zone.tier]?.left, width: chunks[zone.tier]?.width }"
            aria-hidden="true"
          />
          <span
            v-if="inspected === zone.tier"
            class="zone-tip"
          >{{ tooltip(zone) }}</span>
        </button>
      </div>

      <div
        class="roll-labels"
        aria-hidden="true"
      >
        <span
          v-for="zone in zones"
          :key="zone.tier"
          class="zone-label"
          :class="{ gain: isGain(zone), loss: isLoss(zone), silent: zone.chance === 0 }"
          :data-tier="zone.tier"
          :style="{ left: `${zone.start + (zone.end - zone.start) / 2}%` }"
        >
          <span
            v-if="showLabel(zone)"
            class="letter disp"
          >{{ zoneLabel(zone) }}</span>
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.roll {
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
}
.roll-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-height: 18px;
}
.roll-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--text);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}
.roll-title svg { color: var(--gold); }
.roll-note {
  margin-left: auto;
  color: var(--gold);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-align: right;
}
.roll-locked {
  margin-left: auto;
  color: var(--teal);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

/* Headroom for the pin flags only when there are pins; the call and pacts
   lines carry none and would otherwise float under an empty band. */
.roll-stage {
  position: relative;
  padding-top: 4px;
}
.roll-stage.pinned { padding-top: 30px; }

/* Ruler: a hairline of tick marks over the strip. */
.roll-ruler {
  height: 7px;
  margin-bottom: 3px;
  background-image:
    repeating-linear-gradient(90deg, var(--line-5) 0 1px, transparent 1px 10%),
    repeating-linear-gradient(90deg, var(--line-2) 0 1px, transparent 1px 2%);
  background-size: 100% 7px, 100% 4px;
  background-position: 0 0, 0 100%;
  background-repeat: no-repeat;
  box-shadow: inset -1px 0 var(--line-5);
}

.roll-strip {
  position: relative;
  height: 28px;
  background: var(--rail);
  box-shadow: inset 0 0 0 1px var(--line-2);
  overflow: visible;
}
.zone {
  position: absolute;
  top: 0;
  bottom: 0;
  padding: 0;
  border: 0;
  cursor: help;
  background: color-mix(in srgb, var(--tier-c) 15%, transparent);
  box-shadow: inset 0 2px 0 var(--tier-c), inset -1px 0 0 var(--ground);
  transition: filter var(--dur-fast), background-color var(--dur-fast);
}
.zone[data-tier='C'] { --zone: var(--tier-c); }
.zone[data-tier='B'] { --zone: var(--tier-b); }
.zone[data-tier='A'] { --zone: var(--tier-a); }
.zone[data-tier='S'] { --zone: var(--tier-s); }
.zone[data-tier='S+'] { --zone: var(--tier-splus); }
.zone-label[data-tier='C'] { --zone: var(--tier-c); }
.zone-label[data-tier='B'] { --zone: var(--tier-b); }
.zone-label[data-tier='A'] { --zone: var(--tier-a); }
.zone-label[data-tier='S'] { --zone: var(--tier-s); }
.zone-label[data-tier='S+'] { --zone: var(--tier-splus); }
.zone[data-tier='B'] { background: color-mix(in srgb, var(--tier-b) 18%, transparent); }
.zone[data-tier='A'] { background: color-mix(in srgb, var(--tier-a) 20%, transparent); }
.zone[data-tier='S'] { background: color-mix(in srgb, var(--tier-s) 22%, transparent); }
.zone[data-tier='S+'] { background: color-mix(in srgb, var(--tier-splus) 30%, transparent); }
.zone.gain {
  background: color-mix(in srgb, var(--zone) 40%, transparent);
  box-shadow: inset 0 2px 0 var(--zone), inset -1px 0 0 var(--ground);
}
.zone.loss {
  background: color-mix(in srgb, var(--zone) 10%, transparent);
  box-shadow: inset 0 2px 0 color-mix(in srgb, var(--zone) 55%, transparent), inset -1px 0 0 var(--ground);
}
.zone.silent { background: transparent; box-shadow: inset -1px 0 0 var(--line-1); }
.zone:hover, .zone:focus-visible { filter: brightness(1.35); }

/* The delta chunk is the movement itself, drawn over the final zone: gold
   where the tier gained ground, a red hatch where it gave ground away. */
.zone-delta {
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 2;
  pointer-events: none;
  animation: delta-in var(--dur-med) var(--ease-out) both;
}
.zone-delta.gain {
  background:
    repeating-linear-gradient(-45deg, rgba(255, 255, 255, 0.22) 0 2px, transparent 2px 6px),
    color-mix(in srgb, var(--gold-bright) 34%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--gold-bright) 65%, transparent);
  transform-origin: left center;
}
.zone-delta.loss {
  background:
    repeating-linear-gradient(-45deg, color-mix(in srgb, var(--red) 45%, transparent) 0 2px, transparent 2px 7px);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--red) 55%, transparent);
  transform-origin: right center;
}
@keyframes delta-in {
  from { opacity: 0; transform: scaleX(0.4); }
  to { opacity: 1; transform: none; }
}

.zone-tip {
  position: absolute;
  z-index: 20;
  bottom: calc(100% + 12px);
  left: 50%;
  transform: translateX(-50%);
  padding: 6px 9px;
  white-space: nowrap;
  background: var(--raised);
  box-shadow: inset 0 0 0 1px var(--line-4), 0 8px 18px rgba(0, 0, 0, 0.55);
  color: var(--text);
  font: 700 12px var(--font-body);
  letter-spacing: 0.06em;
  pointer-events: none;
}

.roll-labels {
  position: relative;
  height: 34px;
}
.zone-label {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  color: var(--tier-c);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.02em;
  white-space: nowrap;
}
.zone-label[data-tier='C'] { color: var(--tier-c); }
.zone-label[data-tier='B'] { color: var(--tier-b); }
.zone-label[data-tier='A'] { color: var(--tier-a); }
.zone-label[data-tier='S'] { color: var(--tier-s); }
.zone-label[data-tier='S+'] { color: var(--tier-splus); }
.zone-label::before {
  content: '';
  position: absolute;
  top: -10px;
  left: 50%;
  width: 1px;
  height: 6px;
  background: currentColor;
  opacity: 0.6;
}
.zone-label .letter { font-size: 17px; line-height: 1; }
.zone-label.gain .letter { color: var(--gold-bright); text-shadow: 0 0 12px rgba(255, 214, 66, 0.5); }
.zone-label.loss .letter { opacity: 0.75; }
.zone-label.silent { opacity: 0; }

/* Pins: one needle per loot option, coloured by the tier it landed in. */
.roll-pins {
  position: absolute;
  inset: 0 0 34px;
  z-index: 6;
  pointer-events: none;
}
.pin {
  position: absolute;
  top: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform: translateX(-50%);
  animation: pin-land 900ms var(--ease-out) both;
}
.pin-flag {
  z-index: 2;
  padding: 4px 7px 3px;
  background: var(--ground);
  color: var(--text);
  font-size: 15px;
  line-height: 1;
  box-shadow: inset 0 0 0 1px var(--pin, var(--teal)), 0 0 14px color-mix(in srgb, var(--pin, var(--teal)) 55%, transparent);
}
.pin[data-tier='C'] { --pin: var(--tier-c); }
.pin[data-tier='B'] { --pin: var(--tier-b); }
.pin[data-tier='A'] { --pin: var(--tier-a); }
.pin[data-tier='S'] { --pin: var(--tier-s); }
.pin[data-tier='S+'] { --pin: var(--tier-splus); }
.pin-needle {
  flex: 1;
  width: 3px;
  margin-bottom: -8px;
  background: var(--pin, var(--teal));
  box-shadow: 0 0 8px #fffbe6, 0 0 18px var(--pin, var(--teal));
}

.roll.compact .roll-strip { height: 22px; }
.roll.compact .roll-stage.pinned { padding-top: 26px; }
.roll.compact .roll-labels { height: 27px; }
.roll.compact .zone-label .letter { font-size: 14px; }
.roll.compact .pin-flag { font-size: 12px; padding: 3px 5px 2px; }
.roll.compact .roll-title { font-size: 10px; }
.roll.locked .zone { filter: saturate(0.6); }

@keyframes pin-land {
  0% { opacity: 0; transform: translate(-50%, -26px); }
  60% { opacity: 1; transform: translate(-50%, 2px); }
  80% { transform: translate(-50%, -1px); }
  100% { opacity: 1; transform: translate(-50%, 0); }
}

@media (prefers-reduced-motion: reduce) {
  .pin { animation: none; }
  .zone-delta { animation: none; }
}
</style>
