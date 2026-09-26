<script setup lang="ts">
import { FRONTS } from '~~/shared/data/fronts'
import type { FrontId } from '~~/shared/data/fronts'
import { MAJOR_ORDER_REROLL_BONUS } from '~~/shared/engine/config'
import type { DiveState, MajorOrderSelection } from '~~/shared/engine/types'

const props = defineProps<{
  state: DiveState
  canControl: boolean
}>()

const emit = defineEmits<{
  select: [order: MajorOrderSelection | null]
}>()

// The live war, when the server proxy can reach it. Null offline/static or on a
// failed fetch — the manual picker is the fallback.
const { order: suggestion, pending: suggestionPending } = useMajorOrder()

const selected = computed(() => props.state.majorOrder?.fronts ?? [])

function isSelected(frontId: FrontId): boolean {
  return selected.value.includes(frontId)
}

function chooseFront(frontId: FrontId | null): void {
  emit('select', frontId ? { fronts: [frontId] } : null)
}

const suggestionFronts = computed(() => {
  const order = suggestion.value
  if (!order) {
    return ''
  }
  return order.fronts
    .map(id => FRONTS.find(front => front.id === id)?.displayName ?? id)
    .join(' / ')
})
</script>

<template>
  <section class="panel mo">
    <h2>Major Order</h2>
    <p class="muted small">
      Fight where the war is: pin this operation to the live Major Order's front.
      Complete the operation to bank
      <strong>{{ MAJOR_ORDER_REROLL_BONUS }}</strong>
      extra reroll token{{ MAJOR_ORDER_REROLL_BONUS === 1 ? '' : 's' }}.
    </p>
    <div
      v-if="suggestion"
      class="mo-suggestion"
    >
      <span class="muted small">Live Major Order</span>
      <strong class="mo-suggestion-title">{{ suggestion.title }}</strong>
      <span
        v-if="suggestion.planetNames?.length"
        class="muted small"
      >{{ suggestion.planetNames.join(', ') }}</span>
      <button
        class="btn primary"
        type="button"
        :disabled="!canControl"
        @click="emit('select', suggestion)"
      >
        Play it — {{ suggestionFronts }}
      </button>
    </div>
    <p
      v-else-if="suggestionPending && canControl"
      class="muted small"
    >
      Checking the live war…
    </p>
    <div
      class="row mo-options"
      role="group"
      aria-label="Major Order front"
    >
      <button
        v-for="front in FRONTS"
        :key="front.id"
        class="btn mo-option"
        :class="{ selected: isSelected(front.id) }"
        :style="{ '--mo-accent': front.accent }"
        type="button"
        :disabled="!canControl"
        :aria-pressed="isSelected(front.id)"
        @click="chooseFront(front.id)"
      >
        {{ front.displayName }}
      </button>
      <button
        class="btn ghost mo-option"
        :class="{ selected: selected.length === 0 }"
        type="button"
        :disabled="!canControl"
        :aria-pressed="selected.length === 0"
        @click="chooseFront(null)"
      >
        No order
      </button>
    </div>
    <p
      v-if="!canControl"
      class="muted small"
    >
      The host sets the Major Order before the first spin.
    </p>
  </section>
</template>

<style scoped>
.mo { display: grid; gap: 0.5rem; }
.mo-suggestion {
  display: grid;
  gap: 0.3rem;
  padding: 0.6rem;
  border: 1px solid color-mix(in srgb, var(--gold) 45%, var(--border));
  border-radius: 8px;
  background: linear-gradient(165deg, color-mix(in srgb, var(--gold) 10%, transparent), transparent 60%);
}
.mo-suggestion-title { color: var(--gold); }
.mo-options { flex-wrap: wrap; }
.mo-option {
  border-color: color-mix(in srgb, var(--mo-accent, var(--border)) 45%, var(--border));
  transition: border-color var(--dur-fast) ease, background var(--dur-fast) ease;
}
.mo-option.selected {
  color: var(--mo-accent, var(--gold));
  border-color: var(--mo-accent, var(--gold));
  background: color-mix(in srgb, var(--mo-accent, var(--gold)) 14%, transparent);
}
.mo-option:disabled { opacity: 0.55; cursor: default; }
</style>
