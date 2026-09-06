<script setup lang="ts">
import type { Item } from '~~/shared/data/types'

defineProps<{
  pool: Item[]
  ownedIds: string[]
}>()

const emit = defineEmits<{ choose: [itemId: string] }>()

const open = ref(false)

function onChoose(itemId: string): void {
  open.value = false
  emit('choose', itemId)
}
</script>

<template>
  <div class="choice-card">
    <div class="choice-head">
      <span
        class="choice-mark"
        data-tier="S+"
      >S+</span>
      <div class="choice-copy">
        <h3 class="choice-title">
          Diver's Choice
        </h3>
        <p class="choice-sub">
          The ceiling broke the scale. Claim any item from your codex.
        </p>
      </div>
    </div>
    <button
      type="button"
      class="choice-input"
      aria-haspopup="dialog"
      @click="open = true"
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
  gap: 0.6rem;
  border-radius: 11px;
  padding: 0.8rem 0.85rem;
  background:
    radial-gradient(130% 100% at 88% -12%, color-mix(in srgb, var(--tier-splus) 18%, transparent), transparent 58%),
    linear-gradient(165deg, color-mix(in srgb, var(--tier-s) 12%, transparent), transparent 56%),
    var(--bg-raised);
  border: 1px solid color-mix(in srgb, var(--tier-splus) 55%, var(--border));
  box-shadow: 0 0 20px color-mix(in srgb, var(--tier-splus) 20%, transparent);
  animation: choice-glow 2.6s ease-in-out 0.6s infinite;
}

@keyframes choice-glow {
  0%, 100% { box-shadow: 0 0 14px color-mix(in srgb, var(--tier-splus) 16%, transparent); }
  50% { box-shadow: 0 0 26px color-mix(in srgb, var(--tier-splus) 34%, transparent); }
}

.choice-head {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.choice-mark {
  display: inline-grid;
  place-items: center;
  min-width: 2rem;
  height: 2rem;
  padding: 0 0.25rem;
  border: 1px solid currentColor;
  border-radius: 6px;
  font-family: var(--font-display);
  font-size: 0.85rem;
  font-weight: 700;
  font-stretch: 125%;
}

.choice-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 0.95rem;
  font-weight: 700;
  font-stretch: 125%;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  background: linear-gradient(90deg, var(--tier-s), var(--tier-splus));
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
}

.choice-sub {
  margin: 0.15rem 0 0;
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
  background: var(--bg);
  border: 1px dashed color-mix(in srgb, var(--tier-splus) 45%, var(--border));
  border-radius: 8px;
  color: var(--muted);
  font: inherit;
  font-size: 0.8rem;
  cursor: pointer;
  transition: border-color var(--dur-fast) ease, color var(--dur-fast) ease;
}

.choice-input:hover,
.choice-input:focus-visible {
  border-color: var(--tier-splus);
  border-style: solid;
  color: var(--text);
}

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
