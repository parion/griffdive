<script setup lang="ts">
// A sample canister: the report screen's per-rarity control. The test tube is
// the slider — drag or tap along it to set the count; the liquid level is the
// indicator. The number below is an editable field for keyboard entry. Purely
// presentational — the parent owns the value and the engine owns its meaning.
const props = defineProps<{
  modelValue: number
  max: number
  tone: 'common' | 'rare' | 'super'
  label: string
  icon: string
  // The weighted valor contribution (design shows this, not the max).
  value?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

const TONE: Record<'common' | 'rare' | 'super', string> = {
  common: 'var(--sample-common)',
  rare: 'var(--sample-rare)',
  super: 'var(--sample-super)',
}

const toneColor = computed(() => TONE[props.tone])

// Chamber bounds inside the 0..100 viewBox — liquid lives between these rows.
const CHAMBER_TOP = 16
const CHAMBER_BOTTOM = 84
const CHAMBER_H = CHAMBER_BOTTOM - CHAMBER_TOP

const pct = computed(() => (props.max > 0 ? Math.min(1, Math.max(0, props.modelValue / props.max)) : 0))
const fillH = computed(() => pct.value * CHAMBER_H)
const fillY = computed(() => CHAMBER_BOTTOM - fillH.value)
// Distance from the tube's bottom to the liquid line, used to seat the collar.
const knobBottom = computed(() => CHAMBER_TOP + fillH.value)

function clamp(n: number): number {
  return Math.min(props.max, Math.max(0, Math.round(n)))
}

function setValue(n: number): void {
  const next = clamp(n)
  if (next !== props.modelValue) {
    emit('update:modelValue', next)
  }
}

// ---- The tube as a vertical scrubber -------------------------------------
const jarEl = ref<HTMLElement | null>(null)
const dragging = ref(false)

function valueFromPointer(clientY: number): number {
  const el = jarEl.value
  if (!el) {
    return props.modelValue
  }
  const rect = el.getBoundingClientRect()
  const top = rect.top + rect.height * (CHAMBER_TOP / 100)
  const bottom = rect.top + rect.height * (CHAMBER_BOTTOM / 100)
  return clamp(((bottom - clientY) / (bottom - top)) * props.max)
}

function onPointerDown(event: PointerEvent): void {
  dragging.value = true
  jarEl.value?.setPointerCapture(event.pointerId)
  jarEl.value?.focus()
  setValue(valueFromPointer(event.clientY))
}

function onPointerMove(event: PointerEvent): void {
  if (dragging.value) {
    setValue(valueFromPointer(event.clientY))
  }
}

function endDrag(): void {
  dragging.value = false
}

function onKeydown(event: KeyboardEvent): void {
  const big = Math.max(1, Math.round(props.max / 10))
  switch (event.key) {
    case 'ArrowUp':
    case 'ArrowRight':
      setValue(props.modelValue + 1)
      break
    case 'ArrowDown':
    case 'ArrowLeft':
      setValue(props.modelValue - 1)
      break
    case 'PageUp':
      setValue(props.modelValue + big)
      break
    case 'PageDown':
      setValue(props.modelValue - big)
      break
    case 'Home':
      setValue(0)
      break
    case 'End':
      setValue(props.max)
      break
    default:
      return
  }
  event.preventDefault()
}

// ---- The editable number --------------------------------------------------
const editing = ref(false)
const draft = ref(String(props.modelValue))

watch(() => props.modelValue, (value) => {
  if (!editing.value) {
    draft.value = String(value)
  }
})

function onFocus(event: FocusEvent): void {
  editing.value = true
  ;(event.target as HTMLInputElement).select()
}

function onInput(event: Event): void {
  const raw = (event.target as HTMLInputElement).value.replace(/[^0-9]/g, '')
  draft.value = raw
  if (raw !== '') {
    setValue(Number.parseInt(raw, 10))
  }
}

function commitInput(): void {
  editing.value = false
  const parsed = draft.value === '' ? 0 : Number.parseInt(draft.value, 10)
  setValue(Number.isFinite(parsed) ? parsed : 0)
  draft.value = String(clamp(Number.isFinite(parsed) ? parsed : 0))
}

function commitOnEnter(event: KeyboardEvent): void {
  ;(event.target as HTMLInputElement).blur()
}

function cancelInput(event: KeyboardEvent): void {
  draft.value = String(props.modelValue)
  ;(event.target as HTMLInputElement).blur()
}
</script>

<template>
  <div
    class="canister"
    :style="{ '--tone': toneColor }"
  >
    <div
      ref="jarEl"
      class="jar"
      role="slider"
      tabindex="0"
      aria-orientation="vertical"
      :aria-label="`${label} samples`"
      :aria-valuemin="0"
      :aria-valuemax="max"
      :aria-valuenow="modelValue"
      :aria-valuetext="`${modelValue} of ${max}`"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="endDrag"
      @pointercancel="endDrag"
      @keydown="onKeydown"
    >
      <svg
        viewBox="0 0 48 100"
        width="48"
        height="100"
        aria-hidden="true"
        class="tube"
      >
        <rect
          x="12"
          y="1"
          width="24"
          height="8"
          fill="#3a3f2e"
        />
        <rect
          x="5"
          y="9"
          width="38"
          height="7"
          fill="#5a5e45"
        />
        <rect
          x="8"
          y="16"
          width="32"
          height="68"
          fill="#0b0c09"
          stroke="#5a5e45"
          stroke-width="1.5"
        />
        <rect
          x="8"
          y="16"
          width="32"
          height="68"
          fill="var(--tone)"
          fill-opacity="0.09"
        />
        <rect
          class="liquid"
          x="8"
          :y="fillY"
          width="32"
          :height="fillH"
          fill="var(--tone)"
          fill-opacity="0.5"
        />
        <line
          class="meniscus"
          x1="8"
          x2="40"
          :y1="fillY"
          :y2="fillY"
          stroke="var(--tone)"
          stroke-width="2"
          :opacity="pct > 0 ? 1 : 0"
        />
        <line
          v-for="t in 5"
          :key="t"
          :x1="9"
          :x2="13"
          :y1="CHAMBER_BOTTOM - (t / 5) * CHAMBER_H"
          :y2="CHAMBER_BOTTOM - (t / 5) * CHAMBER_H"
          stroke="var(--line-4)"
          stroke-width="1"
        />
        <path
          d="M13 22v56"
          stroke="var(--tone)"
          stroke-opacity="0.4"
          stroke-width="2"
        />
        <rect
          x="5"
          y="84"
          width="38"
          height="7"
          fill="#5a5e45"
        />
        <rect
          x="12"
          y="91"
          width="24"
          height="8"
          fill="#3a3f2e"
        />
      </svg>
      <img
        :src="icon"
        alt=""
        width="24"
        height="24"
        class="jar-icon"
      >
      <span
        class="collar"
        :style="{ bottom: `${knobBottom}px` }"
        aria-hidden="true"
      >
        <i /><i />
      </span>
    </div>
    <div class="canister-body">
      <span class="canister-label">{{ label }}</span>
      <div class="canister-count">
        <input
          class="count-input disp"
          type="text"
          inputmode="numeric"
          :aria-label="`${label} sample count`"
          :value="draft"
          @focus="onFocus"
          @input="onInput"
          @blur="commitInput"
          @keydown.enter.prevent="commitOnEnter"
          @keydown.esc="cancelInput"
        >
        <span class="count-max">/ {{ max }}</span>
      </div>
      <span
        v-if="value"
        class="count-val"
      >{{ value }}</span>
    </div>
  </div>
</template>

<style scoped>
.canister {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}
.jar {
  position: relative;
  width: 48px;
  height: 100px;
  flex-shrink: 0;
  cursor: ns-resize;
  touch-action: none;
}
.jar svg { display: block; }
.liquid,
.meniscus { pointer-events: none; }
.jar-icon {
  position: absolute;
  left: 12px;
  top: 38px;
  width: 24px;
  height: 24px;
  object-fit: contain;
  pointer-events: none;
}
.collar {
  position: absolute;
  left: 4px;
  right: 4px;
  height: 12px;
  transform: translateY(50%);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: 1px solid color-mix(in srgb, var(--tone) 75%, var(--line-5));
  background: color-mix(in srgb, var(--tone) 26%, var(--ground));
  box-shadow: 0 0 10px color-mix(in srgb, var(--tone) 35%, transparent);
  pointer-events: none;
}
.collar i {
  width: 1px;
  height: 6px;
  background: color-mix(in srgb, var(--tone) 70%, var(--text));
}
.canister-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.canister-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: var(--tone);
}
.canister-count {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.count-input {
  width: 3ch;
  min-height: 2.4rem;
  padding: 2px 4px;
  background: transparent;
  border: 1px solid transparent;
  border-bottom: 2px solid var(--line-4);
  color: var(--text);
  font-family: var(--font-display);
  font-stretch: 125%;
  font-weight: 800;
  font-size: 2rem;
  line-height: 1;
  text-align: center;
  caret-color: var(--tone);
}
.count-input:hover { border-bottom-color: color-mix(in srgb, var(--tone) 60%, var(--line-4)); }
.count-input:focus-visible {
  border-color: transparent;
  border-bottom-color: var(--tone);
  background: color-mix(in srgb, var(--tone) 8%, transparent);
  outline: none;
}
.count-max { font-size: 11px; font-weight: 700; color: var(--dim); }
.count-val { font-size: 11px; font-weight: 700; color: var(--teal); }
</style>
