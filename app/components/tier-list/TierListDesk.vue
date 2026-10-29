<script setup lang="ts">
import { TIER_LIST_PRESETS } from '~~/shared/data/tierLists'
import type { SavedTierList } from '~/composables/useTierLists'

// The Tier Maker's list controls: which list is on the board and what to do
// with it. Docked beside the board on wide screens, in a dialog on phones.
defineProps<{
  source: string
  newId: string
  library: readonly SavedTierList[]
  saved: boolean
  dirty: boolean
  picked: boolean
  shareable: boolean
  changes: number
}>()

const emit = defineEmits<{
  open: [id: string]
  save: []
  use: []
  share: []
  import: []
  reset: []
  remove: []
}>()
</script>

<template>
  <div class="tm-desk">
    <label class="tm-desk-field">
      <span class="lbl">On the board</span>
      <select
        :value="source"
        @change="emit('open', ($event.target as HTMLSelectElement).value)"
      >
        <option :value="newId">
          New list (from the default)
        </option>
        <optgroup label="Start from a featured list">
          <option
            v-for="preset in TIER_LIST_PRESETS"
            :key="preset.id"
            :value="`preset:${preset.id}`"
          >
            {{ preset.name }}
          </option>
        </optgroup>
        <optgroup
          v-if="library.length"
          label="Your lists"
        >
          <option
            v-for="entry in library"
            :key="entry.id"
            :value="entry.id"
          >
            {{ entry.name }}
          </option>
        </optgroup>
      </select>
    </label>

    <button
      type="button"
      class="btn primary cut-sm tm-desk-save"
      :class="{ 'cta-sweep': dirty }"
      :disabled="saved && !dirty"
      @click="emit('save')"
    >
      {{ saved ? (dirty ? 'Save changes' : 'Saved') : 'Save to my lists' }}
    </button>
    <button
      v-if="saved && !dirty && !picked"
      type="button"
      class="btn cut-sm"
      @click="emit('use')"
    >
      Use for my next crusade
    </button>
    <p
      v-else-if="saved && picked && !dirty"
      class="tm-desk-note"
    >
      <span
        class="lamp gold"
        aria-hidden="true"
      /> Your next crusade uses this list.
    </p>

    <div class="tm-desk-row">
      <button
        type="button"
        class="btn ghost cut-sm"
        :disabled="!shareable"
        @click="emit('share')"
      >
        Share link
      </button>
      <button
        type="button"
        class="btn ghost cut-sm"
        @click="emit('import')"
      >
        Import
      </button>
    </div>
    <div class="tm-desk-row">
      <button
        type="button"
        class="btn ghost cut-sm"
        :disabled="changes === 0"
        @click="emit('reset')"
      >
        Reset to default
      </button>
      <button
        v-if="saved"
        type="button"
        class="btn danger ghost cut-sm"
        @click="emit('remove')"
      >
        Delete
      </button>
    </div>
  </div>
</template>

<style scoped>
.tm-desk { display: grid; gap: 8px; min-width: 0; }
.tm-desk-field { display: grid; gap: 0.3rem; min-width: 0; margin-bottom: 4px; }
.tm-desk-field select { width: 100%; min-width: 0; }
.tm-desk-save { width: 100%; }
.tm-desk-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(0, 1fr)); gap: 6px; }
.tm-desk-row .btn { width: 100%; }
.tm-desk-note { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 12px; color: var(--khaki); }
</style>
