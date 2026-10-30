<script setup lang="ts">
import { pactName } from '~~/shared/data/pacts'
import { conditionRiskAt } from '~~/shared/engine/config'
import { PACT_BANS_STRATAGEM, applyPactToggle, hasLegalLoadout, pactConflictsWith, pactRiskTotal, pactSubsumedBy } from '~~/shared/engine/pacts'
import { tierZones } from '~~/shared/engine/rewards'
import { activeMisfortune, currentStrain, pactOfferFor, teamRiskOf } from '~~/shared/engine/selectors'
import type { DiverState, DiveState, RewardTier } from '~~/shared/engine/types'

const props = withDefaults(defineProps<{
  state: DiveState
  selfId: string | null
  self: DiverState | null
  canControl?: boolean
}>(), { canControl: true })
const { itemById } = useTierCatalog()

const emit = defineEmits<{
  lock: [pactIds: string[]]
  preview: [pactIds: string[]]
}>()

const selection = ref<string[]>([])
const hoveredId = ref<string | null>(null)

// A new draw or directive invalidates the hand. Watch the sources themselves:
// an array literal is a fresh object on every squad sync, which would wipe the
// hand whenever a teammate locked in.
watch(
  [() => props.state.wheel?.seed, () => props.state.misfortuneAccepted],
  () => {
    selection.value = []
  },
)

const offer = computed(() =>
  props.selfId ? pactOfferFor(props.state, props.selfId) : [])

const misfortune = computed(() => activeMisfortune(props.state))
const strain = computed(() => currentStrain(props.state))
const locked = computed(() => Boolean(props.self?.pactsLocked))
const teamRisk = computed(() => teamRiskOf(props.state))
const owned = computed(() => props.state.personalInventories[props.selfId ?? ''] ?? [])

watch(
  selection,
  (ids) => {
    emit('preview', ids)
  },
  { immediate: true },
)

function toggle(pactId: string): void {
  if (locked.value) {
    return
  }
  selection.value = applyPactToggle(
    offer.value.map(pact => pact.id),
    selection.value,
    pactId,
  )
  // The pointer is still over the card after a tap; clear the hover preview so
  // the strip settles on the hand that is actually sworn.
  hoveredId.value = null
}

const coverage = computed<Record<string, string>>(() => {
  const blocked: Record<string, string> = {}
  const misfortuneId = misfortune.value?.id ?? null
  const kit = owned.value
  const baseLegal = hasLegalLoadout(misfortuneId, [], kit)
  for (const pact of offer.value) {
    if (selection.value.includes(pact.id)) {
      continue
    }
    const subsumer = pactSubsumedBy(pact.id, selection.value)
    if (subsumer) {
      blocked[pact.id] = `Covered by ${pactName(subsumer)}`
      continue
    }
    const conflict = pactConflictsWith(pact.id, selection.value)
    if (conflict) {
      blocked[pact.id] = `Conflicts with ${pactName(conflict)}`
      continue
    }
    if (baseLegal && !hasLegalLoadout(misfortuneId, [...selection.value, pact.id], kit)) {
      blocked[pact.id] = 'Leaves too few stratagems to ready up'
    }
  }
  return blocked
})

function riskOf(pactId: string): number {
  return conditionRiskAt(pactId, props.state.difficulty)
}

function pactValue(ids: string[]): number {
  return teamRisk.value + pactRiskTotal(ids, props.state.difficulty)
}

const currentValor = computed(() => pactValue(selection.value))
const zones = computed(() => tierZones(props.state.difficulty, currentValor.value))

// Previewing a card lights the ground it wins. With nothing hovered, the strip
// compares the current hand against the team floor, so every sworn pact keeps
// its percentage-point gain visible.
const previewValor = computed(() => {
  if (hoveredId.value) {
    const isOn = selection.value.includes(hoveredId.value)
    const ids = isOn
      ? selection.value.filter(id => id !== hoveredId.value)
      : [...selection.value, hoveredId.value]
    return pactValue(ids)
  }
  return currentValor.value
})

const previewZones = computed(() => tierZones(props.state.difficulty, previewValor.value))

const deltas = computed<Partial<Record<RewardTier, number>>>(() => {
  const result: Partial<Record<RewardTier, number>> = {}
  for (const zone of zones.value) {
    const before = previewZones.value.find(entry => entry.tier === zone.tier)
    if (!before) {
      continue
    }
    const delta = (before.chance - zone.chance) * 100
    if (Math.abs(delta) >= 0.5) {
      result[zone.tier] = delta
    }
  }
  return result
})

const selectionNames = computed(() =>
  selection.value.map(id => pactName(id)).join(' · '))

function bannedNote(pactId: string): string {
  const predicate = PACT_BANS_STRATAGEM[pactId]
  if (!predicate) {
    return ''
  }
  const names = owned.value
    .map(id => itemById(id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .filter(item => predicate(item))
    .map(item => item.displayName)
  if (names.length === 0) {
    return ''
  }
  return `Bans ${names.slice(0, 3).join(', ')}${names.length > 3 ? '…' : ''}`
}

const ctaLabel = computed(() => {
  const count = selection.value.length
  if (count === 0) {
    return 'Dive with no pacts'
  }
  return `Swear ${count} pact${count === 1 ? '' : 's'}`
})

function lockNow(): void {
  if (!locked.value) {
    emit('lock', selection.value)
  }
}
</script>

<template>
  <section class="pact-screen">
    <header class="pact-head">
      <span class="kick">Your move</span>
      <h1 class="disp pact-title">
        Swear your pacts
      </h1>
      <p class="pact-sub">
        Pacts only affect you. A broken pact costs a loot option, or Penance if only the stats screen can prove it.
      </p>
    </header>

    <div
      v-if="misfortune"
      class="directive-strip"
    >
      <span class="cap">Squad directive</span>
      <RiskPips
        :value="conditionRiskAt(misfortune.id, state.difficulty)"
        :max="conditionRiskAt(misfortune.id, state.difficulty)"
        tone="red"
      />
      <b class="disp directive-name">{{ misfortune.name }}</b>
      <span class="directive-rule"><ConditionRule :condition="misfortune" /></span>
      <span
        v-if="strain"
        class="strain-note"
      >{{ strain.name }} · whole operation</span>
    </div>
    <div
      v-else
      class="directive-strip safe"
    >
      <span class="cap">Squad directive</span>
      <b class="disp directive-name">Safe dive</b>
      <span class="directive-rule">No directive this mission.</span>
    </div>

    <PactPenance
      :self="self"
      :difficulty="state.difficulty"
    />

    <div
      class="hand"
      role="group"
      aria-label="Pact offer"
    >
      <ConditionCard
        v-for="(pact, index) in offer"
        :key="pact.id"
        :condition="pact"
        :risk="riskOf(pact.id)"
        :selected="selection.includes(pact.id)"
        :stamp="selection.includes(pact.id) ? 'Sworn' : ''"
        :blocked="coverage[pact.id] ?? ''"
        :note="bannedNote(pact.id)"
        :disabled="locked"
        :tilt="selection.includes(pact.id) ? 0 : index % 2 === 0 ? -1.1 : 1.1"
        @select="toggle(pact.id)"
        @mouseenter="hoveredId = pact.id"
        @mouseleave="hoveredId = null"
        @focus="hoveredId = pact.id"
        @blur="hoveredId = null"
      />
    </div>

    <ValorRoll
      :zones="previewZones"
      :deltas="deltas"
      :note="selectionNames ? `With ${selectionNames}` : 'No pacts sworn'"
      :locked="locked"
    />

    <div class="pact-cta">
      <button
        v-if="!locked"
        class="cta cut cta-sweep"
        type="button"
        :disabled="offer.length === 0"
        @click="lockNow"
      >
        {{ ctaLabel }}
        <svg
          width="22"
          height="14"
          viewBox="0 0 22 14"
          aria-hidden="true"
        >
          <path
            d="M0 0h5l7 7-7 7H0l7-7zM10 0h5l7 7-7 7h-5l7-7z"
            fill="currentColor"
          />
        </svg>
      </button>
      <div
        v-else
        class="locked-row"
        role="status"
      >
        <span class="locked-stamp disp">Sworn</span>
        <span class="locked-copy">
          <b>{{ selectionNames || 'No pacts' }}</b>
          <span>Waiting for the rest of the squad…</span>
        </span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.pact-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  width: 100%;
  max-width: 1040px;
  margin: 0 auto;
}
.pact-screen > * { width: 100%; }
.pact-head { display: flex; flex-direction: column; gap: 8px; align-items: center; text-align: center; }
.kick {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--gold);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.24em;
  text-transform: uppercase;
}
.kick::before,
.kick::after {
  content: '';
  width: 22px;
  height: 2px;
  background: currentColor;
  box-shadow: 0 0 8px currentColor;
}
.pact-title { font-size: clamp(36px, 3.8vw, 52px); }
.pact-sub { margin: 0; color: var(--muted); font-size: 14px; }

.directive-strip {
  width: auto;
  max-width: 100%;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px 12px;
  min-height: 42px;
  padding: 6px 12px;
  background: linear-gradient(90deg, rgba(255, 214, 66, 0.1), var(--panel) 60%);
  box-shadow: inset 3px 0 0 var(--gold), inset 0 0 0 1px var(--line-3);
  clip-path: polygon(0 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%);
}
.directive-strip.safe { background: var(--panel); }
.directive-name { font-size: 18px; color: var(--gold); }
.directive-rule { color: var(--khaki); font-size: 13px; }
.strain-note {
  color: var(--orange);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hand {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 300px));
  justify-content: center;
  gap: 28px;
  align-items: stretch;
  padding-top: 6px;
}
.hand > :deep(*) { animation: deal-in 0.5s var(--ease-out) both; }
.hand > :deep(:nth-child(2)) { animation-delay: 90ms; }
.hand > :deep(:nth-child(3)) { animation-delay: 180ms; }
.hand > :deep(:nth-child(4)) { animation-delay: 270ms; }
@keyframes deal-in {
  from { opacity: 0; translate: 0 26px; }
  to { opacity: 1; translate: 0 0; }
}
.pact-screen > :deep(.roll) { max-width: 640px; }
.hand > * { min-width: 0; }

.pact-cta { display: flex; justify-content: center; }
.cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  width: min(100%, 460px);
  min-height: 58px;
  padding: 0 24px;
  border: 0;
  background: linear-gradient(180deg, #ffe57a 0%, var(--gold) 45%, #f0bf1a 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6), inset 0 -3px 0 rgba(110, 80, 0, 0.35), 0 0 34px rgba(255, 214, 66, 0.24);
  color: var(--on-gold);
  font: 800 17px var(--font-display);
  font-stretch: 125%;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
}
.cta:disabled { opacity: 0.4; cursor: not-allowed; }

.locked-row {
  display: flex;
  align-items: center;
  gap: 20px;
  width: min(100%, 620px);
  min-height: 58px;
}
.locked-stamp {
  padding: 5px 14px;
  border: 3px solid var(--gold);
  color: var(--gold);
  font-size: 22px;
  transform: rotate(-7deg);
  -webkit-mask-image: repeating-linear-gradient(118deg, #000 0 3px, rgba(0, 0, 0, 0.45) 3px 4px, #000 4px 9px);
  mask-image: repeating-linear-gradient(118deg, #000 0 3px, rgba(0, 0, 0, 0.45) 3px 4px, #000 4px 9px);
}
.locked-copy { display: flex; flex-direction: column; gap: 4px; font-size: 13px; }
.locked-copy b { color: var(--text); }
.locked-copy span { color: var(--muted); font-size: 12px; }

@media (max-width: 720px) {
  .pact-screen { gap: 12px; }
  .pact-title { font-size: 38px; }
  .hand { grid-template-columns: minmax(0, 1fr); gap: 10px; }
  .pact-cta { justify-content: stretch; }
  .cta { width: 100%; }
}
</style>
