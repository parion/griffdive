<script setup lang="ts">
import { ITEMS_BY_ID } from '~~/shared/data/catalog'
import type { CrusadeMode, CrusadeVariant } from '~~/shared/engine/types'

// The launch beat: a modal over the wheel where the diver's SEAF pack lands in
// the Starting Kit's "?" boxes one by one. It stays up until the diver closes
// it. Pure presentation — the pack was dealt by the engine at launch, and
// nothing here gates an action.
const props = defineProps<{
  variant: CrusadeVariant
  mode?: CrusadeMode
  support: readonly string[]
  name: string
}>()

const open = defineModel<boolean>('open', { required: true })

const STEP_MS = 480
const LEAD_MS = 650

const shown = ref(0)
const total = computed(() => props.support.length)
const finished = computed(() => shown.value >= total.value)
const latest = computed(() => {
  const id = shown.value > 0 ? props.support[shown.value - 1] : undefined
  return id ? ITEMS_BY_ID.get(id)?.displayName ?? '' : ''
})

const body = useTemplateRef<HTMLElement>('body')
const timers: ReturnType<typeof setTimeout>[] = []

function clearTimers(): void {
  timers.splice(0).forEach(clearTimeout)
}

// The kit is taller than the modal: keep the tile that just landed in view.
watch(shown, async () => {
  await nextTick()
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  body.value?.querySelector('.tile.fresh')?.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' })
})

// Each time the modal opens the pack is dealt out again from the first box.
watch(open, (isOpen) => {
  clearTimers()
  if (!isOpen) {
    return
  }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    shown.value = total.value
    return
  }
  shown.value = 0
  for (let step = 1; step <= total.value; step++) {
    timers.push(setTimeout(() => {
      shown.value = step
    }, LEAD_MS + (step - 1) * STEP_MS))
  }
}, { immediate: true })

onBeforeUnmount(clearTimers)
</script>

<template>
  <AppDialog
    v-model:open="open"
    title="Resupply inbound"
    description="Your SEAF Support Package, rolled for this crusade."
    size="xl"
    :show-close="false"
  >
    <div
      ref="body"
      class="reveal"
    >
      <p class="reveal-sub">
        <span class="who">{{ upperName(name) }}</span>
        <span class="count"><b>{{ shown }}</b> / {{ total }} dispatched</span>
      </p>
      <StartingKit
        :variant="variant"
        :mode="mode"
        :support="support"
        :shown="shown"
        compact
      />
    </div>
    <p
      class="sr-only"
      role="status"
      aria-live="polite"
    >
      {{ latest ? `Dispatched: ${latest}` : '' }}
    </p>
    <template #footer>
      <button
        class="btn"
        :class="{ 'primary': finished, 'cta-sweep': finished }"
        type="button"
        @click="open = false"
      >
        {{ finished ? 'To the wheel' : 'Skip' }}
      </button>
    </template>
  </AppDialog>
</template>

<style scoped>
.reveal { display: grid; gap: var(--sp-3); }
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
</style>
