<script setup lang="ts">
// Hold-to-confirm action. A pointer or touch press only counts once it is held
// for the full duration; a tap just nudges. Keyboard and assistive-tech
// activation arrive as a click with no press, and confirm directly. The fill is
// presentation only; the parent's `confirm` handler decides what it means.
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

const holding = ref(false)
const nudged = ref(false)
let pressed = false
let committed = false
let timer: ReturnType<typeof setTimeout> | undefined
let nudgeTimer: ReturnType<typeof setTimeout> | undefined

function finish(): void {
  holding.value = false
  committed = true
  emit('confirm')
}

function down(event: PointerEvent): void {
  if (props.disabled || event.button !== 0) {
    return
  }
  pressed = true
  committed = false
  nudged.value = false
  holding.value = true
  clearTimeout(timer)
  timer = setTimeout(finish, props.duration)
}

function release(): void {
  holding.value = false
  clearTimeout(timer)
}

function abandon(): void {
  release()
  pressed = false
}

function click(): void {
  if (props.disabled) {
    return
  }
  if (!pressed) {
    finish()
    return
  }
  pressed = false
  if (!committed) {
    nudged.value = true
    clearTimeout(nudgeTimer)
    nudgeTimer = setTimeout(() => {
      nudged.value = false
    }, 1600)
  }
}

onBeforeUnmount(() => {
  clearTimeout(timer)
  clearTimeout(nudgeTimer)
})
</script>

<template>
  <button
    class="hold-btn"
    :class="[`tone-${tone}`, { holding }]"
    type="button"
    :disabled="disabled"
    :aria-label="ariaLabel ?? label"
    @pointerdown="down"
    @pointerup="release"
    @pointerleave="abandon"
    @pointercancel="abandon"
    @contextmenu.prevent
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
          v-if="hint || nudged"
          class="hold-hint"
          :class="{ nudged }"
          aria-live="polite"
        >{{ nudged ? 'KEEP HOLDING' : hint }}</span>
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
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.24em;
  text-transform: none;
  opacity: 0.8;
}
.hold-hint.nudged { opacity: 1; text-decoration: underline; text-underline-offset: 3px; }
</style>
