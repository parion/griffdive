<script setup lang="ts">
import { TIER_LIST_PRESETS } from '~~/shared/data/tierLists'
import type { SavedTierList } from '~/composables/useTierLists'

// The Tier Maker's list controls: which list is on the board and what to do
// with it. Docked beside the board on wide screens, in a dialog on phones.
// `lobby` means the maker was opened from a crusade lobby: the list goes to
// that lobby instead of starting another crusade.
defineProps<{
  source: string
  newId: string
  library: readonly SavedTierList[]
  saved: boolean
  dirty: boolean
  picked: boolean
  lobby: boolean
  launching: boolean
}>()

const emit = defineEmits<{
  open: [id: string]
  save: []
  launch: []
  share: []
  download: []
  copyJson: []
  import: []
  revert: []
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
        <optgroup label="Start a new list from">
          <option :value="newId">
            Default tiers
          </option>
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
    <p
      v-if="lobby && saved && picked && !dirty"
      class="tm-desk-note"
    >
      <span
        class="lamp gold"
        aria-hidden="true"
      /> Your lobby is using this list.
    </p>
    <button
      v-else-if="saved && !dirty"
      type="button"
      class="btn cut-sm tm-desk-launch"
      :disabled="launching"
      @click="emit('launch')"
    >
      {{ lobby ? 'Use in my lobby' : launching ? 'Opening a lobby…' : 'Host a crusade with this list' }}
    </button>

    <span class="lbl tm-desk-h">Share</span>
    <div class="tm-desk-row">
      <button
        type="button"
        class="btn ghost cut-sm"
        @click="emit('share')"
      >
        Copy link
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
        @click="emit('download')"
      >
        Save as file
      </button>
      <button
        type="button"
        class="btn ghost cut-sm"
        @click="emit('copyJson')"
      >
        Copy JSON
      </button>
    </div>
    <div
      v-if="dirty || saved"
      class="tm-desk-row"
    >
      <button
        v-if="dirty"
        type="button"
        class="btn ghost cut-sm"
        @click="emit('revert')"
      >
        {{ saved ? 'Undo changes' : 'Start over' }}
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
.tm-desk-save,
.tm-desk-launch { width: 100%; }
.tm-desk-h { margin-top: 6px; }
.tm-desk-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(0, 1fr)); gap: 6px; }
.tm-desk-row .btn { width: 100%; }
.tm-desk-note { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 12px; color: var(--khaki); }
</style>
