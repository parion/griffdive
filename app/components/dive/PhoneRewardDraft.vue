<script setup lang="ts">
import { ALL_WARBOND_CODES, ITEMS_BY_ID } from '~~/shared/data/catalog'
import { itemImageUrl } from '~~/shared/data/images'
import { MAX_DIFFICULTY } from '~~/shared/engine/config'
import {
  allDiversPicked,
  bonusEligible,
  bonusIneligibilityReason,
  canBanAnyReward,
  canBanReward,
  canRerollRewards,
  diverOptions,
  rewardPoolFor,
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
const optionsLost = computed(() => props.self?.failedPactIds.length ?? 0)

const advanceLabel = computed(() =>
  props.state.missionInOperation >= props.opLength
    ? `Advance · difficulty ${Math.min(props.state.difficulty + 1, MAX_DIFFICULTY)}`
    : 'Next mission')

const squadPicks = computed(() =>
  props.state.divers
    .filter(diver => diver.id !== props.selfId)
    .map(diver => ({
      id: diver.id,
      name: diver.name,
      initial: diver.name.trim().slice(0, 1).toUpperCase() || '?',
      picked: diver.pickedOptionId !== null,
      skipped: diver.skipsCurrentDraft,
    })))

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
    <BonusCeremony
      v-if="bonusUp"
      :state="state"
      :self-id="selfId"
      :self="self"
      :can-control="canControl"
      @spin="emit('spinBonus')"
      @award="playerId => emit('awardBonus', playerId)"
      @advance="emit('advance')"
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

        <p
          v-if="optionsLost > 0"
          class="lost-note"
        >
          {{ optionsLost }} failed pact{{ optionsLost === 1 ? '' : 's' }} · one fewer option
        </p>

        <div
          class="squad-picks"
          aria-label="Squad picks"
        >
          <span
            v-for="d in squadPicks"
            :key="d.id"
            class="pick-chip"
            :class="{ waiting: !d.picked && !d.skipped }"
          >
            <span class="pick-init disp">{{ d.initial }}</span>
            <span class="pick-name">{{ d.name }}</span>
            <span class="pick-state">{{ d.skipped ? 'skip' : d.picked ? 'ready' : '…' }}</span>
          </span>
        </div>

        <div
          class="rows"
          role="list"
          aria-label="Reward options"
        >
          <template
            v-for="(option, index) in options"
            :key="option.optionId"
          >
            <div
              v-if="option.choice"
              class="cross-row"
              role="listitem"
              :class="{ picked: self?.pickedOptionId === option.optionId }"
            >
              <DiversChoiceCard
                :pool="rewardPool"
                :owned-ids="ownedIds"
                :disabled="!canControl || resolved || banMode"
                @choose="itemId => emit('pick', option.optionId, itemId)"
              />
            </div>
            <button
              v-else
              class="row"
              role="listitem"
              :class="{
                lead: index === 0,
                picked: self?.pickedOptionId === option.optionId,
                dimmed: resolved && self?.pickedOptionId !== option.optionId,
                banning: banMode,
                selected: selectedBan.includes(option.optionId),
                bannable: bannableIds.includes(option.optionId),
              }"
              type="button"
              :disabled="!canControl || (resolved && !banMode) || (banMode && !bannableIds.includes(option.optionId))"
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
      </div>

      <footer
        class="reward-foot"
        aria-label="Reward tokens"
      >
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
            class="btn primary cut next"
            type="button"
            :disabled="!canControl"
            @click="emit('advance')"
          >
            <span class="disp">{{ advanceLabel }}</span>
          </button>
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
      </footer>

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
.phone-rewards { display: flex; flex-direction: column; min-height: 100%; }
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

.squad-picks { display: flex; gap: 6px; overflow: hidden; }
.pick-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 6px;
  border: 1px solid var(--line-2);
  min-width: 0;
}
.pick-chip.waiting { border-color: var(--gold); }
.pick-init {
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  background: var(--line-2);
  font-size: 10px;
}
.pick-name {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 70px;
}
.pick-state { font-size: 9px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }
.pick-chip.waiting .pick-state { color: var(--gold); }

.rows { display: flex; flex-direction: column; gap: 8px; }

.cross-row { border: 1px solid var(--red); }
.cross-row.picked { box-shadow: 0 0 18px color-mix(in srgb, var(--red) 30%, transparent); }

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

.reward-foot {
  position: relative;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-top: 1px solid var(--line-2);
  background: var(--rail);
}
.ban-bar {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 4px;
  background-image: repeating-linear-gradient(-45deg, var(--red) 0 8px, var(--ground) 8px 16px);
}
.foot-tokens { display: flex; flex-direction: column; gap: 4px; margin-right: auto; }
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
