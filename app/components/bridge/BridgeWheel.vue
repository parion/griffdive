<script setup lang="ts">
import { useDocumentVisibility, useIntersectionObserver } from '@vueuse/core'
import { conditionRiskAt } from '~~/shared/engine/config'
import { deriveMisfortune } from '~~/shared/engine/wheel'
import { WHEEL_SPIN_MS } from '~/utils/motion'

// The Bridge's showpiece: the dive's real wheel, spinning itself. Each turn is
// a fresh seed run through the engine's own derivation, so the directive it
// lands on is exactly what that seed would draw in a crusade. Presentation
// only — nothing here is ever sent to a dive.
const props = withDefaults(defineProps<{ difficulty?: number }>(), { difficulty: 7 })

const DWELL_MS = 3200
const seed = ref(0x6d2b79f5)
// The caption holds the last landed draw while the wheel turns, so it never
// spoils the next one.
const shownSeed = ref(seed.value)
const drawn = computed(() => deriveMisfortune(shownSeed.value))
const risk = computed(() => conditionRiskAt(drawn.value.id, props.difficulty))
const settled = ref(true)

const root = ref<HTMLElement | null>(null)
const inView = ref(false)
useIntersectionObserver(root, ([entry]) => {
  inView.value = entry?.isIntersecting ?? false
}, { threshold: 0.35 })
const visibility = useDocumentVisibility()

let timer: ReturnType<typeof setTimeout> | undefined
function spin(): void {
  let next = seed.value
  while (deriveMisfortune(next).id === drawn.value.id) {
    next = crypto.getRandomValues(new Uint32Array(1))[0]!
  }
  settled.value = false
  seed.value = next
  timer = setTimeout(() => {
    shownSeed.value = next
    settled.value = true
    queue()
  }, WHEEL_SPIN_MS)
}
function queue(): void {
  clearTimeout(timer)
  if (inView.value && visibility.value === 'visible') {
    timer = setTimeout(spin, DWELL_MS)
  }
}

onMounted(() => {
  // A still wheel under reduced motion: one landed draw, never a loop.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return
  }
  watch([inView, visibility], () => {
    if (settled.value) {
      queue()
    }
  }, { immediate: true })
})
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <figure
    ref="root"
    class="bw"
  >
    <div
      class="bw-wheel"
      aria-hidden="true"
      inert
    >
      <WheelOfAdversity
        :difficulty="difficulty"
        :seed="seed"
      />
    </div>
    <figcaption
      class="bw-call"
      :class="{ settled }"
    >
      <span class="lbl bw-k">
        <span
          class="lamp gold"
          :class="{ pulse: !settled }"
          aria-hidden="true"
        />
        {{ settled ? 'Squad directive' : 'Drawing…' }}
      </span>
      <span class="disp bw-name">{{ drawn.name }}</span>
      <span class="bw-rule">“<ConditionRule :condition="drawn" />”</span>
      <span class="bw-risk">
        <RiskPips
          :value="risk"
          :max="risk"
        />
        <span class="cap">Risk {{ risk }} at difficulty {{ difficulty }}</span>
      </span>
    </figcaption>
  </figure>
</template>

<style scoped>
.bw {
  position: relative;
  display: grid;
  justify-items: center;
  margin: 0;
  min-width: 0;
}
.bw-wheel {
  width: 100%;
  --wheel-size: min(100%, var(--bw-size, 520px));
}
.bw-call {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 6px;
  width: min(100%, 420px);
  margin-top: -12px;
  padding: 14px 18px 16px;
  border: 1px solid var(--line-3);
  border-top: 2px solid var(--gold);
  background: color-mix(in srgb, var(--panel) 92%, transparent);
  backdrop-filter: blur(6px);
  transition: opacity var(--dur-med), transform var(--dur-med) var(--ease-out);
}
.bw-call:not(.settled) { opacity: 0.55; transform: translateY(4px); }
.bw-k { display: inline-flex; align-items: center; gap: 8px; color: var(--gold); }
.bw-name {
  font-size: clamp(20px, 2.2vw, 28px);
  line-height: 1.05;
  color: var(--text);
}
.bw-rule { font-size: var(--fs-sm); color: var(--khaki); }
.bw-risk { display: flex; align-items: center; gap: 10px; }
.bw-risk .cap { color: var(--muted); }
</style>
