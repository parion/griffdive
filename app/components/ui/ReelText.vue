<script setup lang="ts">
interface ReelStep {
  key: string
  text: string
  delay: number
}

const props = withDefaults(defineProps<{
  final: string
  candidates: readonly string[]
  reelId: string | number | null
  duration?: number
  startDelay?: number
}>(), { duration: 1500, startDelay: 0 })

const emit = defineEmits<{ reeling: [value: boolean] }>()

const display = ref(props.final)
const reeling = ref(false)
const stepKey = ref('settled')
const stepDelay = ref(120)

let timer: ReturnType<typeof setTimeout> | undefined

function shuffle(list: readonly string[]): string[] {
  const bag = [...list]
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[bag[i], bag[j]] = [bag[j]!, bag[i]!]
  }
  return bag
}

// Geometric slowdown: fast blur of candidates that decelerates onto the final
// entry, so the reveal reads as a machine winding down rather than a swap.
function buildSchedule(): ReelStep[] {
  const pool = props.candidates.filter(name => name !== props.final)
  const steps: ReelStep[] = []
  let bag = shuffle(pool)
  let cursor = 0
  let delay = 45
  let elapsed = 0
  while (elapsed < props.duration) {
    if (cursor >= bag.length) {
      bag = shuffle(pool)
      cursor = 0
    }
    const text = bag[cursor]!
    steps.push({ key: `${text}#${steps.length}`, text, delay })
    elapsed += delay
    delay = Math.min(delay * 1.3, 280)
    cursor++
  }
  steps.push({ key: 'settled', text: props.final, delay })
  return steps
}

function run(): void {
  clearTimeout(timer)
  display.value = props.final
  reeling.value = false
  if (!import.meta.client) {
    return
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (props.reelId == null || reduced || props.candidates.length === 0) {
    return
  }

  const schedule = buildSchedule()
  const begin = (): void => {
    reeling.value = true
    emit('reeling', true)
    let index = 0
    const tick = (): void => {
      const step = schedule[index]!
      display.value = step.text
      stepKey.value = step.key
      stepDelay.value = step.delay
      index++
      if (index >= schedule.length) {
        reeling.value = false
        emit('reeling', false)
        return
      }
      timer = setTimeout(tick, step.delay)
    }
    tick()
  }
  timer = setTimeout(begin, props.startDelay)
}

watch(() => props.reelId, run, { immediate: true })
watch(() => props.final, (final) => {
  if (!reeling.value) {
    display.value = final
  }
})

onBeforeUnmount(() => {
  clearTimeout(timer)
  emit('reeling', false)
})

const reelTransition = computed(() =>
  reeling.value
    ? { duration: Math.min(stepDelay.value / 1000 * 0.8, 0.26), ease: 'easeOut' }
    : { ...SPRING_POP },
)
</script>

<template>
  <span
    class="reel"
    :class="{ reeling }"
    :aria-busy="reeling"
  >
    <AnimatePresence
      mode="popLayout"
      :initial="false"
    >
      <Motion
        :key="reeling ? stepKey : 'settled'"
        as="span"
        class="reel-text"
        :initial="reeling ? { y: '-0.85em', opacity: 0 } : { scale: 0.75, opacity: 0.6 }"
        :animate="reeling ? { y: 0, opacity: 1 } : { scale: 1, opacity: 1 }"
        :exit="{ y: '0.85em', opacity: 0 }"
        :transition="reelTransition"
      >{{ display }}</Motion>
    </AnimatePresence>
  </span>
</template>

<style scoped>
.reel {
  position: relative;
  display: inline-flex;
  justify-content: center;
  overflow: hidden;
  vertical-align: bottom;
}

.reel-text {
  display: inline-block;
  will-change: transform, opacity;
}

.reel.reeling .reel-text {
  color: var(--khaki);
}
</style>
