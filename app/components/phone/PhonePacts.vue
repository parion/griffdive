<script setup lang="ts">
import { pactName } from '~~/shared/data/pacts'
import { conditionRiskAt } from '~~/shared/engine/config'
import { PACT_BANS_STRATAGEM, applyPactToggle, hasLegalLoadout, pactConflictsWith, pactRiskTotal, pactSubsumedBy } from '~~/shared/engine/pacts'
import { tierZones } from '~~/shared/engine/rewards'
import { activeMisfortune, currentStrain, pactOfferFor, teamRiskOf } from '~~/shared/engine/selectors'
import type { DiverState, DiveState, RewardTier } from '~~/shared/engine/types'

const props = defineProps<{
  state: DiveState
  selfId: string | null
  self: DiverState | null
  canControl: boolean
}>()
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

watch(selection, ids => emit('preview', ids), { immediate: true })

function toggle(pactId: string): void {
  if (locked.value) {
    return
  }
  selection.value = applyPactToggle(offer.value.map(pact => pact.id), selection.value, pactId)
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

const zones = computed(() => tierZones(props.state.difficulty, pactValue(selection.value)))
const previewValor = computed(() => {
  if (hoveredId.value) {
    const isOn = selection.value.includes(hoveredId.value)
    const ids = isOn
      ? selection.value.filter(id => id !== hoveredId.value)
      : [...selection.value, hoveredId.value]
    return pactValue(ids)
  }
  return teamRisk.value
})
const previewZones = computed(() => tierZones(props.state.difficulty, previewValor.value))
const deltas = computed<Partial<Record<RewardTier, number>>>(() => {
  const result: Partial<Record<RewardTier, number>> = {}
  for (const zone of zones.value) {
    const before = previewZones.value.find(entry => entry.tier === zone.tier)
    if (!before) {
      continue
    }
    const delta = (zone.chance - before.chance) * 100
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
  return `Bans ${names.slice(0, 2).join(', ')}${names.length > 2 ? '…' : ''}`
}

const ctaLabel = computed(() => {
  const count = selection.value.length
  return count === 0 ? 'Dive with no pacts' : `Swear ${count} pact${count === 1 ? '' : 's'}`
})

function lockNow(): void {
  if (!locked.value) {
    emit('lock', selection.value)
  }
}
</script>

<template>
  <section class="phone-pacts">
    <header class="head">
      <span class="kick">Your move</span>
      <h1 class="disp title">
        Swear your pacts
      </h1>
      <p class="lede">
        Pacts only affect you. A broken pact costs a loot option, or Penance if only the stats screen can prove it.
      </p>
    </header>

    <div
      v-if="misfortune"
      class="directive"
    >
      <span class="cap">Squad directive</span>
      <RiskPips
        :value="conditionRiskAt(misfortune.id, state.difficulty)"
        :max="conditionRiskAt(misfortune.id, state.difficulty)"
        tone="gold"
      />
      <b class="disp">{{ misfortune.name }}</b>
      <span class="dir-rule"><ConditionRule :condition="misfortune" /></span>
      <span
        v-if="strain"
        class="strain"
      >{{ strain.name }} · whole operation</span>
    </div>
    <div
      v-else
      class="directive"
    >
      <span class="cap">Squad directive</span>
      <b class="disp">Safe dive</b>
      <span class="dir-rule">No directive this mission.</span>
    </div>

    <PactPenance
      :self="self"
      :difficulty="state.difficulty"
    />

    <div class="hand">
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
        :tilt="selection.includes(pact.id) ? 0 : index % 2 === 0 ? -0.8 : 0.8"
        compact
        :open="false"
        @select="toggle(pact.id)"
        @mouseenter="hoveredId = pact.id"
        @mouseleave="hoveredId = null"
        @focus="hoveredId = pact.id"
        @blur="hoveredId = null"
      />
    </div>

    <ValorRoll
      :zones="zones"
      :deltas="deltas"
      :note="selectionNames ? `With ${selectionNames}` : 'No pacts sworn'"
      :locked="locked"
      compact
    />

    <PhoneActionBar>
      <template #primary>
        <button
          v-if="!locked"
          class="bar-cta cta-sweep"
          type="button"
          :disabled="offer.length === 0"
          @click="lockNow"
        >
          <span class="disp">{{ ctaLabel }}</span>
        </button>
        <span
          v-else
          class="bar-gate"
        >Waiting on squad</span>
      </template>
    </PhoneActionBar>
  </section>
</template>

<style scoped>
.phone-pacts { display: flex; flex-direction: column; gap: 11px; min-width: 0; }
.head { display: flex; flex-direction: column; gap: 5px; }
.kick {
  color: var(--gold);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}
.title { font-size: 34px; }
.lede { margin: 0; color: var(--muted); font-size: 12px; line-height: 1.4; }
.directive {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 9px;
  min-height: 38px;
  padding: 5px 9px;
  background: linear-gradient(90deg, rgba(255, 214, 66, 0.1), var(--panel) 60%);
  box-shadow: inset 0 0 0 1px var(--line-3);
}
.directive .disp { color: var(--gold); font-size: 16px; }
.dir-rule { color: var(--khaki); font-size: 11px; }
.strain { margin-left: auto; color: var(--orange); font-size: 9px; letter-spacing: 0.06em; text-transform: uppercase; }
.hand { display: flex; flex-direction: column; gap: 9px; }
</style>
