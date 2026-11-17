<script setup lang="ts">
import type { Arrow } from '~~/shared/engine/hero'

defineProps<{
  disabled?: boolean
}>()

const emit = defineEmits<{
  press: [arrow: Arrow]
}>()

const BUTTONS: readonly { arrow: Arrow, label: string }[] = [
  { arrow: 'U', label: 'Up' },
  { arrow: 'L', label: 'Left' },
  { arrow: 'R', label: 'Right' },
  { arrow: 'D', label: 'Down' },
]

// pointerdown, not click: a code is typed at speed, and click waits for the
// release (and for the browser's double-tap check on some phones).
function down(event: PointerEvent, arrow: Arrow): void {
  event.preventDefault()
  emit('press', arrow)
}

// Keyboard and switch users activate the pad's buttons with Enter/Space.
function key(event: KeyboardEvent, arrow: Arrow): void {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    emit('press', arrow)
  }
}
</script>

<template>
  <div
    class="pad"
    role="group"
    aria-label="Stratagem d-pad"
  >
    <button
      v-for="button in BUTTONS"
      :key="button.arrow"
      type="button"
      class="pad-btn"
      :class="`pad-${button.arrow}`"
      :aria-label="button.label"
      :disabled="disabled"
      @pointerdown="down($event, button.arrow)"
      @keydown="key($event, button.arrow)"
      @contextmenu.prevent
    >
      <StratagemHeroArrow
        :arrow="button.arrow"
        state="done"
      />
    </button>
    <span
      class="pad-hub"
      aria-hidden="true"
    />
  </div>
</template>

<style scoped>
.pad {
  --cell: clamp(64px, 19vw, 84px);
  display: grid;
  grid-template-columns: repeat(3, var(--cell));
  grid-template-rows: repeat(3, var(--cell));
  grid-template-areas:
    '. u .'
    'l h r'
    '. d .';
  justify-content: center;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

.pad-btn {
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid var(--line-4);
  background: var(--raised);
  color: var(--gold);
  font-size: calc(var(--cell) * 0.42);
  touch-action: none;
  cursor: pointer;
  transition: background-color var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);
}

.pad-btn:active:not(:disabled) {
  background: rgba(255, 214, 66, 0.18);
  transform: scale(0.94);
}

.pad-btn:disabled { opacity: 0.4; }
.pad-U { grid-area: u; }
.pad-L { grid-area: l; }
.pad-R { grid-area: r; }
.pad-D { grid-area: d; }

.pad-hub {
  grid-area: h;
  background: var(--panel);
  border: 1px solid var(--line-2);
}
</style>
