<script setup lang="ts">
import { useIntersectionObserver } from '@vueuse/core'

// One beat of the Bridge's "how it plays" run: a numbered headline and its
// copy beside a lit visual. The beat lights once it scrolls into view and
// tells its visual through the `lit` slot prop, so entrances play on arrival
// rather than off-screen at page load.
const props = withDefaults(defineProps<{
  id: string
  n: string
  kicker: string
  title: string
  flip?: boolean
}>(), { flip: false })

const root = ref<HTMLElement | null>(null)
const lit = ref(false)
const { stop } = useIntersectionObserver(root, ([entry]) => {
  if (entry?.isIntersecting) {
    lit.value = true
    stop()
  }
}, { threshold: 0.25 })

const headingId = computed(() => `${props.id}-h`)
</script>

<template>
  <section
    :id="id"
    ref="root"
    class="beat"
    :class="{ flip, lit }"
    :aria-labelledby="headingId"
  >
    <div class="beat-copy">
      <span class="beat-k lbl">
        <span class="disp beat-n">{{ n }}</span>
        {{ kicker }}
      </span>
      <h2
        :id="headingId"
        class="disp beat-title"
      >
        {{ title }}
      </h2>
      <div class="beat-body">
        <slot />
      </div>
    </div>
    <div class="beat-visual">
      <slot
        name="visual"
        :lit="lit"
      />
    </div>
  </section>
</template>

<style scoped>
.beat {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: clamp(20px, 3vw, 48px);
  align-items: center;
  padding-block: clamp(40px, 7vw, 96px);
  border-top: 1px solid var(--line-1);
  container-type: inline-size;
}
@media (min-width: 960px) {
  .beat { grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); }
  .beat.flip .beat-copy { order: 2; }
}
.beat-copy {
  display: grid;
  gap: 14px;
  align-content: start;
  opacity: 0;
  transform: translateY(18px);
  transition: opacity var(--dur-slow) var(--ease-out), transform var(--dur-slow) var(--ease-out);
}
.lit .beat-copy { opacity: 1; transform: none; }
.beat-k { display: flex; align-items: baseline; gap: 12px; color: var(--gold); }
.beat-n { font-size: 15px; }
.beat-title {
  margin: 0;
  font-size: clamp(30px, 4.2vw, 56px);
  line-height: 0.98;
  color: var(--text);
  text-wrap: balance;
}
.beat-body {
  display: grid;
  gap: 12px;
  max-width: 34rem;
  font-size: clamp(14px, 1.1vw, 16px);
  line-height: 1.6;
  color: var(--khaki);
}
.beat-body :deep(p) { margin: 0; }
.beat-body :deep(b) { color: var(--text); }
.beat-visual { min-width: 0; }
</style>
