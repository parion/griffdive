<script setup lang="ts">
// Hold-to-confirm action. A pointer or touch press only counts once it is held
// for the full duration; letting go early shakes the button and nudges. Keyboard and assistive-tech
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
const shaking = ref(false)
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
  if (holding.value && !committed) {
    shake()
  }
  holding.value = false
  clearTimeout(timer)
}

// Restarts the keyframes on every early release, even mid-shake.
function shake(): void {
  shaking.value = false
  requestAnimationFrame(() => {
    shaking.value = true
  })
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
    :class="[`tone-${tone}`, { holding, shaking }]"
    type="button"
    :disabled="disabled"
    :aria-label="ariaLabel ?? label"
    @pointerdown="down"
    @pointerup="release"
    @pointerleave="abandon"
    @pointercancel="abandon"
    @contextmenu.prevent
    @click="click"
    @animationend.self="shaking = false"
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
  --hb: var(--gold);
  /* A raised key, unlike the flat one-tap buttons: a lit top bevel, a shaded
     foot and a ledge underneath that the press sinks into. */
  background-color: var(--hb);
  background-image: linear-gradient(180deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0) 42%, rgba(0, 0, 0, 0.14));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.5),
    inset 1px 0 0 rgba(255, 255, 255, 0.18),
    inset -1px 0 0 rgba(0, 0, 0, 0.18),
    inset 0 -3px 0 rgba(0, 0, 0, 0.26),
    0 4px 0 color-mix(in srgb, var(--hb) 42%, #000),
    0 7px 12px rgba(0, 0, 0, 0.45);
  transition: filter var(--dur-fast) var(--ease-out), transform 0.08s ease, box-shadow 0.08s ease;
  touch-action: none;
  user-select: none;
  width: 100%;
  min-height: 54px;
  padding: 0 16px;
}
.hold-btn:hover:not(:disabled) { filter: brightness(1.12); }
.hold-btn.holding {
  transform: translateY(4px);
  box-shadow:
    inset 0 3px 8px rgba(0, 0, 0, 0.45),
    inset 0 -1px 0 rgba(255, 255, 255, 0.16),
    0 0 0 color-mix(in srgb, var(--hb) 42%, #000),
    0 2px 4px rgba(0, 0, 0, 0.35);
}
.hold-btn:disabled { cursor: not-allowed; opacity: 0.4; }
.hold-btn.shaking { animation: holdShake 0.42s cubic-bezier(0.36, 0.07, 0.19, 0.97) both; }

@keyframes holdShake {
  10% { transform: translateX(-9px) rotate(-1.5deg); }
  25% { transform: translateX(8px) rotate(1.2deg); }
  40% { transform: translateX(-7px) rotate(-1deg); }
  55% { transform: translateX(5px) rotate(0.6deg); }
  70% { transform: translateX(-3px); }
  85% { transform: translateX(2px); }
  100% { transform: none; }
}

.tone-red { --hb: var(--red); }
.tone-orange { --hb: var(--orange); }
.tone-teal { --hb: var(--teal); color: #0b0c09; }

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
.hold-label,
.hold-hint { text-shadow: 0 1px 0 rgba(255, 255, 255, 0.4), 0 -1px 0 rgba(0, 0, 0, 0.22); }
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
