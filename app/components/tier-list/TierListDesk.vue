<script setup lang="ts">
import { TIER_LIST_PRESETS } from '~~/shared/data/tierLists'
import type { SavedTierList } from '~/composables/useTierLists'

// The Tier Maker's list controls: which list is on the board and what to do
// with it. Docked beside the board on wide screens, in a dialog on phones.
// The first button is the list's next step: save it, then take it back to an
// open lobby, host a crusade with it, or — on the standalone site — play it.
const props = defineProps<{
  source: string
  newId: string
  library: readonly SavedTierList[]
  saved: boolean
  dirty: boolean
  step: 'save' | 'lobby' | 'host' | 'play'
  launching: boolean
}>()

const label = computed(() => {
  switch (props.step) {
    case 'lobby':
      return 'Back to my lobby with this list'
    case 'host':
      return props.launching ? 'Opening a lobby…' : 'Host a crusade with this list'
    case 'play':
      return 'Play it in Griffdive ↗'
    default:
      return props.saved ? 'Save changes' : 'Save to my lists'
  }
})

const emit = defineEmits<{
  open: [id: string]
  primary: []
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
      :disabled="launching"
      @click="emit('primary')"
    >
      {{ label }}
    </button>
    <p
      v-if="step !== 'save'"
      class="tm-desk-note"
    >
      <span
        class="lamp gold"
        aria-hidden="true"
      /> Saved in this browser.
    </p>

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
.tm-desk-save { width: 100%; }
.tm-desk-h { margin-top: 6px; }
.tm-desk-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(0, 1fr)); gap: 6px; }
.tm-desk-row .btn { width: 100%; }
.tm-desk-note { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 12px; color: var(--khaki); }
</style>
