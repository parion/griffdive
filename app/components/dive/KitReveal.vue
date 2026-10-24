<script setup lang="ts">
import { ITEMS_BY_ID } from '~~/shared/data/catalog'
import type { CrusadeMode, CrusadeVariant } from '~~/shared/engine/types'

// The launch beat: the diver's SEAF pack lands in the Starting Kit's "?" boxes
// one by one, then the stage hands off to the wheel. Pure presentation — the
// pack was dealt by the engine at launch, and nothing here gates an action.
const props = defineProps<{
  variant: CrusadeVariant
  mode?: CrusadeMode
  support: readonly string[]
  name: string
}>()

const emit = defineEmits<{
  done: []
}>()

const STEP_MS = 480
const LEAD_MS = 650
const HOLD_MS = 1300

const shown = ref(0)
const total = computed(() => props.support.length)
const finished = computed(() => shown.value >= total.value)
const latest = computed(() => {
  const id = shown.value > 0 ? props.support[shown.value - 1] : undefined
  return id ? ITEMS_BY_ID.get(id)?.displayName ?? '' : ''
})

const root = useTemplateRef<HTMLElement>('root')
const timers: ReturnType<typeof setTimeout>[] = []
let closed = false

function close(): void {
  if (closed) {
    return
  }
  closed = true
  timers.forEach(clearTimeout)
  emit('done')
}

// The kit is taller than a screen: keep the tile that just landed in view.
watch(shown, async () => {
  await nextTick()
  const fresh = root.value?.querySelector('.tile.fresh')
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  fresh?.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' })
})

onMounted(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced || total.value === 0) {
    shown.value = total.value
    timers.push(setTimeout(close, HOLD_MS))
    return
  }
  for (let step = 1; step <= total.value; step++) {
    timers.push(setTimeout(() => {
      shown.value = step
    }, LEAD_MS + (step - 1) * STEP_MS))
  }
  timers.push(setTimeout(close, LEAD_MS + total.value * STEP_MS + HOLD_MS))
})
onBeforeUnmount(() => timers.forEach(clearTimeout))
</script>

<template>
  <main
    id="main-content"
    ref="root"
    class="reveal scan"
    tabindex="-1"
    aria-labelledby="kit-reveal-h"
  >
    <div class="reveal-inner">
      <header class="reveal-head">
        <span class="lbl gold">SEAF Support Package</span>
        <h1
          id="kit-reveal-h"
          class="disp reveal-title"
        >
          Resupply inbound
        </h1>
        <p class="reveal-sub">
          <span class="who">{{ upperName(name) }}</span>
          <span class="count"><b>{{ shown }}</b> / {{ total }} dispatched</span>
        </p>
      </header>

      <StartingKit
        :variant="variant"
        :mode="mode"
        :support="support"
        :shown="shown"
        compact
      />

      <footer class="reveal-foot">
        <button
          class="btn"
          :class="{ 'primary': finished, 'cta-sweep': finished }"
          type="button"
          @click="close"
        >
          {{ finished ? 'To the wheel' : 'Skip' }}
        </button>
      </footer>
    </div>
    <p
      class="sr-only"
      role="status"
      aria-live="polite"
    >
      {{ latest ? `Dispatched: ${latest}` : '' }}
    </p>
  </main>
</template>

<style scoped>
.reveal {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: var(--pad-page);
  background: var(--ground);
}
.reveal-inner {
  display: grid;
  gap: var(--sp-5);
  width: min(100%, 60rem);
  max-height: 100dvh;
  padding-block: var(--sp-5);
  overflow-y: auto;
}
.reveal-head { display: grid; gap: var(--sp-2); }
.reveal-title { margin: 0; font-size: var(--fs-h1); color: var(--text); }
.reveal-sub {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--sp-3);
  margin: 0;
  color: var(--khaki);
  font-size: var(--fs-sm);
  letter-spacing: 0.08em;
}
.who { font-weight: 700; color: var(--gold); }
.count { font-variant-numeric: tabular-nums; }
.count b { color: var(--text); }
.reveal-foot {
  position: sticky;
  bottom: 0;
  display: flex;
  justify-content: flex-end;
  padding-block: var(--sp-3);
  background: linear-gradient(180deg, transparent, var(--ground) 40%);
}
</style>
