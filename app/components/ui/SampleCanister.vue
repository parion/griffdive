<script setup lang="ts">
// A sample canister: the report screen's stepped counter. The jar is tinted per
// rarity; the count and step buttons are the only interactive parts. Purely
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

function step(delta: number): void {
  const next = Math.min(props.max, Math.max(0, props.modelValue + delta))
  if (next !== props.modelValue) {
    emit('update:modelValue', next)
  }
}
</script>

<template>
  <div
    class="canister"
    role="group"
    :aria-label="`${label}: ${modelValue} of ${max}`"
    :style="{ '--tone': toneColor }"
  >
    <div class="jar">
      <svg
        viewBox="0 0 48 100"
        width="48"
        height="100"
        aria-hidden="true"
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
        width="28"
        height="28"
        class="jar-icon"
      >
    </div>
    <div class="canister-body">
      <span class="canister-label">{{ label }}</span>
      <div class="canister-count">
        <span class="disp count-num">{{ modelValue }}</span>
        <span
          v-if="value"
          class="count-val"
        >{{ value }}</span>
        <span
          v-else
          class="count-max"
        >/ {{ max }}</span>
      </div>
      <div class="step-row">
        <button
          class="ghost step"
          type="button"
          :aria-label="`Remove a ${label.toLowerCase()}`"
          :disabled="modelValue <= 0"
          @click="step(-1)"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.4"
            aria-hidden="true"
          >
            <path d="M5 12h14" />
          </svg>
        </button>
        <button
          class="ghost step"
          type="button"
          :aria-label="`Add a ${label.toLowerCase()}`"
          :disabled="modelValue >= max"
          @click="step(1)"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.4"
            aria-hidden="true"
          >
            <path d="M5 12h14M12 5v14" />
          </svg>
        </button>
      </div>
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
}
.jar svg { display: block; }
.jar-icon {
  position: absolute;
  left: 10px;
  top: 36px;
  width: 28px;
  height: 28px;
  object-fit: contain;
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
  gap: 8px;
}
.count-num { font-size: 2rem; color: var(--text); }
.count-max { font-size: 11px; font-weight: 700; color: var(--dim); }
.count-val { font-size: 11px; font-weight: 700; color: var(--teal); }
.step-row { display: flex; gap: 6px; }
.step {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  color: var(--text);
}
.step svg { width: 16px; height: 16px; }
</style>
