<script setup lang="ts">
import { GRIFFDIVER_TAGLINE } from '~~/shared/data/lore'
import { SPRING_POP } from '~/utils/motion'

const name = defineModel<string>({ required: true })

const grade = ref<'A' | 'E'>('A')
const stamped = ref(false)
const nameInput = ref<HTMLInputElement | null>(null)

// The registry card is the whole pitch: watch A reclassify to E. Reduced motion
// settles straight on the verdict.
onMounted(() => {
  const reduced = import.meta.client
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    grade.value = 'E'
    stamped.value = true
  }
  else {
    setTimeout(() => {
      grade.value = 'E'
    }, 850)
    setTimeout(() => {
      stamped.value = true
    }, 1250)
  }
  nextTick(() => nameInput.value?.focus())
})
</script>

<template>
  <div class="identity">
    <p class="identity-lede">
      {{ GRIFFDIVER_TAGLINE }}
    </p>

    <div
      class="registry"
      :class="{ reclassified: grade === 'E' }"
    >
      <span class="registry-head">Super Earth Citizen Registry</span>
      <div class="registry-grade-row">
        <span class="registry-label">Class</span>
        <Motion
          :key="grade"
          as="span"
          class="registry-grade"
          :initial="{ scale: 0.3, opacity: 0 }"
          :animate="{ scale: 1, opacity: 1 }"
          :transition="SPRING_POP"
        >
          {{ grade }}
        </Motion>
        <AnimatePresence>
          <Motion
            v-if="stamped"
            as="span"
            class="registry-stamp"
            :initial="{ opacity: 0, scale: 1.7, rotate: -20 }"
            :animate="{ opacity: 1, scale: 1, rotate: -8 }"
            :transition="SPRING_POP"
          >
            GRIFFDIVER
          </Motion>
        </AnimatePresence>
      </div>
    </div>

    <label class="field">
      <span class="muted small">Diver name</span>
      <input
        ref="nameInput"
        v-model="name"
        type="text"
        maxlength="32"
        placeholder="Griffin"
        autocomplete="nickname"
        spellcheck="false"
      >
    </label>
  </div>
</template>

<style scoped>
.identity { display: grid; gap: 0.9rem; justify-items: center; }
.identity-lede {
  max-width: 32rem;
  margin: 0;
  text-align: center;
  color: var(--khaki);
}
.identity .field { width: min(100%, 22rem); }

.registry {
  position: relative;
  display: grid;
  gap: 0.35rem;
  width: min(100%, 22rem);
  padding: 0.75rem 0.9rem;
  border: 1px solid color-mix(in srgb, var(--gold) 40%, var(--border));
  border-radius: 8px;
  background: color-mix(in srgb, var(--gold) 6%, var(--bg));
  transition: border-color var(--dur-med) var(--ease-out), background var(--dur-med) var(--ease-out);
}
.registry.reclassified {
  border-color: color-mix(in srgb, var(--red) 55%, var(--border));
  background: color-mix(in srgb, var(--red) 7%, var(--bg));
}

.registry-head {
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
}

.registry-grade-row { display: flex; align-items: center; gap: 0.6rem; }
.registry-label {
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--khaki);
}
.registry-grade {
  display: inline-grid;
  place-items: center;
  width: 2.1rem;
  height: 2.1rem;
  border: 1px solid currentColor;
  border-radius: 6px;
  font-family: var(--font-display);
  font-stretch: 125%;
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--gold);
}
.registry.reclassified .registry-grade { color: var(--red); }

.registry-stamp {
  margin-left: auto;
  padding: 0.15rem 0.5rem;
  border: 2px solid var(--red);
  border-radius: 4px;
  font-family: var(--font-display);
  font-stretch: 125%;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  color: var(--red);
  rotate: -8deg;
}
</style>
