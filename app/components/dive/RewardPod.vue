<script setup lang="ts">
import type { Item } from '~~/shared/data/types'
import type { RewardOption } from '~~/shared/engine/rewards'

const props = withDefaults(defineProps<{
  option: RewardOption
  choicePool: Item[]
  ownedIds: string[]
  index: number
  // The draft was already resolved (or motion is reduced): skip the drop.
  instant: boolean
  // Every pod has landed and nothing is claimed yet.
  canPick: boolean
  picked: boolean
  dimmed: boolean
  // The best option the draft rolled — the pod the draft "leads" with.
  lead?: boolean
  // Ban flow: the landed pods toggle a purge selection instead of picking.
  // `bannable` is the engine's allow-list (Liberty's Cross is never bannable).
  banMode?: boolean
  bannable?: boolean
  selected?: boolean
  // Resolved overlay stamped over the landed card: 'Banked' or 'Banned'.
  stamp?: string | null
}>(), { lead: false, banMode: false, bannable: true, selected: false, stamp: null })

const emit = defineEmits<{
  pick: [optionId: string, choiceItemId?: string]
  ban: [optionId: string]
  settled: []
}>()

const winner = computed(() => props.option.item)
const tierVar = computed(() =>
  props.option.choice ? 'var(--tier-splus)' : `var(--tier-${winner.value.tier})`)
const winnerTier = computed(() => (props.option.choice ? 'S+' : winner.value.tier.toUpperCase()))
const pod = computed(() => String(props.index + 1).padStart(2, '0'))

// One tiny drop animation per pod, staggered by index — the design's podFall →
// split → impact → static card reveal. Reduced motion (and a reload of an
// already-resolved draft) skips straight to the landed card.
const reduced = import.meta.client
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const instant = computed(() => props.instant || reduced)
const settled = ref(instant.value)
let timer: ReturnType<typeof setTimeout> | undefined

const DROP = 620
const STAGGER = 180

onMounted(() => {
  if (instant.value) {
    emit('settled')
    return
  }
  timer = setTimeout(() => {
    settled.value = true
    emit('settled')
  }, DROP + props.index * STAGGER)
})
onBeforeUnmount(() => clearTimeout(timer))

// The landed face is actionable only when every pod has stopped and no other
// pick dimmed it. In ban mode only engine-bannable pods select.
const selectable = computed(() =>
  props.canPick && (props.banMode ? props.bannable : !props.dimmed))
</script>

<template>
  <div
    class="pod-slot"
    :style="{ '--delay': `${index * STAGGER}ms`, '--tier': tierVar }"
  >
    <div
      class="pod-placeholder cut-sm"
      aria-hidden="true"
    >
      <span class="hazard-soft placeholder-bar" />
      <span class="lbl placeholder-pod">POD {{ pod }}</span>
    </div>

    <template v-if="!instant && !settled">
      <span
        class="pod-drop"
        aria-hidden="true"
      >
        <span class="pod-trail" />
        <span class="pod-half pod-l" />
        <span class="pod-half pod-r" />
      </span>
      <span
        class="pod-impact"
        aria-hidden="true"
      />
    </template>

    <Motion
      v-if="settled"
      as="div"
      class="pod-card cut-sm"
      :class="{
        picked: banMode ? selected : picked,
        dimmed: banMode ? !bannable : dimmed,
        lead,
        banning: banMode,
      }"
      :data-tier="winnerTier"
      :initial="instant ? false : { y: 18, scale: 0.9, opacity: 0 }"
      :animate="{ y: 0, scale: 1, opacity: 1 }"
      :transition="{ duration: 0.46, ease: [0.22, 1, 0.36, 1] }"
    >
      <span
        aria-hidden="true"
        class="pod-top"
      />
      <header class="pod-head">
        <span
          class="tb pod-tier"
          :data-tier="winnerTier"
        >{{ winnerTier }}</span>
        <span
          v-if="lead && !banMode"
          class="lbl pod-lead"
        >Ceiling</span>
        <span class="lbl pod-id">POD {{ pod }}</span>
      </header>

      <div class="pod-stage">
        <DiversChoiceCard
          v-if="option.choice"
          :pool="choicePool"
          :owned-ids="ownedIds"
          :disabled="!selectable"
          @choose="itemId => emit('pick', option.optionId, itemId)"
        />
        <ItemCard
          v-else
          :item="winner"
          :selected="banMode ? selected : picked"
          :disabled="!selectable"
          @select="banMode ? emit('ban', option.optionId) : emit('pick', option.optionId)"
        />
      </div>

      <span
        v-if="stamp"
        class="disp stamp pod-stamp"
        :class="{ red: stamp === 'Banned' }"
      >{{ stamp }}</span>

      <footer class="pod-foot">
        <template v-if="banMode">
          <span class="foot-mark cut-sm" />
          <span>{{ selected ? 'Marked for ban' : 'Ban this item' }}</span>
        </template>
        <template v-else>
          <span>{{ selectable ? 'Claim' : 'Locked' }}</span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            aria-hidden="true"
          ><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </template>
      </footer>
    </Motion>
  </div>
</template>

<style scoped>
.pod-slot { position: relative; min-width: 0; min-height: 0; }

.pod-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 1px dashed var(--line-3);
}
.placeholder-bar { width: 56%; height: 6px; }
.placeholder-pod { color: var(--dim); }

.pod-card {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: var(--panel);
  border: 1px solid color-mix(in srgb, var(--tier) 45%, var(--line-3));
  overflow: hidden;
}
.pod-card.lead { border-color: color-mix(in srgb, var(--gold) 60%, var(--line-3)); }
.pod-card.banning { border-color: color-mix(in srgb, var(--red) 45%, var(--line-3)); }
.pod-card.dimmed { opacity: 0.4; filter: grayscale(0.5); }
.pod-card.picked {
  border-color: var(--red);
  box-shadow: 0 0 20px color-mix(in srgb, var(--red) 30%, transparent);
}

.pod-stamp {
  position: absolute;
  left: 50%;
  top: 46%;
  z-index: 4;
  translate: -50% -50%;
  padding: 0.4rem 0.9rem;
  font-size: 1.4rem;
  border: 3px solid var(--gold);
  color: var(--gold);
  background: color-mix(in srgb, var(--ground) 88%, transparent);
  pointer-events: none;
}
.pod-stamp.red { border-color: var(--red); color: var(--red); }

.pod-top {
  height: 4px;
  background: var(--tier);
  flex-shrink: 0;
}

.pod-head {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 42px;
  padding: 0 10px;
  flex-shrink: 0;
}
.pod-tier { min-width: 32px; padding: 0 4px; color: var(--tier); border: 1px solid var(--tier); background: color-mix(in srgb, var(--tier) 14%, transparent); }
.pod-lead { color: var(--gold); }
.pod-id { margin-left: auto; color: var(--dim); }

.pod-stage {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  margin: 0 10px;
  overflow: hidden;
}
.pod-stage :deep(.item-card),
.pod-stage :deep(.choice-card) {
  width: 100%;
  height: 100%;
}

.pod-foot {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 12px;
  border-top: 1px solid var(--line-2);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--khaki);
  flex-shrink: 0;
}
.pod-card.lead .pod-foot { color: var(--gold); }
.pod-card.banning .pod-foot { color: var(--red); }
.pod-foot svg { margin-left: auto; }
.foot-mark {
  width: 16px;
  height: 16px;
  border: 2px solid var(--red);
  background: color-mix(in srgb, var(--red) 20%, transparent);
}

/* The falling pod: a two-half shell that splits on impact. */
.pod-drop {
  position: absolute;
  left: 50%;
  top: 12%;
  z-index: 3;
  width: 76px;
  height: 139px;
  margin-left: -38px;
  pointer-events: none;
  animation: pod-fall 0.5s cubic-bezier(0.55, 0, 0.9, 0.45) var(--delay) both;
}
.pod-half {
  position: absolute;
  top: 0;
  width: 38px;
  height: 139px;
  background: linear-gradient(160deg, var(--line-4), var(--raised));
  border: 1px solid var(--line-5);
}
.pod-l {
  left: 0;
  clip-path: polygon(0 6%, 100% 0, 100% 100%, 0 88%);
  animation: pod-l 0.36s ease-out calc(var(--delay) + 0.56s) forwards;
}
.pod-r {
  left: 38px;
  clip-path: polygon(0 0, 100% 6%, 100% 88%, 0 100%);
  animation: pod-r 0.36s ease-out calc(var(--delay) + 0.56s) forwards;
}
.pod-trail {
  position: absolute;
  left: 36px;
  bottom: 100%;
  width: 4px;
  height: 180px;
  background: linear-gradient(0deg, color-mix(in srgb, var(--gold) 85%, transparent), transparent);
  animation: fade-out 0.25s linear calc(var(--delay) + 0.48s) forwards;
}
.pod-impact {
  position: absolute;
  left: 10%;
  right: 10%;
  top: 60%;
  z-index: 3;
  height: 3px;
  background: var(--gold);
  box-shadow: 0 0 16px 2px color-mix(in srgb, var(--gold) 55%, transparent);
  opacity: 0;
  pointer-events: none;
  animation: pod-impact 0.5s ease-out calc(var(--delay) + 0.48s) both;
}

@keyframes pod-fall {
  0% { transform: translateY(-540px); }
  100% { transform: translateY(0); }
}
@keyframes pod-l {
  0% { transform: none; opacity: 1; }
  100% { transform: translate(-34px, 10px) rotate(-18deg); opacity: 0; }
}
@keyframes pod-r {
  0% { transform: none; opacity: 1; }
  100% { transform: translate(34px, 10px) rotate(18deg); opacity: 0; }
}
@keyframes pod-impact {
  0% { transform: scaleX(0.15); opacity: 0; }
  25% { opacity: 1; }
  100% { transform: scaleX(1.25); opacity: 0; }
}
@keyframes fade-out {
  to { opacity: 0; }
}
</style>
