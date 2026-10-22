<script setup lang="ts">
import { ITEMS_BY_ID } from '~~/shared/data/catalog'
import { itemImageUrl } from '~~/shared/data/images'
import type { Item } from '~~/shared/data/types'
import type { RewardOption } from '~~/shared/engine/rewards'
import { tierZones, topTierOf } from '~~/shared/engine/rewards'
import type { DraftSummary } from '~~/shared/engine/selectors'
import type { RewardTier } from '~~/shared/engine/types'
import { categoryLabel } from '~/utils/itemCategory'

interface SquadDraft {
  id: string
  name: string
  summary: DraftSummary
}

const props = withDefaults(defineProps<{
  options: RewardOption[]
  pickedId: string | null
  pool: Item[]
  ownedIds: string[]
  optionsLost?: number
  squadDrafts?: SquadDraft[]
  tokenCount?: number
  canReroll?: boolean
  canBan?: boolean
  bannableIds?: string[]
  resolved?: boolean
  banned?: boolean
  bannedIds?: string[]
  ceiling?: RewardTier | null
  stars?: number
  difficulty?: number
  teamRisk?: number
  pactRisk?: number
  ready?: boolean
  bonusUp?: boolean
  canControl?: boolean
  kicker?: string
  variant?: 'reward' | 'promotion'
  title?: string
  picksLeft?: number
  picksTotal?: number
  baseTier?: RewardTier | null
  advanceLabel?: string
}>(), {
  optionsLost: 0,
  squadDrafts: () => [],
  tokenCount: 0,
  canReroll: false,
  canBan: false,
  bannableIds: () => [],
  resolved: false,
  banned: false,
  bannedIds: () => [],
  ceiling: null,
  stars: 0,
  difficulty: 3,
  teamRisk: 0,
  pactRisk: 0,
  ready: false,
  bonusUp: false,
  canControl: false,
  kicker: '',
  variant: 'reward',
  title: 'Bank one item',
  picksLeft: 0,
  picksTotal: 0,
  baseTier: null,
  advanceLabel: 'Next mission',
})

const emit = defineEmits<{
  pick: [optionId: string, choiceItemId?: string]
  reroll: []
  ban: [optionIds: string[]]
  openHonors: []
  advance: []
}>()

const promotion = computed(() => props.variant === 'promotion')
const selectedId = ref<string | null>(null)
const choiceItemId = ref<string | null>(null)
const choiceOpen = ref(false)

watch(() => props.options, () => {
  selectedId.value = null
  choiceItemId.value = null
}, { deep: false })

const resolved = computed(() => props.resolved || props.pickedId !== null)
const bestTier = computed<RewardTier | null>(() => topTierOf(props.options))
const zones = computed(() => tierZones(props.difficulty, props.teamRisk + props.pactRisk))
const markers = computed(() =>
  props.options
    .filter(option => typeof option.roll === 'number')
    .map(option => ({ roll: option.roll!, tier: tierOf(option) })),
)

function tierOf(option: RewardOption): RewardTier {
  return option.tier ?? (option.item.tier.toUpperCase() as RewardTier)
}

function rollOf(option: RewardOption): number | null {
  return typeof option.roll === 'number' ? option.roll : null
}

function nameOf(option: RewardOption): string {
  if (option.choice) {
    return 'Liberty’s Cross'
  }
  return option.item.displayName
}

function categoryOf(option: RewardOption): string {
  if (option.choice) {
    return 'Any item'
  }
  return categoryLabel(option.item.category)
}

function imageOf(option: RewardOption): string | undefined {
  return option.choice ? undefined : itemImageUrl(option.item)
}

function chosenItemName(): string {
  if (!selectedId.value) {
    return ''
  }
  const option = props.options.find(entry => entry.optionId === selectedId.value)
  if (!option) {
    return ''
  }
  if (option.choice && choiceItemId.value) {
    return ITEMS_BY_ID.get(choiceItemId.value)?.displayName ?? 'Liberty’s Cross'
  }
  return nameOf(option)
}

const pickedOption = computed(() =>
  props.options.find(option => option.optionId === props.pickedId) ?? null)
const pickedItem = computed(() => {
  if (!props.pickedId) {
    return null
  }
  const direct = ITEMS_BY_ID.get(props.pickedId)
  if (direct) {
    return direct
  }
  return pickedOption.value && !pickedOption.value.choice ? pickedOption.value.item : null
})
const pickedName = computed(() => {
  if (pickedItem.value) {
    return pickedItem.value.displayName
  }
  if (pickedOption.value?.choice) {
    return 'Liberty’s Cross'
  }
  return ''
})

function choose(option: RewardOption): void {
  if (resolved.value) {
    return
  }
  if (promotion.value) {
    emit('pick', option.optionId)
    return
  }
  if (option.choice) {
    selectedId.value = option.optionId
    choiceOpen.value = true
    return
  }
  selectedId.value = selectedId.value === option.optionId ? null : option.optionId
  choiceItemId.value = null
}

function chooseCross(itemId: string): void {
  choiceItemId.value = itemId
  choiceOpen.value = false
}

function bank(): void {
  if (!selectedId.value) {
    return
  }
  const option = props.options.find(entry => entry.optionId === selectedId.value)
  if (option?.choice && !choiceItemId.value) {
    choiceOpen.value = true
    return
  }
  emit('pick', selectedId.value, choiceItemId.value ?? undefined)
}

function reroll(): void {
  if (props.canReroll) {
    emit('reroll')
  }
}

const kickerText = computed(() => {
  if (promotion.value) {
    return props.kicker
  }
  const stars = '★'.repeat(Math.max(0, props.stars))
  return `Liberty provides · ${stars}`
})
</script>

<template>
  <section
    class="loot"
    :class="{ promotion }"
  >
    <header class="loot-head">
      <div class="head-copy">
        <span
          v-if="kickerText"
          class="kick"
        >{{ kickerText }}</span>
        <h1 class="disp loot-title">
          {{ promotion ? title : 'Bank one item' }}
        </h1>
        <p
          v-if="promotion"
          class="loot-sub"
        >
          Pick {{ picksLeft }} of {{ picksTotal }} promotion options. Every claim rerolls the offer.
        </p>
        <p
          v-else-if="optionsLost > 0"
          class="loot-sub red-text"
        >
          {{ optionsLost }} option{{ optionsLost === 1 ? '' : 's' }} forfeited by broken pacts.
        </p>
      </div>
      <div class="head-actions">
        <slot name="head-actions" />
        <span
          v-if="promotion && picksTotal > 0"
          class="picks"
          role="img"
          :aria-label="`${picksLeft} promotion picks left`"
        >
          <span
            v-for="i in picksTotal"
            :key="i"
            class="pick-hex"
            :class="{ on: i <= picksLeft }"
          >{{ i }}</span>
        </span>
      </div>
    </header>

    <ValorRoll
      v-if="!promotion && options.length"
      :zones="zones"
      :markers="markers"
      label="Your Valor rolls"
      :note="`One roll per option · best ${bestTier ?? '—'}`"
      compact
    />

    <div
      class="loot-grid"
      role="radiogroup"
      :aria-label="promotion ? 'Promotion options' : 'Reward options'"
    >
      <button
        v-for="(option, index) in options"
        :key="option.optionId"
        class="loot-card"
        :class="{
          selected: selectedId === option.optionId,
          banked: pickedId === option.optionId || (option.choice && pickedId !== null),
          faded: resolved && pickedId !== option.optionId && !(option.choice && pickedId !== null),
          cross: option.choice,
        }"
        :data-tier="tierOf(option)"
        type="button"
        role="radio"
        :aria-checked="selectedId === option.optionId"
        :aria-label="`${nameOf(option)}, ${tierOf(option)} tier${rollOf(option) ? `, rolled ${rollOf(option)}` : ''}`"
        :style="{ '--i': index }"
        @click="choose(option)"
      >
        <span class="tier-letter disp">{{ tierOf(option) }}</span>
        <span class="card-meta">
          <span
            v-if="rollOf(option)"
            class="roll-badge"
          >{{ rollOf(option) }}</span>
          <span class="cat">{{ categoryOf(option) }}</span>
        </span>

        <span
          v-if="option.choice"
          class="media cross-media"
          aria-hidden="true"
        >
          <span class="cross-mark disp">S+</span>
          <span class="cross-name">Liberty’s Cross</span>
        </span>
        <span
          v-else
          class="media"
          aria-hidden="true"
        >
          <img
            v-if="imageOf(option)"
            :src="imageOf(option)"
            alt=""
            loading="lazy"
            draggable="false"
          >
        </span>

        <span class="item-name disp">{{ nameOf(option) }}</span>
        <span
          v-if="selectedId === option.optionId"
          class="selected-mark"
        >Selected ✓</span>
        <span
          v-else-if="pickedId === option.optionId || (option.choice && pickedId !== null)"
          class="selected-mark banked-mark"
        >Banked ✓</span>
        <span
          v-else
          class="selected-mark empty"
        >{{ promotion ? 'Claim' : 'Select' }}</span>
      </button>
    </div>

    <div
      v-if="!promotion && squadDrafts.length"
      class="squad-row"
    >
      <SquadDraftBoard
        :drafts="squadDrafts"
        compact
      />
    </div>

    <div
      v-if="!promotion"
      class="loot-actions"
    >
      <button
        class="reroll"
        type="button"
        :disabled="!canReroll || resolved"
        @click="reroll"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          aria-hidden="true"
        >
          <rect
            x="3.5"
            y="3.5"
            width="17"
            height="17"
            rx="4.5"
          />
          <g
            fill="currentColor"
            stroke="none"
          >
            <circle
              cx="8.3"
              cy="8.3"
              r="1.5"
            />
            <circle
              cx="15.7"
              cy="8.3"
              r="1.5"
            />
            <circle
              cx="12"
              cy="12"
              r="1.5"
            />
            <circle
              cx="8.3"
              cy="15.7"
              r="1.5"
            />
            <circle
              cx="15.7"
              cy="15.7"
              r="1.5"
            />
          </g>
        </svg>
        {{ resolved ? 'Draft resolved' : `Reroll · ${tokenCount} token${tokenCount === 1 ? '' : 's'}` }}
      </button>

      <button
        v-if="!resolved"
        class="cta cut cta-sweep"
        type="button"
        :disabled="!selectedId"
        @click="bank"
      >
        {{ selectedId ? `Bank ${chosenItemName()}` : 'Select an item' }}
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
      <button
        v-else-if="ready && canControl"
        class="cta cut cta-sweep"
        type="button"
        @click="emit('advance')"
      >
        {{ advanceLabel }}
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
      <span
        v-else-if="resolved"
        class="banked-note"
      >
        <template v-if="pickedName">Banked {{ pickedName }}.</template>
        <template v-else>Draft resolved.</template>
        <span v-if="!ready"> Waiting for the squad…</span>
      </span>
    </div>

    <DiversChoicePicker
      v-if="choiceOpen"
      :open="choiceOpen"
      :pool="pool"
      :owned-ids="ownedIds"
      @close="choiceOpen = false"
      @choose="chooseCross"
    />
  </section>
</template>

<style scoped>
.loot {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 1040px;
  margin: 0 auto;
}
.loot-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  flex-wrap: wrap;
}
.head-copy { display: flex; flex-direction: column; gap: 7px; }
.head-actions { display: flex; align-items: center; gap: 10px; }
.kick {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--gold);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}
.kick::before {
  content: '';
  width: 22px;
  height: 2px;
  background: currentColor;
  box-shadow: 0 0 8px currentColor;
}
.loot-title { font-size: clamp(38px, 4.4vw, 56px); }
.loot-sub { margin: 0; color: var(--muted); font-size: 13px; }
.red-text { color: var(--red); }

.loot-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 18px;
  align-items: stretch;
  padding-top: 4px;
}
.loot-card {
  --edge: var(--line-3);
  --tier: var(--tier-c);
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 9px;
  min-height: 300px;
  padding: 14px 16px 16px;
  border: 1px solid var(--edge);
  background: linear-gradient(180deg, color-mix(in srgb, var(--tier) 10%, var(--panel)), var(--panel) 58%);
  color: var(--text);
  text-align: left;
  font: inherit;
  cursor: pointer;
  clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
  transition: transform var(--dur-med) var(--ease-out), filter var(--dur-med), box-shadow var(--dur-med);
}
.loot-card[data-tier='C'] { --tier: var(--tier-c); }
.loot-card[data-tier='B'] { --tier: var(--tier-b); }
.loot-card[data-tier='A'] { --tier: var(--tier-a); }
.loot-card[data-tier='S'] { --tier: var(--tier-s); }
.loot-card[data-tier='S+'] { --tier: var(--tier-splus); }
.loot-card:hover:not(.faded) { transform: translateY(-4px); filter: brightness(1.06); }
.loot-card.selected {
  --edge: var(--tier);
  transform: translateY(-9px);
  box-shadow: inset 0 0 0 2px var(--tier), 0 0 26px color-mix(in srgb, var(--tier) 28%, transparent);
}
.loot-card.banked {
  --edge: var(--gold);
  box-shadow: inset 0 0 0 2px var(--gold), 0 0 22px rgba(255, 214, 66, 0.2);
}
.loot-card.faded { opacity: 0.42; filter: saturate(0.5); }
.loot-card.cross {
  --edge: var(--tier-splus);
  background: linear-gradient(180deg, rgba(255, 75, 62, 0.16), var(--panel) 58%);
}

.tier-letter {
  position: absolute;
  top: 6px;
  right: 13px;
  color: var(--tier);
  font-size: 44px;
  line-height: 1;
  text-shadow: 0 0 18px color-mix(in srgb, var(--tier) 45%, transparent);
}
.card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 22px;
  color: var(--tier);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.roll-badge {
  padding: 2px 6px;
  background: var(--ground);
  box-shadow: inset 0 0 0 1px var(--tier);
  color: var(--tier);
  letter-spacing: 0.05em;
}
.cat { color: var(--muted); }

.media {
  display: grid;
  place-items: center;
  height: 108px;
  border: 1px solid var(--line-2);
  background:
    linear-gradient(rgba(184, 176, 141, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(184, 176, 141, 0.04) 1px, transparent 1px),
    var(--ground);
  background-size: 26px 26px;
  overflow: hidden;
}
.media img {
  max-width: 88%;
  max-height: 88%;
  object-fit: contain;
}
.cross-media { flex-direction: column; gap: 6px; color: var(--tier-splus); }
.cross-mark { font-size: 34px; line-height: 1; }
.cross-name { font-size: 10px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; }

.item-name {
  font-size: 21px;
  line-height: 1.05;
  margin-top: auto;
  overflow-wrap: anywhere;
}
.selected-mark {
  color: var(--tier);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.selected-mark.empty { color: var(--dim); }
.banked-mark { color: var(--gold); }

.squad-row { padding-top: 2px; }

.loot-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
  padding-top: 4px;
}
.reroll {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  border: 0;
  background: none;
  color: var(--muted);
  font: 600 12px var(--font-body);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
}
.reroll:hover:not(:disabled) { color: var(--gold); }
.reroll:disabled { opacity: 0.4; cursor: not-allowed; }
.cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  min-width: 300px;
  min-height: 58px;
  padding: 0 24px;
  border: 0;
  background: linear-gradient(180deg, #ffe57a 0%, var(--gold) 45%, #f0bf1a 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6), inset 0 -3px 0 rgba(110, 80, 0, 0.35);
  color: var(--on-gold);
  font: 800 17px var(--font-display);
  font-stretch: 125%;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
}
.cta:disabled { opacity: 0.4; cursor: not-allowed; }
.banked-note { color: var(--muted); font-size: 13px; }

.picks { display: inline-flex; gap: 4px; }
.pick-hex {
  display: grid;
  place-items: center;
  width: 24px;
  height: 26px;
  color: var(--dim);
  font: 800 11px var(--font-display);
  background: var(--panel);
  clip-path: polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%);
}
.pick-hex.on { color: var(--on-gold); background: var(--gold); }

.promotion .loot-grid { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }

@media (max-width: 720px) {
  .loot { gap: 12px; }
  .loot-title { font-size: 38px; }
  .loot-grid { grid-template-columns: minmax(0, 1fr); gap: 10px; }
  .loot-card { min-height: 0; display: grid; grid-template-columns: 76px minmax(0, 1fr); grid-template-rows: auto auto auto; column-gap: 12px; }
  .loot-card .media { grid-row: 1 / 4; height: 76px; width: 76px; }
  .tier-letter { position: static; grid-column: 2; font-size: 28px; }
  .card-meta { grid-column: 2; }
  .item-name { grid-column: 2; font-size: 18px; }
  .selected-mark { grid-column: 2; }
  .loot-actions { justify-content: stretch; }
  .cta { flex: 1; min-width: 0; }
}
</style>
