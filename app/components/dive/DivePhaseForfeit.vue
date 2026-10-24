<script setup lang="ts">
import { ITEMS_BY_ID } from '~~/shared/data/catalog'
import { missionsPerOperation } from '~~/shared/engine/config'
import { difficultyName } from '~~/shared/engine/progression'
import { awaitingDiverIds, forfeitOptionsFor } from '~~/shared/engine/selectors'
import type { DiverState, DiveState } from '~~/shared/engine/types'

const props = defineProps<{
  state: DiveState
  selfId: string | null
  self: DiverState | null
  // Phone shell: the remove call lives in the pinned action bar.
  phone?: boolean
}>()

const emit = defineEmits<{ forfeit: [itemId: string] }>()

const opLength = computed(() => missionsPerOperation(props.state.difficulty))

const kicker = computed(() =>
  `Report · ${difficultyName(props.state.difficulty)} · Mission ${props.state.missionInOperation} of ${opLength.value}`)

// The diver's own dealt offer: derived state, so every client — and a reload —
// sees the same one.
const offer = computed(() => (props.self ? forfeitOptionsFor(props.state, props.self) : []))
const surrendered = computed(() => {
  const id = props.self?.forfeitedItemId
  return id ? ITEMS_BY_ID.get(id) ?? null : null
})
const owes = computed(() => props.self !== null && offer.value.length > 0)

// The rest of the squad: each diver's public offer and what they removed.
const squad = computed(() => props.state.divers
  .filter(diver => diver.id !== props.selfId)
  .map(diver => ({
    id: diver.id,
    name: upperName(diver.name),
    offer: forfeitOptionsFor(props.state, diver),
    removedId: diver.forfeitedItemId ?? null,
  })))
const waitingOn = computed(() => awaitingDiverIds(props.state).filter(id => id !== props.selfId))

const selected = ref<string | null>(null)
const confirmed = computed(() => surrendered.value !== null)
// A surrendered item stays marked after a reload, when the local pick is gone.
const shown = computed({
  get: () => surrendered.value?.id ?? selected.value,
  set: (itemId: string | null) => {
    selected.value = itemId
  },
})

const canSurrender = computed(() => owes.value && !confirmed.value && selected.value !== null)

function remove(): void {
  if (canSurrender.value && selected.value) {
    emit('forfeit', selected.value)
  }
}

const removeLabel = computed(() => {
  const item = selected.value ? ITEMS_BY_ID.get(selected.value) : null
  return item ? `Remove ${item.displayName}` : 'Select an item'
})
const status = computed(() => {
  const waiting = waitingOn.value.length > 0 ? `Waiting on ${waitingOn.value.length}…` : 'Restarting…'
  if (confirmed.value) {
    return `Removed ${surrendered.value?.displayName}. ${waiting}`
  }
  return owes.value ? '' : `Nothing to remove. ${waiting}`
})
</script>

<template>
  <section
    class="forfeit"
    aria-labelledby="ff-h"
  >
    <header class="ff-head">
      <span class="lbl ff-kicker">
        <span
          class="pulse ff-dot"
          aria-hidden="true"
        />
        {{ kicker }}
      </span>
      <h1
        id="ff-h"
        class="disp ff-title slam"
      >
        <span class="flicker">Mission failed</span>
      </h1>
      <p class="ff-sub">
        No reward draft. Every diver gives up one earned item, then the operation restarts at mission 1.
      </p>
    </header>

    <template v-if="owes">
      <h2
        id="surrender-h"
        class="sr-only"
      >
        Choose an item to remove
      </h2>
      <ForfeitPicker
        v-model="shown"
        :items="offer"
        :label="`${self?.name ?? 'Your'} forfeit offer`"
        :disabled="confirmed"
        :confirmed="confirmed"
      />
    </template>

    <SquadForfeitBoard
      v-if="squad.length > 0"
      :divers="squad"
    />

    <div
      v-if="!phone"
      class="ff-actions"
      aria-live="polite"
    >
      <p
        v-if="status"
        class="ff-note"
      >
        {{ status }}
      </p>
      <button
        v-if="owes && !confirmed"
        class="cta cut cta-sweep"
        type="button"
        :disabled="!canSurrender"
        @click="remove"
      >
        {{ removeLabel }}
      </button>
    </div>

    <PhoneActionBar v-else>
      <template
        v-if="status"
        #detail
      >
        <p
          class="ff-note"
          role="status"
        >
          {{ status }}
        </p>
      </template>
      <template #primary>
        <button
          v-if="owes && !confirmed"
          class="bar-cta cta-sweep ff-bar-cta"
          type="button"
          :disabled="!canSurrender"
          @click="remove"
        >
          <span class="disp">{{ removeLabel }}</span>
        </button>
        <span
          v-else
          class="bar-gate"
        >{{ waitingOn.length > 0 ? `Waiting on ${waitingOn.length}` : 'Restarting' }}</span>
      </template>
    </PhoneActionBar>
  </section>
</template>

<style scoped>
.forfeit {
  display: flex;
  flex-direction: column;
  gap: var(--gap-panel);
  width: 100%;
  max-width: 1000px;
  min-width: 0;
  margin: 0 auto;
  padding: var(--pad-panel);
}

.ff-head { display: flex; flex-direction: column; gap: var(--sp-3); }
.ff-kicker {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  color: var(--red);
}
.ff-dot { width: 8px; height: 8px; background: var(--red); }
.ff-title {
  margin: 0;
  font-size: clamp(32px, 4vw, 48px);
  color: var(--red);
}
.ff-sub { margin: 0; color: var(--muted); font-size: var(--fs-sm); }
.ff-note { margin: 0; color: var(--muted); font-size: var(--fs-sm); }

.ff-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: var(--sp-4);
}
.cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 300px;
  min-height: 58px;
  padding: 0 24px;
  border: 0;
  background: var(--red);
  color: var(--on-gold);
  font: 800 17px var(--font-display);
  font-stretch: 125%;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
}
.cta:not(:disabled) { box-shadow: 0 0 34px color-mix(in srgb, var(--red) 28%, transparent); }
.cta:disabled {
  background: var(--raised);
  color: var(--dim);
  box-shadow: inset 0 0 0 1px var(--line-3);
  cursor: not-allowed;
}
.ff-bar-cta:not(:disabled) { background: var(--red); }

@media (max-width: 720px) {
  .forfeit { padding: var(--sp-4); }
}
</style>
