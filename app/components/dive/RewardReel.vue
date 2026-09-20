<script setup lang="ts">
import { itemImageUrl } from '~~/shared/data/images'
import type { Item } from '~~/shared/data/types'
import type { RewardOption } from '~~/shared/engine/rewards'
import { SPRING_POP } from '~/utils/motion'

const props = defineProps<{
  option: RewardOption
  candidates: readonly Item[]
  choicePool: Item[]
  ownedIds: string[]
  index: number
  // The draft was already resolved (or motion is reduced): skip the roll.
  instant: boolean
  // Every reel has stopped and nothing is claimed yet.
  canPick: boolean
  picked: boolean
  dimmed: boolean
}>()

const emit = defineEmits<{
  pick: [optionId: string, choiceItemId?: string]
  settled: []
}>()

// One symbol per window. The strip scrolls a fixed-height column and decelerates
// onto the winner, echoing the Wheel of Misfortune — staggered by reel so the
// slots lock in left to right.
const CELLS = 24
const BASE_SPIN = 1500
const STAGGER = 320

function shuffle<T>(list: readonly T[]): T[] {
  const bag = [...list]
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[bag[i], bag[j]] = [bag[j]!, bag[i]!]
  }
  return bag
}

const winner = computed(() => props.option.item)
const tierVar = computed(() =>
  props.option.choice ? 'var(--tier-splus)' : `var(--tier-${winner.value.tier})`)
const winnerTier = computed(() => (props.option.choice ? 'S+' : winner.value.tier))

const strip = (() => {
  const source = props.candidates.length > 0 ? props.candidates : [props.option.item]
  const bag = shuffle(source)
  return Array.from({ length: CELLS }, (_, i) => bag[i % bag.length]!)
})()

const reduced = import.meta.client
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const instant = props.instant || reduced
const spinDuration = instant ? 0 : BASE_SPIN + props.index * STAGGER

const settled = ref(instant)

let timer: ReturnType<typeof setTimeout> | undefined
onMounted(() => {
  if (instant) {
    emit('settled')
    return
  }
  timer = setTimeout(() => {
    settled.value = true
    emit('settled')
  }, spinDuration + 40)
})
onBeforeUnmount(() => clearTimeout(timer))

function imageUrl(item: Item): string | undefined {
  return itemImageUrl(item)
}
</script>

<template>
  <div
    class="reel"
    :style="{ '--cell-h': '12rem' }"
  >
    <div
      class="reel-window"
      :class="{ reeling: !settled && !instant, settled, picked, dimmed }"
      :style="{ '--tier': tierVar }"
    >
      <div
        class="reel-strip"
        :class="{ rolling: !instant }"
        aria-hidden="true"
        :style="{
          '--target': strip.length,
          '--spin-dur': `${spinDuration}ms`,
          'transform': instant ? `translateY(calc(var(--cell-h) * ${-strip.length}))` : undefined,
        }"
      >
        <div
          v-for="(symbol, i) in strip"
          :key="`${symbol.id}-${i}`"
          class="reel-symbol"
          :data-tier="symbol.tier"
        >
          <img
            v-if="imageUrl(symbol)"
            class="sym-art"
            :src="imageUrl(symbol)"
            alt=""
            draggable="false"
          >
          <span class="sym-name">{{ symbol.displayName }}</span>
        </div>
        <div
          class="reel-symbol winner"
          :data-tier="winnerTier"
        >
          <img
            v-if="imageUrl(winner)"
            class="sym-art"
            :src="imageUrl(winner)"
            alt=""
            draggable="false"
          >
          <span class="sym-name">{{ winner.displayName }}</span>
        </div>
      </div>
      <Motion
        v-if="settled"
        as="div"
        class="reel-result"
        :class="{ locked: dimmed || !canPick }"
        :initial="{ opacity: 0, scale: 0.96 }"
        :animate="{ opacity: 1, scale: 1 }"
        :transition="SPRING_POP"
      >
        <DiversChoiceCard
          v-if="option.choice"
          :pool="choicePool"
          :owned-ids="ownedIds"
          @choose="itemId => emit('pick', option.optionId, itemId)"
        />
        <ItemCard
          v-else
          :item="winner"
          :selected="picked"
          :disabled="dimmed || !canPick"
          @select="emit('pick', option.optionId)"
        />
      </Motion>
    </div>
  </div>
</template>

<style scoped>
.reel {
  flex: 0 0 clamp(8.5rem, 22vw, 11rem);
  min-width: 0;
}

.reel-window {
  position: relative;
  height: var(--cell-h);
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 12px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--tier, var(--gold)) 5%, transparent), transparent 30%),
    var(--bg);
  box-shadow: inset 0 0 26px rgba(0, 0, 0, 0.55);
  transition: border-color var(--dur-med) var(--ease-out), opacity var(--dur-med) var(--ease-out), filter var(--dur-med) var(--ease-out);
}

.reel-window.settled {
  border-color: color-mix(in srgb, var(--tier, var(--gold)) 45%, var(--border));
}
.reel-window.picked {
  border-color: var(--gold);
  box-shadow: 0 0 20px color-mix(in srgb, var(--gold) 30%, transparent), inset 0 0 26px rgba(0, 0, 0, 0.55);
}
.reel-window.dimmed { opacity: 0.4; filter: grayscale(0.5); }

/* Glass + vignette so the symbols read as a lit cabinet window. */
.reel-window::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: inherit;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.45), transparent 24%, transparent 76%, rgba(0, 0, 0, 0.45));
}

.reel-strip {
  display: grid;
  grid-auto-rows: var(--cell-h);
  will-change: transform;
}
/* The roll is a keyframe, not a transition: the strip is inserted already at
   rest, so a transition would collapse into an instant jump. */
.reel-strip.rolling {
  animation: reel-spin var(--spin-dur, 1500ms) var(--ease-out) forwards;
}
@keyframes reel-spin {
  from { transform: translateY(0); }
  to { transform: translateY(calc(var(--cell-h) * var(--target) * -1)); }
}

.reel-symbol {
  box-sizing: border-box;
  height: var(--cell-h);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.6rem;
  text-align: center;
  border: 1px solid color-mix(in srgb, currentColor 28%, var(--border));
  background:
    linear-gradient(165deg, color-mix(in srgb, currentColor 10%, transparent), transparent 60%),
    var(--bg);
}
.reel-window.reeling .reel-symbol { filter: blur(1px); }

.sym-art {
  width: 4.5rem;
  height: 4.5rem;
  object-fit: contain;
}

.sym-name {
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1.15;
  color: var(--text);
  overflow-wrap: anywhere;
}

.reel-result {
  position: absolute;
  inset: 0;
  display: grid;
}
.reel-result.locked { pointer-events: none; }
.reel-result :deep(.choice-card) {
  height: 100%;
  gap: 0.4rem;
  padding: 0.5rem;
}
.reel-result :deep(.choice-head) {
  flex-direction: column;
  gap: 0.3rem;
  text-align: center;
}
.reel-result :deep(.choice-mark) {
  min-width: 1.6rem;
  height: 1.6rem;
  font-size: 0.72rem;
}
.reel-result :deep(.choice-title) {
  font-size: 0.78rem;
  letter-spacing: 0.06em;
}
.reel-result :deep(.choice-sub) { display: none; }
.reel-result :deep(.choice-input) {
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.4rem 0.35rem;
  text-align: center;
}
.reel-result :deep(.choice-placeholder) { display: none; }

/* The prize reads as a slot symbol: a big standardized art panel over the name,
   framed in the tier's color while the art keeps its category tint. */
.reel-result :deep(.item-card) {
  width: 100%;
  height: 100%;
  align-content: center;
  justify-items: center;
  text-align: center;
  gap: 0.45rem;
  padding: 0.6rem;
  border-color: color-mix(in srgb, var(--tier) 55%, var(--border));
  background:
    linear-gradient(165deg, color-mix(in srgb, var(--tier) 15%, transparent), transparent 62%),
    var(--bg-raised);
}
.reel-result :deep(.item-top) {
  flex-direction: column;
  width: 100%;
  gap: 0.4rem;
}
.reel-result :deep(.tier-dot),
.reel-result :deep(.item-meta),
.reel-result :deep(.item-stats) { display: none; }
.reel-result :deep(.item-icon) {
  width: 100%;
  height: 5.5rem;
  object-fit: contain;
  background: color-mix(in srgb, var(--cat) 14%, var(--bg));
  border-color: color-mix(in srgb, var(--cat) 30%, var(--border));
  border-radius: 8px;
  padding: 0.4rem;
}
.reel-result :deep(.item-name) {
  text-align: center;
  line-height: 1.15;
}
.reel-result :deep(.item-tags) {
  justify-content: center;
  text-align: center;
}
</style>
