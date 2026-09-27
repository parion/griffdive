<script setup lang="ts">
import { GRIFFDIVER_BRIEF, GRIFFDIVER_GATE_LEDE } from '~~/shared/data/lore'
import { MAX_NAME_LENGTH } from '~~/shared/engine/config'
import { storedDiverName } from '~/composables/useGameSocket'

const emit = defineEmits<{ confirm: [name: string] }>()

const saved = storedDiverName()
const nameDraft = ref(saved === 'Diver' ? '' : saved)
const nameInput = ref<HTMLInputElement | null>(null)

const valid = computed(() => nameDraft.value.trim().length > 0)

// The brief's <details> is focusable and sits before the form, so Reka's
// default open-focus would land there instead of the name field.
function focusName(event: Event): void {
  event.preventDefault()
  nextTick(() => nameInput.value?.focus())
}

function join(): void {
  emit('confirm', nameDraft.value.trim())
}
</script>

<template>
  <AppDialog
    :open="true"
    title="Identify yourself, Griffdiver"
    size="sm"
    :dismissible="false"
    :show-close="false"
    @open-auto-focus="focusName"
  >
    <template #description>
      Your name is how the squad sees you. You'll declare your warbonds next — the panel opens the
      moment you join.
    </template>
    <div class="gate">
      <section class="briefing">
        <span class="briefing-stamp">Ministry of Truth · Class E intake</span>
        <p class="briefing-lede">
          {{ GRIFFDIVER_GATE_LEDE }}
        </p>
        <details class="briefing-more">
          <summary>Read the Griffdiver brief</summary>
          <ul>
            <li
              v-for="line in GRIFFDIVER_BRIEF"
              :key="line"
            >
              {{ line }}
            </li>
          </ul>
        </details>
      </section>
      <form
        class="row"
        @submit.prevent="join"
      >
        <input
          ref="nameInput"
          v-model="nameDraft"
          type="text"
          :maxlength="MAX_NAME_LENGTH"
          placeholder="Diver"
          aria-label="Your name"
          autocomplete="nickname"
          spellcheck="false"
        >
        <button
          class="btn primary"
          type="submit"
          :disabled="!valid"
        >
          Join the dive
        </button>
      </form>
      <p class="exit row small">
        <NuxtLink to="/">Back to base</NuxtLink>
      </p>
    </div>
  </AppDialog>
</template>

<style scoped>
.gate { display: grid; gap: 0.75rem; }
.exit { justify-content: center; margin: 0; }

.briefing {
  display: grid;
  gap: 0.45rem;
  padding: 0.65rem 0.75rem;
  border: 1px solid color-mix(in srgb, var(--gold) 32%, var(--border));
  border-left-width: 3px;
  border-left-color: var(--gold);
  border-radius: 6px;
  background: color-mix(in srgb, var(--gold) 6%, var(--bg));
}

.briefing-stamp {
  font-family: var(--font-display);
  font-stretch: 125%;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--gold);
}

.briefing-lede { margin: 0; font-size: 0.85rem; }

.briefing-more summary {
  cursor: pointer;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--khaki);
}
.briefing-more[open] summary { margin-bottom: 0.35rem; }
.briefing-more ul {
  margin: 0;
  padding-left: 1.1rem;
  display: grid;
  gap: 0.25rem;
}
.briefing-more li { font-size: 0.8rem; color: var(--muted); }
</style>
