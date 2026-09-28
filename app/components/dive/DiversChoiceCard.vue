<script setup lang="ts">
import type { Item } from '~~/shared/data/types'

const props = withDefaults(defineProps<{
  pool: Item[]
  ownedIds: string[]
  disabled?: boolean
}>(), { disabled: false })

const emit = defineEmits<{ choose: [itemId: string] }>()

const open = ref(false)

function openPicker(): void {
  if (props.disabled) {
    return
  }
  open.value = true
}

function onChoose(itemId: string): void {
  open.value = false
  emit('choose', itemId)
}
</script>

<template>
  <div class="choice-card">
    <span
      class="choice-top"
      aria-hidden="true"
    />
    <div class="choice-head">
      <span
        class="choice-mark disp"
        data-tier="S+"
      >S+</span>
      <div class="choice-copy">
        <span class="choice-kicker lbl">Bonus slot</span>
        <h3 class="choice-title">
          Liberty’s Cross
        </h3>
      </div>
    </div>
    <p class="choice-sub">
      The ceiling broke the scale — claim any item from your codex.
    </p>
    <button
      type="button"
      class="choice-input"
      aria-haspopup="dialog"
      :disabled="props.disabled"
      @click="openPicker"
    >
      <span class="choice-placeholder">Search the codex…</span>
      <span class="choice-go">Claim any item ⌕</span>
    </button>
    <DiversChoicePicker
      :open="open"
      :pool="pool"
      :owned-ids="ownedIds"
      @close="open = false"
      @choose="onChoose"
    />
  </div>
</template>

<style scoped>
.choice-card {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem 0.8rem;
  overflow: hidden;
  background:
    radial-gradient(130% 100% at 88% -12%, color-mix(in srgb, var(--tier-splus) 20%, transparent), transparent 58%),
    linear-gradient(165deg, color-mix(in srgb, var(--tier-s) 12%, transparent), transparent 56%),
    var(--panel);
  border: 1px solid color-mix(in srgb, var(--tier-splus) 55%, var(--line-3));
  box-shadow: 0 0 20px color-mix(in srgb, var(--tier-splus) 20%, transparent);
  animation: choice-glow 2.6s ease-in-out 0.6s infinite;
}

.choice-top {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--tier-splus) 0 50%, var(--tier-s) 50% 100%);
}

@keyframes choice-glow {
  0%, 100% { box-shadow: 0 0 14px color-mix(in srgb, var(--tier-splus) 16%, transparent); }
  50% { box-shadow: 0 0 26px color-mix(in srgb, var(--tier-splus) 34%, transparent); }
}

.choice-head {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding-top: 0.15rem;
}

.choice-mark {
  display: inline-grid;
  place-items: center;
  min-width: 1.9rem;
  height: 1.9rem;
  padding: 0 0.25rem;
  font-size: 0.85rem;
  border: 1px solid currentColor;
  background: color-mix(in srgb, var(--tier-splus) 14%, transparent);
}

.choice-copy { display: grid; gap: 0.1rem; min-width: 0; }
.choice-kicker { color: var(--tier-splus); }

.choice-title {
  margin: 0;
  font-family: var(--font-display);
  font-stretch: 125%;
  font-size: 0.95rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: linear-gradient(90deg, var(--tier-s), var(--tier-splus));
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
}

.choice-sub {
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.35;
  color: var(--muted);
}

.choice-input {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  width: 100%;
  margin-top: auto;
  padding: 0.55rem 0.7rem;
  background: var(--ground);
  border: 1px dashed color-mix(in srgb, var(--tier-splus) 45%, var(--line-3));
  color: var(--muted);
  font: inherit;
  font-size: 0.8rem;
  cursor: pointer;
  transition: border-color var(--dur-fast) ease, color var(--dur-fast) ease;
}

.choice-input:hover:not(:disabled),
.choice-input:focus-visible:not(:disabled) {
  border-color: var(--tier-splus);
  border-style: solid;
  color: var(--text);
}

.choice-input:disabled { cursor: default; opacity: 0.6; }

.choice-go {
  flex-shrink: 0;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--tier-splus);
}

@media (prefers-reduced-motion: reduce) {
  .choice-card { animation: none; }
}
</style>
