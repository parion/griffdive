<script setup lang="ts">
import { FRONTS } from '~~/shared/data/fronts'
import type { FrontId } from '~~/shared/data/fronts'
import { factionImageUrl } from '~~/shared/data/images'
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

const { order: suggestion, status, pending: suggestionPending, refresh } = useMajorOrder()

const selected = computed(() => props.state.majorOrder?.fronts ?? [])
// A pinned front the host picked by hand: it carries no reroll carrot.
const manual = computed(() => Boolean(props.state.majorOrder) && !props.state.majorOrder?.live)

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
      class="row small muted mo-empty"
    >
      {{ status === 'none'
        ? 'No active Major Order — the wheel draws the front as usual.'
        : 'Failed to retrieve active MO' }}
      <button
        class="mo-refresh"
        type="button"
        aria-label="Refresh Major Order"
        title="Refresh Major Order"
        @click="refresh()"
      >
        <IconRefresh />
      </button>
    </p>

    <p class="muted small mo-pick-label">
      {{ suggestion ? 'Or pin a front manually' : 'Pin a faction (optional)' }}
    </p>

    <div
      class="row mo-options"
      role="group"
      aria-label="Major Order front"
    >
      <AppTooltip
        v-for="front in FRONTS"
        :key="front.id"
        :content="front.displayName"
      >
        <button
          class="btn mo-option mo-icon"
          :class="{ selected: isSelected(front.id) }"
          :style="{ '--mo-accent': front.accent }"
          type="button"
          :disabled="!canControl"
          :aria-pressed="isSelected(front.id)"
          :aria-label="front.displayName"
          @click="chooseFront(front.id)"
        >
          <img
            :src="factionImageUrl(front.id)"
            alt=""
            draggable="false"
          >
        </button>
      </AppTooltip>
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
      v-else-if="manual"
      class="muted small mo-hint"
    >
      Manual front pick — no reroll bonus.
    </p>
  </div>
</template>

<style scoped>
.mo { display: grid; gap: 0.5rem; }
.mo-options { flex-wrap: wrap; }
.mo-empty { align-items: center; gap: 0.4rem; }
.mo-icon {
  display: inline-grid;
  place-items: center;
  padding: 0.25rem;
  width: 2.6rem;
  height: 2.6rem;
}
.mo-icon img { width: 100%; height: 100%; object-fit: contain; }
.mo-refresh {
  display: inline-grid;
  place-items: center;
  padding: 0;
  width: 1.6rem;
  height: 1.6rem;
  flex-shrink: 0;
  background: none;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--khaki);
  cursor: pointer;
  transition: border-color var(--dur-fast) ease, color var(--dur-fast) ease;
}
.mo-refresh:hover { border-color: var(--gold); color: var(--gold); }
.mo-refresh svg { width: 1rem; height: 1rem; }
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
.mo-pick-label { margin: 0; }
.mo-hint { margin: 0; }
</style>
