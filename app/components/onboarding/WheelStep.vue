<script setup lang="ts">
import { MISFORTUNES } from '~~/shared/data/misfortunes'
import { MISFORTUNE_RISK } from '~~/shared/engine/config'
import { SPRING_POP } from '~/utils/motion'

// A fixed draw so the demo is legible every run. The reel still earns it.
const FINAL_ID = 'oopsAllAirstrikes'
const final = MISFORTUNES.find(entry => entry.id === FINAL_ID) ?? MISFORTUNES[0]!
const candidates = MISFORTUNES.map(entry => entry.name)
const risk = MISFORTUNE_RISK[FINAL_ID] ?? 0

const reelId = ref<number | null>(null)
const reeling = ref(false)
const landed = ref(false)

onMounted(() => {
  const reduced = import.meta.client
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    landed.value = true
    return
  }
  reelId.value = Date.now()
})

watch(reeling, (rolling) => {
  if (!rolling && reelId.value !== null) {
    setTimeout(() => {
      landed.value = true
    }, 250)
  }
})
</script>

<template>
  <div class="wheel-demo">
    <div class="demo-card">
      <span class="demo-head">Misfortune</span>
      <strong class="demo-name">
        <ReelText
          :final="final.name"
          :candidates="candidates"
          :reel-id="reelId"
          @reeling="reeling = $event"
        />
      </strong>
      <p class="demo-rule">
        {{ final.rule }}
      </p>
      <span class="row risk-row small muted">Team risk <RiskPips :value="risk" /></span>
      <AnimatePresence>
        <Motion
          v-if="landed"
          as="span"
          class="demo-stamp"
          :initial="{ opacity: 0, scale: 1.4 }"
          :animate="{ opacity: 1, scale: 1 }"
          :transition="SPRING_POP"
        >
          Locked in — +{{ risk }} team risk
        </Motion>
      </AnimatePresence>
    </div>
  </div>
</template>

<style scoped>
.wheel-demo { display: grid; justify-items: center; }

.demo-card {
  position: relative;
  display: grid;
  gap: 0.35rem;
  width: min(100%, 24rem);
  min-height: 8.5rem;
  align-content: center;
  padding: 0.9rem 1rem;
  border: 1px solid color-mix(in srgb, var(--red) 50%, var(--border));
  border-radius: 10px;
  background:
    linear-gradient(165deg, color-mix(in srgb, var(--red) 10%, transparent), transparent 60%),
    var(--bg);
}

.demo-head {
  font-size: 0.68rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}
.demo-name {
  font-family: var(--font-display);
  font-stretch: 125%;
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: var(--gold);
}
.demo-rule { margin: 0; }

.demo-stamp {
  justify-self: start;
  margin-top: 0.2rem;
  padding: 0.1rem 0.5rem;
  border: 1px solid var(--red);
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--red);
}
</style>
