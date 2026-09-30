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
      class="mo-state muted small"
    >
      <span
        class="lamp gold pulse"
        aria-hidden="true"
      />
      Checking the live war…
    </p>
    <p
      v-else
      class="mo-state small"
    >
      <span
        class="lamp dim"
        aria-hidden="true"
      />
      <span>{{ status === 'none'
        ? 'No active Major Order — the wheel draws the front as usual.'
        : status === 'no-front'
          ? 'The active Major Order doesn\'t target a front — the wheel draws it as usual.'
          : 'Failed to retrieve active MO' }}</span>
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

    <p class="lbl mo-pick-label">
      {{ suggestion ? 'Or pin a front manually' : 'Pin a faction (optional)' }}
    </p>

    <div
      class="mo-options"
      role="group"
      aria-label="Major Order front"
    >
      <AppTooltip
        v-for="front in FRONTS"
        :key="front.id"
        :content="front.displayName"
      >
        <button
          class="mo-option cut-sm"
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
        class="mo-option mo-noorder ghost cut-sm"
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
      class="muted small mo-hint"
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
.mo { display: grid; gap: 0.55rem; }

.mo-state {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
}
.mo-state .lamp { flex-shrink: 0; }
.mo-refresh {
  display: inline-grid;
  place-items: center;
  padding: 0;
  width: 2.75rem;
  height: 2.75rem;
  flex-shrink: 0;
  background: none;
  border: 1px solid var(--line-4);
  color: var(--khaki);
  cursor: pointer;
  transition: border-color var(--dur-fast), color var(--dur-fast);
}
.mo-refresh:hover { border-color: var(--gold); color: var(--gold); }
.mo-refresh svg { width: 1rem; height: 1rem; }

.mo-pick-label { margin: 0; }

.mo-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  align-items: stretch;
}
.mo-option {
  --mo-accent: var(--gold);
  display: inline-grid;
  place-items: center;
  padding: 0.3rem;
  width: 2.75rem;
  height: 2.75rem;
  background: var(--ground);
  border: 1px solid color-mix(in srgb, var(--mo-accent) 40%, var(--line-3));
  color: var(--khaki);
  cursor: pointer;
  transition: border-color var(--dur-fast), background-color var(--dur-fast), color var(--dur-fast), filter var(--dur-fast);
}
.mo-option img { width: 100%; height: 100%; object-fit: contain; }
.mo-option:hover:not(:disabled) { border-color: var(--mo-accent); filter: brightness(1.12); }
.mo-option.selected {
  color: var(--mo-accent);
  border-color: var(--mo-accent);
  background: color-mix(in srgb, var(--mo-accent) 16%, var(--ground));
}
.mo-option:disabled { opacity: 0.55; cursor: default; }

.mo-noorder {
  width: auto;
  padding: 0 0.7rem;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.mo-hint { margin: 0; }
</style>
