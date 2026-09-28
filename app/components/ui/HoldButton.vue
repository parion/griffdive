<script setup lang="ts">
// Hold-to-confirm action with a tap fallback. The fill is presentation only; the
// parent's `confirm` handler decides what the action means, so this never gates
// engine rules — reduced motion simply skips the delay.
const props = withDefaults(defineProps<{
  label: string
  hint?: string
  tone?: 'gold' | 'red' | 'orange' | 'teal'
  disabled?: boolean
  duration?: number
  ariaLabel?: string
}>(), {
  hint: '',
  tone: 'gold',
  disabled: false,
  duration: 650,
  ariaLabel: undefined,
})

const emit = defineEmits<{ confirm: [] }>()

const reduced = import.meta.client
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const holding = ref(false)
const committed = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

function finish(): void {
  holding.value = false
  committed.value = true
  emit('confirm')
  setTimeout(() => {
    committed.value = false
  }, 300)
}

function down(): void {
  if (props.disabled) {
    return
  }
  committed.value = false
  holding.value = true
  clearTimeout(timer)
  timer = setTimeout(finish, reduced ? 0 : props.duration)
}

function up(): void {
  holding.value = false
  clearTimeout(timer)
}

function click(): void {
  if (committed.value) {
    committed.value = false
    return
  }
  if (!props.disabled) {
    finish()
  }
}

onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <button
    class="hold-btn"
    :class="[`tone-${tone}`, { holding }]"
    type="button"
    :disabled="disabled"
    :aria-label="ariaLabel ?? label"
    @pointerdown="down"
    @pointerup="up"
    @pointerleave="up"
    @pointercancel="up"
    @click="click"
  >
    <span
      aria-hidden="true"
      class="hold-fill"
      :style="{ transform: `scaleX(${holding ? 1 : 0})`, transitionDuration: holding ? `${duration}ms` : '0ms' }"
    />
    <span class="hold-body">
      <slot>
        <span class="disp hold-label">{{ label }}</span>
        <span
          v-if="hint"
          class="hold-hint"
        >{{ hint }}</span>
      </slot>
    </span>
  </button>
</template>

<style scoped>
.hold-btn {
  position: relative;
  overflow: hidden;
  display: grid;
  place-items: center;
  border: 0;
  cursor: pointer;
  font-family: inherit;
  color: var(--on-gold);
  background: var(--gold);
  transition: filter var(--dur-fast) var(--ease-out), transform 0.08s ease;
  touch-action: none;
  user-select: none;
  width: 100%;
  min-height: 54px;
  padding: 0 16px;
}
.hold-btn:hover:not(:disabled) { filter: brightness(1.12); }
.hold-btn:active:not(:disabled) { transform: translateY(1px); }
.hold-btn:disabled { cursor: not-allowed; opacity: 0.4; }

.tone-red { background: var(--red); color: var(--on-gold); }
.tone-orange { background: var(--orange); color: var(--on-gold); }
.tone-teal { background: var(--teal); color: #0b0c09; }

.hold-fill {
  position: absolute;
  inset: 0;
  transform-origin: left center;
  transform: scaleX(0);
  transition-property: transform;
  transition-timing-function: linear;
  background-image: repeating-linear-gradient(-45deg, rgba(11, 12, 9, 0.42) 0 8px, transparent 8px 16px);
  pointer-events: none;
}

.hold-body {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  text-align: center;
}
.hold-label { font-size: 18px; letter-spacing: 0.02em; }
.hold-hint {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  opacity: 0.8;
}
</style>
