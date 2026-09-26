<script setup lang="ts">
import { FRONTS } from '~~/shared/data/fronts'
import type { FrontId } from '~~/shared/data/fronts'
import { MAJOR_ORDER_REROLL_BONUS } from '~~/shared/engine/config'
import type { DiveState, MajorOrderSelection } from '~~/shared/engine/types'

// Lives inside the faction card before the roll (the slot the wheel leaves open
// pre-spin). The live order is fetched here; the manual buttons are the offline
// fallback.
const props = defineProps<{
  state: DiveState
  canControl: boolean
}>()

const emit = defineEmits<{
  select: [order: MajorOrderSelection | null]
}>()

const { order: suggestion, pending: suggestionPending, refresh } = useMajorOrder()

const selected = computed(() => props.state.majorOrder?.fronts ?? [])

function isSelected(frontId: FrontId): boolean {
  return selected.value.includes(frontId)
}

function chooseFront(frontId: FrontId | null): void {
  emit('select', frontId ? { fronts: [frontId] } : null)
}

function playSuggestion(): void {
  if (suggestion.value) {
    emit('select', suggestion.value)
  }
}
</script>

<template>
  <div class="mo">
    <MajorOrderCard
      v-if="suggestion"
      :order="suggestion"
      playable
      :can-control="canControl"
      @play="playSuggestion"
    />
    <p
      v-else-if="suggestionPending"
      class="muted small"
    >
      Checking the live war…
    </p>
    <p
      v-else
      class="row small muted"
    >
      No live order right now.
      <button
        class="btn tiny ghost"
        type="button"
        @click="refresh()"
      >
        Retry
      </button>
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
    <p
      v-else
      class="muted small mo-hint"
    >
      Complete an ordered operation for +{{ MAJOR_ORDER_REROLL_BONUS }} reroll token.
    </p>
  </div>
</template>

<style scoped>
.mo { display: grid; gap: 0.5rem; }
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
.mo-hint { margin: 0; }
</style>
