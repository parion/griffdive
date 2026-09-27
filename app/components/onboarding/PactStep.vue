<script setup lang="ts">
import { PACTS } from '~~/shared/data/pacts'
import { PACT_RISK } from '~~/shared/engine/config'
import { SPRING_SNAP } from '~/utils/motion'

const demoPacts = ['thirsty', 'packLight']
  .map(id => PACTS.find(pact => pact.id === id))
  .filter((pact): pact is NonNullable<typeof pact> => Boolean(pact))

// The meter IS the lesson: team risk lands, then a pact stacks onto it, and the
// ceiling ladder lights up a tier at a time.
const team = ref(0)
const pact = ref(0)
const locked = ref(false)

onMounted(() => {
  const reduced = import.meta.client
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    team.value = 3
    pact.value = 2
    locked.value = true
    return
  }
  setTimeout(() => {
    team.value = 3
  }, 500)
  setTimeout(() => {
    pact.value = 2
    locked.value = true
  }, 1400)
})
</script>

<template>
  <div class="pact-demo">
    <div class="pact-chips">
      <Motion
        v-for="(entry, index) in demoPacts"
        :key="entry.id"
        as="span"
        class="pact-chip"
        :initial="{ opacity: 0, y: 14 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ ...SPRING_SNAP, delay: 0.2 + index * 0.15 }"
      >
        <strong>{{ entry.name }}</strong>
        <RiskPips
          :value="PACT_RISK[entry.id] ?? 0"
          :max="3"
        />
      </Motion>
    </div>
    <ValorMeter
      :difficulty="3"
      :team-risk="team"
      :pact-risk="pact"
      :locked="locked"
    />
  </div>
</template>

<style scoped>
.pact-demo { display: grid; gap: 0.7rem; width: min(100%, 26rem); margin: 0 auto; }

.pact-chips { display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center; }
.pact-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.3rem 0.6rem;
  border: 1px solid color-mix(in srgb, var(--red) 45%, var(--border));
  border-radius: 999px;
  background: color-mix(in srgb, var(--red) 8%, var(--bg));
  font-size: 0.82rem;
}
</style>
