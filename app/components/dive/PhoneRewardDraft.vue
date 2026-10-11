<script setup lang="ts">
import { ALL_WARBOND_CODES, ITEMS_BY_ID } from '~~/shared/data/catalog'
import { itemImageUrl } from '~~/shared/data/images'
import { POD_STAGGER } from '~/utils/motion'
import { MAX_DIFFICULTY } from '~~/shared/engine/config'
import {
  allDiversPicked,
  bonusEligible,
  bonusIneligibilityReason,
  canBanAnyReward,
  canBanReward,
  canBuyItem,
  canRerollRewards,
  diverOptions,
  draftSummaryFor,
  pactRiskOf,
  rewardPoolFor,
  shopStockFor,
  teamRiskOf,
} from '~~/shared/engine/selectors'
import type { Item } from '~~/shared/data/types'
import type { RewardOption } from '~~/shared/engine/rewards'
import type { DiverState, DiveState } from '~~/shared/engine/types'

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
  ban: [optionIds: string[]]
  buy: [itemId: string]
  spinBonus: []
  awardBonus: [playerId: string]
  advance: []
}>()

const options = computed(() => (props.self ? diverOptions(props.state, props.self) : []))
const rewardPool = computed(() =>
  props.self ? rewardPoolFor(props.self.warbondCodes ?? ALL_WARBOND_CODES) : [])
const ownedIds = computed(() => props.state.personalInventories[props.selfId ?? ''] ?? [])

const rewardTokens = computed(() => props.self?.rewardTokens ?? 0)
const canReroll = computed(() =>
  props.self ? canRerollRewards(props.state, props.self).allowed : false)
const canBan = computed(() =>
  props.self ? canBanAnyReward(props.state, props.self) : false)
const bannableIds = computed(() => {
  const self = props.self
  if (!self) {
    return []
  }
  return diverOptions(props.state, self)
    .filter(option => canBanReward(props.state, self, option.optionId).allowed)
    .map(option => option.optionId)
})

const ready = computed(() => allDiversPicked(props.state))
const bonusUp = computed(() => ready.value && bonusEligible(props.state))
const bonusNote = computed(() => bonusIneligibilityReason(props.state))
const resolved = computed(() =>
  props.self !== null && (props.self.pickedOptionId !== null || props.self.rewardBanned))
const banned = computed(() => props.self?.rewardBanned ?? false)
const chosen = computed(() =>
  props.self?.pickedOptionId ? ITEMS_BY_ID.get(props.self.pickedOptionId) ?? null : null)
// The advance sweep takes the colour of what the diver banked. Liberty's Cross
// banks a catalog item that was never among the rolled options.
const bankedSweep = computed(() => {
  const pickedId = props.self?.pickedOptionId
  if (!pickedId) {
    return undefined
  }
  const rolled = options.value.find(option => option.optionId === pickedId && !option.choice)
  const tier = rolled ? rolled.item.tier : options.value.some(option => option.choice) ? 'splus' : chosen.value?.tier
  return tier ? { '--sweep': `color-mix(in srgb, var(--tier-${tier}) 70%, white)` } : undefined
})
const optionsLost = computed(() => props.self?.failedPactIds.length ?? 0)

// The rotating Requisition shelf (engine-derived) and its buy verdicts.
const stock = computed(() => (props.self ? shopStockFor(props.state, props.self) : []))
const stockBuyable = computed(() => {
  const self = props.self
  if (!self) {
    return {}
  }
  return Object.fromEntries(
    stock.value.map(option => [option.item.id, canBuyItem(props.state, self, option.item.id)]),
  )
})

const advanceLabel = computed(() =>
  props.state.missionInOperation >= props.opLength
    ? `Advance · difficulty ${Math.min(props.state.difficulty + 1, MAX_DIFFICULTY)}`
    : 'Next mission')

const squadDrafts = computed(() =>
  props.state.divers
    .filter(diver => diver.id !== props.selfId)
    .map(diver => ({ id: diver.id, name: diver.name, summary: draftSummaryFor(props.state, diver) })))
const ceiling = computed(() => (props.self ? draftSummaryFor(props.state, props.self).ceiling : null))
const teamRisk = computed(() => teamRiskOf(props.state))

// The options wait for the ceiling roll, then fade in worst-to-best so the
// reveal builds to the top pull (Liberty's Cross last). A resolved draft or
// reduced motion shows them at once. Presentation only.
const reduced = import.meta.client
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const revealed = ref(false)
const liveReveal = ref(false)
function onClimbed(): void {
  liveReveal.value = !resolved.value && !reduced
  revealed.value = true
}
watch(() => props.self?.rewardRerollSeed, () => {
  revealed.value = false
})
const TIER_ORDER = ['c', 'b', 'a', 's']
const revealRanks = computed(() => {
  const score = (option: RewardOption) => option.choice ? TIER_ORDER.length : TIER_ORDER.indexOf(option.item.tier)
  const ranks: Record<string, number> = {}
  options.value
    .map((option, index) => ({ option, index }))
    .sort((a, b) => score(a.option) - score(b.option) || a.index - b.index)
    .forEach((entry, rank) => {
      ranks[entry.option.optionId] = rank
    })
  return ranks
})
// No track to wait on (sat out, or no ceiling): nothing gates the rows.
const showRows = computed(() => revealed.value || !ceiling.value || options.value.length === 0)
const pactRisk = computed(() => (props.self ? pactRiskOf(props.self, props.state.difficulty) : 0))

// ---- Ban mode ----------------------------------------------------------

const banMode = ref(false)
const selectedBan = ref<string[]>([])

function enterBan(): void {
  banMode.value = true
  selectedBan.value = []
}

function exitBan(): void {
  banMode.value = false
  selectedBan.value = []
}

function toggleBan(optionId: string): void {
  if (!bannableIds.value.includes(optionId)) {
    return
  }
  selectedBan.value = selectedBan.value.includes(optionId)
    ? selectedBan.value.filter(id => id !== optionId)
    : [...selectedBan.value, optionId]
}

function confirmBan(): void {
  emit('ban', [...selectedBan.value])
  exitBan()
}

function imageUrl(item: Item): string | undefined {
  return itemImageUrl(item)
}

function tierOf(option: RewardOption): string {
  return option.choice ? 'S+' : option.item.tier.toUpperCase()
}
</script>

<template>
  <div class="phone-rewards">
    <RewardsSettlement
      v-if="ready"
      :state="state"
      :self-id="selfId"
      :self="self"
      :can-control="canControl"
      :bonus-up="bonusUp"
      :stock="stock"
      :sample-bank="self?.sampleBank ?? 0"
      :buyable="stockBuyable"
      :advance-label="advanceLabel"
      compact
      @spin="emit('spinBonus')"
      @award="playerId => emit('awardBonus', playerId)"
      @advance="emit('advance')"
      @buy="itemId => emit('buy', itemId)"
    />

    <template v-else>
      <div class="scroll">
        <div class="draft-head">
          <h1 class="disp">
            Reward draft
          </h1>
          <span class="token-chips">
            <i
              v-for="n in 3"
              :key="n"
              :class="{ on: n <= rewardTokens }"
            />
            <b>{{ rewardTokens }}/3</b>
          </span>
        </div>

        <CeilingTrack
          v-if="ceiling && options.length"
          :difficulty="state.difficulty"
          :ceiling="ceiling"
          :team-risk="teamRisk"
          :pact-risk="pactRisk"
          class="phone-track"
          :instant="resolved"
          :replay-key="self?.rewardRerollSeed ?? 0"
          @climbed="onClimbed"
        />

        <p
          v-if="optionsLost > 0"
          class="lost-note"
        >
          {{ optionsLost }} failed pact{{ optionsLost === 1 ? '' : 's' }} · one fewer option
        </p>

        <div
          class="rows"
          role="group"
          aria-label="Reward options"
        >
          <template
            v-for="(option, index) in options"
            :key="option.optionId"
          >
            <LibertyCrossBand
              v-if="option.choice && showRows"
              :reveal-rank="revealRanks[option.optionId]"
              :instant="!liveReveal"
              :pool="rewardPool"
              :owned-ids="ownedIds"
              :can-pick="!!self && !resolved"
              :picked="self?.pickedOptionId === option.optionId"
              :dimmed="resolved && self?.pickedOptionId !== option.optionId"
              :ban-mode="banMode"
              @choose="itemId => emit('pick', option.optionId, itemId)"
            />
            <button
              v-else-if="!option.choice"
              class="row"
              :style="{ '--delay': `${(revealRanks[option.optionId] ?? 0) * POD_STAGGER}ms` }"
              :class="{
                waiting: !showRows,
                live: showRows && liveReveal,
                lead: index === 0,
                picked: self?.pickedOptionId === option.optionId,
                dimmed: resolved && self?.pickedOptionId !== option.optionId,
                banning: banMode,
                selected: selectedBan.includes(option.optionId),
                bannable: bannableIds.includes(option.optionId),
              }"
              type="button"
              :data-tier="tierOf(option)"
              :disabled="!showRows || !self || (resolved && !banMode) || (banMode && !bannableIds.includes(option.optionId))"
              :aria-label="`${option.item.displayName}, tier ${tierOf(option)}${index === 0 ? ', ceiling pick' : ''}${banMode ? ', toggle ban' : ', claim'}`"
              @click="banMode ? toggleBan(option.optionId) : emit('pick', option.optionId)"
            >
              <span
                class="row-tier"
                aria-hidden="true"
              />
              <span class="row-art grid-bg">
                <img
                  v-if="imageUrl(option.item)"
                  :src="imageUrl(option.item)"
                  alt=""
                >
              </span>
              <span class="row-copy">
                <span class="row-top">
                  <b
                    class="tb"
                    :data-tier="tierOf(option)"
                  >{{ tierOf(option) }}</b>
                  <span
                    v-if="index === 0"
                    class="lead-tag"
                  >Ceiling</span>
                  <span class="row-cat">{{ option.item.category }}</span>
                </span>
                <span class="row-name">{{ option.item.displayName }}</span>
              </span>
              <span class="row-end">
                <span
                  v-if="banMode"
                  class="ban-box"
                  :class="{ on: selectedBan.includes(option.optionId) }"
                >✕</span>
                <svg
                  v-else
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.2"
                  aria-hidden="true"
                ><path d="M9 5l7 7-7 7" /></svg>
              </span>
              <span
                v-if="self?.pickedOptionId === option.optionId"
                class="stamp disp row-stamp gold-stamp"
              >Banked</span>
            </button>
          </template>
        </div>

        <SquadDraftBoard
          v-if="squadDrafts.length && !banMode && showRows"
          :drafts="squadDrafts"
          compact
        />
      </div>

      <PhoneActionBar aria-label="Reward tokens">
        <template #action>
          <span
            v-if="banMode"
            class="ban-bar"
          />
          <template v-if="banMode">
            <button
              class="ghost cancel"
              type="button"
              @click="exitBan"
            >
              Cancel
            </button>
            <HoldButton
              class="ban-confirm"
              :label="selectedBan.length ? `Ban ${selectedBan.length}` : 'Select items'"
              hint="hold to confirm"
              tone="red"
              :disabled="selectedBan.length === 0"
              @confirm="confirmBan"
            />
          </template>
          <template v-else-if="resolved">
            <div class="result">
              <span class="lbl">{{ banned ? 'Banned' : 'Banked' }}</span>
              <span class="result-name">{{ banned ? 'Offer purged for the crusade' : chosen?.displayName ?? '—' }}</span>
            </div>
            <button
              v-if="canControl"
              class="btn primary cut next cta-sweep"
              type="button"
              :style="bankedSweep"
              :disabled="!ready"
              @click="emit('advance')"
            >
              <span class="disp">{{ ready ? advanceLabel : 'Waiting on squad' }}</span>
            </button>
            <span
              v-else
              class="host-advances"
            >{{ ready ? 'Host advances' : 'Waiting on squad' }}</span>
          </template>
          <template v-else>
            <span class="foot-tokens">
              <span class="lbl">Tokens</span>
              <span class="chit-row">
                <i
                  v-for="n in 3"
                  :key="n"
                  :class="{ on: n <= rewardTokens }"
                />
                <b>{{ rewardTokens }}/3</b>
              </span>
            </span>
            <button
              class="ghost act"
              type="button"
              :disabled="!canReroll"
              @click="emit('reroll')"
            >
              Reroll
            </button>
            <button
              class="ghost act ban"
              type="button"
              :disabled="!canBan"
              @click="enterBan"
            >
              Ban
            </button>
          </template>
        </template>
      </PhoneActionBar>

      <p
        v-if="bonusNote && !resolved"
        class="honor-note"
      >
        {{ bonusNote }}
      </p>
    </template>
  </div>
</template>

<style scoped>
.host-advances {
  margin-left: auto;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
  white-space: nowrap;
}
.phone-rewards { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; }
.scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 16px 14px;
}

.draft-head { display: flex; align-items: center; justify-content: space-between; }
.draft-head h1 { margin: 0; font-size: 17px; color: var(--text); }
.token-chips { display: flex; align-items: center; gap: 3px; }
.token-chips i,
.chit-row i {
  width: 11px;
  height: 13px;
  clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
  background: var(--line-2);
}
.token-chips i.on,
.chit-row i.on { background: var(--gold); }
.token-chips b { margin-left: 5px; font-size: 12px; color: var(--muted); }

.lost-note {
  margin: 0;
  padding: 6px 9px;
  border: 1px dashed var(--red);
  color: var(--red);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.rows { display: flex; flex-direction: column; gap: 8px; }
.phone-track { margin-bottom: 14px; }
.row.waiting { opacity: 0; pointer-events: none; }
.row.live { animation: row-in 0.5s var(--ease-out) var(--delay) backwards; }
@keyframes row-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: none; }
}

/* Rarity reads at a glance: A and S rows carry a tier-tinted sheen, S faster. */
.row[data-tier='A']:not(:disabled),
.row[data-tier='S']:not(:disabled) { overflow: hidden; }
.row[data-tier='A']:not(:disabled)::after,
.row[data-tier='S']:not(:disabled)::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(100deg, transparent 30%, color-mix(in srgb, var(--row-tier) 30%, transparent) 50%, transparent 70%);
  transform: translateX(-130%);
  animation: ctaSweep 4.4s var(--ease-out) infinite;
}
.row[data-tier='A'] { --row-tier: var(--tier-a); }
.row[data-tier='S'] { --row-tier: var(--tier-s); }
.row[data-tier='S']:not(:disabled)::after { animation-duration: 2.6s; }
.row[data-tier='S'] .row-tier { background: var(--tier-s); }
@media (prefers-reduced-motion: reduce) {
  .row::after { display: none; }
}

.row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  height: 76px;
  padding: 0 10px 0 0;
  background: var(--panel);
  border: 1px solid var(--line-2);
  color: var(--text);
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  transition: border-color var(--dur-fast), opacity var(--dur-fast);
}
.row.lead { border-color: color-mix(in srgb, var(--gold) 55%, var(--line-3)); }
.row.picked { border-color: var(--red); box-shadow: 0 0 18px color-mix(in srgb, var(--red) 28%, transparent); }
.row.dimmed { opacity: 0.4; filter: grayscale(0.5); }
.row.banning { border-color: color-mix(in srgb, var(--red) 45%, var(--line-3)); }
.row.selected { background: color-mix(in srgb, var(--red) 12%, var(--panel)); }

.row-tier { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--line-3); }
.row.lead .row-tier { background: var(--gold); }
.row-art {
  display: grid;
  place-items: center;
  width: 58px;
  height: 58px;
  margin-left: 10px;
  flex-shrink: 0;
  background-color: var(--ground);
  background-size: 12px 12px;
  border: 1px solid var(--line-2);
}
.row-art img { width: 44px; height: 44px; object-fit: contain; }
.row-copy { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.row-top { display: flex; align-items: center; gap: 7px; min-width: 0; }
.row-top .tb { min-width: 24px; height: 20px; display: inline-grid; place-items: center; font-size: 11px; }
.lead-tag { font-size: 9px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--gold); }
.row-cat {
  margin-left: auto;
  padding: 1px 5px;
  border: 1px solid var(--line-2);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  white-space: nowrap;
}
.row-name {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.row-end { flex-shrink: 0; width: 26px; display: grid; place-items: center; color: var(--khaki); }
.ban-box {
  width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  border: 2px solid var(--red);
  color: var(--red);
  font-size: 11px;
}
.ban-box.on { background: var(--red); color: var(--ground); }
.row-stamp {
  position: absolute;
  right: 40px;
  top: 7px;
  padding: 3px 6px;
  font-size: 11px;
  border: 2px solid var(--gold);
  color: var(--gold);
  background: rgba(11, 12, 9, 0.88);
}
.gold-stamp { border-color: var(--gold); color: var(--gold); }

.ban-bar {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 4px;
  background-image: repeating-linear-gradient(-45deg, var(--red) 0 8px, var(--ground) 8px 16px);
}
.foot-tokens { display: flex; flex-direction: column; gap: 4px; margin-right: auto; }
.foot-tokens .lbl { font-size: 9px; }
.chit-row { display: flex; align-items: center; gap: 3px; }
.chit-row b { margin-left: 4px; font-size: 12px; color: var(--muted); }
.act {
  height: 44px;
  padding: 0 14px;
  color: var(--text);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.act:disabled { opacity: 0.4; }
.act.ban { color: var(--red); border-color: color-mix(in srgb, var(--red) 50%, transparent); }
.cancel { width: 88px; height: 48px; flex-shrink: 0; color: var(--khaki); font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; }
.ban-confirm { flex: 1 1 auto; }
.result { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.result-name {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--gold);
}
.next { flex-shrink: 0; height: 52px; padding: 0 16px; }
.next .disp { font-size: 14px; }
.honor-note {
  margin: 0;
  padding: 8px 16px;
  font-size: 11px;
  letter-spacing: 0.06em;
  color: var(--muted);
}
</style>
