<script setup lang="ts">
import { ITEMS_BY_ID } from '~~/shared/data/catalog'
import { itemImageUrl } from '~~/shared/data/images'
import { REWARD_TOKEN_CAP } from '~~/shared/engine/config'
import type { DiveState } from '~~/shared/engine/types'

const props = defineProps<{
  state: DiveState
  selfId: string | null
}>()

function initials(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || '?'
}

function chits(count: number): boolean[] {
  return Array.from({ length: REWARD_TOKEN_CAP }, (_, i) => i < count)
}

const self = computed(() =>
  props.state.divers.find(diver => diver.id === props.selfId) ?? null)

const draftItem = computed(() => {
  const diver = self.value
  if (!diver?.pickedOptionId) {
    return null
  }
  return ITEMS_BY_ID.get(diver.pickedOptionId) ?? null
})
const draftBanned = computed(() => self.value?.rewardBanned ?? false)

const size = computed(() => props.state.divers.length)
const CADENCE = [
  { label: '4', bars: [true, true, true], match: (n: number) => n >= 4 },
  { label: '2–3', bars: [true, false, true], match: (n: number) => n === 2 || n === 3 },
  { label: '1', bars: [true, false, false], match: (n: number) => n <= 1 },
]
</script>

<template>
  <section
    class="tokens-rail"
    aria-label="Reward tokens"
  >
    <header class="tr-head">
      <span class="lbl tr-title">Reward tokens</span>
      <span class="tr-cap">Cap {{ REWARD_TOKEN_CAP }}</span>
    </header>

    <div class="tr-bank">
      <div
        v-for="diver in state.divers"
        :key="diver.id"
        class="tr-diver"
        :class="{ self: diver.id === selfId }"
      >
        <span class="cut-sm disp tr-av">{{ initials(diver.name) }}</span>
        <span class="tr-name">{{ diver.name }}</span>
        <span
          class="tr-chits"
          role="img"
          :aria-label="`${diver.rewardTokens} reward tokens`"
        >
          <span
            v-for="(on, i) in chits(diver.rewardTokens)"
            :key="i"
            class="hex tr-chit"
            :class="{ on }"
          />
        </span>
        <span class="tr-count">{{ diver.rewardTokens }}</span>
      </div>
    </div>

    <div class="tr-block">
      <span class="lbl tr-block-h">Spend in a draft</span>
      <div class="tr-spend">
        <span class="tr-spend-icon">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            aria-hidden="true"
          ><rect
            x="3.5"
            y="3.5"
            width="17"
            height="17"
            rx="2"
          /><circle
            cx="8.5"
            cy="8.5"
            r="1.3"
            fill="currentColor"
          /><circle
            cx="15.5"
            cy="15.5"
            r="1.3"
            fill="currentColor"
          /><circle
            cx="12"
            cy="12"
            r="1.3"
            fill="currentColor"
          /></svg>
        </span>
        <span class="tr-spend-copy">
          <span class="tr-spend-name">Reroll</span>
          <span class="tr-spend-sub">New ceiling, new offer</span>
        </span>
      </div>
      <div class="tr-spend">
        <span class="tr-spend-icon danger">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            aria-hidden="true"
          ><circle
            cx="12"
            cy="12"
            r="8.5"
          /><path d="M6 6l12 12" /></svg>
        </span>
        <span class="tr-spend-copy">
          <span class="tr-spend-name danger">Ban</span>
          <span class="tr-spend-sub">Purge items · forfeit pick</span>
        </span>
      </div>
    </div>

    <div
      v-if="self"
      class="tr-block"
    >
      <span class="lbl tr-block-h">Your draft</span>
      <div class="tr-draft">
        <span
          v-if="draftItem"
          class="tr-draft-art"
        >
          <img
            :src="itemImageUrl(draftItem)"
            alt=""
            draggable="false"
          >
        </span>
        <span
          v-else
          class="tr-draft-art empty"
          aria-hidden="true"
        />
        <span class="tr-draft-copy">
          <span class="tr-draft-name">
            {{ draftItem?.displayName ?? (draftBanned ? 'Rewards banned' : 'Choosing…') }}
          </span>
          <span
            v-if="draftItem"
            class="tr-draft-tier"
          >
            <span
              class="tb tr-tier"
              :data-tier="draftItem.tier"
            >{{ draftItem.tier.toUpperCase() }}</span>
            Banked
          </span>
        </span>
      </div>
    </div>

    <div class="tr-block cadence-block">
      <span class="lbl tr-block-h">Honors cadence</span>
      <div
        v-for="row in CADENCE"
        :key="row.label"
        class="tr-cadence"
        :class="{ current: row.match(size) }"
      >
        <span class="tr-cadence-n">{{ row.label }}</span>
        <span class="tr-cadence-bars">
          <span
            v-for="(on, i) in row.bars"
            :key="i"
            class="tr-cadence-bar"
            :class="{ on }"
          />
        </span>
        <span
          v-if="row.match(size)"
          class="tr-now"
        >Now</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.tokens-rail { display: flex; flex-direction: column; gap: 16px; }
.tr-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 20px;
}
.tr-title { color: var(--gold); }
.tr-cap { font-size: 10px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); }

.tr-bank { display: flex; flex-direction: column; gap: 8px; }
.tr-diver {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 44px;
  padding: 0 10px;
  border: 1px solid var(--line-2);
  background: var(--panel);
}
.tr-diver.self { border-color: var(--gold); }
.tr-av {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  font-size: 12px;
  background: var(--line-2);
  color: var(--text);
  flex-shrink: 0;
}
.tr-diver.self .tr-av { background: var(--gold); color: var(--on-gold); }
.tr-name {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tr-chits { margin-left: auto; display: flex; gap: 3px; }
.tr-chit { width: 11px; height: 13px; background: var(--line-2); }
.tr-chit.on { background: var(--gold); }
.tr-count { width: 26px; text-align: right; font-size: 13px; font-weight: 700; color: var(--text); }

.tr-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 14px;
  border-top: 1px solid var(--line-1);
}
.tr-block-h { font-size: 10px; }
.tr-spend { display: flex; align-items: center; gap: 12px; }
.tr-spend-icon {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border: 1px solid var(--line-4);
  color: var(--text);
  flex-shrink: 0;
}
.tr-spend-icon.danger { border-color: color-mix(in srgb, var(--red) 50%, transparent); color: var(--red); }
.tr-spend-copy { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.tr-spend-name { font-size: 13px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; }
.tr-spend-name.danger { color: var(--red); }
.tr-spend-sub { font-size: 11px; color: var(--muted); }

.tr-draft {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border: 1px solid var(--line-2);
  background: var(--panel);
}
.tr-draft-art {
  position: relative;
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  background: var(--ground);
  border: 1px solid var(--line-2);
}
.tr-draft-art::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 3px;
  background: var(--gold);
}
.tr-draft-art.empty::before { background: var(--line-3); }
.tr-draft-art img { width: 38px; height: 38px; object-fit: contain; }
.tr-draft-copy { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.tr-draft-name {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tr-draft-tier {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--gold);
}
.tr-tier {
  display: inline-grid;
  place-items: center;
  width: 22px;
  height: 18px;
  font-size: 10px;
  border: 1px solid currentColor;
}

.cadence-block { margin-top: auto; border: 1px dashed var(--line-2); padding: 12px; }
.cadence-block .tr-block-h { padding-bottom: 2px; }
.tr-cadence {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  font-weight: 700;
  color: var(--muted);
}
.tr-cadence.current { color: var(--text); }
.tr-cadence-n { width: 34px; }
.tr-cadence-bars { display: flex; gap: 3px; }
.tr-cadence-bar { width: 16px; height: 6px; border: 1px solid var(--line-4); }
.tr-cadence-bar.on { background: var(--khaki); border-color: var(--khaki); }
.tr-cadence.current .tr-cadence-bar.on { background: var(--gold); border-color: var(--gold); }
.tr-now {
  margin-left: auto;
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--gold);
}
</style>
