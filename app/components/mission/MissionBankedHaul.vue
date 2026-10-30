<script setup lang="ts">
import { itemImageUrl } from '~~/shared/data/images'
import { missionHaul } from '~~/shared/engine/rewards'
import { draftSummaryFor } from '~~/shared/engine/selectors'
import type { DiverState, DiveState, RewardTier } from '~~/shared/engine/types'
import { categoryLabel } from '~/utils/itemCategory'

// The diver's take from the mission just banked: the item as a lit hero card,
// with the credits the report paid into every purse. Shared by the regroup
// and operation-cleared beats.
const props = withDefaults(defineProps<{
  state: DiveState
  self: DiverState | null
  phone?: boolean
}>(), { phone: false })
const { itemById } = useTierCatalog()

const summary = computed(() => (props.self ? draftSummaryFor(props.state, props.self) : null))
const banked = computed(() =>
  summary.value?.bankedItemId ? itemById(summary.value.bankedItemId) ?? null : null)
const bankedTier = computed<RewardTier | null>(() => {
  const option = summary.value?.options.find(entry => entry.optionId === summary.value?.bankedOptionId)
  return option?.tier ?? (banked.value ? (banked.value.tier.toUpperCase() as RewardTier) : null)
})
const haul = computed(() => missionHaul(props.state.lastReport))

const emptyHaul = computed(() => {
  if (summary.value?.status === 'banned') {
    return 'Broken pacts cost this draft.'
  }
  return 'Nothing banked this mission.'
})
</script>

<template>
  <article
    class="haul"
    :class="{ phone }"
    :data-tier="bankedTier ?? 'C'"
    aria-label="Your haul"
  >
    <header class="haul-head">
      <span class="cap">Your haul</span>
      <span
        v-if="bankedTier"
        class="haul-tier disp"
      >{{ bankedTier }}</span>
    </header>
    <template v-if="banked">
      <span class="haul-media">
        <img
          v-if="itemImageUrl(banked)"
          :src="itemImageUrl(banked)"
          alt=""
          draggable="false"
        >
      </span>
      <span class="haul-copy">
        <span class="cap haul-cat">{{ categoryLabel(banked.category) }}</span>
        <b
          class="disp haul-name"
          :style="fitWord(banked.displayName)"
        >{{ banked.displayName }}</b>
      </span>
    </template>
    <p
      v-else
      class="haul-empty"
    >
      {{ emptyHaul }}
    </p>
    <footer
      v-if="haul > 0"
      class="haul-credits"
    >
      <span>Credits banked</span>
      <CreditAmount
        class="disp haul-amount"
        :value="haul"
        signed
      />
    </footer>
  </article>
</template>

<style scoped>
.haul {
  --tier: var(--tier-c);
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--tier) 14%, var(--panel)), var(--panel) 60%);
  box-shadow: inset 0 0 0 2px var(--gold), 0 0 30px rgba(255, 214, 66, 0.14);
  clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px);
  animation: deal-in 0.55s var(--ease-out) 0.15s both;
}
@keyframes deal-in {
  from { opacity: 0; translate: 0 24px; }
  to { opacity: 1; translate: 0 0; }
}
.haul[data-tier='B'] { --tier: var(--tier-b); }
.haul[data-tier='A'] { --tier: var(--tier-a); }
.haul[data-tier='S'] { --tier: var(--tier-s); }
.haul[data-tier='S+'] { --tier: var(--tier-splus); }
.haul-head { display: flex; align-items: flex-start; justify-content: space-between; min-height: 30px; }
.haul-head .cap { color: var(--gold); }
.haul-tier {
  color: var(--tier);
  font-size: 40px;
  line-height: 0.8;
  animation: slamIn 0.45s var(--ease-impact) 0.4s both;
}
.haul-media {
  position: relative;
  display: block;
  aspect-ratio: var(--haul-aspect, 4 / 3);
  border: 1px solid color-mix(in srgb, var(--tier) 50%, var(--line-2));
  background:
    radial-gradient(ellipse 70% 70% at 50% 55%, color-mix(in srgb, var(--tier) 20%, transparent), transparent 75%),
    var(--ground);
}
.haul-media img {
  position: absolute;
  inset: 8%;
  width: 84%;
  height: 84%;
  object-fit: contain;
  filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.55));
}
.haul-copy { container-type: inline-size; display: flex; flex-direction: column; gap: 4px; }
.haul-cat { color: var(--muted); }
.haul-name { font-size: min(20px, 100cqi / var(--fit-len, 1)); line-height: 1.05; }
.haul-empty { margin: 0; padding: 24px 0; color: var(--muted); font-size: 14px; }
.haul-credits {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--line-2);
  color: var(--muted);
  font-size: 12px;
}
.haul-amount { color: var(--gold); font-size: 20px; }

.haul.phone {
  display: grid;
  grid-template-columns: 112px minmax(0, 1fr);
  grid-template-rows: auto 1fr auto;
  column-gap: 12px;
  row-gap: 6px;
}
.phone .haul-head { grid-column: 1 / -1; }
.phone .haul-media { grid-row: 2 / 4; aspect-ratio: 1; }
.phone .haul-credits { grid-column: 2; }
</style>
