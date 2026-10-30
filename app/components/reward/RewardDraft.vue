<script setup lang="ts">
import { itemImageUrl } from '~~/shared/data/images'
import type { Item } from '~~/shared/data/types'
import type { RewardOption } from '~~/shared/engine/rewards'
import { bankedOptionId, tierZones, topTierOf } from '~~/shared/engine/rewards'
import type { DraftSummary } from '~~/shared/engine/selectors'
import type { RewardTier } from '~~/shared/engine/types'
import { categoryLabel } from '~/utils/itemCategory'
import { pinDelay, revealDuration, revealTimeline } from '~/utils/rewardReveal'

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
const { itemById } = useTierCatalog()

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

const resolved = computed(() => props.resolved || props.pickedId !== null)
const bestTier = computed<RewardTier | null>(() => topTierOf(props.options))
const zones = computed(() => tierZones(props.difficulty, props.teamRisk + props.pactRisk))
// Liberty's Cross unfurls as its own band above the cards; the cards deal in
// left to right and the band opens last as the finale.
const cards = computed(() => props.options.filter(option => !option.choice))
// Remounting on a new offer replays the unfurl after a reroll.
const offerKey = computed(() => props.options.map(option => option.optionId).join())
// A sync rebuilds `options` on every squadmate's action, so only a genuinely
// new offer clears the local pick — a teammate banking must never drop it.
watch(offerKey, () => {
  selectedId.value = null
  choiceItemId.value = null
})
const crossOption = computed(() => props.options.find(option => option.choice) ?? null)
const offerOrder = computed(() =>
  crossOption.value ? [...cards.value, crossOption.value] : cards.value)
const cues = computed(() => {
  const timeline = revealTimeline(offerOrder.value.map(tierOf))
  return new Map(offerOrder.value.map((option, index) => [option.optionId, timeline[index]!]))
})
// A reload onto a resolved draft shows the settled cabinet, no replay.
const instantReveal = resolved.value
// The squad's drafts belong to the settled cabinet: hold them back until your
// own reveal has landed, so a teammate's early bank never pre-empts the fanfare.
// Banking (or a resolved draft) settles at once; a reroll replays the hold.
const squadRevealed = useRevealComplete(
  () => `${offerKey.value}|${resolved.value ? 1 : 0}`,
  () => (resolved.value ? 0 : revealDuration(offerOrder.value.map(tierOf))),
)
const markers = computed(() =>
  props.options.flatMap(option => typeof option.roll === 'number'
    ? [{
        key: option.optionId,
        roll: option.roll,
        tier: tierOf(option),
        delay: instantReveal ? undefined : pinDelay(cues.value.get(option.optionId)!),
      }]
    : []),
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

const crossSelected = computed(() => crossOption.value !== null && selectedId.value === crossOption.value.optionId)
const crossChosenName = computed(() =>
  crossSelected.value && choiceItemId.value ? itemById(choiceItemId.value)?.displayName ?? null : null)

function chosenItemName(): string {
  if (!selectedId.value) {
    return ''
  }
  const option = props.options.find(entry => entry.optionId === selectedId.value)
  if (!option) {
    return ''
  }
  if (option.choice && choiceItemId.value) {
    return itemById(choiceItemId.value)?.displayName ?? 'Liberty’s Cross'
  }
  return nameOf(option)
}

const bankedId = computed(() => bankedOptionId(props.options, props.pickedId))
const pickedOption = computed(() =>
  props.options.find(option => option.optionId === bankedId.value) ?? null)
const pickedItem = computed(() => {
  if (!props.pickedId) {
    return null
  }
  const direct = itemById(props.pickedId)
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

function bank(): void {
  if (!selectedId.value) {
    return
  }
  if (crossSelected.value && !choiceItemId.value) {
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
  return `Mission reward · ${stars}`
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
          {{ optionsLost }} option{{ optionsLost === 1 ? '' : 's' }} forfeited by broken rules.
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
      label="Your loot rolls"
      :note="`One roll per option · best ${bestTier ?? '—'}`"
      compact
    />

    <LibertyCrossBand
      v-if="crossOption"
      :key="offerKey"
      class="loot-cross"
      :pool="pool"
      :owned-ids="ownedIds"
      :delay="instantReveal ? 0 : cues.get(crossOption.optionId)!.start"
      :instant="instantReveal"
      :can-pick="!resolved"
      :picked="crossSelected || bankedId === crossOption.optionId"
      :dimmed="resolved && bankedId !== crossOption.optionId"
      :stamp="resolved && bankedId === crossOption.optionId ? 'Banked' : null"
      :chosen-name="crossChosenName"
      @choose="chooseCross"
    />

    <div
      class="loot-grid"
      role="radiogroup"
      :aria-label="promotion ? 'Promotion options' : 'Reward options'"
    >
      <RewardReveal
        v-for="option in cards"
        :key="option.optionId"
        class="loot-slot"
        :cue="cues.get(option.optionId)!"
        :instant="instantReveal"
        :muted="resolved && bankedId !== option.optionId"
      >
        <button
          class="loot-card"
          :class="{
            selected: selectedId === option.optionId,
            banked: bankedId === option.optionId,
            faded: resolved && bankedId !== option.optionId,
          }"
          :data-tier="tierOf(option)"
          type="button"
          role="radio"
          :aria-checked="selectedId === option.optionId"
          :aria-label="`${nameOf(option)}, ${tierOf(option)} tier${rollOf(option) ? `, rolled ${rollOf(option)}` : ''}`"
          @click="choose(option)"
        >
          <span class="card-top">
            <span class="card-meta">
              <span class="cat">{{ categoryLabel(option.item.category) }}</span>
            </span>
            <span class="tier-letter disp">{{ tierOf(option) }}</span>
          </span>

          <span
            class="media"
            aria-hidden="true"
          >
            <img
              v-if="itemImageUrl(option.item)"
              :src="itemImageUrl(option.item)"
              alt=""
              loading="lazy"
              draggable="false"
            >
          </span>

          <span class="card-foot">
            <span
              class="item-name disp"
              :style="fitWord(nameOf(option))"
            >{{ nameOf(option) }}</span>
            <span
              v-if="selectedId === option.optionId"
              class="selected-mark"
            >Selected ✓</span>
            <span
              v-else-if="bankedId === option.optionId"
              class="selected-mark banked-mark"
            >Banked ✓</span>
            <span
              v-else
              class="selected-mark empty"
            >{{ promotion ? 'Claim' : 'Select' }}</span>
          </span>
        </button>
      </RewardReveal>
    </div>

    <div
      v-if="!promotion && squadDrafts.length && squadRevealed"
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
  </section>
</template>

<style scoped>
.loot {
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
  max-width: 1000px;
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
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  align-items: stretch;
  padding-top: 6px;
}
.loot-card {
  --edge: var(--line-3);
  --tier: var(--tier-c);
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 14px 14px;
  border: 1px solid var(--edge);
  background: linear-gradient(180deg, color-mix(in srgb, var(--tier) 12%, var(--panel)), var(--panel) 55%);
  color: var(--text);
  text-align: left;
  font: inherit;
  cursor: pointer;
  clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px);
  transition: transform var(--dur-med) var(--ease-out), filter var(--dur-med), box-shadow var(--dur-med), opacity var(--dur-med);
}
.loot-slot { --reveal-cut: 12px; }
.loot-cross { --cross-gap: 18px; }
.loot-card[data-tier='C'] { --tier: var(--tier-c); }
.loot-card[data-tier='B'] { --tier: var(--tier-b); }
.loot-card[data-tier='A'] { --tier: var(--tier-a); }
.loot-card[data-tier='S'] { --tier: var(--tier-s); }
.loot-card[data-tier='S+'] { --tier: var(--tier-splus); }
.loot-card:hover:not(.faded) { transform: translateY(-4px); filter: brightness(1.08); }
.loot-card:hover:not(.faded) .media img { transform: scale(1.05); }
.loot-card.selected {
  --edge: var(--tier);
  transform: translateY(-8px);
  box-shadow: inset 0 0 0 2px var(--tier), 0 0 34px color-mix(in srgb, var(--tier) 32%, transparent);
}
.loot-card.banked {
  --edge: var(--gold);
  box-shadow: inset 0 0 0 2px var(--gold), 0 0 28px rgba(255, 214, 66, 0.22);
}
.loot-card.faded { opacity: 0.38; filter: saturate(0.4); }

.card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  min-height: 30px;
}
.tier-letter {
  color: var(--tier);
  font-size: 40px;
  line-height: 0.8;
}
.loot-card:not([data-tier='C']) .tier-letter { animation: slamIn 0.45s var(--ease-impact) var(--impact, 0ms) backwards; }
.loot-card.selected .tier-letter,
.loot-card.banked .tier-letter { animation: slamIn 0.4s var(--ease-impact) both; }
.card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: var(--tier);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.cat { color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* The art is the card: a fixed-aspect well that letterboxes every catalog
   image (framed weapon renders, booster hexes, stratagem glyphs) whole. */
.media {
  position: relative;
  display: block;
  aspect-ratio: 4 / 3;
  border: 1px solid var(--line-2);
  background:
    radial-gradient(ellipse 70% 70% at 50% 55%, color-mix(in srgb, var(--tier) 16%, transparent), transparent 75%),
    linear-gradient(rgba(184, 176, 141, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(184, 176, 141, 0.04) 1px, transparent 1px),
    var(--ground);
  background-size: 100% 100%, 22px 22px, 22px 22px, auto;
  overflow: hidden;
}
.media img {
  position: absolute;
  inset: 9%;
  width: 82%;
  height: 82%;
  object-fit: contain;
  filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.55));
  transition: transform var(--dur-med) var(--ease-out);
}
.selected .media,
.banked .media { border-color: color-mix(in srgb, var(--tier) 55%, var(--line-2)); }

.card-foot { container-type: inline-size; display: flex; flex-direction: column; gap: 5px; margin-top: auto; }
.item-name {
  font-size: min(15px, 100cqi / var(--fit-len, 1));
  line-height: 1.1;
  color: var(--khaki);
}
.selected .item-name,
.banked .item-name { color: var(--text); }
.selected-mark {
  color: var(--tier);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.selected-mark.empty { color: var(--dim); }
.banked-mark { color: var(--gold); }

.squad-row {
  padding-top: 2px;
  animation: squad-in 0.4s var(--ease-out) backwards;
}

@keyframes squad-in {
  from { opacity: 0; translate: 0 10px; }
}

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
.cta:not(:disabled) { box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6), inset 0 -3px 0 rgba(110, 80, 0, 0.35), 0 0 34px rgba(255, 214, 66, 0.24); }
.cta:disabled {
  background: var(--raised);
  color: var(--dim);
  box-shadow: inset 0 0 0 1px var(--line-3);
  cursor: not-allowed;
}
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
  .loot-cross { --cross-gap: 12px; }
  .loot-title { font-size: 38px; }
  .loot-grid { grid-template-columns: minmax(0, 1fr); gap: 10px; }
  .loot-card {
    display: grid;
    grid-template-columns: 112px minmax(0, 1fr);
    grid-template-rows: auto 1fr;
    column-gap: 14px;
    row-gap: 6px;
  }
  .loot-card .media { grid-row: 1 / 3; aspect-ratio: 1; }
  .card-top { grid-column: 2; }
  .card-foot { grid-column: 2; }
  .item-name { font-size: min(16px, 100cqi / var(--fit-len, 1)); }
  .loot-actions { justify-content: stretch; }
  .cta { flex: 1; min-width: 0; }
}
</style>
