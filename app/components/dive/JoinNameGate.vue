<script setup lang="ts">
import { MAX_NAME_LENGTH } from '~~/shared/engine/config'
import { SPRING_SNAP } from '~/utils/motion'
import { storedDiverName } from '~/composables/useGameSocket'

const emit = defineEmits<{ confirm: [name: string] }>()

const saved = storedDiverName()
const nameDraft = ref(saved === 'Diver' ? '' : saved)
const input = ref<HTMLInputElement | null>(null)

const valid = computed(() => nameDraft.value.trim().length > 0)

onMounted(() => {
  input.value?.focus()
})

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    input.value?.focus()
  }
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))

function join(): void {
  emit('confirm', nameDraft.value.trim())
}
</script>

<template>
  <Teleport to="body">
    <AnimatePresence>
      <Motion
        key="gate-backdrop"
        as="div"
        class="backdrop"
        :initial="{ opacity: 0 }"
        :animate="{ opacity: 1 }"
        :exit="{ opacity: 0 }"
        :transition="{ duration: 0.15 }"
      />
      <Motion
        key="gate-dialog"
        as="div"
        class="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="join-name-title"
        :initial="{ opacity: 0, y: 24, scale: 0.97 }"
        :animate="{ opacity: 1, y: 0, scale: 1 }"
        :exit="{ opacity: 0, y: 12, scale: 0.98 }"
        :transition="SPRING_SNAP"
      >
        <h2 id="join-name-title">
          Identify yourself, diver
        </h2>
        <p class="muted small">
          Your name is how the squad sees you. You join the dive the moment you confirm it.
        </p>
        <form
          class="row"
          @submit.prevent="join"
        >
          <input
            ref="input"
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
      </Motion>
    </AnimatePresence>
  </Teleport>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgba(9, 10, 7, 0.72);
}

.dialog {
  position: fixed;
  inset: 0;
  z-index: 41;
  margin: auto;
  width: min(420px, calc(100vw - 2rem));
  height: fit-content;
  padding: 1.1rem 1.25rem 1.25rem;
  background: var(--bg-raised);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
  display: grid;
  gap: 0.75rem;
}

.dialog h2 { margin: 0; color: var(--gold); }

.exit { justify-content: center; margin: 0; }
</style>
