<script setup lang="ts">
import { conditionRiskAt } from '~~/shared/engine/config'
import { pactById } from '~~/shared/data/conditions'

// A dealt hand of three real pacts. Once the beat is in view the cards fan in,
// then two of them take the SWORN stamp — the moment a diver bets on themself.
const props = withDefaults(defineProps<{ lit: boolean, difficulty?: number }>(), { difficulty: 7 })

const HAND = [
  { id: 'thirsty', tilt: -5, sworn: true },
  { id: 'untouchable', tilt: 0, sworn: false },
  { id: 'loadoutLoyalist', tilt: 5, sworn: true },
] as const
const SWEAR_AT = 900
const SWEAR_STEP = 520

const cards = computed(() => HAND.flatMap(({ id, tilt, sworn }) => {
  const condition = pactById(id)
  return condition ? [{ condition, tilt, sworn, risk: conditionRiskAt(id, props.difficulty) }] : []
}))

const swornCount = ref(0)
const timers: ReturnType<typeof setTimeout>[] = []
onBeforeUnmount(() => timers.forEach(clearTimeout))
watch(() => props.lit, (lit) => {
  if (!lit) {
    return
  }
  const total = HAND.filter(card => card.sworn).length
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    swornCount.value = total
    return
  }
  for (let i = 1; i <= total; i++) {
    timers.push(setTimeout(() => {
      swornCount.value = i
    }, SWEAR_AT + (i - 1) * SWEAR_STEP))
  }
}, { immediate: true })

function stampFor(index: number): string {
  const order = cards.value.slice(0, index + 1).filter(card => card.sworn).length
  return cards.value[index]?.sworn && order <= swornCount.value ? 'Sworn' : ''
}
const swornRisk = computed(() =>
  cards.value.filter((card, i) => stampFor(i)).reduce((sum, card) => sum + card.risk, 0))
</script>

<template>
  <div
    class="hand"
    :class="{ lit }"
  >
    <div class="hand-cards">
      <div
        v-for="(card, i) in cards"
        :key="card.condition.id"
        class="hand-slot"
        :style="{ '--i': i }"
      >
        <ConditionCard
          :condition="card.condition"
          :risk="card.risk"
          :tilt="card.tilt"
          :selected="Boolean(stampFor(i))"
          :stamp="stampFor(i)"
          :selectable="false"
        />
      </div>
    </div>
    <div class="hand-tally">
      <span class="cap">Sworn this mission</span>
      <RiskPips
        :value="swornRisk"
        :max="Math.max(swornRisk, 1)"
        tone="gold"
      />
      <span class="hand-note">Your skulls, your odds — the squad never pays for your bet.</span>
    </div>
  </div>
</template>

<style scoped>
.hand { display: grid; gap: 22px; container-type: inline-size; }
.hand-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(8px, 1.4vw, 18px);
  padding-top: 12px;
}
.hand-slot {
  display: grid;
  opacity: 0;
  transform: translateY(40px) rotate(calc((var(--i) - 1) * 8deg));
  transition:
    opacity var(--dur-slow) var(--ease-out) calc(var(--i) * 120ms),
    transform 0.7s var(--ease-impact) calc(var(--i) * 120ms);
}
.lit .hand-slot { opacity: 1; transform: none; }
.hand-slot :deep(.condition) { height: 100%; cursor: default; }
.hand-tally {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 12px 16px;
  border: 1px dashed var(--line-3);
}
.hand-tally .cap { color: var(--gold); }
.hand-note { flex-basis: 100%; font-size: var(--fs-sm); color: var(--muted); }
@container (min-width: 620px) {
  .hand-note { flex-basis: auto; margin-left: auto; }
}
/* A phone holds the hand like a hand: one card in view, the rest a swipe away. */
@container (max-width: 520px) {
  .hand-cards {
    grid-template-columns: none;
    grid-auto-flow: column;
    grid-auto-columns: 74%;
    overflow-x: auto;
    padding: 12px 4px 8px;
    scroll-snap-type: x mandatory;
  }
  .hand-slot { scroll-snap-align: center; }
  .hand-slot :deep(.condition) { transform: none; }
}
</style>
