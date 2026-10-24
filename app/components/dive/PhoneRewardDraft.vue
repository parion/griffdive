<script setup lang="ts">
import { ALL_WARBOND_CODES } from '~~/shared/data/catalog'
import { MAX_DIFFICULTY } from '~~/shared/engine/config'
import { itemImageUrl } from '~~/shared/data/images'
import { bankedOptionId, tierZones, topTierOf } from '~~/shared/engine/rewards'
import type { RewardOption } from '~~/shared/engine/rewards'
import {
  allDiversPicked,
  canRerollRewards,
  diverOptions,
  draftSummaryFor,
  honorsPending,
  pactRiskOf,
  rewardPoolFor,
  teamRiskOf,
} from '~~/shared/engine/selectors'
import type { DiverState, DiveState, RewardTier } from '~~/shared/engine/types'
import { categoryLabel } from '~/utils/itemCategory'
import { pinDelay, revealDuration, revealTimeline } from '~/utils/rewardReveal'

const props = defineProps<{
  state: DiveState
  selfId: string | null
  self: DiverState | null
  canControl: boolean
  opLength: number
}>()

const emit = defineEmits<{
  pick: [optionId: string, choiceItemId?: string]
  reroll: []
  advance: []
}>()

const options = computed(() => (props.self ? diverOptions(props.state, props.self) : []))
const selectedId = ref<string | null>(null)
const choiceItemId = ref<string | null>(null)

const rewardPool = computed(() => {
  if (!props.self) {
    return []
  }
  const banned = new Set(props.self.bannedItemIds)
  return rewardPoolFor(props.self.warbondCodes ?? ALL_WARBOND_CODES)
    .filter(item => !banned.has(item.id))
})
const ownedIds = computed(() => props.state.personalInventories[props.selfId ?? ''] ?? [])
const squadDrafts = computed(() =>
  props.state.divers
    .filter(diver => diver.id !== props.selfId)
    .map(diver => ({ id: diver.id, name: upperName(diver.name), summary: draftSummaryFor(props.state, diver) })),
)

const canReroll = computed(() =>
  props.self ? canRerollRewards(props.state, props.self).allowed : false)
const ready = computed(() => allDiversPicked(props.state))
const resolved = computed(() =>
  props.self !== null && (props.self.pickedOptionId !== null || props.self.rewardBanned))

const teamRisk = computed(() => teamRiskOf(props.state))
const pactRisk = computed(() => (props.self ? pactRiskOf(props.self, props.state.difficulty) : 0))
const zones = computed(() => tierZones(props.state.difficulty, teamRisk.value + pactRisk.value))
const bestTier = computed<RewardTier | null>(() => topTierOf(options.value))
// Liberty's Cross unfurls as its own band above the cards; the cards deal in
// top to bottom and the band opens last as the finale.
const cards = computed(() => options.value.filter(option => !option.choice))
// Remounting on a new offer replays the unfurl after a reroll.
const offerKey = computed(() => options.value.map(option => option.optionId).join())
// A sync rebuilds `options` on every squadmate's action, so only a genuinely
// new offer clears the local pick — a teammate banking must never drop it.
watch(offerKey, () => {
  selectedId.value = null
  choiceItemId.value = null
})
const crossOption = computed(() => options.value.find(option => option.choice) ?? null)
const offerOrder = computed(() =>
  crossOption.value ? [...cards.value, crossOption.value] : cards.value)
const cues = computed(() => {
  const timeline = revealTimeline(offerOrder.value.map(tierOf))
  return new Map(offerOrder.value.map((option, index) => [option.optionId, timeline[index]!]))
})
// A reload onto a resolved draft shows the settled list, no replay.
const instantReveal = resolved.value
// Hold the squad's drafts back until the local reveal has landed: a teammate's
// early bank must never pre-empt the fanfare. Banking settles at once; a
// reroll replays the hold.
const squadRevealed = useRevealComplete(
  () => `${offerKey.value}|${resolved.value ? 1 : 0}`,
  () => (resolved.value ? 0 : revealDuration(offerOrder.value.map(tierOf))),
)
const markers = computed(() =>
  options.value.flatMap(option => typeof option.roll === 'number'
    ? [{
        key: option.optionId,
        roll: option.roll,
        tier: tierOf(option),
        delay: instantReveal ? undefined : pinDelay(cues.value.get(option.optionId)!),
      }]
    : []))

const honorsLocked = computed(() => honorsPending(props.state))
const advanceLabel = computed(() =>
  props.state.missionInOperation >= props.opLength
    ? `Start operation ${Math.min(props.state.difficulty + 1, MAX_DIFFICULTY)}`
    : 'Next mission')

function tierOf(option: RewardOption): RewardTier {
  return option.tier ?? (option.item.tier.toUpperCase() as RewardTier)
}

function nameOf(option: RewardOption): string {
  return option.choice ? 'Liberty’s Cross' : option.item.displayName
}

function choose(option: RewardOption): void {
  if (resolved.value) {
    return
  }
  selectedId.value = selectedId.value === option.optionId ? null : option.optionId
  choiceItemId.value = null
}

function chooseCross(itemId: string): void {
  if (resolved.value || !crossOption.value) {
    return
  }
  selectedId.value = crossOption.value.optionId
  choiceItemId.value = itemId
}

const selectedOption = computed(() =>
  options.value.find(option => option.optionId === selectedId.value) ?? null)
const selectedName = computed(() => {
  if (!selectedOption.value) {
    return ''
  }
  if (selectedOption.value.choice && choiceItemId.value) {
    return rewardPool.value.find(item => item.id === choiceItemId.value)?.displayName ?? 'Liberty’s Cross'
  }
  return nameOf(selectedOption.value)
})

function bank(): void {
  if (!selectedId.value) {
    return
  }
  if (selectedOption.value?.choice && !choiceItemId.value) {
    return
  }
  emit('pick', selectedId.value, choiceItemId.value ?? undefined)
}

const bankedId = computed(() => bankedOptionId(options.value, props.self?.pickedOptionId ?? null))
const pickedOption = computed(() =>
  options.value.find(option => option.optionId === bankedId.value) ?? null)
const crossChosenName = computed(() =>
  selectedOption.value?.choice && choiceItemId.value ? selectedName.value : null)
const pickedName = computed(() =>
  pickedOption.value ? nameOf(pickedOption.value) : (props.self?.pickedOptionId ? 'item' : ''))
</script>

<template>
  <section class="phone-loot">
    <header class="head">
      <span class="kick">Liberty provides · {{ '★'.repeat(state.lastReport?.stars ?? 0) }}</span>
      <h1 class="disp title">
        Bank one item
      </h1>
    </header>

    <ValorRoll
      v-if="options.length"
      :zones="zones"
      :markers="markers"
      label="Your Valor rolls"
      :note="`Best ${bestTier ?? '—'}`"
      compact
    />

    <LibertyCrossBand
      v-if="crossOption"
      :key="offerKey"
      class="phone-cross"
      :pool="rewardPool"
      :owned-ids="ownedIds"
      :delay="instantReveal ? 0 : cues.get(crossOption.optionId)!.start"
      :instant="instantReveal"
      :can-pick="!resolved"
      :picked="selectedId === crossOption.optionId || bankedId === crossOption.optionId"
      :dimmed="resolved && bankedId !== crossOption.optionId"
      :stamp="resolved && bankedId === crossOption.optionId ? 'Banked' : null"
      :chosen-name="crossChosenName"
      @choose="chooseCross"
    />

    <div class="cards">
      <RewardReveal
        v-for="option in cards"
        :key="option.optionId"
        :cue="cues.get(option.optionId)!"
        :instant="instantReveal"
        :muted="resolved && bankedId !== option.optionId"
      >
        <button
          class="loot-card"
          :class="{ selected: selectedId === option.optionId, faded: resolved && bankedId !== option.optionId }"
          :data-tier="tierOf(option)"
          type="button"
          :aria-pressed="selectedId === option.optionId"
          :aria-label="`${nameOf(option)}, ${tierOf(option)} tier${option.roll ? `, rolled ${option.roll}` : ''}`"
          @click="choose(option)"
        >
          <span class="thumb">
            <img
              v-if="itemImageUrl(option.item)"
              :src="itemImageUrl(option.item)"
              alt=""
              loading="lazy"
              draggable="false"
            >
          </span>
          <span class="card-copy">
            <span class="cat">{{ categoryLabel(option.item.category) }}</span>
            <span
              class="name disp"
              :style="fitWord(nameOf(option))"
            >{{ nameOf(option) }}</span>
            <span
              v-if="selectedId === option.optionId"
              class="pick-mark"
            >Selected ✓</span>
          </span>
          <span class="tier disp">{{ tierOf(option) }}</span>
        </button>
      </RewardReveal>
    </div>

    <div
      v-if="squadDrafts.length && squadRevealed"
      class="squad-mini"
    >
      <span class="cap">Squad drafts</span>
      <div
        v-for="draft in squadDrafts"
        :key="draft.id"
        class="draft-row"
      >
        <b>{{ draft.name }}</b>
        <span>{{ draft.summary.status === 'banked' ? 'Banked ✓' : draft.summary.status === 'skipped' ? 'Sat out' : 'Picking…' }}</span>
      </div>
    </div>

    <PhoneActionBar>
      <template #secondary>
        <button
          class="bar-alt"
          type="button"
          :disabled="!canReroll || resolved"
          @click="emit('reroll')"
        >
          Reroll
        </button>
      </template>
      <template #primary>
        <button
          v-if="!resolved"
          class="bar-cta cta-sweep"
          type="button"
          :disabled="!selectedId"
          @click="bank"
        >
          <span class="disp">{{ selectedId ? `Bank ${selectedName}` : 'Select an item' }}</span>
        </button>
        <button
          v-else-if="ready && canControl"
          class="bar-cta cta-sweep"
          type="button"
          :disabled="honorsLocked"
          @click="emit('advance')"
        >
          <span class="disp">{{ honorsLocked ? 'Award Squad Honors first' : advanceLabel }}</span>
        </button>
        <span
          v-else
          class="bar-gate"
        >{{ pickedName ? `Banked ${pickedName}` : 'Draft resolved' }}</span>
      </template>
    </PhoneActionBar>
  </section>
</template>

<style scoped>
.phone-loot { display: flex; flex-direction: column; gap: 11px; min-width: 0; }
.phone-cross { --cross-gap: 11px; }
.head { display: flex; flex-direction: column; gap: 5px; }
.kick {
  color: var(--gold);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.title { font-size: 34px; }
.cards { display: flex; flex-direction: column; gap: 10px; }
.loot-card {
  --tier: var(--tier-c);
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 110px;
  padding: 7px 12px 7px 7px;
  border: 1px solid var(--line-3);
  background: linear-gradient(90deg, color-mix(in srgb, var(--tier) 12%, var(--panel)), var(--panel) 55%);
  color: var(--text);
  text-align: left;
  font: inherit;
  cursor: pointer;
}
.loot-card[data-tier='C'] { --tier: var(--tier-c); }
.loot-card[data-tier='B'] { --tier: var(--tier-b); }
.loot-card[data-tier='A'] { --tier: var(--tier-a); }
.loot-card[data-tier='S'] { --tier: var(--tier-s); }
.loot-card[data-tier='S+'] { --tier: var(--tier-splus); }
.loot-card.selected {
  border-color: var(--tier);
  box-shadow: inset 0 0 0 2px var(--tier), 0 0 18px color-mix(in srgb, var(--tier) 25%, transparent);
}
.loot-card.faded { opacity: 0.45; }
/* The art leads the row; the name is its caption. */
.thumb {
  position: relative;
  display: grid;
  place-items: center;
  width: 96px;
  height: 96px;
  flex: none;
  background:
    radial-gradient(ellipse 70% 70% at 50% 55%, color-mix(in srgb, var(--tier) 18%, transparent), transparent 75%),
    var(--ground);
  box-shadow: inset 0 0 0 1px var(--line-2);
}
.thumb img {
  position: absolute;
  inset: 8%;
  width: 84%;
  height: 84%;
  object-fit: contain;
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.5));
}
.card-copy { container-type: inline-size; display: flex; flex-direction: column; gap: 3px; min-width: 0; flex: 1; }
.cat { color: var(--muted); font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; }
.name { font-size: min(15px, 100cqi / var(--fit-len, 1)); line-height: 1.1; }
.pick-mark { color: var(--tier); font-size: 9px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.tier {
  flex: none;
  color: var(--tier);
  font-size: 34px;
  line-height: 1;
  text-shadow: 0 0 14px color-mix(in srgb, var(--tier) 40%, transparent);
}
.loot-card:not([data-tier='C']) .tier { animation: slamIn 0.45s var(--ease-impact) var(--impact, 0ms) backwards; }
.squad-mini {
  display: flex;
  flex-direction: column;
  gap: 4px;
  animation: squad-in 0.4s var(--ease-out) backwards;
}
@keyframes squad-in {
  from { opacity: 0; translate: 0 10px; }
}
.draft-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 28px;
  padding: 0 8px;
  background: var(--panel);
  box-shadow: inset 0 0 0 1px var(--line-2);
  font-size: 11px;
}
.draft-row b { font-weight: 700; }
.draft-row span { color: var(--muted); font-size: 10px; }
</style>
