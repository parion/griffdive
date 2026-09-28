<script setup lang="ts">
import { MAX_NAME_LENGTH } from '~~/shared/engine/config'
import { storedDiverName } from '~/composables/useGameSocket'

const emit = defineEmits<{ confirm: [name: string] }>()

const saved = storedDiverName()
const nameDraft = ref(saved === 'Diver' ? '' : saved)

const valid = computed(() => nameDraft.value.trim().length > 0)

function join(): void {
  emit('confirm', nameDraft.value.trim())
}
</script>

<template>
  <AppDialog
    :open="true"
    title="Identify yourself, diver"
    size="sm"
    :dismissible="false"
    :show-close="false"
  >
    <template #description>
      Your name is how the squad sees you. You'll declare your warbonds next — the panel opens the
      moment you join.
    </template>
    <form
      class="gate"
      @submit.prevent="join"
    >
      <span class="lbl">Callsign</span>
      <input
        v-model="nameDraft"
        class="nb"
        type="text"
        :maxlength="MAX_NAME_LENGTH"
        placeholder="Diver"
        aria-label="Your name"
        autocomplete="nickname"
        spellcheck="false"
      >
      <button
        class="btn primary block cut-sm"
        type="submit"
        :disabled="!valid"
      >
        Join the dive
      </button>
      <p class="exit row small">
        <NuxtLink to="/">Back to base</NuxtLink>
      </p>
    </form>
  </AppDialog>
</template>

<style scoped>
.gate { display: grid; gap: 0.6rem; }
.exit { justify-content: center; margin: 0; }
</style>
